import { CLASSIFICATION_RULES_VERSION, EXCLUDE_NON_MANUALLY_CASTED, GRAFT_EXPERIENCE_TYPES, LEGACY_EXPERIENCE_TYPES } from './config.js';
import type { Classification, RePoEGem } from './types.js';

export function classify(gem: RePoEGem, options = { excludeNonManuallyCasted: EXCLUDE_NON_MANUALLY_CASTED }): Classification {
  const active = gem.active_skill;
  const types = new Set(active?.types ?? []);
  const tags = new Set(gem.tags);
  const stats = (gem.static.stats ?? []).filter(s => s !== null);
  const statIds = stats.filter(s => s.value !== 0).map(s => s.id ?? '');
  const flag = (id: string) => stats.some(s => s.id === id && typeof s.value === 'number' && s.value > 0);
  const has = (s: string) => types.has(s);
  const result: Classification = {
    activation_types: [], damage_sources: [], damage_types: [], damage_kinds: [], archetypes: [], skill_roles: [], mechanics: [],
    combat_range: null, playability: 'conditional', playability_reasons: [], manual_review: false,
    classification_confidence: 'high', classification_rules_version: CLASSIFICATION_RULES_VERSION,
  };
  const noDamage = flag('base_deal_no_damage');
  const movement = ['Movement', 'Travel', 'Blink'].some(has) || ['movement', 'travel', 'blink'].some(tag => tags.has(tag));
  const guard = has('Guard') || tags.has('guard');
  // Minion is also present on offerings/Convocation: require actual summoning evidence.
  const summons = has('CreatesMinion') || has('CreatesSentinelMinion');
  const minionTypes = new Set(active?.minion_types ?? []);
  const minionHit = minionTypes.has('Attack') || minionTypes.has('Damage');
  const minionDot = minionTypes.has('DamageOverTime');
  const minionDamage = summons && (minionHit || minionDot || statIds.some(id =>
    ['display_minion_monster_type', 'base_display_minion_actor_level'].includes(id) || /^(?:vaal_upgrade|active_skill)_minion_damage_/.test(id)));
  const hitStats = statIds.some(id => /^(?:spell|attack)_(?:minimum|maximum)_(?:base|added)_(?:physical|fire|cold|lightning|chaos)_damage$/.test(id) ||
    /^off_hand_local_(?:minimum|maximum)_added_(?:physical|fire|cold|lightning|chaos)_damage$/.test(id) || /^corpse_explosion_monster_life_permillage_/.test(id));
  const dotStats = statIds.some(id => /^base_(?:physical|fire|cold|lightning|chaos)_damage_to_deal_per_minute$/.test(id) || /^base_righteous_fire_.*_to_deal_to_nearby_per_minute$/.test(id));
  // Attack alone is insufficient. Weapon restrictions/combat types or direct stats
  // establish attacks such as Cyclone, which legitimately lack the Damage type.
  const attackDamage = has('Attack') && ((active?.weapon_restrictions.length ?? 0) > 0 || has('Melee') || has('RangedAttack') || hitStats || flag('is_area_damage'));
  const dot = !noDamage && (dotStats || (has('DamageOverTime') && (has('Spell') || has('Attack'))));
  const hit = !noDamage && (hitStats || attackDamage || (has('Damage') && (has('Spell') || has('Attack'))));
  const damage = hit || dot || minionDamage;
  if (has('Attack')) result.activation_types.push('attack');
  if (has('Spell')) result.activation_types.push('spell');
  if (has('Warcry')) result.activation_types.push('warcry');
  if (has('Triggered') || has('InbuiltTrigger')) result.activation_types.push('trigger');
  if (hit) result.damage_kinds.push('hit');
  if (dot) result.damage_kinds.push('dot');
  if (minionDamage && minionHit && !hit) result.damage_kinds.push('hit');
  if (minionDamage && minionDot && !dot) result.damage_kinds.push('dot');
  if (hit || dot) {
    if (has('Trapped')) result.damage_sources.push('trap');
    else if (has('RemoteMined')) result.damage_sources.push('mine');
    else if (active?.is_skill_totem || has('SummonsTotem')) result.damage_sources.push('totem');
    else result.damage_sources.push('player');
  }
  if (minionDamage) result.damage_sources.push('minion');
  // Only direct base damage/conversion stats prove damage elements. Aura tags do not.
  if (!noDamage) for (const element of ['physical', 'fire', 'cold', 'lightning', 'chaos'] as const) {
    if (statIds.some(id => new RegExp(`^(?:spell|attack)_(?:minimum|maximum)_(?:base|added)_${element}_damage$`).test(id) ||
      new RegExp(`^off_hand_local_(?:minimum|maximum)_added_${element}_damage$`).test(id) ||
      id === `base_${element}_damage_to_deal_per_minute` || id === `corpse_explosion_monster_life_permillage_${element}` ||
      (damage && new RegExp(`^skill_(?:physical|fire|cold|lightning|chaos)_damage_%_to_convert_to_${element}$`).test(id)) ||
      (dot && element === 'fire' && /^base_righteous_fire_.*_to_deal_to_nearby_per_minute$/.test(id)))) result.damage_types.push(element);
  }
  const projectile = has('Projectile') || flag('base_is_projectile');
  const archetype = (condition: boolean, value: Classification['archetypes'][number]) => { if (condition) result.archetypes.push(value); };
  archetype(has('Melee'), 'melee'); archetype(has('Attack'), 'attack'); archetype(active?.weapon_restrictions.includes('Bow') ?? false, 'bow');
  archetype(has('Spell') && (hit || dot), 'spellcaster'); archetype(summons, 'minion');
  archetype(!!active?.is_skill_totem || has('SummonsTotem'), 'totem'); archetype(has('Trapped'), 'trap'); archetype(has('RemoteMined'), 'mine');
  archetype(has('Brand'), 'brand'); archetype(dot || (minionDamage && minionDot), 'dot'); archetype(projectile, 'projectile'); archetype(has('Channel'), 'channeling'); archetype(has('Warcry'), 'warcry');
  const mechanic = (condition: boolean, value: Classification['mechanics'][number]) => { if (condition) result.mechanics.push(value); };
  mechanic(has('Area'), 'aoe'); mechanic(has('Duration'), 'duration'); mechanic(projectile, 'projectile');
  mechanic(has('Chains'), 'chaining'); mechanic(has('Nova'), 'nova'); mechanic(has('Channel'), 'channeling');
  mechanic(has('Cooldown') || (gem.static.cooldown ?? 0) > 0, 'cooldown'); mechanic(has('Instant'), 'instant'); mechanic(summons, 'minion');
  if (damage) result.skill_roles.push('main_damage');
  if (summons) result.skill_roles.push('minion_summoning', 'minion');
  if (movement) result.skill_roles.push('movement');
  if (guard) result.skill_roles.push('defensive');
  if (has('Aura')) result.skill_roles.push('aura');
  if (has('Hex') || has('AppliesCurse')) result.skill_roles.push('curse');
  if (has('Mark')) result.skill_roles.push('mark');
  if (!damage) result.skill_roles.push('utility');
  if (has('Melee') && !summons) result.combat_range = 'melee';
  else if ((has('RangedAttack') || (projectile && has('ProjectilesFromUser'))) && !summons) result.combat_range = 'ranged';
  const decide = (playability: Classification['playability'], ...reasons: Classification['playability_reasons']) => {
    result.playability = playability; result.playability_reasons = reasons;
  };
  if (gem.is_support) decide('excluded', 'support_gem');
  else if (!active) decide('excluded', 'no_active_skill');
  else if (GRAFT_EXPERIENCE_TYPES.has(gem.base_item.experience_type) || flag('is_graft_skill')) decide('excluded', 'graft_skill');
  else if (gem.base_item.release_state === 'unreleased') decide('excluded', 'unreleased');
  else if (gem.base_item.release_state === 'legacy' || LEGACY_EXPERIENCE_TYPES.has(gem.base_item.experience_type)) decide('excluded', 'legacy_skill');
  else if (options.excludeNonManuallyCasted && !active.is_manually_casted) decide('excluded', 'not_manually_casted');
  // Confirmed damage wins over movement/buff/aura/curse roles. Exclusions above
  // remain authoritative, and minion damage is independent of player no-damage.
  else if (damage) decide('main');
  else if (statIds.some(id => /damage_dealt_as_reflected|reflect.*damage/.test(id))) decide('conditional', 'requires_specific_mechanic');
  else if (noDamage && !summons) {
    if (movement) decide('support_only', 'movement_skill', 'no_damage');
    else if (guard) decide('support_only', 'guard_skill', 'no_damage');
    else if (has('Aura')) decide('support_only', 'aura', 'no_damage');
    else if (has('Hex') || has('Mark') || has('AppliesCurse')) decide('support_only', 'curse_or_mark', 'no_damage');
    else if (has('Buff')) decide('support_only', 'buff_only', 'no_damage');
    else decide('support_only', 'no_damage');
  }
  else decide('conditional', 'damage_not_detected');
  if (result.playability === 'conditional') { result.manual_review = true; result.classification_confidence = 'low'; }
  else if (result.playability === 'main' && ((minionDamage && !hit && !dot) || (hit && !hitStats && !attackDamage) || (dot && !dotStats))) result.classification_confidence = 'medium';
  return result;
}
