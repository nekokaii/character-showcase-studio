/** Dependency-free build. Every input is inside this folder. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (directory, name) => fs.readFile(path.join(root, directory, name), 'utf8');
const inlineScript = source => source.replace(/<\/script/gi, '<\\/script');
const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const replaceRequired = (text, marker, replacement) => {
  if (!text.includes(marker)) throw new Error(`Missing source marker: ${marker}`);
  // Library/source text may contain $&, $' or $`; a replacement callback keeps
  // those bytes literal instead of treating them as String.replace directives.
  return text.replace(marker, () => replacement);
};

let scene = `${await read('src', 'urban-language-scene.js')}\n${await read('src', 'design-language-scene.js')}\n${await read('src', 'dual-language-scene.js')}\n${await read('src', 'exploration-full-scene.js')}`;
scene = replaceRequired(scene, '/* LEGACY_SERIES_GEOMETRY */', await read('src', 'studio-geometry.js'));
let script = await read('src', 'exploration-full-logic.js');
script = replaceRequired(script, '/* SCENE_FUNCTION */', scene);
script = replaceRequired(script, '/* MOTION_FUNCTIONS */', await read('src', 'motion-clock.js'));
script = replaceRequired(script, '/* TIMELINE_FUNCTIONS */', `${await read('runtime', 'crt-motion.js')}\n${await read('src', 'timeline.js')}`);
script = replaceRequired(script, '/* INFORMATION_MOTION */', await read('src', 'information-motion.js'));
script = replaceRequired(script, '/* VARIANT_CODEC */', await read('src', 'variant-codec.js'));
script = replaceRequired(script, '/* STUDIO_TEXT */', await read('src', 'studio-text.js'));
script = replaceRequired(script, '/* STUDIO_WORKSPACE */', `${await read('src', 'studio-editor-core.js')}\n${await read('src', 'studio-editor-key.js')}\n${await read('src', 'studio-editor-transform.js')}\n${await read('src', 'studio-editor.js')}\n${await read('src', 'studio-workspace.js')}`);
script = replaceRequired(script, '/* STUDIO_NARRATIVE */', `${await read('src', 'story-intro.js')}\n${await read('src', 'studio-post.js')}\n${await read('src', 'studio-narrative.js')}`);
script = replaceRequired(script, '/* STUDIO_OUTPUT */', `${await read('src', 'export-layout.js')}\n${await read('src', 'ae-canvas-recorder.js')}\n${await read('src', 'ae-geometry-motion.js')}\n${await read('src', 'ae-export.js')}\n${await read('src', 'studio-output.js')}`);
script = replaceRequired(script, '/* OBS_LAYER_SYNC */', await read('src', 'obs-layer-sync.js'));
script = replaceRequired(script, '/* BADGE_ASSETS */{}', await read('src', 'badge-assets.json'));
let fragment = await read('src', 'exploration-full-template.html');
fragment = replaceRequired(fragment, '/* DESIGN_LANGUAGE_STYLES */', await read('src', 'design-language-styles.css'));
fragment = replaceRequired(fragment, '/* URBAN_LANGUAGE_STYLES */', await read('src', 'urban-language-styles.css'));
fragment = replaceRequired(fragment, '/* DUAL_LANGUAGE_STYLES */', await read('src', 'dual-language-styles.css'));
fragment = replaceRequired(fragment, '/* STUDIO_WORKSPACE_STYLES */', `${await read('src', 'studio-workspace.css')}\n${await read('src', 'studio-editor.css')}`);
fragment = replaceRequired(fragment, '/* STUDIO_OUTPUT_STYLES */', `${await read('src', 'studio-output.css')}\n${await read('src', 'obs-layers.css')}`);
fragment = replaceRequired(fragment, '/* STUDIO_NARRATIVE_STYLES */', `${await read('src', 'studio-narrative.css')}\n${await read('src', 'story-intro.css')}\n${await read('src', 'studio-post.css')}\n${await read('src', 'studio-text.css')}`);
fragment = replaceRequired(fragment, '<!-- DUAL_LANGUAGE_MARKUP -->', await read('src', 'dual-language-markup.html'));
const fontLicense = (await read('assets/fonts', 'chill-round-OFL.txt')).replace(/[ \t]+$/gm, '');
let fontCss = `${await read('assets/fonts', 'fonts.css')}\n/* ${fontLicense} */\n${await read('assets/fonts', 'rounded-cn.css')}`;
fontCss = await (async () => {
  const paths = [...new Set([...fontCss.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)].map(match => match[1]))];
  for (const file of paths) {
    if (/^(data:|https?:)/.test(file)) throw new Error('Font CSS must reference bundled files only.');
    const bytes = await fs.readFile(path.join(root, 'assets/fonts', file));
    fontCss = fontCss.split(file).join(`data:font/woff2;base64,${bytes.toString('base64')}`);
  }
  return fontCss;
})();
fragment = fragment.replace(/@import\s+url\(['"]https:\/\/fonts\.googleapis\.com[^;]+;/, () => fontCss);
fragment = fragment.replaceAll("'Noto Sans SC'", "'Microsoft YaHei UI','Microsoft YaHei','PingFang SC'");
const vendor = `${await read('src', 'barcode-code128.min.js')}\n${await read('src', 'qrcode-generator.js')}`;
const notices = (await read('src/badge-assets', 'SOURCE-NOTICES.txt')).replaceAll('-->', '-- >');
fragment = replaceRequired(fragment, '<!-- EXPLORATION_SCRIPTS -->',
  `<!-- Badge source notices\n${notices}\n-->\n<script>\n${inlineScript(vendor)}\n</script>\n<script>\n${inlineScript(script)}\n</script>`);
const ids = [...fragment.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
if (ids.length !== new Set(ids).size) throw new Error('Duplicate IDs in generated fragment.');
if (/<(?:html|head|body|!doctype)\b/i.test(fragment)) throw new Error('Source fragment contains document markup.');
if (/\/\* (SCENE_FUNCTION|LEGACY_SERIES_GEOMETRY|MOTION_FUNCTIONS|TIMELINE_FUNCTIONS|INFORMATION_MOTION|STUDIO_WORKSPACE|STUDIO_WORKSPACE_STYLES|STUDIO_OUTPUT|STUDIO_OUTPUT_STYLES) \*\//.test(fragment)) throw new Error('Unreplaced source marker.');

let kit = await read('runtime', 'visualize.html');
kit = replaceRequired(kit, '<script src="https://unpkg.com/@floating-ui/core@1.7.3/dist/floating-ui.core.umd.min.js"></script>', `<script>${inlineScript(await read('vendor', 'floating-ui-core.min.js'))}</script>`);
kit = replaceRequired(kit, '<script src="https://unpkg.com/@floating-ui/dom@1.7.4/dist/floating-ui.dom.umd.min.js"></script>', `<script>${inlineScript(await read('vendor', 'floating-ui-dom.min.js'))}</script>`);
kit = replaceRequired(kit, '<script id="codex-visualization-lucide" async src="https://unpkg.com/lucide@1.17.0/dist/umd/lucide.js"></script>', `<script id="codex-visualization-lucide">${inlineScript(await read('vendor', 'lucide.js'))}</script>`);
kit = replaceRequired(kit, '<!--__INLINE_VISUALIZATION_FRAGMENT__-->', fragment);
if (/<script\b[^>]*\bsrc\s*=/i.test(kit) || /@import\b/i.test(fragment)) throw new Error('A runtime network dependency remains.');
const stylesheet = await read('runtime', 'visualize.css');
const bridge = inlineScript(await read('runtime', 'standalone-host-bridge.js'));
const shell = inlineScript(await read('runtime', 'standalone-shell.js'));
// Published starting point is data only, never imported markup or scripts.
const startupDefaults = JSON.parse(await read('runtime', 'startup-defaults.json'));
if (typeof startupDefaults.revision !== 'string' || !startupDefaults.widgetState?.privateContent || Buffer.byteLength(JSON.stringify(startupDefaults.widgetState)) > 16384) throw new Error('Invalid startup defaults.');
const startupJson = JSON.stringify(startupDefaults).replaceAll('<', '\\u003c');
let exportPackages = await read('runtime', 'export-packages.js');
exportPackages = replaceRequired(exportPackages, '__STUDIO_AE_TEMPLATE__', JSON.stringify(replaceRequired(await read('runtime', 'ae-import-template.jsx'), '/* CRT_MOTION_FUNCTION */', await read('runtime', 'crt-motion.js'))));
exportPackages = replaceRequired(exportPackages, '__STUDIO_ASSET_NOTICES__', JSON.stringify(notices));
exportPackages = replaceRequired(exportPackages, '__STUDIO_OBS_LAYER_SERVER__', JSON.stringify(await read('runtime', 'obs-layer-server.mjs')));
exportPackages = replaceRequired(exportPackages, '__STUDIO_OBS_LAYER_CONTROL__', JSON.stringify(await read('runtime', 'obs-layer-control.html')));
const outputHost = inlineScript(`${await read('runtime', 'export-zip.js')}\n${exportPackages}\n${await read('runtime', 'obs-layer-host.js')}\n${await read('runtime', 'studio-output-host.js')}\n${await read('runtime', 'editor-host.js')}`);
// The original sandbox and CSP policies are retained. The generated page embeds
// all required scripts, styles, icons and bundled fonts, so they need no connection.
const sources = 'blob: data: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://esm.sh https://fonts.bunny.net https://fonts.googleapis.com https://fonts.gstatic.com https://unpkg.com';
const frameCsp = ["default-src 'none'", `script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' ${sources}`, `style-src 'unsafe-inline' ${sources}`, `img-src ${sources} http://127.0.0.1:*`, `font-src ${sources}`, `media-src ${sources} http://127.0.0.1:*`, 'worker-src blob:', 'connect-src blob: data:', "frame-src 'none'", "object-src 'none'", "base-uri 'none'", "form-action 'none'"].join('; ');
const shellCsp = frameCsp.replace("frame-src 'none'", "frame-src 'self'").replace("connect-src blob: data:", "connect-src 'self' blob: data:");
const title = '角色展示设计工作台 · Character Showcase Studio';
const frameHtml = `<!doctype html>
<html lang="zh-CN" data-visualize-standalone>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="${frameCsp}"><title>${title}</title><style>${stylesheet}\nhtml>body{padding:0}</style></head>
<body><script type="application/json" id="codex-visualization-widget-state">__CODEX_VISUALIZATION_WIDGET_STATE__</script><script>${bridge}</script>${kit}</body></html>`;
const document = `<!doctype html>
<html lang="zh-CN" data-visualize-standalone>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="${shellCsp}"><title>${title}</title><style>:root{color-scheme:light;background:#edf0e9}html,body{margin:0;height:100%;overflow:hidden}body{box-sizing:border-box;background:inherit}iframe{display:block;width:100%;height:100dvh;margin:0 auto;border:0}</style></head>
<body><script type="application/json" id="studio-startup-defaults">${startupJson}</script><iframe id="codex-visualization" sandbox="allow-scripts" referrerpolicy="no-referrer" title="${title}" data-srcdoc="${escape(frameHtml)}"></iframe><script>${outputHost}</script><script>${shell}</script></body></html>\n`;
await fs.mkdir(path.join(root, 'dist'), { recursive: true });
await fs.writeFile(path.join(root, 'index.html'), document);
await fs.writeFile(path.join(root, 'dist', 'index.html'), document);
await fs.writeFile(path.join(root, 'dist', 'character-explorations.fragment.html'), fragment);
await fs.writeFile(path.join(root, 'dist', 'exploration-full-source.js'), script);
const count = [...fragment.matchAll(/<section\b[^>]*\bdata-variant=/g)].length;
console.log(`Built ${count} design variants. index.html: ${Buffer.byteLength(document).toLocaleString()} bytes.`);
