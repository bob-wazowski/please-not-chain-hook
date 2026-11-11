import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

export async function readJson(path: string): Promise<unknown | undefined> {
  try { return JSON.parse(await readFile(path, 'utf8')) as unknown; }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}

// Staging + same-directory rename keeps every JSON complete. Roll back on runtime errors.
export async function commitJson(root: string, files: Record<string, unknown>): Promise<void> {
  const token = randomUUID();
  const staged: { path: string; temp: string; before: string | null }[] = [];
  const replaced: typeof staged = [];
  try {
    for (const [relative, value] of Object.entries(files)) {
      const path = join(root, relative);
      await mkdir(dirname(path), { recursive: true });
      let before: string | null = null;
      try { before = await readFile(path, 'utf8'); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      const temp = `${path}.${token}.tmp`;
      const item = { path, temp, before };
      staged.push(item);
      await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
    }
    for (const item of staged) { await rename(item.temp, item.path); replaced.push(item); }
  } catch (error) {
    for (const item of replaced.reverse()) {
      if (item.before === null) await unlink(item.path);
      else { await writeFile(item.temp, item.before); await rename(item.temp, item.path); }
    }
    throw error;
  } finally {
    await Promise.all(staged.map(item => unlink(item.temp).catch(error => {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    })));
  }
}

export async function withUpdateLock<T>(root: string, action: () => Promise<T>): Promise<T> {
  const directory = join(root, 'data');
  await mkdir(directory, { recursive: true });
  const path = join(directory, '.skills-update.lock');
  try { await writeFile(path, `${process.pid}\n`, { flag: 'wx' }); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('Update lock exists: another update is running. After a crashed run, remove data/.skills-update.lock manually.');
    throw error;
  }
  try { return await action(); } finally { await unlink(path); }
}
