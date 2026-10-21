import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { mediaTools } from '../tools/editor-media.mjs';

const base = process.env.STUDIO_TEST_URL || 'http://127.0.0.1:19488';
const { ffmpeg } = mediaTools(path.resolve('.'));
await fs.mkdir('work', { recursive: true });
const dir = await fs.mkdtemp(path.resolve('work/sequential-export-'));
function run(args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args, { windowsHide: true });
    const chunks = []; let stderr = '';
    child.stdout.on('data', chunk => chunks.push(chunk));
    child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-16000); });
    child.stdin.on('error', () => {});
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(Buffer.concat(chunks)) : reject(Error(stderr || `FFmpeg exited ${code}`)));
    child.stdin.end(input);
  });
}
const colors = [[255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255]];
const raw = Buffer.concat(colors.map(color => {
  const buffer = Buffer.alloc(64 * 36 * 4);
  for (let offset = 0; offset < buffer.length; offset += 4) buffer.set(color, offset);
  return buffer;
}));
const vfrFile = path.join(dir, 'vfr.mkv'), cfrFile = path.join(dir, 'cadence.webm');
const rawInput = ['-v', 'error', '-y', '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', '64x36'];
await run([...rawInput, '-framerate', '10', '-i', 'pipe:0', '-vf', "setpts='if(eq(N,0),0,if(eq(N,1),2,7))'", '-fps_mode', 'passthrough', '-c:v', 'ffv1', '-pix_fmt', 'bgra', vfrFile], raw);
await run([...rawInput, '-framerate', '30', '-i', 'pipe:0', '-c:v', 'libvpx-vp9', '-lossless', '1', '-auto-alt-ref', '0', '-pix_fmt', 'yuva420p', cfrFile], raw);

const cap = await (await fetch(base + '/__editor/capabilities')).json();
const headers = { 'X-Studio-Token': cap.token };
const savedProject = await (await fetch(base + '/__editor/project')).json();
async function imported(file) {
  let asset = await (await fetch(base + '/__editor/import?name=' + encodeURIComponent(path.basename(file)), { method: 'POST', headers, body: await fs.readFile(file) })).json();
  while (asset.status === 'preparing') {
    await new Promise(resolve => setTimeout(resolve, 100));
    asset = await (await fetch(base + '/__editor/asset/' + asset.id)).json();
  }
  assert.equal(asset.status, 'ready', asset.error);
  return asset;
}
const grade = { exposure: 0, contrast: 1, saturation: 1, hue: 0 };
function clip(asset, overrides) {
  return {
    id: crypto.randomUUID(), assetId: asset.id, start: 0, in: 0, out: asset.duration,
    layer: 'above-border', x: 50, y: 50, scale: 100, rotate: 0, opacity: 100,
    cropLeft: 0, cropRight: 0, cropTop: 0, cropBottom: 0,
    fadeIn: 0, fadeOut: 0, transition: 'fade', volume: 0, grade,
    key: { enabled: false, color: '#00ff00', tolerance: .15, softness: .12, spill: .5 },
    ...overrides,
  };
}
async function exported(asset, clips, fps, duration, name) {
  const project = {
    version: 1, assets: [asset], clips, grade, transparent: true,
    output: { width: 192, height: 108, fps, duration, bitrate: 4, codec: 'prores', acceleration: 'cpu' },
  };
  const response = await fetch(base + '/__editor/export', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ project }) });
  const job = await response.json();
  assert.equal(response.status, 202, JSON.stringify(job));
  let result;
  for (let count = 0; count < 600; count++) {
    await new Promise(resolve => setTimeout(resolve, 100));
    result = await (await fetch(base + '/__editor/job/' + job.id)).json();
    if (result.status !== 'rendering') break;
  }
  assert.equal(result.status, 'complete', result.error);
  assert.equal(result.pipeline, 'sequential');
  assert.equal(result.frames, Math.ceil(duration * fps));
  const output = path.join(dir, name + '.mov');
  await fs.writeFile(output, Buffer.from(await (await fetch(base + result.download)).arrayBuffer()));
  const decoded = await run(['-v', 'error', '-i', output, '-pix_fmt', 'rgba', '-f', 'rawvideo', 'pipe:1']);
  assert.equal(decoded.length, result.frames * 192 * 108 * 4);
  return { decoded, result };
}
function expectedPixel(decoded, frame, x, expectedChannel) {
  const offset = ((frame * 108 + 54) * 192 + x) * 4;
  const pixel = [...decoded.subarray(offset, offset + 4)];
  assert.ok(pixel[expectedChannel] > 245 && pixel[3] > 250, `frame ${frame} x=${x} expected channel ${expectedChannel}, got ${pixel}`);
  for (let channel = 0; channel < 3; channel++) if (channel !== expectedChannel) assert.ok(pixel[channel] < 10, `frame ${frame} has unexpected color ${pixel}`);
}

const vfr = await imported(vfrFile);
const overlapping = await exported(vfr, [clip(vfr, { out: .8, x: 25, scale: 50 }), clip(vfr, { in: .2, out: .8, x: 75, scale: 50 })], 10, .6, 'vfr-overlap');
for (let frame = 0; frame < 6; frame++) {
  expectedPixel(overlapping.decoded, frame, 48, frame < 2 ? 0 : 1);
  expectedPixel(overlapping.decoded, frame, 144, frame < 5 ? 1 : 2);
}
console.log('PASS: simultaneous clips from one VFR source retain independent trim times and held frames');

const cfr = await imported(cfrFile);
for (const fps of [30, 60]) {
  const cadence = await exported(cfr, [clip(cfr, { out: .1 })], fps, .1, 'cadence-' + fps);
  for (let frame = 0; frame < fps / 10; frame++) expectedPixel(cadence.decoded, frame, 96, Math.floor(frame * 30 / fps));
  console.log(`PASS: 30 FPS VP9 WebM -> ${fps} FPS export keeps exact ${fps === 30 ? 'RGB' : 'RRGGBB'} cadence`);
}
assert.deepEqual(await (await fetch(base + '/__editor/project')).json(), savedProject, 'headless export must never autosave its render payload over the user project');
console.log('PASS: all export jobs leave the persisted editing project unchanged');
