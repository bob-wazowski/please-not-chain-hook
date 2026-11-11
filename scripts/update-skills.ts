import { fileURLToPath } from 'node:url';
import { loadSource } from './source.js';
import { withUpdateLock } from './storage.js';
import { updateDatabase } from './updater.js';

const args = process.argv.slice(2);
if (args.some(arg => !['--check', '--force'].includes(arg))) throw new Error('Usage: tsx scripts/update-skills.ts [--check] [--force]');
const root = fileURLToPath(new URL('../', import.meta.url));
const check = args.includes('--check');
async function run() {
  // Always rebuild: --force is explicit compatibility syntax, never a safety bypass.
  const source = await loadSource();
  const result = await updateDatabase(root, source, check);
  const count = (state: string) => result.skills.filter(s => s.playability === state).length;
  console.log(`\n========== GEMBLING SKILLS UPDATE ==========\n\nRePoE version: ${source.revision}\nGame version: unknown (content revision used)\nTotal active skill gems: ${result.skills.length}\nSkipped support/no-active: ${result.metadata.skipped_support_or_no_active}\n\nMain: ${count('main')}\nConditional: ${count('conditional')}\nSupport only: ${count('support_only')}\nExcluded: ${count('excluded')}\n\nManual review: ${result.metadata.manual_review.length}\n\nNew gems: ${result.delta.added.length}\nRemoved gems: ${result.delta.removed.length}\nChanged gems: ${result.delta.changed.length}\n\nMode: ${check ? 'CHECK (no files written)' : 'UPDATE'}\nBaseline: ${result.delta.baseline}\n`);
  for (const skill of result.skills.filter(s => s.playability === 'conditional' || s.manual_review)) console.log(`Review: ${skill.name} [${skill.id}] — ${skill.playability_reasons.join(', ')}`);
  for (const warning of result.warnings) console.warn(`Warning: ${warning}`);
  console.log('\n============================================');
}

try {
  if (check) await run(); else await withUpdateLock(root, run);
} catch (error) {
  console.error('Skills update failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
