// Read installed Windows fonts; expose opaque IDs, never client-provided paths.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const execute=promisify(execFile),maxSize=32*1024*1024;
const clean=value=>value.replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,180);
function tables(buffer,offset,size=buffer.length){
 if(offset+12>buffer.length)throw Error('字体目录不完整');
 const signature=buffer.toString('latin1',offset,offset+4),count=buffer.readUInt16BE(offset+4);
 if(!['\x00\x01\x00\x00','OTTO'].includes(signature)||!count||count>256||offset+12+count*16>buffer.length)throw Error('不支持的字体格式');
 const entries=[];for(let i=0;i<count;i++){const p=offset+12+i*16,tag=buffer.toString('latin1',p,p+4),start=buffer.readUInt32BE(p+8),length=buffer.readUInt32BE(p+12);if(start+length>size)throw Error('字体表越界');entries.push({tag,start,length});}
 return {signature,entries};
}
function faceOffsets(buffer){
 if(buffer.toString('latin1',0,4)!=='ttcf')return [0];
 const count=buffer.readUInt32BE(8);if(!count||count>64||12+4*count>buffer.length)throw Error('字体集合无效');
 return Array.from({length:count},(_,i)=>buffer.readUInt32BE(12+4*i));
}
function names(buffer){
 const values=new Map();if(buffer.length<6)return values;
 const count=buffer.readUInt16BE(2),strings=buffer.readUInt16BE(4);
 for(let i=0;i<count&&6+(i+1)*12<=buffer.length;i++){
  const p=6+i*12,platform=buffer.readUInt16BE(p),encoding=buffer.readUInt16BE(p+2),language=buffer.readUInt16BE(p+4),id=buffer.readUInt16BE(p+6),length=buffer.readUInt16BE(p+8),start=strings+buffer.readUInt16BE(p+10);
  if(![1,2,4,6,16,17].includes(id)||start+length>buffer.length)continue;
  let text;if(platform===0||(platform===3&&[0,1,10].includes(encoding))){if(length%2)continue;text=Buffer.from(buffer.subarray(start,start+length)).swap16().toString('utf16le');}else if(platform===1&&encoding===0)text=buffer.toString('latin1',start,start+length);else continue;
  text=clean(text);const rank=language===0x804?4:language===0x409?3:platform===0?2:1;
  if(text&&(!values.has(id)||values.get(id).rank<rank))values.set(id,{text,rank});
 }
 return new Map([...values].map(([id,value])=>[id,value.text]));
}
const checksum=buffer=>{let sum=0;for(let i=0;i<buffer.length;i+=4){let word=0;for(let j=0;j<4;j++)word=(word<<8)|(buffer[i+j]||0);sum=(sum+(word>>>0))>>>0;}return sum;};
// TTC offsets are relative to the collection. Rebuild one standalone SFNT face
// with its own directory, table checksums and head.checkSumAdjustment.
export function extractSystemFont(buffer,index=0){
 const offsets=faceOffsets(buffer);if(!Number.isInteger(index)||!offsets[index]&&offsets[index]!==0)throw Error('字体不存在');
 if(offsets.length===1&&offsets[0]===0){tables(buffer,0);if(buffer.length>maxSize)throw Error('所选字体超过 32 MB');return buffer;}
 const {signature,entries:all}=tables(buffer,offsets[index]),entries=all.filter(t=>t.tag!=='DSIG'),count=entries.length;
 let size=12+16*count;for(const t of entries)size+=(t.length+3)&~3;if(size>maxSize)throw Error('所选字体超过 32 MB');
 const out=Buffer.alloc(size),power=2**Math.floor(Math.log2(count));out.write(signature,0,'latin1');out.writeUInt16BE(count,4);out.writeUInt16BE(power*16,6);out.writeUInt16BE(Math.log2(power),8);out.writeUInt16BE(count*16-power*16,10);
 let cursor=12+16*count,head;entries.forEach((t,i)=>{const p=12+16*i;buffer.copy(out,cursor,t.start,t.start+t.length);if(t.tag==='head'&&t.length>=12){head=cursor;out.writeUInt32BE(0,cursor+8);}out.write(t.tag,p,'latin1');out.writeUInt32BE(checksum(out.subarray(cursor,cursor+t.length)),p+4);out.writeUInt32BE(cursor,p+8);out.writeUInt32BE(t.length,p+12);cursor+=(t.length+3)&~3;});
 if(head!==undefined)out.writeUInt32BE((0xB1B0AFBA-checksum(out))>>>0,head+8);return out;
}
async function installedFiles(){
 if(process.platform!=='win32')throw Error('此系统请使用浏览器授权读取字体');
 const files=new Set(),dirs=[path.join(process.env.WINDIR||'C:\\Windows','Fonts'),...(process.env.LOCALAPPDATA?[path.join(process.env.LOCALAPPDATA,'Microsoft','Windows','Fonts')]:[])];
 for(const dir of dirs)for(const entry of await fs.readdir(dir,{withFileTypes:true}).catch(()=>[]))if(entry.isFile()&&/\.(ttf|otf|ttc|otc)$/i.test(entry.name))files.add(path.join(dir,entry.name));
 // Include registered fonts installed outside the usual font directories.
 const script="$OutputEncoding=[Console]::OutputEncoding=[Text.UTF8Encoding]::new(); $p=@('HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts','HKCU:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts'); $v=@(foreach($k in $p){if(Test-Path -LiteralPath $k){$r=Get-ItemProperty -LiteralPath $k; foreach($x in $r.PSObject.Properties){if($x.Name -notlike 'PS*' -and $x.Value -is [string]){$x.Value}}}}); ConvertTo-Json -Compress -InputObject $v";
 try{const {stdout}=await execute('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,timeout:10000,maxBuffer:2*1024*1024,encoding:'utf8'});for(const file of JSON.parse(stdout.replace(/^\uFEFF/,'')))if(typeof file==='string'&&/\.(ttf|otf|ttc|otc)$/i.test(file)){const expanded=file.replace(/%([^%]+)%/g,(_,key)=>process.env[key]||'%'+key+'%');files.add(path.isAbsolute(expanded)?expanded:path.join(dirs[0],expanded));}}catch{}
 return [...files];
}
async function inspect(file){
 const handle=await fs.open(file,'r');try{
  const {size}=await handle.stat();if(size<12||size>256*1024*1024)return [];
  const read=async(start,length)=>{if(start<0||start+length>size)throw Error('字体目录越界');const b=Buffer.alloc(length),{bytesRead}=await handle.read(b,0,length,start);if(bytesRead!==length)throw Error('字体读取不完整');return b;};
  const header=await read(0,12);let offsets=[0];if(header.toString('latin1',0,4)==='ttcf'){const count=header.readUInt32BE(8);if(!count||count>64)return [];const b=await read(12,count*4);offsets=Array.from({length:count},(_,i)=>b.readUInt32BE(i*4));}
  const result=[];for(let index=0;index<offsets.length;index++){
   const start=offsets[index],h=await read(start,12),count=h.readUInt16BE(4);if(!count||count>256)continue;
   const {entries}=tables(Buffer.concat([h,await read(start+12,count*16)]),0,size),name=entries.find(t=>t.tag==='name');if(!name||name.length>1024*1024)continue;
   const n=names(await read(name.start,name.length)),family=n.get(16)||n.get(1),style=n.get(17)||n.get(2)||'Regular',fullName=n.get(4)||[family,style].join(' '),postscriptName=n.get(6)||fullName;
   if(family)result.push({id:crypto.createHash('sha256').update(file.toLowerCase()+'\0'+index).digest('hex'),family,style,fullName,postscriptName,file,index});
  }return result;
 }finally{await handle.close();}
}
export function createSystemFontLibrary(){
 let cache,loadedAt=0,loading;
 const load=async()=>{if(cache&&Date.now()-loadedAt<60000)return cache;if(loading)return loading;loading=(async()=>{const files=await installedFiles(),records=[];let cursor=0;await Promise.all(Array.from({length:8},async()=>{while(cursor<files.length){const file=files[cursor++];try{records.push(...await inspect(file));}catch{}}}));cache=new Map(records.map(f=>[f.id,f]));loadedAt=Date.now();return cache;})().finally(()=>loading=null);return loading;};
 return {async list(){return [...(await load()).values()].map(({file,index,...metadata})=>metadata).sort((a,b)=>a.family.localeCompare(b.family,'zh-CN')||a.style.localeCompare(b.style));},async read(id){if(!/^[a-f0-9]{64}$/.test(id))throw Error('无效字体编号');const record=(await load()).get(id);if(!record)throw Error('字体不存在，请重新读取字体库');const data=extractSystemFont(await fs.readFile(record.file),record.index);return {name:record.fullName,data};}};
}
