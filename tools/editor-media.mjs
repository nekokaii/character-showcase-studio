import fs from 'node:fs/promises';
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import { chromium } from 'playwright-core';
import { probeFrameTimes, createSequentialDecoder } from './editor-frames.mjs';
import { pngAviHeader, pngAviPacket, validateCapturePNG } from './editor-png.mjs';
import { exportPerformance } from './editor-performance.mjs';

const idPattern=/^[a-f0-9-]{36}$/;
const jobs=new Map(), assets=new Map();
const token=crypto.randomUUID();
let exporting=false;
export function runProcess(command,args,{signal}={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{windowsHide:true,signal});let out='',err='';
    child.stdout.on('data',data=>out+=data);child.stderr.on('data',data=>err=(err+data).slice(-16000));
    child.on('error',reject);child.on('close',code=>code===0?resolve(out):reject(new Error(err||`Process exited ${code}`)));
  });
}
export function mediaTools(root){
  const binary=name=>process.env[name.toUpperCase()+'_PATH']|| (existsSync(path.join(root,'tools/ffmpeg/bin',name+'.exe'))?path.join(root,'tools/ffmpeg/bin',name+'.exe'):name);
  return {ffmpeg:binary('ffmpeg'),ffprobe:binary('ffprobe')};
}
export function validateOutput(raw={}){
  const num=(key,min,max,integer=false)=>{const v=Number(raw[key]);if(!Number.isFinite(v)||v<min||v>max||(integer&&!Number.isInteger(v)))throw Error(`无效的输出参数：${key}`);return v;};
  const result={width:num('width',64,7680,true),height:num('height',64,7680,true),fps:num('fps',1,60,true),duration:num('duration',.1,3600),bitrate:num('bitrate',.1,250),codec:raw.codec,acceleration:raw.acceleration||'auto'};
  if(!['h264','h265','av1','vp9','prores'].includes(result.codec))throw Error('不支持的编码器');
  if(!['auto','cpu','nvenc','qsv','amf'].includes(result.acceleration))throw Error('不支持的编码设备');
  if(raw.workers!==undefined&&![0,1,2,4,8,12,16,24].includes(raw.workers))throw Error('无效的导出并行度');
  result.workers=raw.workers||0;
  if(['vp9','prores'].includes(result.codec)&&!['auto','cpu'].includes(result.acceleration))throw Error('透明 VP9 / ProRes 请使用自动或 CPU 编码');
  if(result.codec!=='prores'&&(result.width%2||result.height%2))throw Error('此编码器的宽高需要为偶数');
  return result;
}
export function encoderArgs(o){
  const rate=['-b:v',`${o.bitrate}M`];
  if(['nvenc','qsv','amf'].includes(o.acceleration)&&['h264','h265','av1'].includes(o.codec)){const name=(o.codec==='h265'?'hevc':o.codec)+'_'+o.acceleration;return ['-c:v',name,...(o.acceleration==='nvenc'?['-preset','p4','-tune','hq','-rc','vbr']:o.acceleration==='qsv'?['-preset','fast']:['-quality','speed']),'-pix_fmt',o.acceleration==='nvenc'?'yuv420p':'nv12',...rate,'-movflags','+faststart',...(o.codec==='h265'?['-tag:v','hvc1']:[])];}
  return o.codec==='prores'?['-c:v','prores_ks','-profile:v','4','-pix_fmt','yuva444p10le','-alpha_bits','16']:o.codec==='vp9'?['-c:v','libvpx-vp9','-pix_fmt','yuva420p','-auto-alt-ref','0','-row-mt','1',...rate]:o.codec==='av1'?['-c:v','libaom-av1','-cpu-used','6','-row-mt','1','-pix_fmt','yuv420p',...rate]:['-c:v',o.codec==='h265'?'libx265':'libx264','-preset','fast','-pix_fmt','yuv420p',...rate,'-movflags','+faststart',...(o.codec==='h265'?['-tag:v','hvc1']:[])];
}
export async function detectHardwareEncoders(ffmpeg){
  const result={h264:[],h265:[],av1:[]};
  const compiled=await runProcess(ffmpeg,['-hide_banner','-encoders']);
  for(const codec of Object.keys(result))for(const acceleration of ['nvenc','qsv','amf']){
    const name=(codec==='h265'?'hevc':codec)+'_'+acceleration;if(!compiled.includes(name))continue;
    try{await runProcess(ffmpeg,['-hide_banner','-loglevel','error','-f','lavfi','-i','color=s=1920x1080:r=30:d=0.1','-frames:v','1',...encoderArgs({codec,acceleration,bitrate:4}),'-f','null','-']);result[codec].push(acceleration);}catch{}
  }
  return result;
}
const encodingLabels={cpu:'CPU 软件编码',nvenc:'NVIDIA NVENC',qsv:'Intel QSV',amf:'AMD AMF'};
export function validateProject(p){
  if(p?.version!==1||!Array.isArray(p.assets)||!Array.isArray(p.clips)||p.clips.length>300||p.assets.length>300)throw Error('剪辑工程格式无效');
  if(p.template!==undefined){
    const t=p.template,keys=['qr','barcode','logo','model','portrait','introCharacter','introAuthor'];
    if(t?.version!==1||t.design?.design!=='character-explorations'||t.design.version!==6)throw Error('展示模板配置格式无效');
    for(const field of ['images','imageNames'])if(t[field]!==undefined){
      if(!t[field]||typeof t[field]!=='object'||Array.isArray(t[field]))throw Error('展示模板图片格式无效');
      for(const [key,value]of Object.entries(t[field]))if(!keys.includes(key)||typeof value!=='string'||(field==='images'?(value.length>16*1024*1024+128||(value!==''&&!/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=\r\n]+$/i.test(value))):value.length>512))throw Error('展示模板图片或文件名无效');
    }
  }
  validateOutput(p.output);if(p.output.durationMode!==undefined&&!['auto','custom'].includes(p.output.durationMode))throw Error('时长模式无效');if(p.designSync!==undefined&&typeof p.designSync!=='boolean')throw Error('同步预览设置无效');
  const grade=g=>{for(const [key,min,max]of [['exposure',-3,3],['contrast',0,3],['saturation',0,3],['hue',-180,180]])if(!Number.isFinite(g?.[key])||g[key]<min||g[key]>max)throw Error('调色参数无效');};grade(p.grade);
  const ids=new Set();for(const a of p.assets){if(!idPattern.test(a.id)||ids.has(a.id))throw Error('素材编号无效');ids.add(a.id);}
  const tracks=new Map(),visualLayers=['above-border','under-border','above-text','under-text'],canonical=layer=>layer==='under-post'?'above-text':['under-intro-text','under-show-text'].includes(layer)?'under-text':layer;
  if(p.videoTracks!==undefined){if(!Array.isArray(p.videoTracks)||p.videoTracks.length>64)throw Error('自定义视频轨道数量无效');for(const t of p.videoTracks){if(!t||!idPattern.test(t.id)||tracks.has(t.id)||!visualLayers.includes(t.layer)||typeof t.name!=='string'||!t.name.trim()||t.name.length>60)throw Error('自定义视频轨道无效');tracks.set(t.id,t);}}
  const clips=new Set();for(const c of p.clips){
    if(c.trackId!==undefined&&(!tracks.has(c.trackId)||tracks.get(c.trackId).layer!==canonical(c.layer)))throw Error('片段所属视频轨道无效');
    if(!idPattern.test(c.id)||clips.has(c.id)||!ids.has(c.assetId)||!['above-border','under-border','under-post','under-intro-text','under-show-text','under-text','above-text','audio-1','audio-2'].includes(c.layer))throw Error('片段编号或层级无效');clips.add(c.id);
    if((p.assets.find(a=>a.id===c.assetId).kind==='audio')!==c.layer.startsWith('audio-'))throw Error('音频素材请放入音轨，视频和图片请放入画面轨道');
    for(const [key,min,max]of [['start',0,3600],['in',0,86400],['out',.001,86400],['x',-100,200],['y',-100,200],['scale',-800,800],['rotate',-360,360],['opacity',0,100],['cropLeft',0,49],['cropRight',0,49],['cropTop',0,49],['cropBottom',0,49],['fadeIn',0,3600],['fadeOut',0,3600],['volume',0,2]])if(!Number.isFinite(c[key])||c[key]<min||c[key]>max)throw Error('片段参数无效：'+key);
    if(c.flipY!==undefined&&typeof c.flipY!=='boolean')throw Error('上下翻转参数无效');
    for(const key of ['audioFadeIn','audioFadeOut'])if(c[key]!==undefined&&(!Number.isFinite(c[key])||c[key]<0||c[key]>3600))throw Error('声音淡入淡出无效');
    if(c.keyframes!==undefined){if(!c.keyframes||typeof c.keyframes!=='object'||Array.isArray(c.keyframes))throw Error('关键帧格式无效');for(const [key,frames]of Object.entries(c.keyframes)){const bounds={x:[-100,200],y:[-100,200],scale:[-800,800],rotate:[-360,360],opacity:[0,100]}[key];if(!bounds||!Array.isArray(frames)||frames.length>500)throw Error('关键帧属性或数量无效');let last=-1;for(const f of frames){if(!Number.isFinite(f?.time)||f.time<0||f.time>86400||f.time<=last||!Number.isFinite(f.value)||f.value<bounds[0]||f.value>bounds[1]||!['linear','smooth','hold'].includes(f.easing||'linear'))throw Error('关键帧数值无效');last=f.time;}}}
    if(c.out<=c.in||!['fade','slide','zoom'].includes(c.transition))throw Error('片段时间或过渡无效');
    if(!/^#[a-f0-9]{6}$/i.test(c.key?.color)||!Number.isFinite(c.key.tolerance)||c.key.tolerance<0||c.key.tolerance>1||!Number.isFinite(c.key.softness)||c.key.softness<.001||c.key.softness>1||!Number.isFinite(c.key.spill)||c.key.spill<0||c.key.spill>1)throw Error('色度键参数无效');grade(c.grade);
  }
  return p;
}
export function createMediaService(root,getOrigin){
  const store=process.env.STUDIO_MEDIA_STORE?path.resolve(process.env.STUDIO_MEDIA_STORE):path.join(root,'.studio-media'),{ffmpeg,ffprobe}=mediaTools(root);
  const send=(res,code,data)=>{res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  const readJSON=async(req,max=160*1024*1024)=>{let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>max)throw Error('请求过大');chunks.push(chunk);}return JSON.parse(Buffer.concat(chunks).toString());};
  const assetDir=id=>{if(!idPattern.test(id))throw Error('无效素材编号');return path.join(store,'assets',id);};
  async function getAsset(id){if(assets.has(id))return assets.get(id);const data=JSON.parse(await fs.readFile(path.join(assetDir(id),'asset.json'),'utf8'));assets.set(id,data);return data;}
  const previewTasks=new Map(), fullTasks=new Map(),frameIndexCache=new Map();let hardwarePromise;const hardware=()=>hardwarePromise||(hardwarePromise=detectHardwareEncoders(ffmpeg).catch(()=>({h264:[],h265:[],av1:[]})));
  async function frameTimes(id,signal){
    // Imported originals are immutable. Repeated exports can reuse their exact
    // time-base index instead of decoding the full source again with FFprobe.
    if(signal.aborted)throw Error('已取消导出');
    if(frameIndexCache.has(id))return frameIndexCache.get(id);
    const times=await probeFrameTimes({ffprobe,file:path.join(assetDir(id),'original'),signal});
    if(frameIndexCache.size>=32)frameIndexCache.delete(frameIndexCache.keys().next().value);
    frameIndexCache.set(id,times);return times;
  }
  const persist=a=>fs.writeFile(path.join(assetDir(a.id),'asset.json'),JSON.stringify(a));
  async function probeAsset(id,source,name){
    const info=JSON.parse(await runProcess(ffprobe,['-v','error','-show_streams','-show_format','-of','json',source]));
    const v=info.streams.find(s=>s.codec_type==='video'&&!s.disposition?.attached_pic),audio=info.streams.find(s=>s.codec_type==='audio');
    if(!v){if(!audio)throw Error('素材不含可用的视频或音频');const duration=[audio.duration,info.format.duration].map(Number).find(n=>Number.isFinite(n)&&n>0);if(!duration)throw Error('无法读取音频时长');return {id,name,kind:'audio',duration,codec:audio.codec_name,audio:true,image:false,alpha:false,channels:audio.channels,sampleRate:Number(audio.sample_rate)};}
    const tags=Object.fromEntries(Object.entries(v.tags||{}).map(([k,v])=>[k.toLowerCase(),v]));
    const image=/\.(png|jpg|jpeg|webp|bmp)$/i.test(name),rate=(v.avg_frame_rate||v.r_frame_rate||'30/1').split('/').map(Number);
    const a={id,name,duration:image?5:[v.duration,info.format.duration].map(Number).find(n=>Number.isFinite(n)&&n>0),width:v.width,height:v.height,codec:v.codec_name,pixelFormat:v.pix_fmt,alpha:/^(yuva|rgba|bgra|argb|abgr|gbrap|ya)/.test(v.pix_fmt||'')||String(tags.alpha_mode)==='1',audio:info.streams.some(s=>s.codec_type==='audio'),image,fps:rate[1]?rate[0]/rate[1]:30};
    if(!image&&(!Number.isFinite(a.duration)||a.duration<=0))throw Error('无法读取素材时长');return a;
  }
  const decodeArgs=a=>a.codec==='vp9'?['-c:v','libvpx-vp9']:[];
  function ensurePreview(a){
    if(a.previewRevision===2&&a.preview)return Promise.resolve(a);
    if(previewTasks.has(a.id))return previewTasks.get(a.id);
    const task=(async()=>{
      a.previewStatus='preparing';delete a.previewError;
      try{
        // Re-probe old projects too: FFprobe often reports yuv420p + ALPHA_MODE for VP9 alpha.
        Object.assign(a,await probeAsset(a.id,path.join(assetDir(a.id),'original'),a.name));
        if(a.kind==='audio'){
          // A common browser preview format; exports always mix the untouched source.
          const file=path.join(assetDir(a.id),'preview.m4a');
          await runProcess(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',path.join(assetDir(a.id),'original'),'-map','0:a:0','-vn','-c:a','aac','-b:a','192k','-movflags','+faststart',file]);
          a.preview=`/__editor/media/${a.id}/preview.m4a`;a.previewRevision=2;a.previewStatus='ready';a.previewMode='audio';a.status='ready';await persist(a);return a;
        }
        const ext=a.image?'png':a.alpha?'webm':'mp4',file=path.join(assetDir(a.id),'preview.'+ext);
        const compatibleAlpha=a.alpha&&a.codec==='vp9'&&/^yuva?420p$/.test(a.pixelFormat||'')&&/\.webm$/i.test(a.name)&&Math.max(a.width,a.height)<=960&&a.fps<=30.01;
        if(compatibleAlpha)await fs.copyFile(path.join(assetDir(a.id),'original'),file);
        else await runProcess(ffmpeg,['-hide_banner','-loglevel','error','-y',...decodeArgs(a),'-i',path.join(assetDir(a.id),'original'),'-map','0:v:0','-vf',"scale=w='min(960,iw)':h='min(960,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2"+(a.image?'':',fps='+Math.min(30,a.fps||30)),...(a.image?['-frames:v','1','-pix_fmt','rgba']:['-map','0:a?',...(a.alpha?['-c:v','libvpx-vp9','-lossless','1','-deadline','realtime','-cpu-used','8','-row-mt','1','-pix_fmt','yuva420p','-auto-alt-ref','0','-g','15','-c:a','libopus']:['-c:v','libx264','-preset','ultrafast','-crf','25','-pix_fmt','yuv420p','-g','15','-c:a','aac','-movflags','+faststart'])]),file]);
        a.preview=`/__editor/media/${a.id}/preview.${ext}`;a.previewRevision=2;a.previewStatus='ready';a.previewMode=compatibleAlpha?'direct':'proxy';a.status='ready';await persist(a);return a;
      }catch(e){a.previewStatus='error';a.previewError=e.message;throw e;}
      finally{previewTasks.delete(a.id);}
    })();previewTasks.set(a.id,task);return task;
  }
  function ensureFull(a,signal){
    if(!a.alpha&&!a.image&&a.codec==='h264'&&a.pixelFormat==='yuv420p'&&/\.mp4$/i.test(a.name)){return (async()=>{const file=path.join(assetDir(a.id),'proxy.mp4');if(!existsSync(file))await fs.copyFile(path.join(assetDir(a.id),'original'),file);a.proxy=`/__editor/media/${a.id}/proxy.mp4`;await persist(a);return a;})();}
    if(a.proxy)return Promise.resolve(a);
    if(fullTasks.has(a.id))return fullTasks.get(a.id);
    const task=(async()=>{
      const file=path.join(assetDir(a.id),a.image?'proxy.png':'proxy.webm');
      if(a.codec==='vp9'&&/\.webm$/i.test(a.name))await fs.copyFile(path.join(assetDir(a.id),'original'),file);
      else await runProcess(ffmpeg,['-hide_banner','-loglevel','error','-y',...decodeArgs(a),'-i',path.join(assetDir(a.id),'original'),'-map','0:v:0',...(a.image?['-frames:v','1','-pix_fmt','rgba']:['-an','-c:v','libvpx-vp9','-lossless','1','-deadline','realtime','-cpu-used','6','-row-mt','1','-pix_fmt','yuva420p','-auto-alt-ref','0']),file],{signal});
      a.proxy=`/__editor/media/${a.id}/${a.image?'proxy.png':'proxy.webm'}`;await persist(a);return a;
    })().finally(()=>fullTasks.delete(a.id));fullTasks.set(a.id,task);return task;
  }
  async function prepare(id,source,name){
    const a=assets.get(id);try{Object.assign(a,await probeAsset(id,source,name));await ensurePreview(a);}catch(e){a.status='error';a.error=e.message;}
  }
  async function render(job){
    exporting=true;const controller=new AbortController(),decoders=new Map(),indexes=new Map(),workers=[],pendingFrames=[],browserInstances=[];job.controller=controller;let browser,encoder,terminal='error',layerWindows={},decodeSequence=Promise.resolve();
    try{
      const o=validateOutput(job.payload.project.output),extension=o.codec==='prores'?'mov':o.codec==='vp9'?'webm':'mp4';
      const performancePlan=exportPerformance(o);job.performance=performancePlan;
      const dir=path.join(store,'exports',job.id);await fs.mkdir(dir,{recursive:true});
      const output=path.join(dir,'showcase.'+extension);
      const requested=o.acceleration;let selected=requested==='auto'?((await hardware())[o.codec]?.[0]||'cpu'):requested;
      if(selected!=='cpu'){try{await runProcess(ffmpeg,['-hide_banner','-loglevel','error','-f','lavfi','-i',`color=s=${o.width}x${o.height}:r=30:d=0.1`,'-frames:v','1',...encoderArgs({...o,acceleration:selected}),'-f','null','-'],{signal:controller.signal});}catch(e){if(controller.signal.aborted)throw e;if(requested!=='auto')throw Error(encodingLabels[selected]+' 无法编码此尺寸或当前不可用，请改用自动或 CPU。');selected='cpu';job.notice='此尺寸未能使用 GPU，已自动改用 CPU。';}}
      o.acceleration=selected;job.acceleration=selected;job.encoder=undefined;job.encoding=encodingLabels[selected]+' / '+o.codec.toUpperCase();
      job.phase='preparing-media';
      const payload=structuredClone(job.payload);payload.design??=payload.project.template?.design;payload.images??=payload.project.template?.images;delete payload.project.template;payload.project.clips=payload.project.clips.filter(c=>c.start<o.duration);
      const sequential=process.env.STUDIO_EXPORT_PIPELINE!=='browser';job.pipeline=sequential?'sequential':'browser';
      const frameURLs=sequential&&process.env.STUDIO_EXPORT_FRAME_TRANSPORT!=='base64';job.transport=frameURLs?'local-png':'base64';
      if(frameURLs){job.frameToken=crypto.randomUUID();job.frameBuffers=new Map();}
      for(const a of payload.project.assets){if(controller.signal.aborted)throw Error('已取消导出');const stored=await getAsset(a.id);if(stored.status!=='ready')throw Error('素材未就绪');if(payload.project.clips.some(c=>c.assetId===a.id&&c.start<o.duration)){
        if(stored.kind==='audio'){Object.assign(a,stored,{renderFrames:false});continue;}
        if(sequential&&!stored.image){const times=await frameTimes(a.id,controller.signal);indexes.set(a.id,times);Object.assign(a,stored,{renderFrames:true});}
        else{await ensureFull(stored,controller.signal);Object.assign(a,stored,{renderFrames:false,proxy:getOrigin()+stored.proxy});}
      }else Object.assign(a,stored,{renderFrames:false});}
      for(const c of payload.project.clips){const a=await getAsset(c.assetId);if((a.kind==='audio')!==c.layer.startsWith('audio-'))throw Error('音频与画面轨道不匹配');if(!a.image&&c.out>a.duration+.001)throw Error('素材出点超过原始时长');}
      // Source pipes keep only the current PNG and bounded transport buffers.
      const decodeAt=async time=>Promise.all(payload.project.clips.map(async c=>{
        const decoderId=c.id,window=layerWindows[c.layer];if(time>=c.start+c.out-c.in||(window&&(time<window[0]||time>=window[1]))){const old=decoders.get(decoderId);if(old){await old.dispose();decoders.delete(decoderId);}return null;}
        if(time<c.start)return null;const a=payload.project.assets.find(a=>a.id===c.assetId);if(!a.renderFrames)return null;
        let decoder=decoders.get(decoderId);if(!decoder){decoder=createSequentialDecoder({ffmpeg,file:path.join(assetDir(a.id),'original'),codec:a.codec,times:indexes.get(a.id),signal:controller.signal,threads:performancePlan.sourceThreads,pngThreads:performancePlan.pngThreads});decoders.set(decoderId,decoder);}
        const frame=await decoder.frameAt(c.in+time-c.start);return {id:c.id,...frame};
      })).then(frames=>frames.filter(Boolean));
      if(controller.signal.aborted)throw Error('已取消导出');job.phase='preparing-workers';
      const launch=channel=>chromium.launch({channel,headless:true,args:['--autoplay-policy=no-user-gesture-required','--force-device-scale-factor=1','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows',...(process.env.STUDIO_EXPORT_CAPTURE_PACING==='display'?[]:['--disable-features=CDPScreenshotNewSurface','--disable-frame-rate-limit','--disable-gpu-vsync'])]});
      const total=Math.ceil(o.duration*o.fps);
      // Independent compositor surfaces overlap frame commitment and PNG capture.
      // Each worker samples a monotonic subsequence; results enter the encoder in
      // exact timeline order, with only one captured frame queued per worker.
      const workerCount=sequential?performancePlan.workers:1;job.workers=workerCount;
      const browserCount=Math.min(workerCount,performancePlan.browsers);
      browser={close:()=>Promise.allSettled(browserInstances.map(instance=>instance.close()))};job.browser=browser;
      await Promise.all(Array.from({length:browserCount},async(_,id)=>{
        try{browserInstances[id]=await launch(process.env.STUDIO_BROWSER||'chrome');}catch(e){if(process.env.STUDIO_BROWSER)throw e;browserInstances[id]=await launch('msedge');}
        if(controller.signal.aborted){await browserInstances[id].close();throw Error('已取消导出');}
      }));
      const prepareWorker=async id=>{
        const page=await browserInstances[id%browserCount].newPage({viewport:{width:o.width,height:o.height},deviceScaleFactor:1,reducedMotion:'no-preference'});
        await page.goto(getOrigin()+'/?editor-render=1');
        await page.evaluate(()=>{document.documentElement.style.setProperty('background','transparent','important');document.body.style.setProperty('background','transparent','important');});
        const handle=await page.waitForSelector('iframe'),frame=await handle.contentFrame();
        await frame.waitForFunction(()=>!!globalThis.studioEditorAPI);
        await frame.evaluate(data=>globalThis.studioEditorAPI.loadRender(data),payload);
        const capture=await page.context().newCDPSession(page);await capture.send('Emulation.setDefaultBackgroundColorOverride',{color:{r:0,g:0,b:0,a:0}});
        workers[id]={id,frame,capture,sentFrames:new Map()};
      };
      // Parsing the embedded template and allocating every GPU surface at once
      // can stall Chromium startup at 24 workers. Bound initialization as well
      // as frame queues; the completed workers still render concurrently.
      for(let first=0;first<workerCount;first+=8){
        if(controller.signal.aborted)throw Error('已取消导出');
        await Promise.all(Array.from({length:Math.min(8,workerCount-first)},(_,i)=>prepareWorker(first+i)));
      }
      layerWindows=await workers[0].frame.evaluate(()=>globalThis.studioEditorAPI.renderLayerWindows());
      const audioInputs=[],audioFilters=[],audioLabels=[];let input=1;
      for(const clip of payload.project.clips){
        const a=await getAsset(clip.assetId);if(!a.audio||clip.volume<=0)continue;
        const duration=clip.out-clip.in,length=Math.min(duration,o.duration-clip.start),window=layerWindows[clip.layer]||[0,o.duration],start=Math.max(clip.start,window[0]),visibleLength=Math.min(clip.start+length,window[1])-start;if(visibleLength<=0)continue;
        audioInputs.push('-i',path.join(assetDir(a.id),'original'));const label='a'+input,fadeIn=Math.min(clip.audioFadeIn??clip.fadeIn,duration),fadeOut=Math.min(clip.audioFadeOut??clip.fadeOut,duration);
        // FFmpeg treats afade:d=0 as its default one-second fade, so omit it.
        const chain=[`[${input}:a]atrim=start=${clip.in}:duration=${length}`,'asetpts=PTS-STARTPTS',`volume=${clip.volume}`];
        if(fadeIn>0)chain.push(`afade=t=in:d=${fadeIn}`);
        if(fadeOut>0)chain.push(`afade=t=out:st=${Math.max(0,duration-fadeOut)}:d=${fadeOut}`);
        chain.push(`atrim=start=${start-clip.start}:duration=${visibleLength}`,'asetpts=PTS-STARTPTS',`adelay=${Math.round(start*1000)}:all=1[${label}]`);audioFilters.push(chain.join(','));audioLabels.push(`[${label}]`);input++;
      }
      const filters=audioLabels.length?['-filter_complex',audioFilters.concat(`${audioLabels.join('')}amix=inputs=${audioLabels.length}:normalize=0,asetpts=N/SR/TB,apad[audio]`).join(';'),'-map','0:v','-map','[audio]','-c:a',o.codec==='prores'?'pcm_s16le':o.codec==='vp9'?'libopus':'aac']:['-an'];
      encoder=spawn(ffmpeg,['-hide_banner','-loglevel',process.env.STUDIO_EXPORT_TRACE?'verbose':'error','-y','-filter_threads',String(performancePlan.inputThreads),'-f','avi','-threads',String(performancePlan.inputThreads),'-probesize','32','-analyzeduration','0','-fpsprobesize','0','-i','pipe:0',...audioInputs,...filters,...encoderArgs(o),'-fps_mode','passthrough','-frames:v',String(total),'-t',String(o.duration),output],{windowsHide:true,signal:controller.signal});
      job.encoder=encoder;let errors='';encoder.stderr.on('data',data=>errors=(errors+data).slice(-12000));
      const done=new Promise((resolve,reject)=>{encoder.on('error',reject);encoder.on('close',code=>code===0?resolve():reject(Error(errors||'编码已取消')));});done.catch(()=>{});encoder.stdin.on('error',()=>{});
      await new Promise((resolve,reject)=>encoder.stdin.write(pngAviHeader({width:o.width,height:o.height,fps:o.fps,totalFrames:total}),error=>error?reject(error):resolve()));
      job.phase='rendering';
      const started=performance.now();job.timings={decodeMs:0,seekMs:0,captureMs:0,pipeMs:0};
      // Keep source decoding shared and strictly chronological. Compositor
      // workers must not decode the same source twice or race it backwards.
      const queueDecode=index=>{const result=decodeSequence.then(()=>decodeAt(index/o.fps));decodeSequence=result.catch(()=>{});return result;};
      const renderFrame=async(worker,index)=>{
        if(controller.signal.aborted)throw Error('已取消导出');
        let decodedFrames=[];if(sequential){const beforeDecode=performance.now(),decoded=await worker.pendingDecode;job.timings.decodeMs+=performance.now()-beforeDecode;if(frameURLs){const active=new Set(decoded.map(f=>worker.id+':'+f.id));for(const key of job.frameBuffers.keys())if(key.startsWith(worker.id+':')&&!active.has(key))job.frameBuffers.delete(key);}decodedFrames=decoded.filter(f=>worker.sentFrames.get(f.id)!==f.index).map(f=>{worker.sentFrames.set(f.id,f.index);if(frameURLs){job.frameBuffers.set(worker.id+':'+f.id,{index:f.index,png:f.png});return {id:f.id,index:f.index,url:`${getOrigin()}/__editor/render-frame/${job.id}/${job.frameToken}/${worker.id}/${f.id}/${f.index}.png`};}return {id:f.id,index:f.index,png:f.png.toString('base64')};});}
        const beforeSeek=performance.now();await worker.frame.evaluate(({time,frames})=>globalThis.studioEditorAPI.seekRender(time,frames),{time:index/o.fps,frames:decodedFrames});job.timings.seekMs+=performance.now()-beforeSeek;
        const beforeCapture=performance.now(),captureOptions={format:'png',fromSurface:true,optimizeForSpeed:true,captureBeyondViewport:false};
        // The first high-resolution GPU surface may still be allocating/rastering
        // when its initial compositor commit completes. Prime that exact frame
        // once, then commit it again before accepting a capture for the encoder.
        if(!worker.warmed){await worker.capture.send('Page.captureScreenshot',captureOptions);await worker.frame.evaluate(t=>globalThis.studioEditorAPI.seekRender(t),index/o.fps);worker.warmed=true;}
        const shot=await worker.capture.send('Page.captureScreenshot',captureOptions);const png=Buffer.from(shot.data,'base64');job.timings.captureMs+=performance.now()-beforeCapture;
        if(process.env.STUDIO_EXPORT_VALIDATE_PNG)try{await validateCapturePNG(png);}catch(e){await fs.writeFile(path.join(dir,`invalid-${index}.png`),png);throw e;}
        return png;
      };
      for(const worker of workers){if(sequential){worker.pendingDecode=queueDecode(worker.id);worker.pendingDecode.catch(()=>{});}pendingFrames[worker.id]=renderFrame(worker,worker.id);pendingFrames[worker.id].catch(()=>{});}
      for(let index=0;index<total;index++){
        if(controller.signal.aborted)throw Error('已取消导出');
        const worker=workers[index%workerCount],png=await pendingFrames[worker.id];
        if(process.env.STUDIO_EXPORT_TRACE)await fs.appendFile(path.join(dir,'frames.log'),`${index}: ${png.readUInt32BE(16)}x${png.readUInt32BE(20)} type=${png[25]} sha256=${crypto.createHash('sha256').update(png).digest('hex')}\n`);
        if(index+workerCount<total){if(sequential){worker.pendingDecode=queueDecode(index+workerCount);worker.pendingDecode.catch(()=>{});}pendingFrames[worker.id]=renderFrame(worker,index+workerCount);pendingFrames[worker.id].catch(()=>{});}
        const beforePipe=performance.now();await new Promise((resolve,reject)=>encoder.stdin.write(pngAviPacket(png),error=>error?reject(error):resolve()));job.timings.pipeMs+=performance.now()-beforePipe;
        job.frames=index+1;job.elapsed=(performance.now()-started)/1000;job.fps=job.frames/job.elapsed;job.progress=(index+1)/total*.96;
      }
      job.phase='encoding';encoder.stdin.end();await done;if(process.env.STUDIO_EXPORT_TRACE)await fs.writeFile(path.join(dir,'encoder.log'),errors);
      // Do not report success if a driver/muxer ever drops a submitted frame.
      const encodedFrames=Number((await runProcess(ffprobe,['-v','error','-select_streams','v:0','-count_packets','-show_entries','stream=nb_read_packets','-of','csv=p=0',output],{signal:controller.signal})).trim());
      if(encodedFrames!==total)throw Error(`输出帧数不完整（${encodedFrames}/${total}），本次导出未通过完整性校验，请重试。`);
      job.progress=1;terminal='complete';job.download=`/__editor/download/${job.id}/showcase.${extension}`;
    }catch(e){terminal=job.cancelled?'cancelled':'error';job.error=e.message;}
    finally{if(encoder&&!encoder.killed)encoder.kill();controller.abort();await browser?.close().catch(()=>{});await Promise.allSettled([...decoders.values()].map(d=>d.dispose()));await decodeSequence.catch(()=>{});await Promise.allSettled(pendingFrames);exporting=false;job.status=terminal;job.frameBuffers?.clear();delete job.frameBuffers;delete job.frameToken;delete job.payload;delete job.browser;delete job.encoder;delete job.controller;}
  }
  return async(req,res,url)=>{
    if(!url.pathname.startsWith('/__editor/'))return false;
    try{
      await fs.mkdir(store,{recursive:true});
      const origin=getOrigin();
      if(req.headers.host!==new URL(origin).host){send(res,403,{error:'Invalid host'});return true;}
      // The opaque-origin artwork sandbox can read only the currently offered
      // lossless frame. The unguessable task secret expires on every exit path;
      // no source path or whole-video decoded cache is exposed here.
      const renderFrame=url.pathname.match(/^\/__editor\/render-frame\/([a-f0-9-]{36})\/([a-f0-9-]{36})\/([0-9]|1[0-9]|2[0-3])\/([a-f0-9-]{36})\/(\d+)\.png$/);
      if(renderFrame&&['GET','HEAD'].includes(req.method)){
        const job=jobs.get(renderFrame[1]),frame=job?.frameBuffers?.get(renderFrame[3]+':'+renderFrame[4]);
        if(job?.status!=='rendering'||job.frameToken!==renderFrame[2]||frame?.index!==Number(renderFrame[5])){send(res,404,{error:'导出帧已释放'});return true;}
        res.writeHead(200,{'Content-Type':'image/png','Content-Length':frame.png.length,'Access-Control-Allow-Origin':'*','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:frame.png);return true;
      }
      const media=url.pathname.match(/^\/__editor\/media\/([a-f0-9-]{36})\/((?:proxy|preview)\.(?:webm|png|mp4|m4a))$/);
      if(media&&['GET','HEAD'].includes(req.method)){
        const a=await getAsset(media[1]);if(a.status!=='ready')throw Error('素材未就绪');
        const file=path.join(assetDir(media[1]),media[2]),stat=await fs.stat(file);let start=0,end=stat.size-1;
        if(req.headers.range){const m=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!m){res.writeHead(416);res.end();return true;}start=Number(m[1]);end=m[2]?Math.min(Number(m[2]),end):end;}
        if(start>end||start>=stat.size){res.writeHead(416,{'Content-Range':`bytes */${stat.size}`});res.end();return true;}
        res.writeHead(req.headers.range?206:200,{'Content-Type':media[2].endsWith('m4a')?'audio/mp4':media[2].endsWith('png')?'image/png':media[2].endsWith('mp4')?'video/mp4':'video/webm','Content-Length':end-start+1,'Accept-Ranges':'bytes','Access-Control-Allow-Origin':'*','Cache-Control':'private, max-age=86400',...(req.headers.range?{'Content-Range':`bytes ${start}-${end}/${stat.size}`}:{})});
        if(req.method==='HEAD')res.end();else createReadStream(file,{start,end}).pipe(res);return true;
      }
      if(req.headers['sec-fetch-site']==='cross-site'||(req.headers.origin&&req.headers.origin!==origin)){send(res,403,{error:'仅接受本机工作台请求'});return true;}
      if(url.pathname==='/__editor/capabilities'&&req.method==='GET'){
        try{const version=await runProcess(ffmpeg,['-version']);send(res,200,{ready:true,version:version.split('\n')[0],parallelExport:true,maxExportWorkers:24,exportPipeline:process.env.STUDIO_EXPORT_PIPELINE==='browser'?'browser':'sequential',token,origin,hardware:await hardware()});}catch{send(res,200,{ready:false,error:'请运行 setup-editor.cmd 安装本机视频组件',token,origin});}return true;
      }
      if(req.method!=='GET'&&req.headers['x-studio-token']!==token){send(res,403,{error:'会话验证失败，请刷新'});return true;}
      if(url.pathname==='/__editor/project/validate'&&req.method==='POST'){validateProject(await readJSON(req));send(res,200,{ok:true});return true;}
      if(url.pathname==='/__editor/project'){
        if(req.method==='GET'){const saved=await fs.readFile(path.join(store,'project.json'),'utf8').catch(()=>'null');send(res,200,JSON.parse(saved));}
        else if(req.method==='PUT'){const data=await readJSON(req);if(data!==null)validateProject(data);const temp=path.join(store,'project-'+crypto.randomUUID()+'.tmp');await fs.writeFile(temp,JSON.stringify(data));await fs.rename(temp,path.join(store,'project.json'));send(res,200,{ok:true});}else send(res,405,{error:'Method not allowed'});return true;
      }
      if(url.pathname==='/__editor/import'&&req.method==='POST'){
        const id=crypto.randomUUID(),dir=assetDir(id);await fs.mkdir(dir,{recursive:true});
        let size=0;req.on('data',chunk=>{size+=chunk.length;if(size>20*1024**3)req.destroy(Error('文件超过 20 GB'));});
        await pipeline(req,createWriteStream(path.join(dir,'original')));
        const name=(url.searchParams.get('name')||'素材').slice(0,240),a={id,name,status:'preparing'};assets.set(id,a);prepare(id,path.join(dir,'original'),name);send(res,202,a);return true;
      }
      const previewRequest=url.pathname.match(/^\/__editor\/preview\/([a-f0-9-]{36})$/);
      if(previewRequest&&req.method==='POST'){const a=await getAsset(previewRequest[1]);if(a.previewRevision!==2)ensurePreview(a).catch(()=>{});send(res,202,a);return true;}
      const asset=url.pathname.match(/^\/__editor\/asset\/([a-f0-9-]{36})$/);
      if(asset&&req.method==='GET'){send(res,200,await getAsset(asset[1]));return true;}
      if(url.pathname==='/__editor/export'&&req.method==='POST'){
        if(exporting){send(res,409,{error:'已有导出任务，请完成或取消后再试'});return true;}
        const payload=await readJSON(req);validateProject(payload.project);
        if(!Array.isArray(payload.project.clips)||payload.project.clips.length>300)throw Error('素材数量无效');
        const job={id:crypto.randomUUID(),status:'rendering',progress:0,payload};jobs.set(job.id,job);render(job);send(res,202,{id:job.id});return true;
      }
      const jobMatch=url.pathname.match(/^\/__editor\/job\/([a-f0-9-]{36})$/);
      if(jobMatch){const job=jobs.get(jobMatch[1]);if(!job)throw Error('找不到导出任务');if(req.method==='DELETE'){job.cancelled=true;job.controller?.abort();await job.browser?.close().catch(()=>{});}send(res,200,{id:job.id,status:job.status,phase:job.phase,progress:job.progress,encoding:job.encoding,acceleration:job.acceleration,pipeline:job.pipeline,transport:job.transport,workers:job.workers,performance:job.performance,frames:job.frames,fps:job.fps,elapsed:job.elapsed,timings:job.timings,notice:job.notice,error:job.error,download:job.download});return true;}
      const download=url.pathname.match(/^\/__editor\/download\/([a-f0-9-]{36})\/(showcase\.(?:mp4|webm|mov))$/);
      if(download&&req.method==='GET'){const file=path.join(store,'exports',download[1],download[2]),stat=await fs.stat(file);res.writeHead(200,{'Content-Type':'application/octet-stream','Content-Disposition':`attachment; filename="${download[2]}"`,'Content-Length':stat.size});createReadStream(file).pipe(res);return true;}
      send(res,404,{error:'接口不存在'});
    }catch(e){if(!res.headersSent)send(res,400,{error:e.message});else res.destroy();}
    return true;
  };
}
