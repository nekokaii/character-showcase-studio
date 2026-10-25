import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const work=path.join(root,'work/rounded-font-qa');await fs.mkdir(work,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[],network=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
 // File mode exercises the embedded assets without touching the local editor's project.
 await page.goto(pathToFileURL(path.join(root,'index.html')).href+'?editor-render=1');
 const frame=await(await page.waitForSelector('iframe')).contentFrame();await frame.waitForFunction(()=>!!globalThis.studioEditorAPI);
 const cdp=await page.context().newCDPSession(frame);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
 const fonts=async selector=>{
  await frame.locator(selector).evaluate(el=>{document.getElementById('font-probe')?.removeAttribute('id');el.id='font-probe';});
  const {root}=await cdp.send('DOM.getDocument',{depth:-1,pierce:true});
  const find=n=>n.attributes?.includes('font-probe')?n:(n.contentDocument&&find(n.contentDocument))||n.children?.map(find).find(Boolean);
  const node=find(root);assert.ok(node,'CDP can inspect the rendered text');
  return (await cdp.send('CSS.getPlatformFontsForNode',{nodeId:node.nodeId})).fonts;
 };
 const project={version:1,assets:[],clips:[],grade:{exposure:0,contrast:1,saturation:1,hue:0},output:{width:1920,height:1080,fps:30,duration:14,bitrate:12,codec:'h264',acceleration:'cpu',workers:1}};
 const design={version:6,design:'character-explorations',activeDesign:'couture',name:'粗奶丸 Nova',brand:'圆润工作室',introDuration:0,frame:'none',typography:{name:{font:'rounded'},character:{font:'rounded'},author:{font:'rounded'}},narrative:{introStyle:'model',outroEnabled:false,postEffect:'none'}};
 const load=async(d=design,p=project,t=.5,target=frame)=>{await target.evaluate(data=>studioEditorAPI.loadRender(data),{project:p,design:d,images:{}});await target.evaluate(t=>studioEditorAPI.seekRender(t),t);};
 const name='.studio-edit-stage .hero-name';
 for(const weight of ['400','700','900']){
  await load({...design,typography:{...design.typography,name:{font:'rounded',weight}}});
  const used=await fonts(name),chinese=used.find(f=>/ChillRoundF/.test(f.postScriptName));
  assert.ok(chinese?.isCustomFont&&chinese.glyphCount===3,JSON.stringify(used));
  assert.ok(used.some(f=>/^Nunito/.test(f.postScriptName)&&f.isCustomFont),'Latin text retains Nunito');
  console.log(weight,used.map(f=>({family:f.familyName,postScriptName:f.postScriptName,glyphs:f.glyphCount})));
 }
 await frame.locator(name).screenshot({path:path.join(work,'rounded-title.png')});await page.screenshot({path:path.join(work,'landscape.png')});
 // Saved rounded keys also work when the title follows the scheme font.
 const defaults=JSON.parse(await fs.readFile(path.join(root,'runtime/startup-defaults.json'),'utf8')).widgetState.privateContent;
 await load({...design,typography:{name:{font:'auto'}},variants:{...defaults.variants,couture:{...defaults.variants.couture,typeface:'rounded'}}});
 assert.ok((await fonts(name)).some(f=>/ChillRoundF/.test(f.postScriptName)&&f.glyphCount===3));
 const portrait=await browser.newPage({viewport:{width:1080,height:1920}});await portrait.goto(pathToFileURL(path.join(root,'index.html')).href+'?editor-render=1');
 const pf=await(await portrait.waitForSelector('iframe')).contentFrame();await pf.waitForFunction(()=>!!globalThis.studioEditorAPI);
 await load({...design,ratio:'portrait',name:'粗奶丸·圆润角色展示'},{...project,output:{...project.output,width:1080,height:1920}},.5,pf);
 const bounds=await pf.locator(name).evaluate(el=>{const r=document.createRange();r.selectNodeContents(el);const b=r.getBoundingClientRect(),a=el.closest('.design-art').getBoundingClientRect();return {text:b.toJSON(),art:a.toJSON()};});
 assert.ok(bounds.text.left>=bounds.art.left-1&&bounds.text.right<=bounds.art.right+1&&bounds.text.top>=bounds.art.top-1&&bounds.text.bottom<=bounds.art.bottom+1,'long portrait title fits the canvas');
 assert.equal(bounds.art.width,1080);assert.equal(bounds.art.height,1920);assert.ok(Math.abs(bounds.art.top)<1,'portrait canvas fills the render viewport');
 await portrait.screenshot({path:path.join(work,'portrait.png')});await portrait.close();
 await load({...design,introDuration:8,narrative:{...design.narrative,introStyle:'story',characterShotDuration:4,authorShotDuration:4,characterCorner:'center',authorCorner:'center'}},project,1);
 const story='.studio-edit-stage .story-shot[data-story-role="character"] .story-title';
 assert.ok((await fonts(story)).some(f=>/ChillRoundF/.test(f.postScriptName)&&f.glyphCount===3),'intro title uses the same Chinese rounded font');
 await page.screenshot({path:path.join(work,'intro.png')});
 await load(JSON.parse(JSON.stringify(design)));
 assert.ok((await fonts(name)).some(f=>/ChillRoundF/.test(f.postScriptName)),'project JSON round-trip retains the font');
 assert.deepEqual(network,[],'preview and render require no network font downloads');assert.deepEqual(errors,[]);
 console.log('PASS: embedded Chinese rounded glyphs, Latin Nunito, weights, scheme default, portrait fitting, intro titles and saved project restore.');
}finally{await browser.close();}
