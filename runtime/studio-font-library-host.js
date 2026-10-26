// Font binaries live in IndexedDB, outside the compact 16 KiB widget state.
(()=>{
 const frame=document.getElementById('codex-visualization'),key=location.pathname;
 let writes=Promise.resolve();
 const database=()=>new Promise((resolve,reject)=>{const q=indexedDB.open('showcase-font-library',1);q.onupgradeneeded=()=>q.result.createObjectStore('fonts');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(Error('浏览器无法打开字体缓存，请保存剪辑工程保留字体'));});
 async function access(action,fonts){const db=await database();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('fonts',action==='save'?'readwrite':'readonly'),store=tx.objectStore('fonts'),q=action==='save'?store.put(fonts,key):store.get(key);tx.oncomplete=()=>resolve(q.result||[]);tx.onerror=tx.onabort=()=>reject(Error('字体缓存保存失败，请保存剪辑工程保留字体'));});}finally{db.close();}}
 window.addEventListener('message',async event=>{
  const q=event.data;if(event.source!==frame?.contentWindow||q?.type!=='studio-font-library-request')return;
  try{
   if(!Number.isSafeInteger(q.id)||q.id<1||!['load','save'].includes(q.action))throw Error('字体缓存操作无效');
   const readOnly=new URLSearchParams(location.search).has('editor-render');if(readOnly){event.source.postMessage({type:'studio-font-library-response',id:q.id,fonts:[]},'*');return;}
   let fonts;if(q.action==='save'){const value=validateStudioFonts(q.fonts),write=writes.then(()=>access('save',value));writes=write.catch(()=>{});await write;fonts=[];}else{await writes;fonts=validateStudioFonts(await access('load'));}
   event.source.postMessage({type:'studio-font-library-response',id:q.id,fonts},'*');
  }catch(error){event.source.postMessage({type:'studio-font-library-response',id:q.id,error:error.message},'*');}
 });
})();
