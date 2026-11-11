export const REPOE_BASE_URL = 'https://repoe-fork.github.io/';
export const CLASSIFICATION_RULES_VERSION = '1.1.0';
export const EXCLUDE_NON_MANUALLY_CASTED = true;
// These are observed source values, not guesses based on display names.
export const GRAFT_EXPERIENCE_TYPES = new Set(['GemProgressionGraftSkill']);
export const LEGACY_EXPERIENCE_TYPES = new Set(['GemProgressionRoyale1', 'GemProgressionRoyale4']);
export const SOURCE_FILES = ['gems_minimal.json', 'gems.json', 'gem_tags.json', 'active_skill_types.json'] as const;
export const SOURCE_TIMEOUT_MS = 120_000;
export const MAX_SOURCE_BYTES = 150 * 1024 * 1024;
export const MAX_REMOVAL_FRACTION = 0.5;
