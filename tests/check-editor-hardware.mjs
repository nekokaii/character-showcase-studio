import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import {execFile} from 'node:child_process';import {promisify} from 'node:util';import {mediaTools,runProcess} from '../tools/editor-media.mjs';
const base=process.env.STUDIO_TEST_URL||'http://127.0.0.1:19478',{ffmpeg,ffprobe}=mediaTools(path.resolve('.')),dir='work/hardware-qa';await fs.mkdir(dir,{recursive:true});const cap=await(await fetch(base+'/__editor/capabilities')).json();assert.ok(cap.hardware.h264.includes('nvenc'));
await runProcess(ffmpeg,['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=c=red:s=960x540:r=30:d=0.5','-f','lavfi','-i','color=c=blue:s=960x540:r=30:d=0.5','-filter_complex','[0:v][1:v]concat=n=2:v=1:a=0[v]','-map','[v]','-c:v','libx264','-g','1','-pix_fmt','yuv420p',dir+'/colors.mp4']);
let asset=await(await fetch(base+'/__editor/import?name=colors.mp4',{method:'POST',headers:{'X-Studio-Token':cap.token},body:await fs.readFile(dir+'/colors.mp4')})).json();while(asset.status==='preparing'){await new Promise(r=>setTimeout(r,150));asset=await(await fetch(base+'/__editor/asset/'+asset.id)).json();}assert.equal(asset.status,'ready',asset.error);
const grade={exposure:0,contrast:1,saturation:1,hue:0},clip={id:crypto.randomUUID(),assetId:asset.id,start:0,in:0,out:1,layer:'above-border',x:50,y:50,scale:100,rotate:0,opacity:100,cropLeft:0,cropRight:0,cropTop:0,cropBottom:0,fadeIn:0,fadeOut:0,transition:'fade',volume:0,grade,key:{enabled:false,color:'#00ff00',tolerance:.15,softness:.12,spill:.5}};
for(const codec of ['h264','h265','av1']){
 const project={version:1,assets:[asset],clips:[clip],grade,output:{width:960,height:540,fps:2,duration:1,bitrate:4,codec,acceleration:'nvenc'}};
 const response=await fetch(base+'/__editor/export',{method:'POST',headers:{'X-Studio-Token':cap.token,'Content-Type':'application/json'},body:JSON.stringify({project})});assert.equal(response.status,202);const job=await response.json();let result;
 for(let i=0;i<500;i++){await new Promise(r=>setTimeout(r,150));result=await(await fetch(base+'/__editor/job/'+job.id)).json();if(result.status!=='rendering')break;}assert.equal(result.status,'complete',result.error);assert.equal(result.acceleration,'nvenc');assert.equal(result.frames,2);assert.ok(result.timings.captureMs>0);
 const data=await(await fetch(base+result.download)).arrayBuffer(),file=dir+'/'+codec+'.mp4';await fs.writeFile(file,Buffer.from(data));const info=JSON.parse(await runProcess(ffprobe,['-v','error','-show_streams','-of','json',file]));assert.match(info.streams[0].tags.encoder,/nvenc/);
 const pixels=await promisify(execFile)(ffmpeg,['-hide_banner','-loglevel','error','-i',file,'-vf','crop=2:2:480:270,scale=1:1','-f','rawvideo','-pix_fmt','rgb24','-'],{encoding:'buffer'});assert.equal(pixels.stdout.length,6);assert.ok(pixels.stdout[0]>200&&pixels.stdout[2]<30);assert.ok(pixels.stdout[3]<30&&pixels.stdout[5]>200);console.log('PASS:',result.encoding,'two distinct frames',JSON.stringify(result.timings));
}
// GPU canvas composition must be committed before capturing: the first frame
// keys away red, while later blue frames retain their original opaque alpha.
{
 const project={version:1,assets:[asset],clips:[{...clip,key:{...clip.key,enabled:true,color:'#ff0000'}}],grade,transparent:true,output:{width:960,height:540,fps:6,duration:1,bitrate:4,codec:'prores',acceleration:'cpu'}};
 const response=await fetch(base+'/__editor/export',{method:'POST',headers:{'X-Studio-Token':cap.token,'Content-Type':'application/json'},body:JSON.stringify({project})});assert.equal(response.status,202);const job=await response.json();let result;
 for(let i=0;i<500;i++){await new Promise(r=>setTimeout(r,150));result=await(await fetch(base+'/__editor/job/'+job.id)).json();if(result.status!=='rendering')break;}assert.equal(result.status,'complete',result.error);
 const file=dir+'/key-alpha.mov';await fs.writeFile(file,Buffer.from(await(await fetch(base+result.download)).arrayBuffer()));
 const {stdout}=await promisify(execFile)(ffmpeg,['-hide_banner','-loglevel','error','-i',file,'-vf','crop=2:2:900:450,scale=1:1','-f','rawvideo','-pix_fmt','rgba','-'],{encoding:'buffer'});assert.equal(stdout.length,24);
 for(let i=0;i<6;i++){if(i<3)assert.ok(stdout[i*4+3]<5,'red must be transparent at frame '+i);else assert.ok(stdout[i*4+2]>250&&stdout[i*4+3]>250,'blue must be opaque at frame '+i);}
 console.log('PASS: full-size shader export retains exact frame colors and keyed alpha across six frames');
}
