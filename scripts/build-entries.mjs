/**
 * Build background and content scripts as IIFE.
 * Used by both Chrome (MV3) and Compat (MV2) builds.
 *
 * Why IIFE: Chrome injects content scripts as classic scripts (no ESM imports).
 * Service workers can use ESM with "type": "module" but IIFE avoids compatibility issues.
 */
import * as esbuild from 'esbuild';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const mode = process.argv[2] || 'chrome';
const outDir = resolve(root, 'dist', mode);
const target = mode === 'compat' ? 'chrome86' : 'chrome91';

const common = {
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target,
  minify: false,
  sourcemap: false,
  define: {
    'process.env.NODE_ENV': JSON.stringify(mode === 'compat' ? 'compat' : 'production'),
  },
  alias: {
    '@': resolve(root, 'src'),
    shared: resolve(root, 'src/shared'),
  },
};

async function build() {
  console.log(`Building entries for ${mode} (target: ${target})...`);

  // Background service worker / event page
  await esbuild.build({
    ...common,
    entryPoints: [resolve(root, 'src/background/index.ts')],
    outfile: resolve(outDir, 'background.js'),
  });
  console.log('  background.js');

  // 1688 content script
  await esbuild.build({
    ...common,
    entryPoints: [resolve(root, 'src/content/1688-sidebar.ts')],
    outfile: resolve(outDir, 'content/1688.js'),
  });
  console.log('  content/1688.js');

  // Shopee content script
  await esbuild.build({
    ...common,
    entryPoints: [resolve(root, 'src/content/shopee-sidebar.ts')],
    outfile: resolve(outDir, 'content/shopee.js'),
  });
  console.log('  content/shopee.js');

  console.log(`Entries built for ${mode}!`);
}

build().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
