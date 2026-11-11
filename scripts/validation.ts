import { z } from 'zod';
import { overridesSchema, skillSchema, type Overrides, type Skill } from './types.js';

export function validateSkills(value: unknown): Skill[] {
  const skills = z.array(skillSchema).nonempty().parse(value);
  const byId = new Map(skills.map(s => [s.id, s]));
  if (byId.size !== skills.length) throw new Error('Duplicate skill IDs');
  for (const skill of skills) {
    if (skill.variant.parent_id && !byId.has(skill.variant.parent_id)) throw new Error(`Missing parent for ${skill.id}`);
    const visited = new Set([skill.id]);
    let parentId = skill.variant.parent_id;
    while (parentId) {
      if (visited.has(parentId)) throw new Error(`Cyclic parent relationship: ${skill.id}`);
      visited.add(parentId); parentId = byId.get(parentId)!.variant.parent_id;
    }
    if (skill.playability === 'conditional' && !skill.manual_review) throw new Error(`Conditional skill requires manual review: ${skill.id}`);
    if (skill.is_new && !skill.first_seen_repo_version) throw new Error(`New skill missing first-seen revision: ${skill.id}`);
  }
  return skills;
}

export function applyOverrides(skills: Skill[], value: unknown): { skills: Skill[]; warnings: string[] } {
  const overrides: Overrides = overridesSchema.parse(value);
  const ids = new Set(skills.map(s => s.id));
  const warnings = Object.keys(overrides).filter(id => !ids.has(id)).map(id => `Override refers to absent gem: ${id}`);
  return { skills: skills.map(skill => skillSchema.parse({ ...skill, ...overrides[skill.id] })), warnings };
}
