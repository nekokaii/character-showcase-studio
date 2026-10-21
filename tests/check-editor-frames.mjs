import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { mediaTools } from '../tools/editor-media.mjs';
import { probeFrameTimes, createSequentialDecoder } from '../tools/editor-frames.mjs';

const { ffmpeg, ffprobe } = mediaTools(path.resolve('.'));
await fs.mkdir('work', { recursive: true });
const dir = await fs.mkdtemp(path.resolve('work/editor-frames-'));
const width = 64, height = 48;
function run(command, args, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true });
    const chunks = []; let stderr = '';
    child.stdout.on('data', chunk => chunks.push(chunk));
    child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-16000); });
    child.stdin.on('error', () => {});
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(Buffer.concat(chunks)) : reject(Error(stderr || `Process exited ${code}`)));
    child.stdin.end(input);
  });
}
const frame = rgba => {
  const buffer = Buffer.alloc(width * height * 4);
  for (let offset = 0; offset < buffer.length; offset += 4) buffer.set(rgba, offset);
  return buffer;
};
const colors = [[255, 0, 0, 0], [0, 255, 0, 128], [0, 0, 255, 255]];
const raw = Buffer.concat(colors.map(frame));
const video = path.join(dir, 'vfr-alpha.mkv');
await run(ffmpeg, [
  '-v', 'error', '-y', '-f', 'rawvideo', '-pixel_format', 'rgba',
  '-video_size', `${width}x${height}`, '-framerate', '10', '-i', 'pipe:0',
  '-vf', "setpts='if(eq(N,0),0,if(eq(N,1),2,7))'", '-fps_mode', 'passthrough',
  '-c:v', 'ffv1', '-level', '3', '-pix_fmt', 'bgra', video,
], raw);
const pixels = png => run(ffmpeg, [
  '-v', 'error', '-f', 'image2pipe', '-c:v', 'png', '-i', 'pipe:0',
  '-frames:v', '1', '-pix_fmt', 'rgba', '-f', 'rawvideo', 'pipe:1',
], png);
const times = await probeFrameTimes({ ffprobe, file: video });
assert.deepEqual(times, [0, .2, .7]);
const decoder = createSequentialDecoder({ ffmpeg, file: video, codec: 'ffv1', times });
try {
  const first = await decoder.frameAt(-1);
  assert.equal(first.index, 0);
  assert.equal(first.png.readUInt32BE(16), width);
  assert.equal(first.png.readUInt32BE(20), height);
  assert.equal(first.png[24], 8, 'PNG retains eight bit channel depth');
  assert.equal(first.png[25], 6, 'PNG retains explicit RGBA channels');
  assert.deepEqual(await pixels(first.png), frame(colors[0]));
  assert.strictEqual((await decoder.frameAt(.199)).png, first.png);
  const second = await decoder.frameAt(.2);
  assert.equal(second.index, 1);
  assert.deepEqual(await pixels(second.png), frame(colors[1]));
  const repeated = await decoder.frameAt(.699);
  assert.strictEqual(repeated.png, second.png);
  const final = await decoder.frameAt(.7);
  assert.equal(final.index, 2);
  assert.deepEqual(await pixels(final.png), frame(colors[2]));
  assert.strictEqual((await decoder.frameAt(500)).png, final.png);
  await assert.rejects(decoder.frameAt(.2), /cannot seek backwards/);
} finally { await decoder.dispose(); }
await assert.rejects(decoder.frameAt(501), /disposed/);
await decoder.dispose();

const concurrent = createSequentialDecoder({ ffmpeg, file: video, times });
try {
  const frames = await Promise.all([concurrent.frameAt(0), concurrent.frameAt(.2), concurrent.frameAt(.7)]);
  assert.deepEqual(frames.map(result => result.index), [0, 1, 2]);
} finally { await concurrent.dispose(); }

// An incompressible PNG spans many OS pipe reads and exercises chunk boundaries.
const noisyFile = path.join(dir, 'noise.mkv'), noisy = Buffer.alloc(320 * 240 * 4);
let seed = 123456789;
for (let index = 0; index < noisy.length; index++) {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  noisy[index] = seed & 255;
}
await run(ffmpeg, ['-v', 'error', '-y', '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', '320x240', '-framerate', '1', '-i', 'pipe:0', '-c:v', 'ffv1', '-pix_fmt', 'bgra', noisyFile], noisy);
const noisyDecoder = createSequentialDecoder({ ffmpeg, file: noisyFile, times: [0] });
try {
  const result = await noisyDecoder.frameAt(0);
  assert.ok(result.png.length > 65536);
  assert.deepEqual(await pixels(result.png), noisy);
} finally { await noisyDecoder.dispose(); }

const delayed = path.join(dir, 'delayed.mkv');
await run(ffmpeg, [
  '-v', 'error', '-y', '-f', 'rawvideo', '-pixel_format', 'rgba',
  '-video_size', `${width}x${height}`, '-framerate', '10', '-i', 'pipe:0',
  '-f', 'lavfi', '-i', 'anullsrc=r=8000:cl=mono:d=2',
  '-vf', 'setpts=PTS+1/TB', '-fps_mode', 'passthrough',
  '-c:v', 'ffv1', '-pix_fmt', 'bgra', '-c:a', 'pcm_s16le', delayed,
], raw);
assert.deepEqual(await probeFrameTimes({ ffprobe, file: delayed }), [1, 1.1, 1.2], 'container audio timeline preserves the delayed video start');

