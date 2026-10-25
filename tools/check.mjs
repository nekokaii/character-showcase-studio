import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFile(path.join(root, file), 'utf8');
new vm.Script(await read('dist/exploration-full-source.js'), { filename: 'exploration-full-source.js' });
for (const file of ['tools/build.mjs', 'tools/server.mjs', 'tools/sync-source.mjs']) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'inherit' });
  assert.equal(result.status, 0, `${file} syntax check failed`);
}
const document = await read('index.html');
const fragment = await read('dist/character-explorations.fragment.html');
// Parse every actual executable script after both HTML serialization layers.
// This catches corrupted vendor payloads even if the separate source file parses.
const decode = value => value.replace(/&quot;/g, '"').replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
const frameMatch = document.match(/\bdata-srcdoc="([^"]*)"/);
assert.ok(frameMatch, 'serialized sandbox frame exists');
const frame = decode(frameMatch[1]);
let executableScripts = 0;
for (const [name, markup] of [['shell', document], ['frame', frame]]) {
  for (const [index, match] of [...markup.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)].entries()) {
    if (/\btype\s*=\s*["']application\/json["']/i.test(match[1])) continue;
    new vm.Script(match[2], { filename: `${name}-embedded-${index}.js` });
    executableScripts++;
  }
}
assert.ok(executableScripts >= 9, 'all embedded executable scripts were inspected');
assert.ok(document.includes('sandbox="allow-scripts"'), 'sandbox retained');
assert.ok(document.includes('Content-Security-Policy'), 'CSP retained');
assert.equal([...fragment.matchAll(/<section\b[^>]*\bdata-variant=/g)].length, 13, 'all 13 designs included');
assert.ok(!/<script\b[^>]*\bsrc\s*=/i.test(document), 'runtime is embedded');
assert.ok(!/@import\b/i.test(fragment), 'fonts do not need the network');
assert.ok(!/C:[/\\]Users[/\\]|\.codex[/\\]/i.test(document), 'built page has no machine-specific path');
for (const name of ['check-motion.cjs', 'check-information-motion.cjs', 'check-narrative.cjs', 'check-story-intro.cjs', 'check-typography.cjs', 'check-rounded-font.mjs', 'check-ending-visual-reset.mjs', 'check-workspace-layout.mjs', 'check-post-processing.cjs', 'check-motion-state.cjs', 'check-variant-codec.cjs', 'check-urban-designs.cjs', 'check-output.cjs', 'check-export-packages.cjs', 'check-obs-layer-clock.cjs', 'check-obs-layers.cjs', 'check-obs-sync-server.cjs', 'check-ae-postprocessing.cjs', 'check-resolution.cjs', 'check-ae-geometry-motion.cjs', 'check-ae-transitions.cjs']) {
  const result = spawnSync(process.execPath, [path.join(root, 'tests', name)], { stdio: 'inherit' });
  assert.equal(result.status, 0, `${name} failed`);
}
console.log(`PASS: ${executableScripts} embedded scripts parse; 13 designs, retained sandbox/CSP, embedded runtime/fonts, and motion/state regressions.`);
