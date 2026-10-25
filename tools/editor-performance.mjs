import os from 'node:os';

// Budget the whole pipeline, including Chromium surfaces and in-flight RGBA/PNG
// buffers. A high core count must not imply an unbounded frame or browser queue.
export function exportPerformance(output,{cpus=os.availableParallelism?.()||os.cpus().length,freeMemory=os.freemem(),env=process.env,totalFrames=Math.ceil(output.fps*output.duration)}={}){
 const pixels=output.width*output.height;
 const perWorker=192*1024**2+pixels*96;
 const memoryLimit=Math.max(1,Math.floor(freeMemory*.45/perWorker));
 const override=Number(env.STUDIO_EXPORT_WORKERS);
 const requested=Number.isInteger(override)&&override>0?override:Number(output.workers)||Math.max(1,Math.min(8,Math.floor(cpus/4)));
 const aggressive=requested>8;
 // More workers must not multiply high-resolution GPU surfaces past the
 // tested budget: 24 x 1080p fits, while 4K retains its eight-surface ceiling.
 const surfaceLimit=Math.max(1,Math.floor(64*1024**2/pixels));
 const limit=Math.min(24,memoryLimit,surfaceLimit,totalFrames);
 const workers=Math.max(1,Math.min(limit,requested));
 // Source decoders are shared, not multiplied by the compositor count. Keep
 // their PNG compression parallel even when many compositor surfaces are open.
 const sourceThreads=Math.max(1,Math.min(aggressive?8:4,Math.floor(cpus/(aggressive?3:Math.max(2,Math.min(workers,8))))));
 const browsers=Math.max(1,Math.min(workers,8,Math.trunc(Number(env.STUDIO_EXPORT_BROWSERS))||Math.ceil(workers/2)));
 return {workers,browsers,sourceThreads,pngThreads:sourceThreads,inputThreads:Math.max(1,Math.min(aggressive?8:4,cpus)),cpuThreads:cpus,memoryLimited:requested>memoryLimit};
}
