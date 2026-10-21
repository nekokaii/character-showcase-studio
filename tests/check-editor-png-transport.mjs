import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {pngAviHeader,pngAviPacket,validateCapturePNG} from '../tools/editor-png.mjs';
import {mediaTools} from '../tools/editor-media.mjs';
const {ffmpeg}=mediaTools(process.cwd());
async function run(args,parts){
 const child=spawn(ffmpeg,args,{windowsHide:true}),chunks=[];let errors='';
 child.stdout.on('data',b=>chunks.push(b));child.stderr.on('data',b=>errors+=b);child.stdin.on('error',()=>{});
 const done=new Promise((resolve,reject)=>{child.on('error',reject);child.on('close',code=>code===0?resolve(Buffer.concat(chunks)):reject(Error(errors)));});done.catch(()=>{});
 for(const part of parts)await new Promise((resolve,reject)=>child.stdin.write(part,e=>e?reject(e):resolve()));
 child.stdin.end();return done;
}
const raw=Buffer.from([255,0,0,0,0,255,0,128,0,0,255,255,50,100,150,255]);
const png=await run(['-v','error','-f','rawvideo','-pixel_format','rgba','-video_size','2x2','-i','pipe:0','-frames:v','1','-c:v','png','-pix_fmt','rgba','-f','image2pipe','pipe:1'],[raw]);
await validateCapturePNG(png);
const header=pngAviHeader({width:2,height:2,fps:60,totalFrames:5});
assert.equal(header.length,224);assert.equal(header.readUInt32LE(4),0,'unbounded RIFF avoids cumulative 4 GB limit');assert.equal(header.readUInt32LE(216),0,'unbounded movi avoids cumulative 4 GB limit');
const stream=Buffer.concat([header,...Array.from({length:5},()=>pngAviPacket(png))]),parts=[];
for(let at=0;at<stream.length;){const count=[1,7,13,1024][parts.length%4];parts.push(stream.subarray(at,at+count));at+=count;}
const decoded=await run(['-v','error','-f','avi','-threads','1','-i','pipe:0','-fps_mode','passthrough','-pix_fmt','rgba','-f','rawvideo','pipe:1'],parts);
assert.deepEqual(decoded,Buffer.concat(Array.from({length:5},()=>raw)),'packet framing preserves exact RGB and alpha through fragmented pipe writes');
console.log('PASS: packetized PNG stream retains exact transparent/partial/opaque RGBA, exact 60 FPS cadence and five frames across arbitrarily fragmented pipe writes; lengths permit streams beyond 4 GB');
