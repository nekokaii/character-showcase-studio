import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright-core';
import {createMediaService,validateProject} from '../tools/editor-media.mjs';
import {createSystemFontLibrary,extractSystemFont} from '../tools/system-fonts.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),work=path.join(root,'work/system-fonts-qa');await fs.mkdir(work,{recursive:true});
// A small TTC with a head table verifies relocation and the SFNT checksum.
const collection=Buffer.alloc(112);collection.write('ttcf');collection.writeUInt32BE(0x10000,4);collection.writeUInt32BE(1,8);collection.writeUInt32BE(32,12);collection.writeUInt32BE(0x10000,32);collection.writeUInt16BE(1,36);collection.write('head',44);collection.writeUInt32BE(64,52);collection.writeUInt32BE(48,56);
const extracted=extractSystemFont(collection);assert.equal(extracted.readUInt32BE(20),28);assert.equal(extracted.length,76);let sum=0;for(let i=0;i<extracted.length;i+=4)sum=(sum+extracted.readUInt32BE(i))>>>0;assert.equal(sum,0xB1B0AFBA);
assert.throws(()=>extractSystemFont(collection,1));const corrupt=Buffer.from(collection);corrupt.writeUInt32BE(1000,52);assert.throws(()=>extractSystemFont(corrupt));
let nativeFonts=[];if(process.platform==='win32'){const library=createSystemFontLibrary();nativeFonts=await library.list();assert.ok(nativeFonts.length>0);assert.ok(nativeFonts.every(f=>!('file'in f)&&!('index'in f)));await assert.rejects(library.read('../../Windows/win.ini'));}
const prior=process.env.STUDIO_MEDIA_STORE;process.env.STUDIO_MEDIA_STORE=path.join(work,'store-'+Date.now());let base;const service=createMediaService(root,()=>base);if(prior===undefined)delete process.env.STUDIO_MEDIA_STORE;else process.env.STUDIO_MEDIA_STORE=prior;
const document=await fs.readFile(path.join(root,'index.html'),'utf8'),server=http.createServer(async(req,res)=>{if(await service(req,res,new URL(req.url,base)))return;res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(document);});await new Promise(r=>server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1500,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/?editor-render=1');let frame=await(await page.waitForSelector('iframe')).contentFrame();await frame.waitForFunction(()=>!!studioEditorAPI);
 const readOnly=await frame.evaluate(()=>new Promise(resolve=>{const id=999999;const listener=event=>{if(event.source===parent&&event.data?.type==='studio-font-library-response'&&event.data.id===id){window.removeEventListener('message',listener);resolve(event.data);}};window.addEventListener('message',listener);parent.postMessage({type:'studio-font-library-request',id,action:'system-pick'},'*');}));assert.equal(readOnly.file,null);assert.equal(await page.locator('[data-system-font-picker]').count(),0,'render-only workers cannot open font selection');
 const seed=JSON.parse(await fs.readFile(path.join(root,'runtime/startup-defaults.json'),'utf8')).widgetState.privateContent;
 const design={...seed,name:'角色展示夏风海浪',activeDesign:'couture',ratio:'landscape',time:6,playing:false,introDuration:0,narrative:{...seed.narrative,introStyle:'model',postEffect:'none',outroEnabled:false},typography:{name:{weight:'400'}}};
 // Use a normal edit page, isolated store and independent browser profile.
 await page.goto(base);frame=await(await page.waitForSelector('iframe')).contentFrame();await frame.waitForSelector('#studio-text-font',{state:'attached'});await frame.evaluate(design=>window.dispatchEvent(new CustomEvent('openai:set_globals',{detail:{globals:{widgetState:{privateContent:design}}}})),design);
 await frame.locator('.studio-typography').evaluate(el=>el.open=true);
 const picker=page.locator('[data-system-font-picker]'),open=()=>frame.locator('[data-system-font-open]').click();
 await open();await picker.waitFor();await picker.locator('[data-system-close]').click();await frame.waitForFunction(()=>!document.querySelector('[data-system-font-open]').disabled);assert.equal(await frame.locator('#studio-text-font').inputValue(),'auto','cancel preserves the current text font');
 if(nativeFonts.length){
  const data=await(await fetch(base+'/__editor/fonts')).json();assert.equal(data.fonts.length,nativeFonts.length);assert.ok(data.fonts.every(f=>!JSON.stringify(f).includes('Windows\\')));
  assert.equal((await fetch(base+'/__editor/fonts',{headers:{'Sec-Fetch-Site':'cross-site'}})).status,403,'cross-site reads are rejected');
  const choice=nativeFonts.find(f=>f.family==='宋体')||nativeFonts.find(f=>f.family==='微软雅黑')||nativeFonts[0];
  await open();await picker.locator('[data-system-search]').fill(choice.fullName);await picker.getByRole('option',{name:choice.fullName+' '+choice.style,exact:true}).click();
  await page.screenshot({path:path.join(work,'system-font-picker.png')});await picker.locator('[data-system-use]').click();await picker.waitFor({state:'detached'});
  await frame.waitForFunction(()=>document.querySelector('#studio-text-font').value.startsWith('custom:'),{timeout:60000});const id=await frame.locator('#studio-text-font').inputValue();
  const session=await page.context().newCDPSession(frame);await session.send('DOM.enable');await session.send('CSS.enable');
  await frame.locator('.design-art[data-kind="couture"] .hero-name').evaluate(el=>el.id='system-font-glyph-probe');
  const {root:dom}=await session.send('DOM.getDocument',{depth:-1,pierce:true}),find=n=>n.attributes?.includes('system-font-glyph-probe')?n:(n.contentDocument&&find(n.contentDocument))||n.children?.map(find).find(Boolean);
  const used=(await session.send('CSS.getPlatformFontsForNode',{nodeId:find(dom).nodeId})).fonts;assert.ok(used.some(f=>f.isCustomFont&&f.glyphCount===8),JSON.stringify(used));
  await frame.locator('.design-art[data-kind="couture"] .hero-name').screenshot({path:path.join(work,'installed-chinese-glyphs.png')});
  await frame.waitForFunction(()=>document.querySelector('.studio-editor-status')?.textContent.includes('本机视频引擎已连接'),{timeout:60000});
  let saved;for(let n=0;n<80;n++){saved=await(await fetch(base+'/__editor/project')).json();if(saved?.template?.fonts?.some(f=>f.id===id))break;await new Promise(r=>setTimeout(r,100));}validateProject(saved);assert.equal(saved.template.fonts[0].name,choice.fullName);assert.equal(saved.template.design.typography.name.font,id);
  const output={...saved,output:{...saved.output,width:640,height:360,fps:2,duration:.5,durationMode:'custom',workers:1,acceleration:'cpu',codec:'h264',bitrate:3}};
  const cap=await(await fetch(base+'/__editor/capabilities')).json(),response=await fetch(base+'/__editor/export',{method:'POST',headers:{'X-Studio-Token':cap.token,'Content-Type':'application/json'},body:JSON.stringify({project:output})});assert.ok(response.ok,await response.clone().text());const job=await response.json();let result;for(let n=0;n<300;n++){result=await(await fetch(base+'/__editor/job/'+job.id)).json();if(result.status!=='rendering')break;await new Promise(r=>setTimeout(r,200));}assert.equal(result.status,'complete',JSON.stringify(result));
 }
 // Browser-only fallback: explicit activation, denied permission, metadata-only
 // enumeration, and reading only the chosen face. API is mocked because Chrome
 // headless returns an empty installed-font list on this host.
 const fallback=await browser.newPage({viewport:{width:1500,height:1000}});await fallback.route('**/__editor/fonts',route=>route.fulfill({status:404,body:'{}'}));
 const fixture=(await fs.readFile(path.join(root,'assets/fonts/zcoolkuaile.woff2'))).toString('base64');await fallback.addInitScript(base64=>{window.fontQueries=0;window.fontBlobs=0;window.queryLocalFonts=async()=>{window.fontQueries++;if(window.fontQueries===1)throw new DOMException('Denied','NotAllowedError');return [{family:'测试系统字体',fullName:'浏览器系统字体测试',style:'Regular',postscriptName:'BrowserFixture',blob:async()=>{window.fontBlobs++;return new Blob([Uint8Array.from(atob(base64),c=>c.charCodeAt(0))]);}}];};},fixture);
 await fallback.goto(base);const ff=await(await fallback.waitForSelector('iframe')).contentFrame();await ff.waitForSelector('#studio-text-font',{state:'attached'});await ff.locator('.studio-typography').evaluate(el=>el.open=true);await ff.locator('[data-system-font-open]').click();const fp=fallback.locator('[data-system-font-picker]');await fp.locator('[data-system-authorize]').click();await fp.locator('[data-system-status]').filter({hasText:'未获得读取权限'}).waitFor();assert.equal(await fallback.evaluate(()=>window.fontBlobs),0);await fp.locator('[data-system-authorize]').click();await fp.getByRole('option',{name:'浏览器系统字体测试 Regular'}).click();assert.equal(await fallback.evaluate(()=>window.fontBlobs),0,'selection preview does not read font binaries');await fp.locator('[data-system-use]').click();await ff.waitForFunction(()=>Array.from(document.querySelector('#studio-text-font').options).some(o=>o.textContent.includes('浏览器系统字体测试')));assert.equal(await fallback.evaluate(()=>window.fontBlobs),1);
 assert.deepEqual(errors,[]);console.log('PASS: system font enumeration, opaque IDs, TTC extraction/checksum, native picker/search/cancel, actual Chinese glyphs, saved project and FFmpeg export; browser permission fallback reads only the chosen face.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
