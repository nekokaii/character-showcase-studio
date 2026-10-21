import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {mediaTools} from '../tools/editor-media.mjs';

// Use two isolated services: STUDIO_EXPORT_WORKERS=1 and the default two workers.
// Never point this test at the interactive production service.
const single=process.env.STUDIO_SINGLE_URL||'http://127.0.0.1:19608';
const parallel=process.env.STUDIO_TEST_URL||'http://127.0.0.1:19628';
const {ffmpeg}=mediaTools(process.cwd());
const dir=await fs.mkdtemp(path.resolve('work/parallel-export-'));
const run=(args,input)=>new Promise((resolve,reject)=>{
 const child=spawn(ffmpeg,args,{windowsHide:true}),chunks=[];let errors='';
 child.stdout.on('data',c=>chunks.push(c));child.stderr.on('data',c=>errors=(errors+c).slice(-16000));child.stdin.on('error',()=>{});
 child.on('error',reject);child.on('close',code=>code===0?resolve(Buffer.concat(chunks)):reject(Error(errors||'FFmpeg failed')));child.stdin.end(input);
});
const width=96,height=64,frames=48,raw=Buffer.alloc(width*height*4*frames);
for(let f=0;f<frames;f++)for(let y=0;y<height;y++)for(let x=0;x<width;x++){
 const i=((f*height+y)*width+x)*4;
 raw.set([(x*3+f*11)%256,(y*4+f*7)%256,(x+y+f*3)%256,x<12||x>=84||y<8||y>=56?0:x<36?Math.round((x-12)/24*255):255],i);
}
const source=path.join(dir,'moving-alpha.mkv');
await run(['-v','error','-y','-f','rawvideo','-pixel_format','rgba','-video_size',`${width}x${height}`,'-framerate','30','-i','pipe:0','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','1.6','-c:v','ffv1','-level','3','-pix_fmt','bgra','-c:a','pcm_s16le',source],raw);
const grade={exposure:0,contrast:1,saturation:1,hue:0};
const saved=new Map();
async function request(base,route,body,method='POST'){
 const cap=await(await fetch(base+'/__editor/capabilities')).json();
 const response=await fetch(base+'/__editor/'+route,{method,headers:{'X-Studio-Token':cap.token,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=await response.json();assert.ok(response.ok,JSON.stringify(data));return data;
}
async function prepare(base){
 saved.set(base,await(await fetch(base+'/__editor/project')).json());
 const cap=await(await fetch(base+'/__editor/capabilities')).json();
 let a=await(await fetch(base+'/__editor/import?name=moving-alpha.mkv',{method:'POST',headers:{'X-Studio-Token':cap.token},body:await fs.readFile(source)})).json();
 while(a.status==='preparing'){await new Promise(r=>setTimeout(r,100));a=await(await fetch(base+'/__editor/asset/'+a.id)).json();}
 assert.equal(a.status,'ready',a.error);assert.equal(a.alpha,true);
 const clip={id:crypto.randomUUID(),assetId:a.id,start:0,in:.1,out:1.1,layer:'above-text',x:35,y:40,scale:85,rotate:0,opacity:100,cropLeft:0,cropRight:0,cropTop:0,cropBottom:0,fadeIn:0,fadeOut:0,audioFadeIn:.2,audioFadeOut:.3,transition:'fade',volume:.6,grade,key:{enabled:false,color:'#00ff00',tolerance:.15,softness:.12,spill:.5},keyframes:{x:[{time:.1,value:30,easing:'smooth'},{time:1.1,value:70}],y:[{time:.1,value:35},{time:1.1,value:65}],scale:[{time:.1,value:80},{time:1.1,value:135}],rotate:[{time:.1,value:-25},{time:1.1,value:50}],opacity:[{time:.1,value:45},{time:.8,value:100,easing:'hold'}]}};
 return {version:1,assets:[a],clips:[clip,{...structuredClone(clip),id:crypto.randomUUID(),start:.2,in:.5,out:1.3,x:65,scale:65,rotate:25,volume:.4,keyframes:{}}],grade,transparent:true,output:{width:320,height:180,fps:30,duration:1,bitrate:10,codec:'prores',acceleration:'cpu'}};
}
async function exportProject(base,project,name,narrative={postEffect:'none'}){
 const {id}=await request(base,'export',{project,design:{design:'character-explorations',version:6,narrative}});let job;
 for(let i=0;i<600;i++){await new Promise(r=>setTimeout(r,100));job=await(await fetch(base+'/__editor/job/'+id)).json();if(job.status!=='rendering')break;}
 assert.equal(job.status,'complete',job.error);assert.equal(job.frames,Math.ceil(project.output.duration*project.output.fps));
 const file=path.join(dir,name+(project.output.codec==='vp9'?'.webm':'.mov'));await fs.writeFile(file,Buffer.from(await(await fetch(base+job.download)).arrayBuffer()));
 return {job,file,pixels:await run(['-v','error',...(project.output.codec==='vp9'?['-c:v','libvpx-vp9']:[]),'-i',file,'-pix_fmt','rgba','-f','rawvideo','pipe:1']),audio:await run(['-v','error','-i',file,'-vn','-ac','1','-ar','48000','-f','s16le','pipe:1'])};
}
const a=await prepare(single),b=await prepare(parallel);
const before=await exportProject(single,a,'single');
const after=await exportProject(parallel,b,'parallel');
assert.equal(after.job.workers,2);assert.equal(after.job.transport,'local-png');
assert.ok(before.pixels.equals(after.pixels),'all RGBA channels of every decoded frame match the single-worker output');
assert.ok(before.audio.equals(after.audio),'PCM audio and audio fades match the single-worker output');
assert.equal(after.audio.length,48000*2,'one-second export keeps the complete PCM audio tail');
let transparent=0,partial=0,opaque=0;
for(let i=3;i<after.pixels.length;i+=4){if(after.pixels[i]<2)transparent++;else if(after.pixels[i]>253)opaque++;else partial++;}
assert.ok(transparent>1000&&partial>1000&&opaque>1000,JSON.stringify({transparent,partial,opaque}));
const frameSize=320*180*4;
for(let f=1;f<30;f++)assert.ok(!after.pixels.subarray(f*frameSize,(f+1)*frameSize).equals(after.pixels.subarray((f-1)*frameSize,f*frameSize)),'no stale or repeated moving frame '+f);
const rms=(start,duration)=>{const first=Math.round(start*48000)*2,last=Math.round((start+duration)*48000)*2;let sum=0;for(let i=first;i<last;i+=2)sum+=after.audio.readInt16LE(i)**2;return Math.sqrt(sum/((last-first)/2));};
assert.ok(rms(.01,.03)<rms(.3,.03)*.4,'audio fade-in retained');
assert.ok(rms(.96,.03)<rms(.6,.03)*.4,'audio fade-out retained');
for(const [base,old]of saved)assert.deepEqual(await(await fetch(base+'/__editor/project')).json(),old,'export never modifies the saved project');
console.log('PASS: 30 moving frames are pixel-identical RGBA and audio-identical to single worker; independent trims, all transform keyframes, transparent/partial/opaque alpha, audio fades, ordered cadence and project preservation');
for(const effect of ['prism','film']){
 const p={...a,transparent:false,output:{...a.output,fps:12}},q={...b,transparent:false,output:{...b.output,fps:12}};
 const settings={postEffect:effect,postStrength:1,postDispersion:.8,postCharacter:true,postAuthor:true,postShow:true,postFade:.15};
 const one=await exportProject(single,p,'single-'+effect,settings),two=await exportProject(parallel,q,'parallel-'+effect,settings);
 assert.ok(one.pixels.equals(two.pixels),'animated '+effect+' optical filters are pixel-identical');
 console.log('PASS: animated '+effect+' optical effect matches the single-worker output at every frame');
}

// Cancel while both compositor workers/source decoder are active, then prove a
// fresh export succeeds. This also waits for browser/FFmpeg cleanup to finish.
b.output.duration=1.4;b.clips[0].out=1.5;
const started=await request(parallel,'export',{project:b});let active;
for(let i=0;i<300;i++){active=await(await fetch(parallel+'/__editor/job/'+started.id)).json();if(active.frames>=2||active.status!=='rendering')break;await new Promise(r=>setTimeout(r,30));}
assert.equal(active.status,'rendering');
await request(parallel,'job/'+started.id,undefined,'DELETE');
for(let i=0;i<300;i++){active=await(await fetch(parallel+'/__editor/job/'+started.id)).json();if(active.status!=='rendering')break;await new Promise(r=>setTimeout(r,30));}
assert.equal(active.status,'cancelled',JSON.stringify(active));
b.output.duration=1;await exportProject(parallel,b,'after-cancel');
console.log('PASS: cancel active two-worker export, wait for resource cleanup, then export again');
const vp9=await exportProject(parallel,{...b,output:{...b.output,fps:6,codec:'vp9'}},'vp9-alpha');
assert.equal(vp9.pixels.length,320*180*4*6);let min=255,max=0;for(let i=3;i<vp9.pixels.length;i+=4){min=Math.min(min,vp9.pixels[i]);max=Math.max(max,vp9.pixels[i]);}
assert.equal(min,0);assert.ok(max>250);assert.ok(vp9.audio.length>90000,'Opus audio retains the full one-second timeline');
console.log('PASS: VP9 Alpha output preserves transparent/opaque alpha, exact frame count and Opus sound with packetized input');
