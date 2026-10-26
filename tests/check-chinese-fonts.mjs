import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
import {validateStudioFonts} from '../runtime/studio-font-data.mjs';
import {validateProject,createMediaService} from '../tools/editor-media.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),read=file=>fs.readFile(path.join(root,file),'utf8');
const work=path.join(root,'work/chinese-fonts-qa');await fs.mkdir(work,{recursive:true});
const fixture=await fs.readFile(path.join(root,'assets/fonts/zcoolkuaile.woff2'));
const font={id:'custom:'+'a'.repeat(32),name:'测试字体',data:'data:font/woff2;base64,'+fixture.toString('base64')};
assert.deepEqual(validateStudioFonts([font]),[font]);
for(const invalid of [[font,font],[{...font,id:'../bad'}],[{...font,data:'https://example.com/font.woff2'}],[{...font,data:font.data.replace('/woff2','/otf')}],[{...font,name:'bad\0name'}],Array(9).fill(font)])assert.throws(()=>validateStudioFonts(invalid));
// CFF-flavoured WOFF2 must pass the same signature check as TrueType WOFF2.
validateStudioFonts([{...font,data:'data:font/woff2;base64,'+(await fs.readFile(path.join(root,'assets/fonts/chill-round-f-regular.woff2'))).toString('base64')}]);
const oldStore=process.env.STUDIO_MEDIA_STORE;process.env.STUDIO_MEDIA_STORE=path.join(work,'store-'+Date.now());
let base;const service=createMediaService(root,()=>base),document=await read('index.html');
if(oldStore===undefined)delete process.env.STUDIO_MEDIA_STORE;else process.env.STUDIO_MEDIA_STORE=oldStore;
const server=http.createServer(async(req,res)=>{if(await service(req,res,new URL(req.url,base)))return;res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(document);});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const connect=async()=>{const frame=await(await page.waitForSelector('iframe')).contentFrame();await frame.waitForSelector('#studio-text-font',{state:'attached'});return frame;};
 await page.goto(base);let frame=await connect();await frame.waitForFunction(()=>document.querySelector('.studio-editor-status')?.textContent.includes('本机视频引擎已连接'),{timeout:60000});
 const seed=JSON.parse(await read('runtime/startup-defaults.json')).widgetState.privateContent;
 const design={...seed,activeDesign:'couture',ratio:'landscape',frame:'none',name:'角色展示夏风海浪',playing:false,time:6,introDuration:0,narrative:{...seed.narrative,introStyle:'model',postEffect:'none',outroEnabled:false},typography:{name:{weight:'400'}}};
 await frame.evaluate(design=>window.dispatchEvent(new CustomEvent('openai:set_globals',{detail:{globals:{widgetState:{privateContent:design}}}})),design);
 await frame.locator('.studio-typography').evaluate(el=>el.open=true);
 let cdp;
 const fonts=async(selector,target=frame)=>{
  const session=target===frame?(cdp??=await page.context().newCDPSession(frame)):await target.page().context().newCDPSession(target);await session.send('DOM.enable');await session.send('CSS.enable');
  await target.locator(selector).evaluate(el=>{document.getElementById('cjk-probe')?.removeAttribute('id');el.id='cjk-probe';});
  const {root}=await session.send('DOM.getDocument',{depth:-1,pierce:true}),find=n=>n.attributes?.includes('cjk-probe')?n:(n.contentDocument&&find(n.contentDocument))||n.children?.map(find).find(Boolean);
  return (await session.send('CSS.getPlatformFontsForNode',{nodeId:find(root).nodeId})).fonts;
 };
 const name='.design-art[data-kind="couture"] .hero-name',settle=async()=>{await frame.evaluate(()=>document.fonts.ready);await frame.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));};
 for(const [key,ps]of [['cn-serif','ZCOOLXiaoWei-Regular'],['serif','ZCOOLXiaoWei-Regular'],['brush','MaShanZheng-Regular'],['playful','ZCOOLKuaiLe-Regular'],['rounded','ChillRoundFRegular']]){
  await frame.locator('#studio-text-font').selectOption(key);await settle();const used=await fonts(name);
  assert.ok(used.some(f=>f.postScriptName===ps&&f.isCustomFont&&f.glyphCount===8),JSON.stringify(used));
  await frame.locator(name).screenshot({path:path.join(work,key+'.png')});
 }
 await frame.locator('#studio-text-font').selectOption('auto');await frame.locator('[data-design="couture"] [data-vfield="typeface"]').selectOption('brush');await settle();assert.ok((await fonts(name)).some(f=>f.postScriptName==='MaShanZheng-Regular'));
 await frame.locator('.studio-font-library').evaluate(el=>el.open=true);
 await frame.locator('#studio-font-import').setInputFiles(path.join(root,'assets/fonts/zcoolkuaile.woff2'));
 await frame.waitForFunction(()=>document.querySelector('#studio-text-font')?.value.startsWith('custom:'));await settle();
 const id=await frame.locator('#studio-text-font').inputValue();assert.ok((await fonts(name)).some(f=>f.postScriptName==='ZCOOLKuaiLe-Regular'));
 assert.equal(await frame.locator('[data-font-library] .studio-font-library-row').count(),1);
 await frame.locator('#studio-font-import').setInputFiles(path.join(root,'assets/fonts/zcoolkuaile.woff2'));await frame.waitForFunction(()=>!document.querySelector('#studio-font-import').disabled);assert.equal(await frame.locator('[data-font-library] .studio-font-library-row').count(),1,'duplicate import reuses the same font');
 await frame.locator('#studio-font-import').setInputFiles({name:'broken.woff2',mimeType:'font/woff2',buffer:Buffer.from('wOF2broken-font')});
 await frame.waitForFunction(()=>document.querySelector('[data-font-status]')?.textContent.includes('无法加载'));assert.equal(await frame.locator('#studio-text-font').inputValue(),id,'corrupt import retains the selected font');
 await frame.locator('#studio-text-target').selectOption('caption');await frame.locator('#studio-text-font').selectOption(id);await frame.locator('#studio-text-target').selectOption('name');
 await frame.locator('[data-design="couture"] [data-vfield="typeface"]').selectOption(id);
 const cap=await(await fetch(base+'/__editor/capabilities')).json(),headers={'X-Studio-Token':cap.token,'Content-Type':'application/json'};
 // Wait for the real debounced project write, then validate the backend roundtrip.
 let saved;for(let n=0;n<40;n++){saved=await(await fetch(base+'/__editor/project')).json();if(saved?.template?.fonts?.length&&saved.template.design.typography.caption.font===id)break;await new Promise(r=>setTimeout(r,100));}
 validateProject(saved);assert.equal(saved.template.fonts[0].id,id);assert.equal(saved.template.design.variants.couture.typeface,id);assert.equal(saved.template.fonts[0].data,font.data);
 const invalid=structuredClone(saved);invalid.template.fonts[0].data='https://example.com/font.woff2';assert.throws(()=>validateProject(invalid));
 const dl=page.waitForEvent('download');await frame.locator('[data-editor-mode="editing"]').click();await frame.locator('[data-save-project]').click();const downloaded=await dl;await downloaded.saveAs(path.join(work,'with-font.json'));
 const project=JSON.parse(await read('work/chinese-fonts-qa/with-font.json'));assert.equal(project.template.fonts[0].id,id);validateProject(project);
 await page.reload();frame=await connect();cdp=null;await frame.waitForFunction(()=>document.querySelector('#studio-text-font')?.value.startsWith('custom:'));await settle();assert.ok((await fonts(name)).some(f=>f.postScriptName==='ZCOOLKuaiLe-Regular'),'saved project reload uses the imported Chinese font');
 // Browser cache must also work without the media backend's project restore.
 await fetch(base+'/__editor/project',{method:'PUT',headers,body:'null'});await page.reload();frame=await connect();cdp=null;await frame.waitForFunction(()=>document.querySelector('#studio-text-font option[data-custom-font]'));await settle();assert.ok((await fonts(name)).some(f=>f.postScriptName==='ZCOOLKuaiLe-Regular'),'IndexedDB restores font bytes independently of compact state');
 await frame.locator('.studio-typography').evaluate(el=>el.open=true);await frame.locator('.studio-font-library').evaluate(el=>el.open=true);await frame.locator('[data-font-library] button').click();await settle();assert.equal(await frame.locator('#studio-text-font').inputValue(),'auto');assert.equal(await frame.locator('[data-design="couture"] [data-vfield="typeface"]').inputValue(),'editorial');
 await frame.locator('[data-editor-mode="editing"]').click();await frame.locator('[data-load-project]').setInputFiles(path.join(work,'with-font.json'));await frame.waitForFunction(()=>document.querySelector('.studio-editor-status')?.textContent.includes('工程已恢复'));await settle();assert.ok((await fonts(name)).some(f=>f.postScriptName==='ZCOOLKuaiLe-Regular'),'project carries the font after browser-library deletion');
 // Actual render API must await custom fonts before capturing its first frame.
 const render=await browser.newPage({viewport:{width:1920,height:1080}});await render.goto(base+'/?editor-render=1');const rf=await(await render.waitForSelector('iframe')).contentFrame();await rf.waitForFunction(()=>!!studioEditorAPI);
 await rf.evaluate(data=>studioEditorAPI.loadRender(data),{project,design:project.template.design,images:{},fonts:project.template.fonts});await rf.evaluate(()=>studioEditorAPI.seekRender(6));
 assert.ok((await fonts(name,rf)).some(f=>f.postScriptName==='ZCOOLKuaiLe-Regular'&&f.isCustomFont));await render.screenshot({path:path.join(work,'custom-render.png')});
 // HTML / OBS output carries fonts separately from the compact parameter state.
 const outputPayload={kind:'html',state:project.template.design,fonts:project.template.fonts,images:{},config:{width:1920,includeCharacters:false}};
 const output=await page.evaluate(payload=>{const f=document.getElementById('codex-visualization'),template=f.srcdoc.replace(/<script type="application\/json" id="codex-visualization-widget-state">[\s\S]*?<\/script>/,'<script type="application/json" id="codex-visualization-widget-state">__CODEX_VISUALIZATION_WIDGET_STATE__</script>');return buildStudioOutputDocument(template,payload,document.querySelector('meta[http-equiv="Content-Security-Policy"]').content);},outputPayload);
 const html=path.join(work,'custom-output.html');await fs.writeFile(html,output.html);const standalone=await browser.newPage({viewport:{width:1920,height:1080}});await standalone.goto(pathToFileURL(html).href);const of=await(await standalone.waitForSelector('iframe')).contentFrame();await of.waitForFunction(id=>[...document.fonts].some(f=>f.family==='StudioUser_'+id.slice(7)&&f.status==='loaded'),id);assert.ok((await fonts(name,of)).some(f=>f.postScriptName==='ZCOOLKuaiLe-Regular'&&f.isCustomFont),'standalone renders imported glyphs without the installed font or editor cache');
 // One real FFmpeg export also exercises the template-font fallback path used
 // by API callers that supply a complete saved project without separate fonts.
 const exportProject={...project,output:{...project.output,width:640,height:360,fps:2,duration:.5,durationMode:'custom',workers:1,acceleration:'cpu',codec:'h264',bitrate:3}};
 const response=await fetch(base+'/__editor/export',{method:'POST',headers,body:JSON.stringify({project:exportProject})});assert.ok(response.ok,await response.clone().text());const job=await response.json();let result;
 for(let n=0;n<300;n++){result=await(await fetch(base+'/__editor/job/'+job.id)).json();if(result.status!=='rendering')break;await new Promise(r=>setTimeout(r,200));}
 assert.equal(result.status,'complete',JSON.stringify(result));assert.ok((await(await fetch(base+result.download)).arrayBuffer()).byteLength>500);
 assert.deepEqual(errors,[]);console.log('PASS: real Chinese glyphs in four distinct fonts; scheme/per-text choices; custom import, duplicate/corrupt handling, browser cache, project restore, render, standalone output and actual FFmpeg export with packed fonts.');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
