import { createHash } from 'node:crypto';
import { z } from 'zod';
import { MAX_SOURCE_BYTES, REPOE_BASE_URL, SOURCE_FILES, SOURCE_TIMEOUT_MS } from './config.js';
import { gemSchema, type RePoEGem, type SourceData } from './types.js';

export const gemKey = (g: RePoEGem) => JSON.stringify([g.base_item.id, g.active_skill?.id ?? null, g.discriminator ?? null, g.is_support]);
export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export async function download(file: string, fetcher: typeof fetch = fetch): Promise<string> {
  const response = await fetcher(new URL(file, REPOE_BASE_URL), { signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`${file}: HTTP ${response.status}`);
  if (!response.body) throw new Error(`${file}: empty body`);
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > MAX_SOURCE_BYTES) throw new Error(`${file}: response exceeds size limit`);
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text.trim()) throw new Error(`${file}: empty body`);
  return text;
}

export function parseSources(raw: Record<string, string>): SourceData {
  const parse = (file: string): unknown => {
    const value = raw[file];
    if (!value) throw new Error(`Missing source: ${file}`);
    try { return JSON.parse(value) as unknown; } catch { throw new Error(`Invalid JSON: ${file}`); }
  };
  const gems = z.array(gemSchema).nonempty().parse(parse('gems_minimal.json'));
  const fullObject = z.record(z.string(), z.unknown()).parse(parse('gems.json'));
  const full = new Map<string, RePoEGem>();
  for (const [effectId, value] of Object.entries(fullObject)) {
    // gems.json also contains item-only effects, absent from the minimal gem list.
    if (typeof value === 'object' && value !== null && 'base_item' in value && value.base_item != null) {
      full.set(effectId, gemSchema.parse(value));
    }
  }
  if (!full.size) throw new Error('Empty full gem export');
  const byKey = new Map<string, RePoEGem>();
  for (const gem of full.values()) {
    const key = gemKey(gem);
    if (byKey.has(key)) throw new Error(`Ambiguous full export gem: ${key}`);
    byKey.set(key, gem);
  }
  for (const gem of gems) {
    const fullGem = byKey.get(gemKey(gem));
    if (fullGem && JSON.stringify(fullGem.active_skill) !== JSON.stringify(gem.active_skill)) {
      throw new Error(`Inconsistent minimal/full snapshots: ${gem.display_name}. Retry after RePoE finishes publishing.`);
    }
  }
  if (gems.filter(g => byKey.has(gemKey(g))).length / gems.length < 0.95) throw new Error('Full/minimal exports have insufficient matching coverage');
  const gemTags = z.record(z.string(), z.string().nullable()).parse(parse('gem_tags.json'));
  const skillTypes = z.array(z.string()).nonempty().parse(parse('active_skill_types.json'));
  if (!Object.keys(gemTags).length) throw new Error('Empty tag dictionary');
  for (const gem of gems) {
    for (const tag of gem.tags) if (!(tag in gemTags)) throw new Error(`Unknown game tag: ${tag}`);
    for (const type of [...gem.active_skill?.types ?? [], ...gem.active_skill?.minion_types ?? []]) {
      if (!skillTypes.includes(type)) throw new Error(`Unknown active skill type: ${type}`);
    }
  }
  const hashes = Object.fromEntries(SOURCE_FILES.map(file => [file, sha256(raw[file]!)]));
  return { gems, full, gemTags, skillTypes, hashes, revision: `sha256:${sha256(JSON.stringify(hashes))}` };
}

export async function loadSource(fetcher: typeof fetch = fetch): Promise<SourceData> {
  const entries = await Promise.all(SOURCE_FILES.map(async file => [file, await download(file, fetcher)] as const));
  return parseSources(Object.fromEntries(entries));
}
