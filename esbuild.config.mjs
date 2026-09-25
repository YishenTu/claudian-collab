import esbuild from 'esbuild';
import { collectThirdPartyNotices } from './scripts/third-party-notices.mjs';
import { builtinModules } from 'node:module';
import { readFile, writeFile } from 'node:fs/promises';
import compression from './scripts/compressedStaticAssets.js';
import aliases from './scripts/desktopRuntimeAliases.js';
import timers from './scripts/rendererSafeUnref.js';
import terser from './scripts/terserProductionBundle.js';

const production = process.argv.includes('production');
const external = [
  'obsidian', 'electron', '@codemirror/autocomplete', '@codemirror/collab',
  '@codemirror/commands', '@codemirror/language', '@codemirror/lint',
  '@codemirror/search', '@codemirror/state', '@codemirror/view',
  '@lezer/common', '@lezer/highlight', '@lezer/lr', ...builtinModules, 'node:*',
];
const context = await esbuild.context({
  metafile: true, entryPoints: ['src/main.ts'], outfile: 'main.js', bundle: true,
  alias: aliases.createDesktopRuntimeAliases(), external, platform: 'node',
  format: 'cjs', target: 'es2022', charset: 'utf8', treeShaking: true,
  minify: production, sourcemap: production ? false : 'inline',
  loader: { '.wasm': 'binary' },
  plugins: [
    compression.createCompressedStaticAssetsPlugin(),
    ...(production ? [terser.createTerserProductionBundlePlugin(['main.js'])] : []),
    {
      name: 'renderer-timers-and-styles',
      setup(build) {
        build.onEnd(async result => {
          if (result.errors.length) return;
          const patched = timers.patchRendererUnsafeUnrefSites(await readFile('main.js', 'utf8'));
          if (timers.findUnsafeTimerUnrefSites(patched.contents).length) throw new Error('Unsafe renderer timers remain.');
          const notices = await collectThirdPartyNotices(Object.keys(result.metafile.inputs));
          const license = await readFile('LICENSE', 'utf8');
          const noticeText = `Claudian Collab\n${license}\nThird-party notices\n${notices}`.replaceAll('*/', '* /');
          await writeFile('main.js', `/*! ${noticeText}\n*/\n${patched.contents}`);
          await esbuild.build({ entryPoints: ['src/style/index.css'], outfile: 'styles.css', bundle: true, minify: production });
        });
      },
    },
  ],
});
if (production) {
  try { await context.rebuild(); } finally { await context.dispose(); }
} else await context.watch();
