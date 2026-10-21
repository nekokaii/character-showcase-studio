// Keep native IO outside the opaque-origin artwork sandbox.
(()=>{
 const frame=document.getElementById('codex-visualization'),renderOnly=new URLSearchParams(location.search).get('editor-render')==='1';let capability;let saves=Promise.resolve();

 const monitorId=new URLSearchParams(location.search).get('monitor');let monitorWindow,monitorFrame,latestMonitor,monitorLoaded=false,monitorPinned=false;
 const remember=packet=>latestMonitor={...packet,content:packet.content||latestMonitor?.content};
 const notifyMonitor=()=>frame.contentWindow.postMessage({type:'studio-monitor-active',active:!!monitorWindow&&!monitorWindow.closed},'*');
 const sendMonitor=packet=>{if(!monitorWindow||monitorWindow.closed)return;if(monitorPinned)monitorWindow.postMessage({type:'studio-monitor-pip-state',payload:packet},location.origin);else monitorWindow.postMessage({type:'studio-monitor-deliver',payload:packet},location.origin);};
 // Ordinary-window fallback remains a clean picture-only page.
 if(monitorId){
  document.title='Showcase Monitor';document.documentElement.style.background='#000';document.body.style.background='#000';frame.style.cssText='display:block;width:100vw;height:100dvh;margin:0;border:0;visibility:hidden';
  frame.addEventListener('load',()=>{monitorLoaded=true;if(latestMonitor)frame.contentWindow.postMessage({type:'studio-monitor-state',payload:latestMonitor},'*');});
  window.addEventListener('message',e=>{if(e.source!==opener||e.origin!==location.origin||e.data?.type!=='studio-monitor-deliver')return;remember(e.data.payload);if(monitorLoaded)frame.contentWindow.postMessage({type:'studio-monitor-state',payload:e.data.payload},'*');});
  opener?.postMessage({type:'studio-monitor-ready',id:monitorId},location.origin);
 }
 async function openMonitor(){
  if(monitorWindow&&!monitorWindow.closed){monitorWindow.focus();return {ok:true,pinned:monitorPinned};}
  monitorLoaded=false;
  if(window.documentPictureInPicture){try{
   monitorWindow=await documentPictureInPicture.requestWindow({width:960,height:540,disallowReturnToOpener:true,preferInitialWindowPlacement:true});monitorPinned=true;
   const c=await capabilities(),win=monitorWindow,d=win.document;win.__studioMonitorHost=window;d.title='Showcase Monitor';d.documentElement.style.cssText='margin:0;width:100%;height:100%;overflow:hidden;background:#000';d.body.style.cssText='margin:0;width:100%;height:100%;overflow:hidden;background:#000';
   monitorFrame=d.createElement('iframe');monitorFrame.id='codex-visualization';monitorFrame.title='Showcase Monitor';monitorFrame.setAttribute('sandbox','allow-scripts');monitorFrame.setAttribute('referrerpolicy','no-referrer');monitorFrame.style.cssText='display:block;position:absolute;inset:0;width:100%;height:100%;border:0;margin:0;visibility:hidden';
   // This bridge runs in the actual parent realm of the isolated artwork.
   const relay=d.createElement('script');relay.textContent=`(()=>{const cap=${JSON.stringify({...c,renderOnly:true,openEditor:false})};window.addEventListener('message',e=>{const child=document.getElementById('codex-visualization')?.contentWindow;if(e.source===window.__studioMonitorHost&&e.data?.type==='studio-monitor-pip-state'){child?.postMessage({type:'studio-monitor-state',payload:e.data.payload},'*');return;}const q=e.data;if(e.source===child&&q?.type==='studio-monitor-render-ready'){document.getElementById('codex-visualization').style.visibility='visible';return;}if(e.source!==child||q?.type!=='studio-editor-request')return;child.postMessage({type:'studio-editor-response',id:q.id,...(q.action==='capabilities'?{result:cap}:{error:'监视窗口为只读'})},'*');});})();`;
   d.body.append(relay);monitorFrame.addEventListener('load',()=>{monitorLoaded=true;if(latestMonitor)sendMonitor(latestMonitor);});monitorFrame.srcdoc=frame.srcdoc;d.body.append(monitorFrame);
   win.addEventListener('pagehide',()=>{if(monitorWindow===win){monitorWindow=null;monitorFrame=null;monitorPinned=false;monitorLoaded=false;notifyMonitor();}},{once:true});
   return {ok:true,pinned:true};
  }catch(e){monitorWindow?.close();monitorWindow=null;monitorPinned=false;}}
  monitorWindow=window.open('/?editor-render=1&monitor='+crypto.randomUUID(),'showcase-monitor','popup,width=960,height=540,resizable=yes');monitorPinned=false;
  if(!monitorWindow)throw Error('浏览器阻止了监视窗口，请允许此站点弹出窗口');
  return {ok:true,pinned:false,notice:'已打开纯画面监视；此浏览器未能直接置顶，请使用桌面 Chrome / Edge。'};
 }
 window.addEventListener('message',event=>{
  if(monitorId&&event.source===frame?.contentWindow&&event.data?.type==='studio-monitor-render-ready'){frame.style.visibility='visible';return;}
  if(event.source===frame?.contentWindow&&event.data?.type==='studio-editor-monitor-update'&&!monitorId){remember(event.data.payload);if(monitorWindow&&!monitorWindow.closed){if(monitorPinned&&monitorLoaded)sendMonitor(event.data.payload);else if(!monitorPinned)sendMonitor(event.data.payload);}else notifyMonitor();}
  if(event.source===monitorWindow&&event.origin===location.origin&&event.data?.type==='studio-monitor-ready'&&latestMonitor)sendMonitor(latestMonitor);
 });
 const capabilities=()=>capability||(capability=fetch('/__editor/capabilities').then(r=>{if(!r.ok)throw Error('请使用 start-editor.cmd 启动本机剪辑版');return r.json();}).catch(e=>{capability=null;throw e;}));
 window.addEventListener('message',async event=>{
  const d=event.data;if(event.source!==frame?.contentWindow||d?.type!=='studio-editor-request'||typeof d.id!=='string')return;
  try{
   if(renderOnly&&d.action!=='capabilities')throw Error('导出窗口仅用于画面渲染');
   if(d.action==='monitorOpen'){if(monitorId)throw Error('监视窗口不能再打开监视窗口');const result=await openMonitor();frame.contentWindow.postMessage({type:'studio-editor-response',id:d.id,result},'*');return;}
   const c=await capabilities();let result;
   const routes={capabilities:['GET','capabilities'],load:['GET','project'],save:['PUT','project'],validateProject:['POST','project/validate'],import:['POST','import?name='+encodeURIComponent(d.payload?.name||'素材')],preview:['POST','preview/'+d.payload?.id],asset:['GET','asset/'+d.payload?.id],export:['POST','export'],job:['GET','job/'+d.payload?.id],cancel:['DELETE','job/'+d.payload?.id]};
   if(d.action==='projectDownload'){const blob=new Blob([JSON.stringify(d.payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='showcase-edit.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);result={ok:true};}else if(d.action==='download'){
    if(!/^\/__editor\/download\/[a-f0-9-]{36}\/showcase\.(mp4|mov|webm)$/.test(d.payload?.url))throw Error('无效下载地址');
    const a=document.createElement('a');a.href=d.payload.url;a.download='';a.click();result={ok:true};
   }else if(d.action==='capabilities')result={...c,renderOnly,openEditor:new URLSearchParams(location.search).get('workspace')==='edit'};
   else{
    if(!routes[d.action]||(['asset','preview','job','cancel'].includes(d.action)&&!/^[a-f0-9-]{36}$/.test(d.payload?.id)))throw Error('无效操作');
    const [method,route]=routes[d.action];
    const execute=async()=>{const r=await fetch('/__editor/'+route,{method,headers:{'X-Studio-Token':c.token,...(d.action==='import'?{}:{'Content-Type':'application/json'})},body:method==='GET'||method==='DELETE'?undefined:d.action==='import'?d.payload.file:JSON.stringify(d.payload)});const data=await r.json();if(!r.ok)throw Error(data.error||'操作失败');return data;};
    if(d.action==='save'){const write=saves.then(execute);saves=write.catch(()=>{});result=await write;}else result=await execute();
   }
   frame.contentWindow.postMessage({type:'studio-editor-response',id:d.id,result},'*');
  }catch(e){frame.contentWindow.postMessage({type:'studio-editor-response',id:d.id,error:e.message},'*');}
 });
})();
