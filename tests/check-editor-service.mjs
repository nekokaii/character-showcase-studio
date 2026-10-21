import assert from 'node:assert/strict';
const base=process.env.STUDIO_TEST_URL||'http://127.0.0.1:19378';
const cap=await(await fetch(base+'/__editor/capabilities')).json();assert.equal(cap.ready,true);
const post=(route,payload,headers={})=>fetch(base+'/__editor/'+route,{method:'POST',headers:{'X-Studio-Token':cap.token,'Content-Type':'application/json',...headers},body:JSON.stringify(payload)});
assert.equal((await fetch(base+'/.studio-media/project.json')).status,403);
assert.equal((await fetch(base+'/__editor/capabilities',{headers:{Origin:'https://example.com'}})).status,403);
assert.equal((await post('export',{}, {'X-Studio-Token':''})).status,403);
const project={version:1,assets:[],clips:[],grade:{exposure:0,contrast:1,saturation:1,hue:0},output:{width:320,height:180,fps:12,duration:10,bitrate:2,codec:'h264'}};
assert.equal((await post('export',{project:{...project,output:{...project.output,width:321}}})).status,400);
const start=await post('export',{project});assert.equal(start.status,202);const job=await start.json();
assert.equal((await post('export',{project})).status,409);
assert.equal((await fetch(base+'/__editor/job/'+job.id,{method:'DELETE',headers:{'X-Studio-Token':cap.token}})).status,200);
let result;for(let i=0;i<100;i++){result=await(await fetch(base+'/__editor/job/'+job.id)).json();if(result.status!=='rendering')break;await new Promise(r=>setTimeout(r,200));}
assert.equal(result.status,'cancelled');
assert.equal((await post('export',{project:{...project,output:{...project.output,codec:'bad'}}})).status,400);
console.log('PASS: private source paths, origin/token guards, output validation, single-export limit, cancellation and subsequent service health');
