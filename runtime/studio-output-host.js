// Only data crosses the sandbox. Exported markup always comes from our own build.
function buildStudioOutputDocument(frameTemplate,payload,policy){
  if(typeof frameTemplate!=='string'||!frameTemplate.includes('__CODEX_VISUALIZATION_WIDGET_STATE__'))throw new Error('输出模板不可用，请重新打开本地工作台。');
  if(!payload||typeof payload!=='object'||!payload.state||payload.state.design!=='character-explorations')throw new Error('无效的设计参数。');
  const serialized=JSON.stringify(payload.state);
  if(new TextEncoder().encode(serialized).length>16384)throw new Error('设计参数超过导出上限。');
  const state=JSON.parse(serialized),source=payload.config||{},portrait=state.ratio==='portrait';
  const scale=source.width===(portrait?2160:3840)?2:1;
  const layer=['picture','effects','borders'].includes(source.layer)?source.layer:'all';
  const config={enabled:true,width:(portrait?1080:1920)*scale,height:(portrait?1920:1080)*scale,transparent:['effects','borders'].includes(layer)||source.transparent===true,includeCharacters:source.includeCharacters===true,start:source.start==='show'?'show':'intro',fit:source.fit==='cover'?'cover':'contain',layer,obsLayers:source.obsLayers==='separate'?'separate':'combined'};
  // Standalone HTML contains the full sequence; OBS retains direct/manual playback.
  if(source.playback==='complete'){config.playback='complete';config.start='intro';}
  // Only our loopback service endpoint is permitted. This stays outside the
  // opaque-origin sandbox; the iframe keeps its original network policy.
  if(source.sync&&typeof source.sync.key==='string'&&/^[a-zA-Z0-9_-]{8,100}$/.test(source.sync.key)&&source.sync.endpoint==='/__studio_clock')config.sync={key:source.sync.key,endpoint:'/__studio_clock'};
  const images={};
  for(const key of ['logo','qr','barcode','model','portrait','introCharacter','introAuthor']){
    if(!config.includeCharacters&&['model','portrait','introCharacter','introAuthor'].includes(key))continue;
    if(state.narrative?.storyPackagingOnly&&['introCharacter','introAuthor'].includes(key))continue;
    const value=payload.images?.[key];if(value==null||value==='')continue;
    if(typeof value!=='string'||value.length>18*1024*1024||!/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/]*={0,2}$/i.test(value))throw new Error('素材格式无效或图片过大。');
    images[key]=value;
  }
  const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const fonts=payload.fonts===undefined?[]:validateStudioFonts(payload.fonts);
  const globals={widgetState:{modelContent:null,privateContent:state},statePersistence:'none',studioOutput:config,studioImages:images,studioFonts:fonts};
  const bootstrap='<script type="application/json" id="codex-visualization-widget-state">__CODEX_VISUALIZATION_WIDGET_STATE__</script>';
  const frameHtml=frameTemplate.replace(bootstrap,()=>'<script type="application/json" id="codex-visualization-widget-state">'+JSON.stringify(globals).replaceAll('<','\\u003c')+'</script>');
  if(frameHtml===frameTemplate)throw new Error('输出模板不完整，请重新构建工作台。');
  const title=(typeof state.name==='string'?state.name:'SHOWCASE').slice(0,40)+' · '+config.width+'×'+config.height+' · 展示输出';
  const filename=(typeof state.name==='string'?state.name:'showcase').replace(/[^\p{L}\p{N}_-]/gu,'').slice(0,30)||'showcase';
  const loader="const f=document.getElementById('studio-output');f.addEventListener('load',()=>f.focus());f.srcdoc=f.dataset.srcdoc;delete f.dataset.srcdoc;"+(config.sync?'('+studioOBSLayerBootstrap.toString()+')('+JSON.stringify(config)+');':'');
  const outputPolicy=config.sync?( /(?:^|;)\s*connect-src\s+[^;]*/i.test(policy)?policy.replace(/(^|;)\s*connect-src\s+[^;]*/i,"$1 connect-src 'self'"):policy+"; connect-src 'self'"):policy;
  const html='<!doctype html>\n<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="'+escape(outputPolicy)+'"><title>'+escape(title)+'</title><meta name="studio-output-size" content="'+config.width+'x'+config.height+'"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}iframe{display:block;width:100%;height:100vh;height:100dvh;border:0}</style></head><body><iframe id="studio-output" title="'+escape(title)+'" sandbox="allow-scripts" referrerpolicy="no-referrer" data-srcdoc="'+escape(frameHtml)+'"></iframe><script>'+loader+'</script></body></html>';
  return {html,filename:filename+'-showcase-'+config.width+'x'+config.height+'.html',config};
}
(()=>{
  const frame=document.getElementById('codex-visualization'),template=frame?.dataset.srcdoc,policy=document.querySelector('meta[http-equiv="Content-Security-Policy"]')?.content;
  if(!template||!policy)return;
  globalThis.studioOutputHost={download(payload){
    if(payload?.kind==='ae'){const result=buildStudioAEFiles(payload);studioDownload(studioZip(result.files),result.filename);return {filename:result.filename,layers:result.scene.layers.length,geometry:result.scene.geometry.length}}
    const result=buildStudioOutputDocument(template,payload,policy);
    if(payload?.kind==='obs'){
      if(result.config.obsLayers==='separate'){
        const key=globalThis.crypto?.randomUUID?.()||('studio_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)),sync={key,endpoint:'/__studio_clock'};
        result.layerDocuments=Object.fromEntries(['picture','effects','borders'].map(layer=>[layer,buildStudioOutputDocument(template,{...payload,config:{...payload.config,layer,sync}},policy).html]));
        result.syncManifest={key,start:result.config.start,width:result.config.width,height:result.config.height,files:{picture:'01-picture.html',effects:'02-effects.html',borders:'03-borders.html'}};
      }
      const filename=result.filename.replace(/\.html$/, '-OBS.zip');studioDownload(studioZip(studioOBSFiles(result)),filename);return {filename,width:result.config.width,height:result.config.height,layers:result.config.obsLayers==='separate'?3:1}
    }
    studioDownload(new Blob([result.html],{type:'text/html;charset=utf-8'}),result.filename);
    return {filename:result.filename,width:result.config.width,height:result.config.height};
  }};
})();
