import {chromium} from 'playwright-core';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mediaTools,runProcess} from '../tools/editor-media.mjs';
const base=process.env.STUDIO_TEST_URL||'http://127.0.0.1:19498';
const {ffmpeg}=mediaTools(process.cwd()),exec=promisify(execFile),work='work/text-order-qa';await fs.mkdir(work,{recursive:true});
await runProcess(ffmpeg,['-v','error','-y','-f','lavfi','-i','color=blue:s=320x180','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','7','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac',work+'/blue.mp4']);
const cap=await(await fetch(base+'/__editor/capabilities')).json(),saved=await(await fetch(base+'/__editor/project')).json();
let a=await(await fetch(base+'/__editor/import?name=blue.mp4',{method:'POST',headers:{'X-Studio-Token':cap.token},body:await fs.readFile(work+'/blue.mp4')})).json();
while(a.status==='preparing'){await new Promise(r=>setTimeout(r,100));a=await(await fetch(base+'/__editor/asset/'+a.id)).json();}assert.equal(a.status,'ready',a.error);
const grade={exposure:0,contrast:1,saturation:1,hue:0},clip={id:crypto.randomUUID(),assetId:a.id,start:0,in:0,out:7,layer:'under-text',x:50,y:50,scale:400,rotate:0,opacity:100,cropLeft:0,cropRight:0,cropTop:0,cropBottom:0,fadeIn:0,fadeOut:0,transition:'fade',volume:1,grade,key:{enabled:false,color:'#00ff00',tolerance:.15,softness:.12,spill:.5}};
const project={version:1,assets:[a],clips:[clip],grade,output:{width:640,height:360,fps:1,duration:7,bitrate:4,codec:'h264',acceleration:'cpu'},designSync:true};
const design={design:'character-explorations',version:6,introDuration:5.1,narrative:{introStyle:'story',postEffect:'none'}};
const browser=await chromium.launch({channel:'chrome'}),errors=[];
const put=p=>fetch(base+'/__editor/project',{method:'PUT',headers:{'X-Studio-Token':cap.token,'Content-Type':'application/json'},body:JSON.stringify(p)});
async function raw(file){return (await exec(ffmpeg,['-v','error','-i',file,'-pix_fmt','rgb24','-f','rawvideo','-'],{encoding:'buffer',maxBuffer:32e6})).stdout;}
const nonBlue=(pixels,rect,width=640)=>{let n=0;for(let y=Math.max(0,Math.ceil(rect.y));y<Math.min(360,Math.floor(rect.y+rect.height));y++)for(let x=Math.max(0,Math.ceil(rect.x));x<Math.min(width,Math.floor(rect.x+rect.width));x++){const i=(y*width+x)*3;if(pixels[i]>60||pixels[i+1]>60||pixels[i+2]<150)n++;}return n;};
try{
 const page=await browser.newPage({viewport:{width:640,height:360}});page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/?editor-render=1');const f=await(await page.waitForSelector('iframe')).contentFrame();await f.waitForFunction(()=>!!globalThis.studioEditorAPI);
 const load=async(layer,extra={})=>f.evaluate(payload=>studioEditorAPI.loadRender(payload),{project:{...project,assets:[{...a,proxy:base+a.preview}],clips:[{...clip,layer}],...extra},design,images:Object.fromEntries(['model','portrait','introCharacter','introAuthor'].map(k=>[k,'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360"><path fill="red" d="M0 0H640V360H0Z"/></svg>')]))});
 const boxes=[];
 for(const layer of ['under-text','above-text','under-intro-text','under-show-text','under-post']){
  await load(layer);for(const [t,selector]of [[1,'[data-story-role="character"] .story-title'],[3.3,'[data-story-role="author"] .story-title'],[6,'.hero-name']]){
   await f.evaluate(t=>studioEditorAPI.seekRender(t),t);const box=f.locator('[data-clip-id="'+clip.id+'"]');assert.equal(await box.evaluate(e=>e.hidden),false,layer+' remains visible '+t);
   const text=f.locator('.studio-editor-text-layers '+selector),rect=await text.boundingBox();assert.ok(rect?.width>0);if(layer==='under-text')boxes.push(rect);
   const image=work+'/'+layer+'-'+t+'.png';await page.screenshot({path:image});const count=nonBlue(await raw(image),rect);assert.ok(['above-text','under-post'].includes(layer)?count<10:count>30,layer+' '+t+' text pixels='+count);
  }
 }
 // Changing layers restores original scene nodes; repeated changes never duplicate text.
 await load('under-border');assert.equal(await f.locator('.studio-editor-text-layers').count(),0);assert.equal(await f.locator('.studio-editor-render-art .composition .hero-name').count(),1);assert.equal(await f.locator('.studio-editor-render-art .story-shot .story-image').count(),2);
 // Both text-order lanes and the legacy post lane are inside the same filtered
 // composite; optical light bands sit above them. Bypass lanes remain outside.
 for(const layer of ['under-text','above-text','under-post','under-border','above-border']){
  await load(layer);await f.locator('[data-narrative="postEffect"]').evaluate(e=>{e.value='prism';e.dispatchEvent(new Event('change',{bubbles:true}));});await f.evaluate(()=>studioEditorAPI.seekRender(1));
  const relation=await f.locator('[data-clip-id="'+clip.id+'"]').evaluate(box=>({filtered:!!box.closest('.studio-post-surface'),textFiltered:!!box.closest('.studio-post-surface')?.querySelector('.studio-editor-text-layers'),filter:box.closest('.studio-post-surface')?.style.filter}));
  if(['under-border','above-border'].includes(layer))assert.equal(relation.filtered,false);else{assert.equal(relation.filtered,true);assert.equal(relation.textFiltered,true);assert.ok(relation.filter.includes('url('));}
 }
 // Real pixels from optical compositing affect both processed footage lanes and
 // do not change a fully covering bypass clip.
 for(const layer of ['under-text','above-text','under-border']){
  const captures=[];for(const effect of ['none','film']){await load(layer);await f.locator('[data-narrative="postEffect"]').evaluate((e,effect)=>{e.value=effect;e.dispatchEvent(new Event('change',{bubbles:true}));},effect);await f.evaluate(()=>studioEditorAPI.seekRender(1));const file=work+'/fx-'+layer+'-'+effect+'.png';await page.screenshot({path:file});captures.push(await raw(file));}
  let changed=0;for(let y=120;y<230;y++)for(let x=300;x<500;x++){const i=(y*640+x)*3;if(Math.abs(captures[0][i]-captures[1][i])+Math.abs(captures[0][i+1]-captures[1][i+1])+Math.abs(captures[0][i+2]-captures[1][i+2])>4)changed++;}assert.ok(layer==='under-border'?changed===0:changed>100,layer+' optical pixel changes '+changed);
 }
 // RGB offset is independent of optical light bands; zero removes only the RGB filter.
 await load('under-text');await f.locator('[data-narrative="postEffect"]').evaluate(e=>{e.value='prism';e.dispatchEvent(new Event('change',{bubbles:true}));});await f.locator('[data-narrative="postStrength"]').evaluate(e=>{e.value='100';e.dispatchEvent(new Event('input',{bubbles:true}));});
 const dispersion=f.locator('[data-narrative="postDispersion"]');assert.equal(await dispersion.inputValue(),'25');
 for(const value of [0,25,100]){await dispersion.evaluate((e,value)=>{e.value=String(value);e.dispatchEvent(new Event('input',{bubbles:true}));},value);await f.evaluate(()=>studioEditorAPI.seekRender(1));const state=await f.locator('.studio-editor-render-art').evaluate(art=>({dx:+art.querySelector('feOffset').getAttribute('dx'),optics:+getComputedStyle(art.querySelector('.studio-post-optics')).opacity,filter:art.querySelector('.studio-post-surface').style.filter,textFilter:art.querySelector('.studio-editor-text-layers').style.filter}));assert.equal(state.optics,1);assert.equal(state.textFilter,'','no duplicate filtering of text');if(value===0){assert.equal(state.dx,0);assert.ok(!state.filter.includes('-prism'));}else assert.ok(Math.abs(state.dx-3.3*value/100)<.01,JSON.stringify(state));}
 assert.deepEqual(errors,[]);await page.close();
 // Actual encoded frames and sound continue across scene changes on both lanes.
 for(const layer of ['under-text','above-text']){
  const before=await(await fetch(base+'/__editor/project')).json();const r=await fetch(base+'/__editor/export',{method:'POST',headers:{'X-Studio-Token':cap.token,'Content-Type':'application/json'},body:JSON.stringify({project:{...project,clips:[{...clip,layer}]},design})});const job=await r.json();assert.equal(r.status,202,job.error);let result;do{await new Promise(r=>setTimeout(r,200));result=await(await fetch(base+'/__editor/job/'+job.id)).json();}while(result.status==='rendering');assert.equal(result.status,'complete',result.error);const file=work+'/'+layer+'.mp4';await fs.writeFile(file,Buffer.from(await(await fetch(base+result.download)).arrayBuffer()));const pixels=await raw(file),size=640*360*3;
  for(const [index,time]of [1,3,6].entries()){const count=nonBlue(pixels.subarray(time*size,(time+1)*size),boxes[index]);assert.ok(layer==='above-text'?count<30:count>30,layer+' native frame '+time+' count='+count);const audio=(await exec(ffmpeg,['-v','error','-ss',String(time),'-i',file,'-t','0.1','-ac','1','-ar','8000','-f','s16le','-'],{encoding:'buffer'})).stdout;let sum=0;for(let i=0;i+1<audio.length;i+=2)sum+=audio.readInt16LE(i)**2;assert.ok(Math.sqrt(sum/(audio.length/2))>500,'continuous audio '+layer+' '+time);}
  assert.deepEqual(await(await fetch(base+'/__editor/project')).json(),before);
 }
 // Live workbench: all designs, migration, sync toggle, and restored DOM ownership.
 await put({...project,clips:[{...clip,layer:'under-intro-text'}]});const p=await browser.newPage({viewport:{width:1500,height:1100}});p.on('pageerror',e=>errors.push(e.message));await p.goto(base+'/?workspace=edit');const f2=await(await p.waitForSelector('iframe')).contentFrame();await f2.locator('.studio-edit-workspace').waitFor({state:'visible'});assert.equal(await f2.locator('[data-layer="under-text"] .studio-edit-clip').count(),1);await f2.locator('[data-layer="under-text"] .studio-edit-clip').click();assert.equal(await f2.getByRole('combobox',{name:'合成层级',exact:true}).inputValue(),'under-text');await f2.getByRole('button',{name:'返回展示',exact:true}).click();await f2.getByRole('button',{name:'展示页',exact:true}).click();
 for(const option of await f2.locator('#studio-design option').evaluateAll(es=>es.map(e=>e.value))){await f2.locator('#studio-design').selectOption(option);const art=f2.locator('.studio-views>section:not([hidden]) .design-art');await art.locator('.studio-editor-footage-below [data-clip-id]').waitFor({state:'visible'});assert.equal(await art.locator('.studio-editor-text-layers .hero-name').count(),1);assert.equal(await f2.locator('.studio-editor-text-layers').count(),1);}
 await f2.getByRole('checkbox',{name:'同步剪辑素材',exact:true}).uncheck();assert.equal(await f2.locator('.studio-editor-text-layers').count(),0);assert.equal(await f2.locator('.studio-views>section:not([hidden]) .composition .hero-name').count(),1);assert.deepEqual(errors,[]);
 console.log('PASS: real pixels above/below both intro texts and showcase title, legacy lanes, uninterrupted audio/video, RGB control with retained optics, all 13 designs, sync cleanup, native exports and project preservation');
}finally{await browser.close();await put(saved);}
