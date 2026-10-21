import { spawn } from 'node:child_process';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const MAX_PNG_BYTES = 512 * 1024 * 1024;
const MAX_CHUNK_BYTES = 64 * 1024 * 1024;
const TIME_EPSILON = 1e-7;

function aborted(signal) {
  const error = new Error('Video frame decoding was cancelled', { cause: signal?.reason });
  error.name = 'AbortError';
  return error;
}

/** Read presentation timestamps without retaining decoded picture data. */
export async function probeFrameTimes({ ffprobe, file, signal }) {
  if (signal?.aborted) throw aborted(signal);
  const child = spawn(ffprobe, [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'frame=best_effort_timestamp,best_effort_timestamp_time:stream=time_base:format=start_time',
    '-of', 'compact=p=1:nk=0', file,
  ], { windowsHide: true });
  let stderr = '', failure, pending = '', origin, timeBase, missingTimestamps = 0;
  const timestamps = [];
  const onAbort = () => { failure = aborted(signal); child.kill(); child.stdout.destroy(); };
  signal?.addEventListener('abort', onAbort, { once: true });
  child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-16000); });
  child.stderr.on('error', () => {});
  child.stdout.on('error', () => {});
  const closed = new Promise(resolve => {
    child.on('error', error => { failure ||= error; });
    child.once('close', code => resolve(code));
  });
  const parse = line => {
    if (line.startsWith('frame|')) {
      const match = line.match(/(?:^|\|)best_effort_timestamp_time=([^|]+)/);
      const value = match ? Number(match[1]) : NaN;
      const tickMatch = line.match(/(?:^|\|)best_effort_timestamp=([^|]+)/);
      const ticks = tickMatch ? Number(tickMatch[1]) : NaN;
      if (Number.isFinite(value) || Number.isSafeInteger(ticks)) timestamps.push({ value, ticks });
      else missingTimestamps++;
    } else if (line.startsWith('stream|')) {
      const match = line.match(/(?:^|\|)time_base=(\d+)\/(\d+)/);
      if (match && Number(match[1]) > 0 && Number(match[2]) > 0) timeBase = { numerator: Number(match[1]), denominator: Number(match[2]) };
    } else if (line.startsWith('format|')) {
      const match = line.match(/(?:^|\|)start_time=([^|]+)/);
      const value = match ? Number(match[1]) : NaN;
      if (Number.isFinite(value)) origin = value;
    }
  };
  try {
    for await (const chunk of child.stdout) {
      pending += chunk.toString();
      let end;
      while ((end = pending.indexOf('\n')) !== -1) {
        parse(pending.slice(0, end).trim());
        pending = pending.slice(end + 1);
      }
      if (pending.length > 65536) throw Error('Invalid video timestamp output');
    }
    if (pending) parse(pending.trim());
    const code = await closed;
    if (failure) throw failure;
    if (code !== 0) throw Error(stderr || `Video timestamp probe exited ${code}`);
    if (!timestamps.length) throw Error('The video contains no timestamped frames');
    if (missingTimestamps) throw Error('The video contains frames without usable presentation timestamps');
    // The formatted seconds have only six decimal places; integer timestamps
    // avoid choosing the preceding frame at exact 1/30 or 1/60 boundaries.
    const seconds = timestamps.map(({ value, ticks }) => timeBase && Number.isSafeInteger(ticks) ? ticks * timeBase.numerator / timeBase.denominator : value);
    if (seconds.some(time => !Number.isFinite(time))) throw Error('The video contains frames without a usable time base');
    seconds.sort((a, b) => a - b);
    origin ??= seconds[0];
    const normalized = seconds.map(time => Math.max(0, time - origin));
    // WebM commonly stores a nominal 30 FPS timestamp as .033/.067 seconds.
    // Half a source clock tick compensates for that quantization when output
    // sampling lands on the intended boundary. True VFR holds remain intact;
    // this tolerance is capped at half a millisecond, below an output frame.
    Object.defineProperty(normalized, 'timestampTolerance', {
      value: timeBase ? Math.min(.0005, timeBase.numerator / timeBase.denominator / 2) + TIME_EPSILON : TIME_EPSILON,
    });
    return normalized;
  } catch (error) {
    child.kill();
    child.stdout.destroy();
    await closed;
    throw failure || error;
  } finally {
    signal?.removeEventListener('abort', onAbort);
  }
}

