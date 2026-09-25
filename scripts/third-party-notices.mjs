import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

/** Collect licenses from packages actually included in the esbuild input graph. */
export async function collectThirdPartyNotices(inputs, root = process.cwd()) {
  const directories = new Set();
  for (const input of inputs) {
    const normalized = input.replaceAll('\\', '/');
    const marker = 'node_modules/';
    const index = normalized.lastIndexOf(marker);
    if (index < 0) continue;
    const parts = normalized.slice(index + marker.length).split('/');
    const name = parts[0].startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
    directories.add(path.resolve(root, normalized.slice(0, index + marker.length), name));
  }
  const notices = [];
  for (const directory of [...directories].sort()) {
    const pkg = JSON.parse(await readFile(path.join(directory, 'package.json'), 'utf8'));
    const files = (await readdir(directory, { withFileTypes: true }))
      .filter(file => file.isFile() && /^(licen[cs]e|copying|notice|authors)(\.|$)/i.test(file.name))
      .map(file => file.name).sort();
    if (!files.some(file => /^(licen[cs]e|copying)(\.|$)/i.test(file))) throw new Error(`Missing license for bundled package ${pkg.name}`);
    const contents = await Promise.all(files.map(file => readFile(path.join(directory, file), 'utf8')));
    notices.push(`${pkg.name}@${pkg.version}\n${contents.join('\n')}`);
  }
  return notices.join('\n\n---\n\n');
}
