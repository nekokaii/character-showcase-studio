import { chromium } from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=process.env.STUDIO_TEST_URL||'http://127.0.0.1:19378';
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.goto(base);const frame=await (await page.waitForSelector('iframe')).contentFrame();
 await frame.getByRole('button',{name:'剪辑工作台',exact:true}).click();
 await frame.locator('.studio-edit-workspace').waitFor({state:'visible'});
 await page.waitForTimeout(1500);
 assert.equal(await frame.locator('.studio-edit-stage>.design-art').count(),1);
 assert.equal(await frame.getByRole('spinbutton',{name:'宽度 px',exact:true}).inputValue(),'1920');
 console.log('Status:',await frame.locator('.studio-editor-status').innerText());
 await fs.mkdir('work/editor-qa',{recursive:true});
 await page.screenshot({path:'work/editor-qa/workspace.png'});
 await frame.getByRole('button',{name:'返回展示',exact:true}).click();
 assert.equal(await frame.locator('.studio-edit-stage>.design-art').count(),0);
 assert.equal(await frame.locator('.studio-views .design-art').count(),13);
 assert.deepEqual(errors,[]);
 console.log('PASS: workspace switch, live showcase mount, output controls, restored design UI, no page errors');
}finally{await browser.close();}
