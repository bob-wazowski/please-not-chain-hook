import { join } from 'node:path';
import { z } from 'zod';
import { CLASSIFICATION_RULES_VERSION, MAX_REMOVAL_FRACTION, REPOE_BASE_URL } from './config.js';
import { updateHistory } from './history.js';
import { normalize } from './normalizer.js';
import { sha256 } from './source.js';
import { commitJson, readJson } from './storage.js';
import { changeSchema, type SourceData } from './types.js';
import { applyOverrides, validateSkills } from './validation.js';

export async function updateDatabase(root: string, source: SourceData, check: boolean, generatedAt = new Date().toISOString()) {
  const [priorValue, historyValue, overridesValue] = await Promise.all([
    readJson(join(root, 'src/data/skills.json')), readJson(join(root, 'data/changelog.json')), readJson(join(root, 'data/overrides.json')),
  ]);
  const previous = priorValue === undefined ? null : validateSkills(priorValue);
  const history = z.array(changeSchema).parse(historyValue ?? []);
  if (new Set(history.map(e => e.version)).size !== history.length) throw new Error('Duplicate changelog versions');
  if ((previous === null) !== (history.length === 0)) throw new Error('Database/changelog state is incomplete; restore a consistent backup before updating.');
  const normalized = normalize(source);
  const overridden = applyOverrides(normalized.skills, overridesValue ?? {});
  const result = updateHistory(overridden.skills, previous, history, source.revision, generatedAt);
  const skills = validateSkills(result.skills);
  if (previous && result.delta.removed.length / previous.length > MAX_REMOVAL_FRACTION) throw new Error('Safety stop: source would remove more than 50% of the database. Inspect the source before updating.');
  const warnings = [...normalized.warnings, ...overridden.warnings];
  const metadata = {
    source: REPOE_BASE_URL, version: source.revision, version_kind: 'content_sha256', game_version: null,
    version_limitation: 'No verified machine-readable game version used; revision hashes the four downloaded JSON files.',
    generated_at: generatedAt, classification_rules_version: CLASSIFICATION_RULES_VERSION,
    source_hashes: source.hashes, overrides_hash: sha256(JSON.stringify(overridesValue ?? {})),
    attribute_requirements_level: 'base_item.max_level (natural maximum); static fallback; unknown = null',
    total_source_records: source.gems.length, skipped_support_or_no_active: normalized.skipped,
    total_active_skill_gems: skills.length,
    counts: Object.fromEntries(['main', 'conditional', 'support_only', 'excluded'].map(state => [state, skills.filter(s => s.playability === state).length])),
    manual_review: skills.filter(s => s.manual_review).map(s => ({ id: s.id, name: s.name, reasons: s.playability_reasons })), warnings,
  };
  if (!check) await commitJson(root, {
    'data/skills.previous.json': previous ?? [],
    'data/changelog.json': result.changelog,
    'data/skills-meta.json': metadata,
    // Publish the database last, after all outputs were staged and validated.
    'src/data/skills.json': skills,
  });
  return { ...result, skills, metadata, warnings };
}