// Pulling stdout only as a frame is requested applies pipe backpressure to FFmpeg.
// The reader keeps one transport buffer and one PNG, rather than a video cache.
class PngReader {
  constructor(stream) {
    this.iterator = stream[Symbol.asyncIterator]();
    this.buffer = Buffer.alloc(0);
    this.offset = 0;
  }
  async read(length, allowEnd = false) {
    if (!length) return Buffer.alloc(0);
    const parts = [];
    let remaining = length;
    while (remaining) {
      if (this.offset === this.buffer.length) {
        const next = await this.iterator.next();
        if (next.done) {
          if (allowEnd && remaining === length) return null;
          throw Error('Video decoder ended in the middle of a PNG frame');
        }
        this.buffer = next.value;
        this.offset = 0;
      }
      const count = Math.min(remaining, this.buffer.length - this.offset);
      parts.push(this.buffer.subarray(this.offset, this.offset + count));
      this.offset += count;
      remaining -= count;
    }
    return parts.length === 1 ? parts[0] : Buffer.concat(parts, length);
  }
  async next() {
    const signature = await this.read(8, true);
    if (!signature) return null;
    if (!signature.equals(PNG_SIGNATURE)) throw Error('Video decoder returned an invalid PNG signature');
    const parts = [signature];
    let size = 8, first = true;
    while (true) {
      const header = await this.read(8);
      const length = header.readUInt32BE(0), type = header.toString('ascii', 4, 8);
      if (length > MAX_CHUNK_BYTES || size + length + 12 > MAX_PNG_BYTES) throw Error('Decoded PNG exceeds the frame buffer limit');
      if (first && (type !== 'IHDR' || length !== 13)) throw Error('Decoded PNG has no valid image header');
      first = false;
      const body = await this.read(length + 4);
      parts.push(header, body);
      size += length + 12;
      if (type === 'IEND') {
        if (length !== 0) throw Error('Decoded PNG has an invalid end marker');
        return Buffer.concat(parts, size);
      }
    }
  }
}

/**
 * One sequential, full-resolution RGBA decoder for a monotonically read clip.
 * The requested time uses the media timeline returned by probeFrameTimes().
 * A repeated frame returns the same Buffer. Seeking backwards needs a new decoder.
 */
export function createSequentialDecoder({ ffmpeg, file, codec, times, signal }) {
  if (!Array.isArray(times) || !times.length || times.some((time, index) => !Number.isFinite(time) || time < 0 || (index && time < times[index - 1]))) {
    throw Error('Video frame timestamps must be a nonempty sorted array');
  }
  const timestampTolerance = Number.isFinite(times.timestampTolerance)
    ? Math.max(TIME_EPSILON, Math.min(.0005 + TIME_EPSILON, times.timestampTolerance)) : TIME_EPSILON;
  let child, reader, closed, stderr = '', failure, disposed = false;
  let currentIndex = -1, currentPng, lastTime = -Infinity, sequence = Promise.resolve();
  const stop = () => {
    if (child) {
      child.kill();
      child.stdout.destroy();
    }
  };
  const onAbort = () => { failure = aborted(signal); stop(); };
  if (signal?.aborted) failure = aborted(signal);
  else signal?.addEventListener('abort', onAbort, { once: true });
  const check = () => {
    if (failure) throw failure;
    if (disposed) throw Error('Video frame decoder has been disposed');
  };
  const start = () => {
    check();
    child = spawn(ffmpeg, [
      '-hide_banner', '-loglevel', 'error', '-nostdin',
      ...(codec === 'vp9' ? ['-c:v', 'libvpx-vp9'] : []),
      '-i', file, '-map', '0:v:0', '-an', '-sn', '-dn',
      '-fps_mode', 'passthrough', '-c:v', 'png', '-threads', '1',
      '-pix_fmt', 'rgba', '-compression_level', '1', '-f', 'image2pipe', 'pipe:1',
    ], { windowsHide: true });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-16000); });
    child.stderr.on('error', () => {});
    child.stdout.on('error', () => {});
    closed = new Promise(resolve => {
      child.on('error', error => { failure ||= error; });
      child.once('close', code => resolve(code));
    });
    reader = new PngReader(child.stdout);
  };
  async function nextFrameAt(seconds) {
    check();
    if (!Number.isFinite(seconds)) throw Error('Video frame time must be finite');
    seconds = Math.max(0, seconds);
    if (seconds + TIME_EPSILON < lastTime) throw Error('Sequential video decoding cannot seek backwards; create a new decoder');
    lastTime = seconds;
    let low = 0, high = times.length;
    while (low < high) {
      const middle = (low + high) >>> 1;
      if (times[middle] <= seconds + timestampTolerance) low = middle + 1;
      else high = middle;
    }
    const target = Math.max(0, low - 1);
    if (!child) start();
    try {
      while (currentIndex < target) {
        check();
        const png = await reader.next();
        check();
        if (!png) {
          const code = await closed;
          check();
          throw Error(stderr || `Video decoder ended before frame ${target} (exit ${code})`);
        }
        currentPng = png;
        currentIndex++;
      }
      return { png: currentPng, index: currentIndex };
    } catch (error) {
      failure ||= error;
      stop();
      await closed;
      throw failure;
    }
  }
  return {
    frameAt(seconds) {
      const result = sequence.then(() => nextFrameAt(seconds));
      sequence = result.catch(() => {});
      return result;
    },
    async dispose() {
      disposed = true;
      failure ||= Error('Video frame decoder has been disposed');
      signal?.removeEventListener('abort', onAbort);
      stop();
      if (closed) await closed;
      currentPng = undefined;
    },
  };
}
