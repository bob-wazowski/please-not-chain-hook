import { z } from 'zod';

const strings = z.array(z.string());
const nullableNumber = z.number().finite().nonnegative().nullable();
export const requirementsSchema = z.object({ str: nullableNumber, dex: nullableNumber, int: nullableNumber });
export const statSchema = z.object({ id: z.string().nullish(), type: z.string(), value: z.number().finite().nullable().optional() });
export const gemSchema = z.object({
  active_skill: z.object({
    id: z.string().min(1), display_name: z.string(), description: z.string(),
    is_manually_casted: z.boolean(), is_skill_totem: z.boolean(),
    types: strings, minion_types: strings.nullish(), weapon_restrictions: strings,
  }).nullish(),
  base_item: z.object({ id: z.string().min(1), display_name: z.string(), experience_type: z.string(),
    max_level: z.number().int().positive(), release_state: z.enum(['released', 'unreleased', 'legacy']) }),
  color: z.enum(['r', 'g', 'b', 'w']), display_name: z.string().min(1), is_support: z.boolean(),
  tags: strings, discriminator: z.string().nullish(), secondary_granted_effect: z.string().nullish(),
  static: z.object({
    stats: z.array(statSchema.nullable()).nullish(), stat_requirements: requirementsSchema.nullish(),
    cooldown: nullableNumber.optional(), vaal: z.object({ souls: z.number(), stored_uses: z.number() }).nullish(),
  }),
  per_level: z.record(z.string(), z.object({ stat_requirements: requirementsSchema.nullish() })).optional(),
});
export type RePoEGem = z.infer<typeof gemSchema>;
export type ActiveSkill = NonNullable<RePoEGem['active_skill']>;
export const playabilitySchema = z.enum(['main', 'conditional', 'support_only', 'excluded']);
export const classificationShape = {
  activation_types: z.array(z.enum(['attack', 'spell', 'warcry', 'trigger'])),
  damage_sources: z.array(z.enum(['player', 'minion', 'totem', 'trap', 'mine'])),
  damage_types: z.array(z.enum(['physical', 'fire', 'cold', 'lightning', 'chaos'])),
  damage_kinds: z.array(z.enum(['hit', 'dot'])),
  archetypes: z.array(z.enum(['melee', 'attack', 'bow', 'spellcaster', 'minion', 'totem', 'trap', 'mine', 'brand', 'dot', 'projectile', 'channeling', 'warcry'])),
  skill_roles: z.array(z.enum(['main_damage', 'minion_summoning', 'movement', 'defensive', 'aura', 'curse', 'mark', 'utility', 'minion'])),
  mechanics: z.array(z.enum(['aoe', 'duration', 'projectile', 'chaining', 'nova', 'channeling', 'cooldown', 'instant', 'minion'])),
  combat_range: z.enum(['melee', 'ranged']).nullable(),
  playability: playabilitySchema,
  playability_reasons: z.array(z.enum(['support_gem', 'no_active_skill', 'unreleased', 'graft_skill', 'not_manually_casted', 'movement_skill', 'guard_skill', 'aura', 'curse_or_mark', 'buff_only', 'no_damage', 'damage_not_detected', 'legacy_skill', 'requires_specific_mechanic', 'support_skill'])),
  manual_review: z.boolean(), classification_confidence: z.enum(['high', 'medium', 'low']),
  classification_rules_version: z.string().min(1),
};
export const classificationSchema = z.strictObject(classificationShape);
export type Classification = z.infer<typeof classificationSchema>;
export const skillSchema = z.strictObject({
  id: z.string().min(1), name: z.string().min(1), wiki_url: z.url(),
  source: z.strictObject({ base_item_id: z.string().min(1), active_skill_id: z.string().min(1), release_state: z.string().min(1) }),
  variant: z.strictObject({ type: z.enum(['base', 'transfigured', 'vaal', 'vaal_transfigured']), parent_id: z.string().min(1).nullable() }),
  game_tags: strings, skill_types: strings,
  attribute_color: z.enum(['str', 'dex', 'int', 'all']),
  attribute_requirements: z.strictObject({ strength: nullableNumber, dexterity: nullableNumber, intelligence: nullableNumber }),
  weapon_restrictions: strings,
  ...classificationShape,
  is_new: z.boolean(), first_seen_repo_version: z.string().min(1).nullable(),
});
export interface Skill extends z.infer<typeof skillSchema> {}
export const overridesSchema = z.record(z.string(), classificationSchema.omit({ classification_rules_version: true }).partial());
export type Overrides = z.infer<typeof overridesSchema>;
export const changeSchema = z.strictObject({
  version: z.string(), generated_at: z.iso.datetime(), baseline: z.boolean(),
  added: z.array(z.strictObject({ id: z.string(), name: z.string(), playability: playabilitySchema })),
  removed: z.array(z.strictObject({ id: z.string(), name: z.string() })), changed: strings,
});
export type Change = z.infer<typeof changeSchema>;
export interface SourceData {
  gems: RePoEGem[];
  full: Map<string, RePoEGem>;
  gemTags: Record<string, string | null>;
  skillTypes: string[];
  revision: string;
  hashes: Record<string, string>;
}
