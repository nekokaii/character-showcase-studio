import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {chromium} from 'playwright-core';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),read=file=>fs.readFile(path.join(root,file),'utf8');
const work=path.join(root,'work/ending-visual-reset-qa');await fs.mkdir(work,{recursive:true});
const logic=await read('src/exploration-full-logic.js');
const prefix=(await read('src/studio-text.js'))+'\n'+logic.slice(logic.indexOf('\n')+1,logic.indexOf('const template='))
 .replace('/* VARIANT_CODEC */',await read('src/variant-codec.js')).replace('/* MOTION_FUNCTIONS */',await read('src/motion-clock.js')).replace('/* TIMELINE_FUNCTIONS */',(await read('runtime/crt-motion.js'))+'\n'+(await read('src/timeline.js')));
const scope=vm.createContext({document:{getElementById:()=>({})},matchMedia:()=>({matches:false}),window:{openai:{setWidgetState:()=>Promise.resolve()}}});vm.runInContext(prefix,scope);
const seed=JSON.parse(vm.runInContext('JSON.stringify(state)',scope)),baseline=JSON.parse(vm.runInContext('JSON.stringify(encodeStudioVariants(variantBaseline))',scope));
Object.assign(seed,{name:'圆圆',brand:'星光工房',topText:'保留顶部',bottomText:'保留底部',playing:false});seed.typography.name.text='保留自定义名字';seed.typography.name.font='rounded';seed.typography.copy.author.meta='保留作者小字';seed.seriesData.fur.caption='保留毛绒短句';
Object.assign(seed.narrative,{outroEnabled:true,outroContent:'word',shutdownEnabled:false,postEffect:'none'});
for(const variant of Object.values(seed.variants)){variant.accent='#123abc';variant.background='dark';variant.ringSpeed=2.4;variant.effects.grain=.15;variant.geometryBySeries.fur='burst';}
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url=pathToFileURL(path.join(root,'index.html')).href+'?editor-render=1';await page.goto(url);
 const frame=await(await page.waitForSelector('iframe')).contentFrame();await frame.waitForSelector('#studio-design');
 await frame.evaluate(design=>window.dispatchEvent(new CustomEvent('openai:set_globals',{detail:{globals:{widgetState:{privateContent:design}}}})),seed);
 await frame.locator('.studio-narrative:not(.studio-postprocessing)').evaluate(el=>el.open=true);
 await frame.locator('#studio-outro-color-mode').selectOption('custom');
 await frame.locator('#studio-outro-color').evaluate(el=>{el.value='#ef72aa';el.dispatchEvent(new Event('input',{bubbles:true}));});
 await frame.waitForFunction(()=>window.openai.widgetState?.privateContent?.narrative?.outroColor==='#ef72aa');
 assert.equal(await frame.locator('[data-design="couture"] .ending-word').evaluate(el=>getComputedStyle(el).color),'rgb(239, 114, 170)');
 const snapshot=()=>frame.evaluate(()=>JSON.parse(JSON.stringify(window.openai.widgetState.privateContent)));
 const before=await snapshot(),reset=frame.locator('[data-design="couture"] [data-reset-visuals]'),undo=frame.locator('[data-design="couture"] [data-undo-visuals]');
 await reset.click();const after=await snapshot();assert.deepEqual(after.variants,baseline,'all thirteen schemes use their own defaults');
 const withoutVariants=value=>{const copy=structuredClone(value);delete copy.variants;return copy;};assert.deepEqual(withoutVariants(after),withoutVariants(before),'all content and shared settings survive reset');assert.ok(await reset.isDisabled());assert.ok(await undo.isVisible());
 // Existing controls must still modify the live objects after a reset.
 await frame.locator('[data-design="couture"] [data-vfield="background"]').selectOption('dark');
 assert.equal(await frame.locator('[data-design="couture"] .design-art').getAttribute('data-background'),'dark');
 assert.notDeepEqual((await snapshot()).variants.couture,baseline.couture);
 await undo.click();assert.deepEqual((await snapshot()).variants,before.variants,'undo restores all previous visual parameters');assert.ok(await undo.isHidden());
 await frame.locator('[data-design="couture"] [data-reset-visuals]').screenshot({path:path.join(work,'reset-control.png')});
 await frame.locator('#studio-outro-color-mode').selectOption('theme');assert.equal(await frame.locator('[data-design="couture"] .ending-word').evaluate(el=>el.style.color),'');
 await frame.locator('#studio-outro-color-mode').selectOption('custom');
 await page.reload();const restored=await(await page.waitForSelector('iframe')).contentFrame();await restored.waitForFunction(()=>document.querySelector('#studio-outro-color-mode')?.value==='custom');
 assert.equal(await restored.locator('#studio-outro-color').inputValue(),'#ef72aa');
 const design=await restored.evaluate(()=>JSON.parse(JSON.stringify(window.openai.widgetState.privateContent)));
 const render=await browser.newPage({viewport:{width:1920,height:1080}});await render.goto(url);const rf=await(await render.waitForSelector('iframe')).contentFrame();await rf.waitForFunction(()=>!!globalThis.studioEditorAPI);
 const project={version:1,assets:[],clips:[],grade:{exposure:0,contrast:1,saturation:1,hue:0},output:{width:1920,height:1080,fps:30,duration:20,bitrate:12,codec:'h264',acceleration:'cpu',workers:1}};
 await rf.evaluate(data=>studioEditorAPI.loadRender(data),{project,design,images:{}});await rf.evaluate(()=>studioEditorAPI.seekRender(19));
 assert.equal(await rf.locator('.studio-edit-stage .ending-word').evaluate(el=>getComputedStyle(el).color),'rgb(239, 114, 170)','video render uses saved custom color');
 await render.screenshot({path:path.join(work,'ending.png')});assert.deepEqual(errors,[]);
 console.log('PASS: ending color controls, theme restore, persistence and render; 13-scheme reset, retained content, live controls and undo.');
}finally{await browser.close();}
