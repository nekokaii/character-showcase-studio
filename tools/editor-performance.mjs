import os from 'node:os';

// Budget the whole pipeline, including Chromium surfaces and in-flight RGBA/PNG
// buffers. A high core count must not imply an unbounded frame or browser queue.
export function exportPerformance(output,{cpus=os.availableParallelism?.()||os.cpus().length,freeMemory=os.freemem(),env=process.env,totalFrames=Math.ceil(output.fps*output.duration)}={}){
 const pixels=output.width*output.height;
 const perWorker=192*1024**2+pixels*96;
 const memoryLimit=Math.max(1,Math.floor(freeMemory*.45/perWorker));
 const surfaceLimit=Math.max(1,Math.floor(64*1024**2/pixels));
 const limit=Math.min(8,memoryLimit,surfaceLimit,totalFrames);
 const override=Number(env.STUDIO_EXPORT_WORKERS);
 const requested=Number.isInteger(override)&&override>0?override:Number(output.workers)||Math.max(1,Math.floor(cpus/4));
 const workers=Math.max(1,Math.min(limit,requested));
 const sourceThreads=Math.max(1,Math.min(4,Math.floor(cpus/Math.max(2,workers))));
 const browsers=Math.max(1,Math.min(workers,4,Math.trunc(Number(env.STUDIO_EXPORT_BROWSERS))||Math.ceil(workers/2)));
 return {workers,browsers,sourceThreads,pngThreads:sourceThreads,inputThreads:Math.max(1,Math.min(4,cpus)),cpuThreads:cpus,memoryLimited:requested>memoryLimit};
}
