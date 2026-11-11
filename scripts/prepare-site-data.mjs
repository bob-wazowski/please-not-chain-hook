import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';

// Separate frontend adapter; existing PoE 1 normalizer/classifier are untouched.
const sources = {
  'poe2-skill_gems': 'https://repoe-fork.github.io/poe2/skill_gems.json',
  'poe2-skills': 'https://repoe-fork.github.io/poe2/skills.json',
  'poe2-ascendancies': 'https://repoe-fork.github.io/poe2/ascendancies.json',
  'poe2-characters': 'https://repoe-fork.github.io/poe2/characters.json',
  'poe1-tree': 'https://raw.githubusercontent.com/grindinggear/skilltree-export/3.29.1/data.json',
  'phrecia-alternate': 'https://raw.githubusercontent.com/grindinggear/skilltree-export/3.27.0g/alternate.json',
};
await fs.mkdir('.cache', { recursive: true });
const read = async name => {
  if (!existsSync(`.cache/${name}.json`)) {
    const response = await fetch(sources[name]); if (!response.ok) throw Error(`${name}: HTTP ${response.status}`);
    await fs.writeFile(`.cache/${name}.json`, await response.text());
  }
  return JSON.parse(await fs.readFile(`.cache/${name}.json`, 'utf8'));
};
const poe1 = JSON.parse(await fs.readFile('src/data/skills.json', 'utf8'));
const poe2 = await read('poe2-skill_gems');
const effects = await read('poe2-skills');
const asc = Object.values(await read('poe2-ascendancies')).filter(a => !a.disabled && !a.name.includes('DNT') && !a.overrides_ascendancy);
const chars = await read('poe2-characters');
const convertClass = c => ({ name: c.name, attributes: { strength: c.base_str, dexterity: c.base_dex, intelligence: c.base_int }, ascendancies: c.ascendancies.map(a => a.name) });
const games = [
  { id: 'poe1', name: 'Path of Exile 1', catalog: 'poe1', version: 'GGG 3.29.1 classes / existing gem snapshot', classes: (await read('poe1-tree')).classes.map(convertClass) },
  { id: 'poe2', name: 'Path of Exile 2', catalog: 'poe2', version: 'RePoE exported skill snapshot', classes: chars.filter(c => asc.some(a => a.character[1] === c.name)).map(c => ({ name: c.name, attributes: { strength: c.base_stats.strength, dexterity: c.base_stats.dexterity, intelligence: c.base_stats.intelligence }, ascendancies: asc.filter(a => a.character[1] === c.name).map(a => a.name) })) },
  { id: 'phrecia', name: 'Legacy of Phrecia', catalog: 'poe1', version: 'GGG 3.27.0g alternate ruleset / shared PoE 1 gems', classes: (await read('phrecia-alternate')).classes.map(convertClass) },
];
const second = Object.entries(poe2).filter(([, g]) => g.gem_type !== 'support' && g.base_item.release_state === 'released' && !g.base_item.display_name.includes('[DNT')).map(([id, g]) => {
  const effect = effects[g.grants_skills[0]]?.active_skill;
  const types = effect?.types ?? [];
  const tags = g.tags ?? [];
  const has = value => types.includes(value) || tags.includes(value.toLowerCase());
  const archetypes = [];
  for (const [condition, name] of [[has('Melee'), 'melee'], [has('Attack'), 'attack'], [has('Spell'), 'spellcaster'], [has('Minion'), 'minion'], [has('Projectile'), 'projectile'], [has('Totem'), 'totem'], [has('Channelling') || has('Channel'), 'channeling'], [effect?.weapon_restrictions?.includes('Bow'), 'bow'], [has('Warcry'), 'warcry'], [has('DamageOverTime'), 'dot']]) if (condition) archetypes.push(name);
  const damaging = has('Damage') || has('Attack') || has('Minion');
  return { id: `poe2:${id}`, name: g.base_item.display_name, family: g.base_item.display_name.toLowerCase(), archetypes,
    requirements: g.requirement_weights, requirementKind: 'weights', color: ({ r: 'str', g: 'dex', b: 'int', w: 'all' })[g.color] ?? 'all',
    playability: g.gem_type === 'spirit' ? 'support_only' : damaging ? 'main' : 'conditional', variant: 'base',
    damage: ['physical', 'fire', 'cold', 'lightning', 'chaos'].filter(t => has(t) || has(t[0].toUpperCase() + t.slice(1))),
    kinds: [has('Damage') || has('Attack') ? 'hit' : null, has('DamageOverTime') ? 'dot' : null].filter(Boolean),
    activation: [has('Attack') ? 'attack' : null, has('Spell') ? 'spell' : null].filter(Boolean), tags,
    wiki: `https://www.poe2wiki.net/wiki/${encodeURIComponent(g.base_item.display_name.replaceAll(' ', '_'))}` };
});
const byId = new Map(poe1.map(g => [g.id, g]));
const first = poe1.map(g => {
  let root = g; const seen = new Set();
  while (root.variant.parent_id && !seen.has(root.id)) { seen.add(root.id); const parent = byId.get(root.variant.parent_id); if (!parent) break; root = parent; }
  return { id: g.id, name: g.name, family: root.name.replace(/^Vaal /, '').split(' of ')[0].toLowerCase(), requirements: g.attribute_requirements, requirementKind: 'maximum', color: g.attribute_color, archetypes: g.archetypes, variant: g.variant.type,
    playability: /playtest|\[DNT|\[UNUSED/i.test(g.name) ? 'excluded' : g.playability,
    damage: g.damage_types, kinds: g.damage_kinds, activation: g.activation_types, tags: g.game_tags,
    wiki: g.wiki_url };
});
await fs.writeFile('src/data/poe1.json', JSON.stringify(first));
await fs.writeFile('src/data/games.json', JSON.stringify(games, null, 2));
await fs.writeFile('src/data/poe2.json', JSON.stringify(second));
await fs.writeFile('src/data/provenance.json', JSON.stringify({ generated: new Date().toISOString(), sources: ['https://repoe-fork.github.io/', 'https://repoe-fork.github.io/poe2/', 'https://github.com/grindinggear/skilltree-export/tree/3.29.1', 'https://github.com/grindinggear/skilltree-export/tree/3.27.0g/alternate.json'], limitations: ['PoE 1 gems retain the existing snapshot, with no verified patch identifier.', 'PoE 2 affinity uses actual requirement weights from RePoE, not numerical equipment requirements.', 'Phrecia uses the shared PoE 1 gem snapshot with official alternate Ascendancies.'] }, null, 2));
console.log(`Prepared ${second.length} PoE 2 gems and ${games.length} rulesets`);