const vp9 = path.join(dir, 'alpha.webm');
await run(ffmpeg, [
  '-v', 'error', '-y', '-f', 'rawvideo', '-pixel_format', 'rgba',
  '-video_size', `${width}x${height}`, '-framerate', '10', '-i', 'pipe:0',
  '-c:v', 'libvpx-vp9', '-lossless', '1', '-auto-alt-ref', '0', '-pix_fmt', 'yuva420p', vp9,
], raw);
const vp9Reference = await run(ffmpeg, ['-v', 'error', '-c:v', 'libvpx-vp9', '-i', vp9, '-pix_fmt', 'rgba', '-f', 'rawvideo', 'pipe:1']);
const alphaDecoder = createSequentialDecoder({ ffmpeg, file: vp9, codec: 'vp9', times: await probeFrameTimes({ ffprobe, file: vp9 }) });
try {
  for (let index = 0; index < 3; index++) {
    const result = await alphaDecoder.frameAt(index / 10), decoded = await pixels(result.png);
    assert.equal(result.index, index);
    assert.deepEqual(decoded, vp9Reference.subarray(index * width * height * 4, (index + 1) * width * height * 4), 'PNG transfer exactly preserves source decoder output');
    for (let offset = 3; offset < decoded.length; offset += 4) assert.ok(Math.abs(decoded[offset] - colors[index][3]) <= 1);
    const expectedChannel = index;
    assert.ok(decoded[expectedChannel] >= 250, `VP9 decoded frame ${index} retains its color`);
  }
} finally { await alphaDecoder.dispose(); }

const cadenceFile = path.join(dir, 'cadence.webm');
await run(ffmpeg, ['-v', 'error', '-y', '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', `${width}x${height}`, '-framerate', '30', '-i', 'pipe:0', '-c:v', 'libvpx-vp9', '-lossless', '1', '-auto-alt-ref', '0', '-pix_fmt', 'yuva420p', cadenceFile], raw);
const cadenceTimes = await probeFrameTimes({ ffprobe, file: cadenceFile });
assert.deepEqual(cadenceTimes, [0, .033, .067]);
assert.ok(cadenceTimes.timestampTolerance > .0005 && cadenceTimes.timestampTolerance < .000501);
for (const fps of [30, 60]) {
  const cadence = createSequentialDecoder({ ffmpeg, file: cadenceFile, codec: 'vp9', times: cadenceTimes });
  try {
    for (let index = 0; index < fps / 10; index++) assert.equal((await cadence.frameAt(index / fps)).index, Math.floor(index * 30 / fps), `30 FPS WebM cadence at output ${fps} frame ${index}`);
  } finally { await cadence.dispose(); }
}
const preciseFile = path.join(dir, 'precise.nut');
await run(ffmpeg, ['-v', 'error', '-y', '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', `${width}x${height}`, '-framerate', '30', '-i', 'pipe:0', '-c:v', 'ffv1', '-pix_fmt', 'bgra', preciseFile], raw);
const preciseTimes = await probeFrameTimes({ ffprobe, file: preciseFile });
assert.deepEqual(preciseTimes, [0, 1 / 30, 2 / 30], 'integer time-base ticks avoid six-decimal timestamp rounding');

const abortProbe = new AbortController(); abortProbe.abort();
await assert.rejects(probeFrameTimes({ ffprobe, file: video, signal: abortProbe.signal }), { name: 'AbortError' });
const abortedDecoder = createSequentialDecoder({ ffmpeg, file: video, times, signal: abortProbe.signal });
await assert.rejects(abortedDecoder.frameAt(0), { name: 'AbortError' });
await abortedDecoder.dispose();
const abortDuringRead = new AbortController();
const cancelled = createSequentialDecoder({ ffmpeg, file: video, times, signal: abortDuringRead.signal });
const pendingCancelled = cancelled.frameAt(.7);
await new Promise(resolve => setTimeout(resolve, 1));
abortDuringRead.abort();
await assert.rejects(pendingCancelled, { name: 'AbortError' });
await cancelled.dispose();

const disposing = createSequentialDecoder({ ffmpeg, file: video, times });
const pendingDispose = disposing.frameAt(.7);
await new Promise(resolve => setTimeout(resolve, 1));
await disposing.dispose();
await assert.rejects(pendingDispose, /disposed/);
const missing = createSequentialDecoder({ ffmpeg, file: path.join(dir, 'missing'), times });
await assert.rejects(missing.frameAt(0), /No such file|not found|Error opening|Cannot open/i);
await missing.dispose();
const absentBinary = createSequentialDecoder({ ffmpeg: path.join(dir, 'missing-ffmpeg.exe'), file: video, times });
await assert.rejects(absentBinary.frameAt(0), /ENOENT/);
await absentBinary.dispose();
assert.throws(() => createSequentialDecoder({ ffmpeg, file: video, times: [.2, .1] }), /sorted/);

console.log('PASS: exact full-size RGBA pixels, VFR floor selection, delayed video start, repeated frame reuse, queued requests, VP9 transparent/semitransparent alpha, disposal, cancellation and process errors');
