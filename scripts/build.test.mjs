import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire, builtinModules } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { build } from 'esbuild';
import compression from './compressedStaticAssets.js';
import aliases from './desktopRuntimeAliases.js';
import timers from './rendererSafeUnref.js';
import terser from './terserProductionBundle.js';

const require = createRequire(import.meta.url);
test('production assets embed and round-trip SQL Wasm and every locale', async () => {
  const locales = readdirSync('src/i18n/locales').filter(name => name.endsWith('.json')).sort();
  const result = await build({
    bundle: true, format: 'cjs', platform: 'node', target: 'es2022', minify: true, write: false,
    external: [...builtinModules, 'node:*'], alias: aliases.createDesktopRuntimeAliases(),
    plugins: [compression.createCompressedStaticAssetsPlugin()],
    stdin: { resolveDir: process.cwd(), contents: [
      'import initSqlJs from "sql.js";',
      'import wasm from "sql.js/dist/sql-wasm.wasm";',
      ...locales.map((name, i) => `import locale${i} from './src/i18n/locales/${name}';`),
      `module.exports = { initSqlJs, wasm, locales: [${locales.map((_, i) => `locale${i}`).join(',')}] };`,
    ].join('\n') },
  });
  const source = await terser.minifyProductionBundle(result.outputFiles[0].text);
  const module = { exports: {} };
  Function('module', 'exports', 'require', '__dirname', source)(module, module.exports, require, process.cwd());
  assert.deepEqual(Buffer.from(module.exports.wasm), readFileSync(path.join(path.dirname(require.resolve('sql.js')), 'sql-wasm.wasm')));
  assert.deepEqual(module.exports.locales, locales.map(name => JSON.parse(readFileSync(`src/i18n/locales/${name}`, 'utf8'))));
  const sql = await module.exports.initSqlJs({ wasmBinary: module.exports.wasm });
  const database = new sql.Database();
  try { assert.equal(database.exec('SELECT 6 * 7')[0].values[0][0], 42); } finally { database.close(); }
});
test('release files are self-contained and versions agree', () => {
  const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const versions = JSON.parse(readFileSync('versions.json', 'utf8'));
  assert.equal(manifest.id, 'claudian-collab');
  assert.equal(manifest.version, pkg.version);
  assert.equal(versions[manifest.version], manifest.minAppVersion);
  const source = readFileSync('main.js', 'utf8');
  assert.ok(Buffer.byteLength(source) < 5 * 1024 * 1024);
  assert.match(source, /Third-party notices/);
  assert.match(source, /Copyright \(c\) 2017 sql\.js authors/);
  assert.match(source, /Permission is hereby granted/);
  assert.match(source, /bonjour-service@/);
  assert.deepEqual(timers.findUnsafeTimerUnrefSites(source), []);
  assert.match(readFileSync('styles.css', 'utf8'), /claudian-collab-standalone/);
});
