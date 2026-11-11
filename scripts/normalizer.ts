import { classify } from './classifier.js';
import { gemKey } from './source.js';
import type { RePoEGem, Skill, SourceData } from './types.js';

export function skillId(gem: RePoEGem): string {
  if (!gem.active_skill) throw new Error('Cannot assign a skill ID without active_skill');
  return `${gem.active_skill.id}::${gem.base_item.id}${gem.discriminator ? `::${gem.discriminator}` : ''}`;
}

export function normalize(source: SourceData): { skills: Skill[]; warnings: string[]; skipped: number } {
  const candidates = source.gems.filter(g => !g.is_support && g.active_skill);
  const ids = new Set<string>();
  const warnings: string[] = [];
  const fullByKey = new Map([...source.full.values()].map(g => [gemKey(g), g]));
  const skills = candidates.map((gem): Skill => {
    const active = gem.active_skill!;
    const id = skillId(gem);
    if (ids.has(id)) throw new Error(`Duplicate skill ID: ${id}`);
    ids.add(id);
    const full = fullByKey.get(gemKey(gem));
    if (!full) warnings.push(`Full export has no exact item/effect match; using static requirements: ${id}`);
    // Requirements at the gem's natural maximum level, not corrupted levels or colour guesses.
    const levelRequirements = full?.per_level?.[String(gem.base_item.max_level)]?.stat_requirements;
    const staticRequirements = gem.static.stat_requirements;
    const requirement = (key: 'str' | 'dex' | 'int') => levelRequirements?.[key] ?? staticRequirements?.[key] ?? null;
    const vaal = active.types.includes('Vaal') || gem.tags.includes('vaal') || gem.static.vaal != null;
    const transfigured = !!gem.discriminator;
    let parent: RePoEGem | undefined;
    if (vaal && gem.secondary_granted_effect) {
      const secondary = source.full.get(gem.secondary_granted_effect);
      if (secondary?.active_skill && !secondary.is_support) parent = candidates.find(g => gemKey(g) === gemKey(secondary));
    } else if (transfigured) {
      const matches = candidates.filter(g => g.base_item.id === gem.base_item.id && !g.discriminator && !g.active_skill!.types.includes('Vaal'));
      if (matches.length === 1) parent = matches[0];
    }
    if ((vaal || transfigured) && !parent) warnings.push(`Unresolved parent: ${id}`);
    return {
      id, name: gem.display_name,
      wiki_url: `https://www.poewiki.net/wiki/${encodeURIComponent(gem.display_name.replaceAll(' ', '_'))}`,
      source: { base_item_id: gem.base_item.id, active_skill_id: active.id, release_state: gem.base_item.release_state },
      variant: { type: vaal && transfigured ? 'vaal_transfigured' : vaal ? 'vaal' : transfigured ? 'transfigured' : 'base', parent_id: parent ? skillId(parent) : null },
      game_tags: [...gem.tags], skill_types: [...active.types],
      attribute_color: ({ r: 'str', g: 'dex', b: 'int', w: 'all' } as const)[gem.color],
      attribute_requirements: { strength: requirement('str'), dexterity: requirement('dex'), intelligence: requirement('int') },
      weapon_restrictions: [...active.weapon_restrictions],
      ...classify(gem), is_new: false, first_seen_repo_version: null,
    };
  });
  return { skills: skills.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0), warnings, skipped: source.gems.length - candidates.length };
}
