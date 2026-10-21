import {inflate} from 'node:zlib';
import {promisify} from 'node:util';
const decode=promisify(inflate);
const u32=n=>{const buffer=Buffer.alloc(4);buffer.writeUInt32LE(n);return buffer;};
const fourcc=value=>Buffer.from(value,'ascii');
const chunk=(id,data)=>Buffer.concat([fourcc(id),u32(data.length),data,...(data.length&1?[Buffer.alloc(1)]:[])]);
const list=(type,data)=>chunk('LIST',Buffer.concat([fourcc(type),data]));

// Give each lossless PNG an explicit packet boundary. Concatenated large PNGs
// can be misparsed by image2pipe; AVI avoids inspecting compressed image data.
// Zero RIFF/movi sizes mean an unbounded non-seekable stream in FFmpeg's AVI
// demuxer, unlike 0xffffffff which could impose a cumulative 4 GB limit.
export function pngAviHeader({width,height,fps,totalFrames}){
 for(const [name,value,max]of [['width',width,32767],['height',height,32767],['fps',fps,1000],['totalFrames',totalFrames,0xffffffff]])if(!Number.isInteger(value)||value<1||value>max)throw Error('Invalid PNG transport '+name);
 const avih=Buffer.alloc(56);avih.writeUInt32LE(Math.round(1e6/fps),0);avih.writeUInt32LE(totalFrames,16);avih.writeUInt32LE(1,24);avih.writeUInt32LE(width,32);avih.writeUInt32LE(height,36);
 const strh=Buffer.alloc(56);strh.write('vids',0,'ascii');strh.write('MPNG',4,'ascii');strh.writeUInt32LE(1,20);strh.writeUInt32LE(fps,24);strh.writeUInt32LE(totalFrames,32);strh.writeUInt32LE(0xffffffff,40);strh.writeInt16LE(width,52);strh.writeInt16LE(height,54);
 const strf=Buffer.alloc(40);strf.writeUInt32LE(40,0);strf.writeInt32LE(width,4);strf.writeInt32LE(height,8);strf.writeUInt16LE(1,12);strf.writeUInt16LE(32,14);strf.write('MPNG',16,'ascii');
 return Buffer.concat([fourcc('RIFF'),u32(0),fourcc('AVI '),list('hdrl',Buffer.concat([chunk('avih',avih),list('strl',Buffer.concat([chunk('strh',strh),chunk('strf',strf)]))])),fourcc('LIST'),u32(0),fourcc('movi')]);
}
export function pngAviPacket(png){
 if(!Buffer.isBuffer(png)||png.length<8||!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Invalid capture PNG');
 return chunk('00dc',png);
}

// Optional diagnostic only; production passes PNG packets through unchanged.
export async function validateCapturePNG(png){
 const parts=[];let offset=8;
 while(offset+12<=png.length){const length=png.readUInt32BE(offset),type=png.toString('ascii',offset+4,offset+8);if(offset+length+12>png.length)throw Error('Truncated screenshot PNG');if(type==='IDAT')parts.push(png.subarray(offset+8,offset+8+length));offset+=length+12;if(type==='IEND')break;}
 if(offset!==png.length||!parts.length)throw Error('Invalid screenshot PNG');
 await decode(Buffer.concat(parts));
}
