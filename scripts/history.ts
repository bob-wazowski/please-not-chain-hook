import type { Change, Skill } from './types.js';

function significant(skill: Skill): string {
  const { is_new: _new, first_seen_repo_version: _firstSeen, classification_rules_version: _rulesVersion, ...data } = skill;
  return JSON.stringify(data);
}

export function updateHistory(current: Skill[], previous: Skill[] | null, history: Change[], revision: string, generatedAt: string) {
  const baseline = previous === null;
  const old = new Map((previous ?? []).map(s => [s.id, s]));
  const skills = current.map((skill): Skill => {
    const prior = old.get(skill.id);
    const firstSeen = prior ? prior.first_seen_repo_version : baseline ? null : revision;
    return { ...skill, first_seen_repo_version: firstSeen, is_new: firstSeen === revision };
  });
  const ids = new Set(skills.map(s => s.id));
  const added = baseline ? [] : skills.filter(s => !old.has(s.id)).map(({ id, name, playability }) => ({ id, name, playability }));
  const removed = (previous ?? []).filter(s => !ids.has(s.id)).map(({ id, name }) => ({ id, name }));
  const changed = skills.filter(s => { const prior = old.get(s.id); return prior && significant(s) !== significant(prior); }).map(s => s.id);
  const entry: Change = { version: revision, generated_at: generatedAt, baseline, added, removed, changed };
  const existing = history.findIndex(e => e.version === revision);
  const changelog = structuredClone(history);
  if (existing < 0) changelog.push(entry);
  else if (added.length || removed.length || changed.length) {
    const prior = changelog[existing]!;
    // One entry per content revision, including rule/override rebuilds on that revision.
    const unionById = <T extends { id: string }>(a: T[], b: T[]) => [...new Map([...a, ...b].map(x => [x.id, x])).values()];
    changelog[existing] = {
      ...prior, generated_at: generatedAt,
      added: unionById(prior.added, added), removed: unionById(prior.removed, removed),
      changed: [...new Set([...prior.changed, ...changed])].sort(),
    };
  }
  return { skills, changelog, delta: entry };
}
