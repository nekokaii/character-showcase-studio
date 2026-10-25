import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),read=file=>fs.readFile(path.join(root,file),'utf8');
const work=path.join(root,'work/workspace-layout-qa');await fs.mkdir(work,{recursive:true});
const logic=await read('src/exploration-full-logic.js');
const prefix=(await read('src/studio-text.js'))+'\n'+logic.slice(logic.indexOf('\n')+1,logic.indexOf('const template='))
 .replace('/* VARIANT_CODEC */',await read('src/variant-codec.js')).replace('/* MOTION_FUNCTIONS */',await read('src/motion-clock.js')).replace('/* TIMELINE_FUNCTIONS */',(await read('runtime/crt-motion.js'))+'\n'+(await read('src/timeline.js')));
const scope=vm.createContext({document:{getElementById:()=>({})},matchMedia:()=>({matches:false}),window:{openai:{setWidgetState:()=>Promise.resolve()}}});vm.runInContext(prefix,scope);
const seed=JSON.parse(vm.runInContext('JSON.stringify(state)',scope));
Object.assign(seed,{name:'粗奶丸 Nova',series:'fur',time:6,playing:false,introDuration:0});
Object.assign(seed.narrative,{introStyle:'model',postEffect:'none',outroEnabled:false});
for(const v of Object.values(seed.variants)){v.textMotion=false;v.parallax=false;}
const browser=await chromium.launch({channel:'chrome',headless:true});
const errors=[],url=pathToFileURL(path.join(root,'index.html')).href+'?editor-render=1';
const open=async(viewport,saved)=>{
 const page=await browser.newPage({viewport});page.on('pageerror',e=>errors.push(e.message));
 // A memory-only transport exercises project restore and synced media without
 // starting a service or reading/writing the user's saved editing project.
 if(saved)await page.addInitScript(saved=>{if(window!==top)return;addEventListener('message',event=>{
  const q=event.data;if(q?.type!=='studio-editor-request')return;event.stopImmediatePropagation();
  const result=q.action==='capabilities'?{ready:true,origin:'',hardware:{},maxExportWorkers:24}:q.action==='load'?saved:['asset','preview'].includes(q.action)?saved.assets.find(a=>a.id===q.payload.id):{};
  event.source.postMessage({type:'studio-editor-response',id:q.id,result},'*');
 },true);},saved);
 await page.goto(url);const frame=await(await page.waitForSelector('iframe')).contentFrame();await frame.waitForSelector('#studio-design');await frame.evaluate(()=>document.fonts.ready);return {page,frame};
};
const settle=frame=>frame.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
const restore=async(frame,design)=>{await frame.evaluate(design=>window.dispatchEvent(new CustomEvent('openai:set_globals',{detail:{globals:{widgetState:{privateContent:design}}}})),design);await settle(frame);};
const geometry=(frame,key)=>frame.locator(`.design-art[data-kind="${key}"]`).evaluate(art=>{
 const a=art.getBoundingClientRect(),result={};
 for(const selector of ['.composition','.hero-name','.art-edition','.edition-label','.copy-caption','.copy-subtitle','.technical','.formats','.compatibility','.barcode','.art-credit','.edge.top','.edge.bottom','.studio-editor-clip-surface']){
  const el=art.querySelector(selector);if(!el)continue;const b=el.getBoundingClientRect();
  result[selector]=b.width||b.height?[(b.x-a.x)/a.width,(b.y-a.y)/a.height,b.width/a.width,b.height/a.height]:[0,0,0,0];
 }
 return {ratio:a.width/a.height,logical:[art.offsetWidth,art.offsetHeight],parts:result};
});
const same=(a,b,label)=>{assert.ok(Math.abs(a.ratio-b.ratio)<.00001,label+' aspect');assert.deepEqual(a.logical,b.logical,label+' logical canvas');for(const [key,values]of Object.entries(a.parts))for(let i=0;i<4;i++)assert.ok(Math.abs(values[i]-b.parts[key][i])<.00025,`${label} ${key}[${i}]: ${values[i]} != ${b.parts[key][i]}`);};
const fit=async(frame,key)=>{const bounds=await frame.locator(`.design-art[data-kind="${key}"]`).evaluate(art=>{const a=art.getBoundingClientRect(),s=art.parentElement.getBoundingClientRect(),css=getComputedStyle(art.parentElement);return {a:a.toJSON(),s:s.toJSON(),x:parseFloat(css.paddingLeft),y:parseFloat(css.paddingTop)};});assert.ok(bounds.a.left>=bounds.s.left+bounds.x-1&&bounds.a.right<=bounds.s.right-bounds.x+1&&bounds.a.top>=bounds.s.top+bounds.y-1&&bounds.a.bottom<=bounds.s.bottom-bounds.y+1,'entire canvas fits its stage');};
try{
 const {page,frame}=await open({width:1600,height:1100});
 for(const ratio of ['portrait','landscape']){
  const render=await open(ratio==='portrait'?{width:1080,height:1920}:{width:1920,height:1080});
  for(const key of Object.keys(seed.variants)){
   const design={...seed,activeDesign:key,ratio,frame:key==='dual'?'vertical':'horizontal'};
   await restore(frame,design);const display=await geometry(frame,key);await fit(frame,key);
   await frame.locator('[data-editor-mode="editing"]').click();await settle(frame);
   await frame.locator('.studio-edit-workspace [data-seek]').fill('6');await settle(frame);
   same(display,await geometry(frame,key),`${ratio}/${key} display/editor`);await fit(frame,key);
   if(key==='cloud'&&ratio==='portrait')await page.screenshot({path:path.join(work,'portrait-editor.png')});
   await frame.locator('[data-editor-design]').click();await settle(frame);same(display,await geometry(frame,key),`${ratio}/${key} return`);
   const width=ratio==='portrait'?1080:1920,height=ratio==='portrait'?1920:1080;
   const project={version:1,assets:[],clips:[],grade:{exposure:0,contrast:1,saturation:1,hue:0},output:{width,height,fps:30,duration:20,durationMode:'custom',bitrate:12,codec:'h264',acceleration:'cpu',workers:1}};
   await render.frame.evaluate(data=>studioEditorAPI.loadRender(data),{project,design,images:{}});await render.frame.evaluate(()=>studioEditorAPI.seekRender(6));
   same(display,await geometry(render.frame,key),`${ratio}/${key} export`);
   if(key==='cloud'){
    if(ratio==='portrait')await page.screenshot({path:path.join(work,'portrait-display.png')});
    await frame.locator('[data-focus-preview]').click();await settle(frame);same(display,await geometry(frame,key),`${ratio}/${key} focus`);await fit(frame,key);
    await page.setViewportSize({width:900,height:850});await settle(frame);same(display,await geometry(frame,key),`${ratio}/${key} resize`);await fit(frame,key);
    await frame.locator('[data-focus-preview]').click();await page.setViewportSize({width:1600,height:1100});await settle(frame);
   }
  }
  await render.page.close();
 }
 const asset={id:'layout-image',name:'layout.png',kind:'image',image:true,status:'ready',duration:20,width:1,height:1,proxy:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg=='};
 const clip={id:'layout-clip',assetId:asset.id,start:0,in:0,out:20,layer:'under-text',x:61,y:55,scale:38,flipY:false,rotate:17,opacity:65,cropLeft:0,cropRight:0,cropTop:0,cropBottom:0,fadeIn:0,fadeOut:0,transition:'fade',volume:0,audioFadeIn:0,audioFadeOut:0,grade:{exposure:0,contrast:1,saturation:1,hue:0},key:{enabled:false}};
 const design={...seed,activeDesign:'cloud',ratio:'portrait',frame:'horizontal'},project={version:1,assets:[asset],clips:[clip],designSync:true,grade:{exposure:0,contrast:1,saturation:1,hue:0},output:{width:1080,height:1920,fps:30,duration:20,durationMode:'custom',bitrate:12,codec:'h264',acceleration:'cpu',workers:1},template:{design,images:{}}};
 const synced=await open({width:1600,height:1100},project),sf=synced.frame;
 await sf.waitForFunction(()=>document.querySelector('.studio-editor-clip-surface img')?.complete&&document.querySelector('.studio-editor-clip-surface')?.style.width);await settle(sf);
 const display=await geometry(sf,'cloud');assert.ok(display.parts['.studio-editor-clip-surface'][2]>0);
 await sf.locator('[data-editor-mode="editing"]').click();await settle(sf);same(display,await geometry(sf,'cloud'),'synced image with foreground text');
 await sf.locator('[data-editor-design]').click();await settle(sf);same(display,await geometry(sf,'cloud'),'synced image return');
 await synced.page.setViewportSize({width:1200,height:900});await settle(sf);same(display,await geometry(sf,'cloud'),'synced image resize');
 const high=await open({width:2160,height:3840});await high.frame.evaluate(data=>studioEditorAPI.loadRender(data),{project:{...project,output:{...project.output,width:2160,height:3840}},design,images:{}});await high.frame.evaluate(()=>studioEditorAPI.seekRender(6));same(display,await geometry(high.frame,'cloud'),'synced image 4K export');
 assert.deepEqual(errors,[]);console.log('PASS: all 13 schemes share display/editor/export geometry in portrait and landscape; return, focus, resize, canvas fit and synced transformed media below text through 4K.');
}finally{await browser.close();}

