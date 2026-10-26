// Shared validation for project, browser cache, HTML/OBS and video rendering.
export function validateStudioFonts(value=[]){
 if(!Array.isArray(value)||value.length>8)throw Error('自定义字体最多 8 款');
 const ids=new Set();let bytes=0;
 return value.map(font=>{
  if(!font||typeof font.id!=='string'||!/^custom:[a-f0-9]{32}$/.test(font.id)||ids.has(font.id)||typeof font.name!=='string'||!font.name.trim()||font.name.length>64||/[\u0000-\u001f\u007f]/.test(font.name))throw Error('自定义字体资料无效');
  const data=font.data,match=typeof data==='string'&&data.match(/^data:font\/(woff2|woff|ttf|otf);base64,([a-z0-9+/]+={0,2})$/i);
  if(!match||match[2].length%4||match[2].length>Math.ceil(16*1024*1024/3)*4)throw Error('字体文件无效或超过 16 MB');
  const signatures={woff2:'wOF2',woff:'wOFF',ttf:'\x00\x01\x00\x00',otf:'OTTO'};
  if(atob(match[2].slice(0,8)).slice(0,4)!==signatures[match[1].toLowerCase()])throw Error('字体内容与格式不符');
  bytes+=match[2].length;if(bytes>Math.ceil(32*1024*1024/3)*4)throw Error('自定义字体总大小不能超过 32 MB');
  ids.add(font.id);return {id:font.id,name:font.name,data};
 });
}
