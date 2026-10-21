// Shared timeline rules; seconds are always measured at 1×.
function studioEditorLayer(layer){if(layer==='under-post')return 'above-text';return ['under-intro-text','under-show-text'].includes(layer)?'under-text':layer;}
const studioVideoLayers=['above-border','under-border','above-text','under-text'];
const studioTrackLabels={'above-border':'边框上方','under-border':'后处理上方 · 不受效果','above-text':'文字上方 · 受后处理','under-text':'文字下方 · 受后处理'};
function studioCustomTracks(p){return Array.isArray(p.videoTracks)?p.videoTracks:[];}
function studioClipTrackId(c){return c.trackId||studioEditorLayer(c.layer);}
function studioVideoTracks(p,layer){return [...studioCustomTracks(p).filter(t=>t.layer===layer).map(t=>({...t,label:t.name})),{id:layer,layer,label:studioTrackLabels[layer]}];}
function studioClipTrackRank(p,c){const tracks=studioVideoTracks(p,studioEditorLayer(c.layer)),index=tracks.findIndex(t=>t.id===studioClipTrackId(c));return index<0?1:tracks.length-index;}
function studioSetClipTrack(c,track){c.layer=track.layer;if(track.id===track.layer)delete c.trackId;else c.trackId=track.id;}
function studioEditorTimelineRows(p){return [...studioVideoTracks(p,'above-border'),{id:'border',label:'── 信息边框 ──'},...studioVideoTracks(p,'under-border'),{id:'post',label:'── 画面后处理 ──'},...studioVideoTracks(p,'above-text'),{id:'text',label:'── 片头 / 展示页文字 ──'},...studioVideoTracks(p,'under-text'),{id:'showcase',label:'片头 · 展示 · 片尾'},{id:'audio-1',layer:'audio-1',label:'♫ 音轨 1'},{id:'audio-2',layer:'audio-2',label:'♫ 音轨 2'}];}
function studioEditorOutputAspect(o){if(Math.abs(o.width-o.height*16/9)<=1)return 'landscape';if(Math.abs(o.height-o.width*16/9)<=1)return 'portrait';return 'custom';}
function studioEditorAspectSize(o,ratio){const long=Math.min(7680,Math.max(114,Math.round(Math.max(o.width,o.height)/2)*2)),short=Math.max(64,Math.round(long*9/16/2)*2);return ratio==='portrait'?{width:short,height:long}:{width:long,height:short};}
function studioAudioLayer(layer){return ['audio-1','audio-2'].includes(layer);}
function studioAssetFitsLayer(asset,layer){return (asset.kind==='audio')===studioAudioLayer(layer);}
function studioClipDuration(c){return Math.max(0,c.out-c.in);}
const studioAnimatedKeys=['x','y','scale','rotate','opacity'];
function studioAnimatedValue(c,key,source){
 const frames=c.keyframes?.[key];if(!frames?.length)return c[key];
 if(source<=frames[0].time)return frames[0].value;
 for(let i=1;i<frames.length;i++){const a=frames[i-1],b=frames[i];if(source<=b.time){let t=Math.max(0,Math.min(1,(source-a.time)/(b.time-a.time)));if(a.easing==='hold')t=source<b.time?0:1;else if(a.easing==='smooth')t=t*t*(3-2*t);return a.value+(b.value-a.value)*t;}}
 return frames.at(-1).value;
}
function studioAnimatedClip(c,time){const value={...c},source=c.in+Math.max(0,time-c.start);for(const key of studioAnimatedKeys)value[key]=studioAnimatedValue(c,key,source);return value;}
function studioPutKeyframe(c,key,source,value,easing='linear'){
 c.keyframes??={};const frames=c.keyframes[key]??=[];const old=frames.find(f=>Math.abs(f.time-source)<.0005);if(old){old.value=value;old.easing=easing;}else frames.push({time:source,value,easing});frames.sort((a,b)=>a.time-b.time);
}
function studioSetAnimatedProperty(c,key,value,time){
 if(['x','y'].includes(key)&&(c.keyframes?.x?.length||c.keyframes?.y?.length)){const source=Math.max(c.in,Math.min(c.out,c.in+time-c.start)),values={x:studioAnimatedValue(c,'x',source),y:studioAnimatedValue(c,'y',source)};values[key]=value;for(const axis of ['x','y']){const old=c.keyframes?.[axis]?.find(f=>Math.abs(f.time-source)<.0005);if(!c.keyframes?.[axis]?.length&&source>c.in+.0005)studioPutKeyframe(c,axis,c.in,c[axis]);studioPutKeyframe(c,axis,source,values[axis],old?.easing||'linear');}return;}
 if(c.keyframes?.[key]?.length){const source=Math.max(c.in,Math.min(c.out,c.in+time-c.start)),old=c.keyframes[key].find(f=>Math.abs(f.time-source)<.0005);studioPutKeyframe(c,key,source,value,old?.easing||'linear');}else c[key]=value;
}
function studioKeyframeKeys(group){return group==='transform'?studioAnimatedKeys:group==='position'?['x','y']:[group];}
function studioRecordPose(c,keys,time){const source=Math.max(c.in,Math.min(c.out,c.in+time-c.start)),values=Object.fromEntries(keys.map(key=>[key,studioAnimatedValue(c,key,source)]));for(const key of keys){const old=c.keyframes?.[key]?.find(f=>Math.abs(f.time-source)<.0005);if(!c.keyframes?.[key]?.length&&source>c.in+.0005)studioPutKeyframe(c,key,c.in,c[key]);studioPutKeyframe(c,key,source,values[key],old?.easing||'linear');}}
function studioClipPose(c,time){
 const t=time-c.start,d=studioClipDuration(c);if(t<0||t>=d)return {visible:false,opacity:0,source:c.in,audioGain:0,transitionOpacity:0};
 const a=c.fadeIn>0?Math.min(1,t/c.fadeIn):1,b=c.fadeOut>0?Math.min(1,(d-t)/c.fadeOut):1;
 const ai=Math.min(d,c.audioFadeIn??c.fadeIn),ao=Math.min(d,c.audioFadeOut??c.fadeOut),audioGain=(ai>0?Math.min(1,t/ai):1)*(ao>0?Math.min(1,(d-t)/ao):1);
 return {visible:true,source:c.in+t,opacity:Math.min(a,b)*studioAnimatedValue(c,'opacity',c.in+t)/100,transitionOpacity:Math.min(a,b),audioGain,progress:t/d};
}
function studioGradeCSS(g){return `brightness(${Math.pow(2,g.exposure||0)}) contrast(${g.contrast??1}) saturate(${g.saturation??1}) hue-rotate(${g.hue||0}deg)`;}
function studioKeyPixels(data,color,tolerance,softness,spill){
 const r=parseInt(color.slice(1,3),16),g=parseInt(color.slice(3,5),16),b=parseInt(color.slice(5,7),16),range=Math.sqrt(3)*255;
 for(let i=0;i<data.length;i+=4){const distance=Math.hypot(data[i]-r,data[i+1]-g,data[i+2]-b)/range;const alpha=Math.max(0,Math.min(1,(distance-tolerance)/Math.max(.001,softness)));data[i+3]=Math.round(data[i+3]*alpha);if(spill&&g>r&&g>b)data[i+1]-=Math.max(0,data[i+1]-Math.max(data[i],data[i+2]))*spill*(1-alpha);}
 return data;
}
function studioSplitClip(c,time,id){const d=time-c.start;if(d<=.001||d>=studioClipDuration(c)-.001)return null;const right={...structuredClone(c),id,start:time,in:c.in+d,fadeIn:0};c.out=c.in+d;c.fadeOut=0;c.audioFadeOut=0;right.audioFadeIn=0;return right;}
function studioNewClip(asset,start=0){return {id:crypto.randomUUID(),assetId:asset.id,start,in:0,out:asset.duration,layer:asset.kind==='audio'?'audio-1':'under-border',x:50,y:50,scale:100,flipY:false,rotate:0,opacity:100,cropLeft:0,cropRight:0,cropTop:0,cropBottom:0,fadeIn:0,fadeOut:0,transition:'fade',volume:1,audioFadeIn:0,audioFadeOut:0,grade:{exposure:0,contrast:1,saturation:1,hue:0},key:{enabled:false,color:'#00ff00',tolerance:.15,softness:.12,spill:.5}};}
