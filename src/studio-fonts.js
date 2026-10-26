function createStudioFontLibrary(root){
 let records=[],faces=new Map(),revision=0,pending=Promise.resolve(),requestId=0;
 const requests=new Map();
 const notify=()=>root.dispatchEvent(new Event('studio-fonts-change'));
 const rpc=(action,fonts)=>new Promise((resolve,reject)=>{const id=++requestId,timeout=action==='system-pick'?null:setTimeout(()=>{requests.delete(id);reject(Error('字体缓存未响应，请保存剪辑工程保留字体'));},10000);requests.set(id,{resolve,reject,timeout});parent.postMessage({type:'studio-font-library-request',id,action,fonts},'*');});
 window.addEventListener('message',event=>{if(event.source!==parent||event.data?.type!=='studio-font-library-response')return;const q=requests.get(event.data.id);if(!q)return;requests.delete(event.data.id);clearTimeout(q.timeout);event.data.error?q.reject(Error(event.data.error)):q.resolve(event.data.file??event.data.fonts);});
 function replace(value,persist=false){
  const next=validateStudioFonts(value),previous=new Map(records.map(f=>[f.id,f]));records=next;revision++;
  for(const [id,face]of faces)if(!next.some(f=>f.id===id&&f.data===previous.get(id)?.data)){document.fonts.delete(face);faces.delete(id);}
  const loads=[];
  for(const font of next){let face=faces.get(font.id);if(!face){face=new FontFace('StudioUser_'+font.id.slice(7),'url("'+font.data+'")');document.fonts.add(face);faces.set(font.id,face);}loads.push(face.load());}
  pending=Promise.all(loads).then(()=>{notify();return records;});pending.catch(()=>{});notify();
  if(persist)rpc('save',next).catch(error=>root.dispatchEvent(new CustomEvent('studio-fonts-error',{detail:error.message})));
  return pending;
 }
 const initialRevision=revision;
 // Packed output owns its fonts. Never read or modify an editor's browser cache.
 if(globalThis.studioOutput?.enabled)replace(globalThis.studioFonts||[]).catch(()=>{});
 else rpc('load').then(fonts=>{if(revision===initialRevision&&fonts?.length)replace(fonts).catch(()=>{});}).catch(()=>{});
 return {list:()=>records.map(f=>({...f})),get revision(){return revision;},get ready(){return pending;},replace,
  async pickSystem(){const file=await rpc('system-pick');return file?this.import(file):null;},
  async import(file){
   if(!/\.(ttf|otf|woff2?)$/i.test(file.name)||!file.size||file.size>32*1024*1024)throw Error('请选择不超过 32 MB 的 TTF / OTF / WOFF / WOFF2 字体');
   const buffer=await file.arrayBuffer(),header=new Uint8Array(buffer,0,Math.min(4,buffer.byteLength)),signature=String.fromCharCode(...header),format=signature==='wOF2'?'woff2':signature==='wOFF'?'woff':signature==='OTTO'?'otf':header.join(',')==='0,1,0,0'?'ttf':null;
   if(!format)throw Error('无法识别字体内容，请使用 TTF / OTF / WOFF / WOFF2');
   const hash=await crypto.subtle.digest('SHA-256',buffer),id='custom:'+Array.from(new Uint8Array(hash)).slice(0,16).map(n=>n.toString(16).padStart(2,'0')).join('');
   if(records.some(f=>f.id===id))return id;
   const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve('data:font/'+format+';base64,'+reader.result.split(',')[1]);reader.onerror=()=>reject(Error('字体读取失败'));reader.readAsDataURL(file);});
   const font={id,name:file.name.replace(/\.(ttf|otf|woff2?)$/i,'').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,64)||'自定义字体',data};validateStudioFonts([...records,font]);
   // Parse first, so a corrupt font never replaces working project settings.
   await new FontFace('StudioFontProbe','url("'+data+'")').load().catch(()=>{throw Error('字体无法加载，文件可能已损坏或浏览器不支持');});
   await replace([...records,font],true);return id;
  },remove(id){return replace(records.filter(f=>f.id!==id),true);}
 };
}
