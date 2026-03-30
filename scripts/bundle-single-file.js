#!/usr/bin/env node
// Builds dist/ton-wallet.html — a self-contained single-file wallet
// that works when opened directly from disk (file://).

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const dist = join(import.meta.dirname, '..', 'dist');

// Read built index.html
let html = readFileSync(join(dist, 'index.html'), 'utf-8');

// Remove static favicon link — the app sets it dynamically via JS
// (works reliably with file:// protocol)
html = html.replace(/<link rel="icon"[^>]*\/>/, '');

// Find and inline CSS
const assets = readdirSync(join(dist, 'assets'));
for (const file of assets) {
  if (file.endsWith('.css')) {
    const css = readFileSync(join(dist, 'assets', file), 'utf-8');
    html = html.replace(
      new RegExp(`<link[^>]*href="/assets/${file}"[^>]*>`),
      `<style>\n${css}\n</style>`
    );
  }
}

// Find and inline JS
for (const file of assets) {
  if (file.endsWith('.js')) {
    const js = readFileSync(join(dist, 'assets', file), 'utf-8');
    html = html.replace(
      new RegExp(`<script[^>]*src="/assets/${file}"[^>]*></script>`),
      `<script type="module">\n${js}\n</script>`
    );
  }
}

writeFileSync(join(dist, 'ton-wallet.html'), html);
console.log('Built dist/ton-wallet.html');
