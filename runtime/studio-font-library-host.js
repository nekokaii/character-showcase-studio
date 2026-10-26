// Font binaries live in IndexedDB, outside the compact 16 KiB widget state.
(()=>{
 const frame=document.getElementById('codex-visualization'),key=location.pathname;
 let writes=Promise.resolve();
 let pickerOpen=false;
 function pickSystemFont(){
  if(pickerOpen)throw Error('系统字体窗口已打开');pickerOpen=true;
  return new Promise(resolve=>{
   const previous=document.activeElement,dialog=document.createElement('dialog');dialog.dataset.systemFontPicker='';dialog.setAttribute('aria-label','选择系统字体');
   dialog.innerHTML='<style>[data-system-font-picker]{box-sizing:border-box;width:min(780px,94vw);max-height:90dvh;padding:24px;border:1px solid #cbd4c4;border-radius:16px;background:#f6f8f2;color:#293025;font:14px/1.5 system-ui,sans-serif;box-shadow:0 20px 80px #0005}[data-system-font-picker]::backdrop{background:#0007}[data-system-font-picker] *{box-sizing:border-box}[data-system-font-picker] header,[data-system-font-picker] footer{display:flex;align-items:center;justify-content:space-between;gap:12px}[data-system-font-picker] h2{font:600 20px system-ui;margin:0}[data-system-font-picker] button,[data-system-font-picker] input{font:inherit;border:1px solid #cbd4c4;border-radius:8px;padding:9px 12px;background:white;color:inherit}[data-system-font-picker] button{cursor:pointer}[data-system-font-picker] button:disabled{opacity:.5;cursor:default}[data-system-font-picker] p{margin:12px 0;color:#596452}[data-system-font-picker] input{width:100%;margin-bottom:12px}[data-system-font-picker] [data-system-list]{display:flex;flex-direction:column;gap:5px;overflow:auto;height:clamp(140px,42dvh,400px);margin-bottom:12px}[data-system-font-picker] [data-system-list] button{text-align:left;display:flex;align-items:center;gap:12px;justify-content:space-between}[data-system-font-picker] [data-system-list] button[aria-selected=true]{border-color:#57764c;background:#e5eddf}[data-system-font-picker] [data-system-list] small{color:#68745f;font:11px system-ui}[data-system-font-picker] [data-system-preview]{padding:16px 12px;border:1px solid #cbd4c4;border-radius:8px;min-height:80px;font-size:30px;overflow-wrap:anywhere;margin-bottom:14px}[data-system-font-picker] [hidden]{display:none!important}@media(max-width:480px){[data-system-font-picker]{padding:16px}[data-system-font-picker] [data-system-list] button{display:block}[data-system-font-picker] [data-system-list] small{display:block}}</style><header><h2>选择系统字体</h2><button type="button" data-system-close aria-label="关闭系统字体窗口">关闭</button></header><p data-system-status role="status">正在读取本机字体库…</p><button type="button" data-system-authorize hidden>授权读取系统字体</button><input type="search" data-system-search aria-label="搜索系统字体" placeholder="搜索字体名称、家族或样式" disabled><div data-system-list role="listbox" aria-label="系统字体列表"></div><div data-system-preview aria-label="字体效果预览"></div><footer><small>选中字体会自动随工程、视频和 HTML 输出携带。</small><button type="button" data-system-use disabled>使用此字体</button></footer>';
   const get=key=>dialog.querySelector('[data-system-'+key+']'),status=get('status'),search=get('search'),list=get('list'),preview=get('preview'),use=get('use'),authorize=get('authorize');
   preview.textContent='角色展示 · 夏风与海浪 Aa 0123';let fonts=[],selected=null,closed=false,busy=false;
   const finish=file=>{if(closed)return;closed=true;dialog.close();dialog.remove();pickerOpen=false;previous?.focus();resolve(file||null);};
   get('close').onclick=()=>finish();dialog.addEventListener('cancel',event=>{event.preventDefault();finish();});
   const render=()=>{
    const needle=search.value.trim().toLocaleLowerCase(),filtered=fonts.filter(font=>[font.family,font.fullName,font.style,font.postscriptName].join(' ').toLocaleLowerCase().includes(needle));list.replaceChildren();
    // Keep large font libraries responsive. Search still covers every record.
    for(const font of filtered.slice(0,200)){const button=document.createElement('button'),title=document.createElement('span'),style=document.createElement('small');button.type='button';button.setAttribute('role','option');button.setAttribute('aria-selected',String(selected===font));title.textContent=font.fullName||font.family;style.textContent=font.style||'Regular';button.append(title,style);button.disabled=busy;button.onclick=()=>{selected=font;preview.style.fontFamily=JSON.stringify(font.family)+',sans-serif';preview.style.fontWeight=/bold|black|heavy|粗|黑/i.test(font.style)?'700':'400';preview.style.fontStyle=/italic|oblique|斜/i.test(font.style)?'italic':'normal';use.disabled=false;render();};list.append(button);}
    if(fonts.length)status.textContent=filtered.length?filtered.length+' 款匹配字体'+(filtered.length>200?'，当前显示前 200 款，请搜索缩小范围':''):'没有匹配字体，请尝试其他名称';
   };
   const setFonts=value=>{fonts=value;selected=null;search.disabled=false;authorize.hidden=true;use.disabled=true;render();if(!fonts.length)status.textContent='未读取到字体，可使用浏览器授权读取或保留文件导入。';search.focus();};search.oninput=render;
   const canBrowser=window.isSecureContext&&typeof window.queryLocalFonts==='function';
   authorize.onclick=async()=>{authorize.disabled=true;status.textContent='请允许浏览器读取系统字体…';try{setFonts(await window.queryLocalFonts());if(!fonts.length)authorize.hidden=false;}catch(error){if(!closed)status.textContent=error.name==='NotAllowedError'?'未获得读取权限。可在站点权限中允许本地字体后重试。':error.message;}finally{authorize.disabled=false;}};
   use.onclick=async()=>{if(!selected||busy)return;busy=true;use.disabled=true;search.disabled=true;authorize.disabled=true;render();status.textContent='正在准备 '+selected.fullName+' …';try{
    let blob;if(selected.blob)blob=await selected.blob();else{const r=await fetch('/__editor/fonts/'+encodeURIComponent(selected.id));if(!r.ok){const error=await r.json();throw Error(error.error||'系统字体读取失败');}blob=await r.blob();}
    if(!blob.size||blob.size>32*1024*1024)throw Error('所选字体为空或超过 32 MB，请选择其他字体');
    finish(new File([blob],(selected.fullName||selected.family)+'.ttf',{type:'font/sfnt'}));
   }catch(error){if(!closed){status.textContent=error.message;use.disabled=false;search.disabled=false;authorize.disabled=false;}}finally{busy=false;for(const button of list.querySelectorAll('button'))button.disabled=false;}};
   document.body.append(dialog);dialog.showModal();
   (async()=>{try{
    if(!['localhost','127.0.0.1','[::1]'].includes(location.hostname)||!['http:','https:'].includes(location.protocol))throw Error('网页版请授权浏览器读取字体');
    const r=await fetch('/__editor/fonts');if(!r.ok)throw Error('本机字体服务尚未启用；保存工程并重启本机服务后可直接读取');const data=await r.json();if(!Array.isArray(data.fonts))throw Error('本机字体服务尚未启用；保存工程并重启本机服务后可直接读取');if(closed)return;setFonts(data.fonts);if(!fonts.length&&canBrowser)authorize.hidden=false;
   }catch(error){if(closed)return;status.textContent=error.message+(canBrowser?'，也可点击下方按钮授权读取。':'。浏览器授权方式需要桌面 Chrome / Edge 和 localhost 或 HTTPS。');authorize.hidden=!canBrowser;}})();
  });
 }
 const database=()=>new Promise((resolve,reject)=>{const q=indexedDB.open('showcase-font-library',1);q.onupgradeneeded=()=>q.result.createObjectStore('fonts');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(Error('浏览器无法打开字体缓存，请保存剪辑工程保留字体'));});
 async function access(action,fonts){const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('fonts',action==='save'?'readwrite':'readonly'),store=tx.objectStore('fonts'),q=action==='save'?store.put(fonts,key):store.get(key);tx.oncomplete=()=>resolve(q.result||[]);tx.onerror=tx.onabort=()=>reject(Error('字体缓存保存失败，请保存剪辑工程保留字体'));});}finally{db.close();}}
 window.addEventListener('message',async event=>{
  const q=event.data;if(event.source!==frame?.contentWindow||q?.type!=='studio-font-library-request')return;
  try{
   if(!Number.isSafeInteger(q.id)||q.id<1||!['load','save','system-pick'].includes(q.action))throw Error('字体操作无效');
   const readOnly=new URLSearchParams(location.search).has('editor-render');if(readOnly){event.source.postMessage({type:'studio-font-library-response',id:q.id,...(q.action==='system-pick'?{file:null}:{fonts:[]})},'*');return;}
   if(q.action==='system-pick'){const file=await pickSystemFont();event.source.postMessage({type:'studio-font-library-response',id:q.id,file},'*');return;}
   let fonts;if(q.action==='save'){const value=validateStudioFonts(q.fonts),write=writes.then(()=>access('save',value));writes=write.catch(()=>{});await write;fonts=[];}else{await writes;fonts=validateStudioFonts(await access('load'));}
   event.source.postMessage({type:'studio-font-library-response',id:q.id,fonts},'*');
  }catch(error){event.source.postMessage({type:'studio-font-library-response',id:q.id,error:error.message},'*');}
 });
})();
