import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
const base=process.env.STUDIO_TEST_URL||'http://127.0.0.1:19968';
assert.notEqual(new URL(base).port,'19378','use an isolated service, never the user project');
const cap=await(await fetch(base+'/__editor/capabilities')).json();
const saved=await(await fetch(base+'/__editor/project')).json();
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const connected=async()=>{const frame=await(await page.waitForSelector('iframe')).contentFrame();await frame.locator('.studio-editor-status').filter({hasText:'本机视频引擎已连接'}).waitFor();return frame;};
 await page.goto(base+'/?workspace=edit');let frame=await connected();
 await frame.getByLabel('导出并行度',{exact:true}).selectOption('8');
 await page.waitForTimeout(900);
 let project=await(await fetch(base+'/__editor/project')).json();assert.equal(project.output.workers,8,'manual setting is saved as a number');
 await page.reload();frame=await connected();assert.equal(await frame.getByLabel('导出并行度',{exact:true}).inputValue(),'8','reload restores parallelism');
 await frame.getByLabel('导出并行度',{exact:true}).selectOption('0');await page.waitForTimeout(900);
 project=await(await fetch(base+'/__editor/project')).json();assert.equal(project.output.workers,0);
 await page.reload();frame=await connected();assert.equal(await frame.getByLabel('导出并行度',{exact:true}).inputValue(),'0');
 assert.deepEqual(errors,[]);
 console.log('PASS: editor parallelism control, numeric autosave, reload and automatic mode');
}finally{
 await browser.close();const response=await fetch(base+'/__editor/project',{method:'PUT',headers:{'X-Studio-Token':cap.token,'Content-Type':'application/json'},body:JSON.stringify(saved)});assert.ok(response.ok);
}
