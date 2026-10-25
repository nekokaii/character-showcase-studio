(()=>{
// Rendered output plays the requested animation regardless of OS UI preferences.
const root=document.getElementById('character-directions'),reduced=globalThis.studioOutput?.enabled===true?{matches:false,addEventListener(){}}:matchMedia('(prefers-reduced-motion: reduce)');
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),lerp=(a,b,p)=>a+(b-a)*p,smooth=n=>{n=clamp(n);return n*n*(3-2*n)};
function studioBorderSettings(source){
 const value={mode:'theme',style:'solid',background:'#090b10',text:'#f4efe1',accent:'#bceb45',opacity:1,lineWidth:.12};
 if(!source||typeof source!=='object'||Array.isArray(source))return value;
 if(['theme','custom'].includes(source.mode))value.mode=source.mode;
 if(['solid','outline','double'].includes(source.style))value.style=source.style;
 for(const key of ['background','text','accent'])if(typeof source[key]==='string'&&/^#[0-9a-f]{6}$/i.test(source[key]))value[key]=source[key];
 if(Number.isFinite(source.opacity))value.opacity=clamp(source.opacity,0,1);
 if(Number.isFinite(source.lineWidth))value.lineWidth=clamp(source.lineWidth,.04,.4);
 return value;
}
// Deterministic, seekable CRT power-off envelope shared by browser and AE.
// ES3 syntax is intentional: this function also runs inside AE expressions.
function studioCRTPose(progress){
  var q=Math.max(0,Math.min(1,progress));
  function e(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)}
  var shutter=e((q-.12)/.44),active=e(q/.035)*(1-e((q-.46)/.1));
  return {
    shutter:shutter,
    signal:e((q-.38)/.14)*(1-e((q-.86)/.055)),
    signalWidth:1-e((q-.62)/.27),
    dot:e((q-.77)/.065)*(1-e((q-.87)/.13)),
    dotScale:1-.88*e((q-.84)/.16),
    flash:.15*e(q/.045)*(1-e((q-.07)/.12)),
    scan:.18*active,
    jitter:Math.sin(q*149)*Math.sin(q*37)*.0014*active,
    flicker:1-.12*Math.pow(Math.max(0,Math.sin(q*173)),2)*active
  };
}

// Narrative timing is independent of the continuous geometry/text clocks.
function studioIntroDuration(value){return Number.isFinite(value)?Math.max(0,Math.min(1800,value)):4.5}
function studioShowDuration(narrative){return Number.isFinite(narrative?.showDuration)?Math.max(1,Math.min(60,narrative.showDuration)):12}
function studioNarrativeSettings(value={}){
  value=value&&typeof value==='object'?value:{};
  const pick=(v,values,fallback)=>values.includes(v)?v:fallback;
  const bounded=(v,min,max,fallback)=>Number.isFinite(v)?Math.max(min,Math.min(max,v)):fallback;
  const outroDuration=bounded(value.outroDuration,1.5,12,3.5);
  return {introStyle:pick(value.introStyle,['model','title','story'],'model'),nameReveal:pick(value.nameReveal,['show','delayed'],'show'),nameDelay:bounded(value.nameDelay,.2,.9,.65),showDuration:studioShowDuration(value),showPlayback:pick(value.showPlayback,['continuous','repeat'],'continuous'),outroEnabled:value.outroEnabled===true,outroDuration,outroStyle:pick(value.outroStyle,['signature','orbit','quiet'],'signature'),outroContent:pick(value.outroContent,['auto','word','logo'],'auto'),outroTrigger:pick(value.outroTrigger,['auto','manual'],'auto'),shutdownEnabled:value.shutdownEnabled!==false,shutdownDuration:bounded(value.shutdownDuration,.3,Math.min(1.5,outroDuration*.45),Math.min(.8,outroDuration*.45)),
    outroColorMode:pick(value.outroColorMode,['theme','custom'],'theme'),outroColor:typeof value.outroColor==='string'&&/^#[0-9a-f]{6}$/i.test(value.outroColor)?value.outroColor:'#f3f0e5',
    characterShotEnabled:value.characterShotEnabled!==false,authorShotEnabled:value.authorShotEnabled!==false,
    characterShotDuration:bounded(value.characterShotDuration,.5,600,2.5),authorShotDuration:bounded(value.authorShotDuration,.5,600,2),storyTransitionDuration:bounded(value.storyTransitionDuration,.15,3,.6),
    characterCorner:pick(value.characterCorner,['tl-br','tr-bl','bl-tr','br-tl','center'],'tl-br'),authorCorner:pick(value.authorCorner,['tl-br','tr-bl','bl-tr','br-tl','center'],'tr-bl'),
    characterEffect:pick(value.characterEffect,['none','crt','holo','polar'],'polar'),authorEffect:pick(value.authorEffect,['none','crt','holo','polar'],'polar'),
    characterEffectStrength:bounded(value.characterEffectStrength,0,1,.3),authorEffectStrength:bounded(value.authorEffectStrength,0,1,.3),
    characterEffectSpeed:bounded(value.characterEffectSpeed,.1,2,.7),authorEffectSpeed:bounded(value.authorEffectSpeed,.1,2,.7),
    postEffect:pick(value.postEffect,['none','polar','crt','holo','bloom','anamorphic','prism','film'],pick(value.characterEffect,['polar','crt','holo'],'polar')),
    postStrength:bounded(value.postStrength,0,1,.6),postDispersion:bounded(value.postDispersion,0,1,.25),postSpeed:bounded(value.postSpeed,.1,2,.7),postFade:bounded(value.postFade,.15,1.5,.45),postGlow:bounded(value.postGlow,0,1,.25),
    postCharacter:value.postCharacter!==false,postAuthor:value.postAuthor!==false,postShow:value.postShow===true,postOutro:value.postOutro===true,
    storyPackagingOnly:value.storyPackagingOnly===true,storyFlash:value.storyFlash===true,
    characterScale:bounded(value.characterScale,.6,2.4,1.15),authorScale:bounded(value.authorScale,.6,2.4,1.25),
    characterX:bounded(value.characterX,0,100,55),characterY:bounded(value.characterY,0,100,50),authorX:bounded(value.authorX,0,100,45),authorY:bounded(value.authorY,0,100,50)};
}
// Two independently composed poster shots precede the main showcase. Disabled
// shots consume no time; with neither enabled, the opening is skipped entirely.
function studioStoryDuration(narrative){
  const n=studioNarrativeSettings(narrative);
  return (n.characterShotEnabled?n.characterShotDuration:0)+(n.authorShotEnabled?n.authorShotDuration:0)+(n.characterShotEnabled||n.authorShotEnabled?n.storyTransitionDuration:0);
}
function studioStoryPose(time,intro,narrative){
  const n=studioNarrativeSettings(narrative),nominal=studioStoryDuration(n),total=Number.isFinite(intro)?studioIntroDuration(intro):nominal;
  const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
  if(!nominal||!total)return {active:false,role:'show',local:0,duration:0,alpha:0,shift:0,main:1,transitionStart:0,transitionDuration:0,flash:0};
  const scale=total/nominal,shots=[];
  if(n.characterShotEnabled)shots.push({role:'character',duration:n.characterShotDuration*scale});
  if(n.authorShotEnabled)shots.push({role:'author',duration:n.authorShotDuration*scale});
  const transitionDuration=n.storyTransitionDuration*scale,transitionStart=total-transitionDuration,t=Math.max(0,Number.isFinite(time)?time:0),main=ease((t-transitionStart)/transitionDuration);
  let start=0,shot=shots[0],index=0;
  while(index<shots.length-1&&t>=start+shot.duration){start+=shot.duration;shot=shots[++index]}
  const local=Math.min(shot.duration,Math.max(0,t-start)),fadeIn=Math.min(.24*scale,shot.duration*.22),fadeOut=Math.min(.2*scale,shot.duration*.2),entry=ease(local/fadeIn),lastShot=index===shots.length-1,exit=lastShot?main:1-ease((shot.duration-local)/fadeOut);
  const alpha=t>=total?0:entry*(1-exit),shift=.032*(1-ease(local/Math.min(.65*scale,shot.duration*.55)))-.018*exit;
  let flash=0;
  if(n.storyFlash){for(const boundary of [shots.length>1?shots[0].duration:-1,transitionStart])if(boundary>0){const distance=(t-boundary)/(.055*scale);flash=Math.max(flash,Math.exp(-distance*distance)*.7)}if(t>=total)flash=0;}
  return {active:t<total,role:t>=total?'show':shot.role,local,duration:shot.duration,alpha,shift,main,transitionStart,transitionDuration,flash};
}
function studioContinuousShow(narrative){return !narrative?.outroEnabled&&narrative?.showPlayback!=='repeat'}
function studioTotalDuration(intro,narrative){return studioIntroDuration(intro)+studioShowDuration(narrative)+(narrative?.outroEnabled?studioNarrativeSettings(narrative).outroDuration:0)}
function studioPhase(time,intro,narrative){return time<studioIntroDuration(intro)?'intro':narrative?.outroEnabled&&time>=studioIntroDuration(intro)+studioShowDuration(narrative)?'outro':'show'}
function studioNarrativeTime(time,intro){
  const duration=studioIntroDuration(intro),t=Number.isFinite(time)?Math.max(0,time):0;
  return duration>0&&t<duration?t/duration*4.5:4.5+Math.max(0,t-duration);
}
function studioAdvanceTime(time,delta,intro,narrative){
  const duration=studioIntroDuration(intro),show=studioShowDuration(narrative),next=Math.max(0,time+delta);
  if(narrative?.outroEnabled&&(narrative.outroTrigger!=='manual'||time>=duration+show))return Math.min(next,studioTotalDuration(intro,narrative));
  // Hold the completed information entrance, while independent motion clocks
  // keep rings, patterns, copy and border text moving without a narrative reset.
  if(studioContinuousShow(narrative))return Math.min(next,duration+show);
  return next>=duration+show?duration+(next-duration)%show:next;
}
function studioRetimeShow(time,intro,before,after){
  const start=studioIntroDuration(intro),old=studioShowDuration(before),next=studioShowDuration(after);
  if(time<start)return time;
  return time<start+old?start+(time-start)/old*next:start+next+(time-start-old);
}
function studioRetime(time,before,after){
  const old=studioIntroDuration(before),next=studioIntroDuration(after);
  return old>0&&time<old?time/old*next:next+Math.max(0,time-old);
}
// All narrative animation is seekable. The independent ring clock never resets
// when moving from intro to showcase or when the brand ending starts.
function studioNarrativePose(time,intro,narrative){
  const n=studioNarrativeSettings(narrative),duration=studioIntroDuration(intro),t=Math.max(0,time);
  const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
  const story=n.introStyle==='story'?studioStoryPose(t,duration,n):null,geometry=story?story.main:ease((studioNarrativeTime(t,duration)-.75)/3.6),modelFirst=n.introStyle==='model';
  const reveal=n.nameReveal==='show'?duration:duration*n.nameDelay;
  const outroTime=n.outroEnabled?Math.max(0,t-duration-n.showDuration):0;
  const shutdown=n.outroEnabled&&n.shutdownEnabled?Math.max(0,Math.min(1,(outroTime-n.outroDuration+n.shutdownDuration)/n.shutdownDuration)):0;
  const crt=studioCRTPose(shutdown);
  return {geometry,titleMove:modelFirst||story?1:geometry,
    titleAlpha:story?story.main:modelFirst&&duration>0?ease((t-reveal)/Math.max(.35,Math.min(.9,duration*.25))):1,
    info:story?story.main:modelFirst&&duration>0?ease((t-duration)/.85):geometry,model:story?story.main:modelFirst?1:geometry,story,
    outro:ease(outroTime/Math.min(.8,n.outroDuration*.28)),
    brand:ease((outroTime-.12)/Math.min(1,n.outroDuration*.35)),
    mark:ease((outroTime-.08)/Math.min(1.1,n.outroDuration*.4)),
    shutdown,...crt,
    progress:Math.max(0,Math.min(1,outroTime/n.outroDuration))};
}

// The composition timeline can loop while the artwork phase keeps moving.
// Changing a speed alters only future increments, preserving the current pose.
const motionClockEdgeDefaults={top:{direction:'negative',duration:32},bottom:{direction:'positive',duration:38}};
function motionClockSpeed(value,min,max){return Number.isFinite(value)?Math.max(min,Math.min(max,value)):1}
function motionClockEdgeRate(edge,key){
  const fallback=motionClockEdgeDefaults[key],direction=['negative','positive','still'].includes(edge?.direction)?edge.direction:fallback.direction;
  const duration=Number.isFinite(edge?.duration)?Math.max(12,Math.min(90,edge.duration)):fallback.duration;
  return (direction==='negative'?-1:direction==='positive'?1:0)/duration;
}
function createMotionClock(time,variants,edgeSettings){
  const elapsed=Number.isFinite(time)?Math.max(0,time):0,entries=Object.entries(variants||{});
  return {elapsed,
    rings:Object.fromEntries(entries.map(([key,v])=>[key,elapsed*motionClockSpeed(v?.ringSpeed,0,3)])),
    texts:Object.fromEntries(entries.map(([key,v])=>[key,elapsed*motionClockSpeed(v?.textMotionSpeed,.25,2)])),
    edges:Object.fromEntries(['top','bottom'].map(key=>[key,elapsed*motionClockEdgeRate(edgeSettings?.[key],key)]))
  };
}
function advanceMotionClock(clock,delta,variants,edgeSettings){
  if(!Number.isFinite(delta)||delta<=0)return;
  clock.elapsed+=delta;
  clock.rings??={};clock.texts??={};clock.edges??={top:0,bottom:0};
  for(const [key,v]of Object.entries(variants||{})){
    clock.rings[key]=(clock.rings[key]??0)+delta*motionClockSpeed(v?.ringSpeed,0,3);
    // Disabled text effects still accumulate, so reenabling never restarts them.
    clock.texts[key]=(clock.texts[key]??0)+delta*motionClockSpeed(v?.textMotionSpeed,.25,2);
  }
  for(const key of ['top','bottom'])clock.edges[key]=(clock.edges[key]??0)+delta*motionClockEdgeRate(edgeSettings?.[key],key);
}

// time: narrative seconds; phase: independently accumulated text seconds.
// index: stagger order (negative skips entry); style: refined / soft / playful.
// x/y are pixels. entry is an unblurred fade for stationary QR/barcode layers.
function informationMotionPose(time,phase,index,style,amount=1){
  const finite=(value,fallback)=>Number.isFinite(value)?value:fallback;
  const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
  const strength=clamp(finite(amount,1));
  if(strength===0)return {x:0,y:0,scale:1,opacity:1,entry:1};
  const order=finite(index,0),start=.8+clamp(order,0,7)*.32;
  const progress=order<0?1:clamp((finite(time,0)-start)/1.12);
  const entry=progress*progress*(3-2*progress);
  const angle=finite(phase,0)*Math.PI*2/12+Math.max(0,order)*.47;
  let x,y,scale=1;
  if(style==='soft'){
    x=.65*Math.sin(angle*.5);
    y=2.35*Math.sin(angle)+.45*(1-entry);
    scale+=.0025*Math.sin(angle*.5)*entry;
  }else if(style==='playful'){
    const bounce=Math.max(0,Math.sin(angle))**4;
    x=.65*Math.sin(angle*.5);
    y=-1.7*bounce+1.15*(1-entry);
    scale+=.015*bounce*entry;
  }else{
    x=1.15*Math.sin(angle*.5);
    y=.55*Math.sin(angle)+.65*(1-entry);
  }
  return {x:x*strength,y:y*strength,scale:1+(scale-1)*strength,
    opacity:1-strength*(1-entry),entry};
}

// Positive cycles move right and negative cycles move left. Only the repeated
// content's display position wraps; the shared animation clocks never wrap.
function marqueeOffset(phase,cycleWidth){
  if(!Number.isFinite(phase)||!Number.isFinite(cycleWidth)||cycleWidth<=0)return 0;
  const fraction=((-phase%1)+1)%1;
  return fraction===0?0:-fraction*cycleWidth;
}

/* tuple-v1 stores complete variant values without repeating property names.
   This positional schema is append-only: changing an existing slot requires a
   new encoding marker. State validation remains the restore function's job. */
const studioVariantTupleCodec=(()=>{
  const main=['typeface','cutStrength','badgePalette','badgeStyle','badgeColor','badgeInk','badgeOpacity','ringSpeed','ringScale','textMotion','textMotionStyle','textMotionAmount','textMotionSpeed','geometryStrength','geometryOpacity','grid','gridMoving','gridOpacity','gridMotion','modelScale','parallax','palette','background','pattern','accent','dualSplit','dualGuides'];
  const effects=['gradeEnabled','grade','gradeStrength','gradeModel','gradient','gradientStrength','gradientColor','gradientMotion','titleGradient','grain','vignette','shadowEnabled','shadowStyle','shadowStrength','shadowDepth','shadowColor'];
  const shadows=['title','badges','model','geometry','floor'];
  const series=['atelier','fur','mini'];
  const paths=main.map(key=>[key]).concat(effects.map(key=>['effects',key]),shadows.map(key=>['shadows',key]),series.map(key=>['geometryBySeries',key]));
  const own=(value,key)=>value!==null&&typeof value==='object'&&Object.prototype.hasOwnProperty.call(value,key);
  const safeKey=key=>key!=='__proto__'&&key!=='constructor'&&key!=='prototype';
  const record=value=>value!==null&&typeof value==='object'&&!Array.isArray(value);
  const scalar=value=>typeof value==='string'||typeof value==='number'||typeof value==='boolean';
  function clone(value){
    if(Array.isArray(value))return value.map(clone);
    if(!record(value))return value;
    const copy={};
    for(const key of Object.keys(value))if(safeKey(key))copy[key]=clone(value[key]);
    return copy;
  }
  function encode(variants){
    const encoded={};
    if(!record(variants))return encoded;
    for(const name of Object.keys(variants)){
      if(!safeKey(name)||!record(variants[name]))continue;
      const source=variants[name];
      encoded[name]=paths.map(path=>{
        let value=source;
        for(const key of path){if(!own(value,key))return null;value=value[key]}
        return scalar(value)?value:null;
      });
    }
    return encoded;
  }
  function decode(encoded,defaults){
    const expanded=record(defaults)?clone(defaults):{};
    if(!record(encoded))return expanded;
    for(const name of Object.keys(expanded)){
      if(!safeKey(name)||!record(expanded[name])||!own(encoded,name)||!Array.isArray(encoded[name]))continue;
      const target=expanded[name],tuple=encoded[name];
      for(let index=0;index<paths.length&&index<tuple.length;index++){
        const value=tuple[index];
        if(value===null||!scalar(value))continue;
        const path=paths[index];
        if(path.length===1)target[path[0]]=value;
        else{
          if(!record(target[path[0]]))target[path[0]]={};
          target[path[0]][path[1]]=value;
        }
      }
    }
    return expanded;
  }
  return {encode,decode};
})();
function encodeStudioVariants(variants){return studioVariantTupleCodec.encode(variants)}
function decodeStudioVariants(encoded,defaults){return studioVariantTupleCodec.decode(encoded,defaults)}

const assets={"mmd":{"label":"MMD Compatible","source":"https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/person-standing.svg","productSource":"https://sites.google.com/view/vpvp/","kind":"generic-lucide","lucide":"person-standing","note":"Generic body/motion symbol, not an official MMD logo or certification badge.","type":"image/svg+xml","path":"badge-assets/mmd.svg","bytes":278,"dataUri":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjUiIHI9IjEiLz48cGF0aCBkPSJtOSAyMCAzLTYgMyA2Ii8+PHBhdGggZD0ibTYgOCA2IDIgNi0yIi8+PHBhdGggZD0iTTEyIDEwdjQiLz48L3N2Zz4="},"arkit":{"label":"ARKit Compatible","source":"https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/scan-face.svg","productSource":"https://developer.apple.com/documentation/arkit/arfaceanchor/blendshapes","kind":"generic-lucide","lucide":"scan-face","note":"Generic face-scan symbol, not an Apple logo.","type":"image/svg+xml","path":"badge-assets/arkit.svg","bytes":397,"dataUri":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMyA3VjVhMiAyIDAgMCAxIDItMmgyIi8+PHBhdGggZD0iTTE3IDNoMmEyIDIgMCAwIDEgMiAydjIiLz48cGF0aCBkPSJNMjEgMTd2MmEyIDIgMCAwIDEtMiAyaC0yIi8+PHBhdGggZD0iTTcgMjFINWEyIDIgMCAwIDEtMi0ydi0yIi8+PHBhdGggZD0iTTggMTRzMS41IDIgNCAyIDQtMiA0LTIiLz48cGF0aCBkPSJNOSA5aC4wMSIvPjxwYXRoIGQ9Ik0xNSA5aC4wMSIvPjwvc3ZnPg=="},"vrcft":{"label":"VRCFT","source":"https://raw.githubusercontent.com/VRCFaceTracking/brand-guide/master/SVG/Logos/VRCFTLogo.svg","productSource":"https://github.com/VRCFaceTracking/brand-guide","kind":"official-basic-logo-derived","note":"Monochrome treatment of foreground paths from the permissive basic square icon. No restricted Works with VRCFaceTracking or Unified Expressions badge is included.","type":"image/svg+xml","path":"badge-assets/vrcft.svg","bytes":12472,"dataUri":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNTUiIGhlaWdodD0iMjU1IiB2aWV3Qm94PSIwIDAgMjU1IDI1NSIgZmlsbD0ibm9uZSI+PHBhdGggZD0iTTE2NC43NTkgMzEuNzY1MUMxNjYuMTAyIDMwLjYyMDYgMTY3LjM3OCAyOS40NzEgMTY4LjcyNSAyOC40MTA3QzE3MC4wNzggMjcuMzQ1NCAxNzEuNzE4IDI2LjczNTIgMTczLjE1MSAyNS43OTU4QzE3Ni4yNzUgMjMuNzQ2OCAxNzkuODg2IDIyLjk2NTMgMTgzLjM2MyAyMS44NjUyQzE4NC42NjEgMjEuNDU0NiAxODYuMTA0IDIxLjUwMDcgMTg3LjQ4MiAyMS4zNDYxQzE4OC4zNzggMjEuMjQ1NSAxODkuMjc3IDIxLjE3MzggMTkwLjE3MiAyMS4wNjE4QzE5MS4zMzIgMjAuOTE2NCAxOTIuNDc1IDIxLjEwMzQgMTkzLjYyIDIxLjIxMzVDMTk1LjE2MiAyMS4zNjE3IDE5Ni42OTcgMjEuNTY3OCAxOTguMjM4IDIxLjcyNjVDMTk5LjczMyAyMS44ODA2IDIwMS4wNjggMjIuNTg5NCAyMDIuNTA3IDIyLjkzMTRDMjA1Ljg1MyAyMy43MjY0IDIwOC43MTYgMjUuNTU3MiAyMTEuNjkyIDI3LjE2MzRDMjEzLjY0MSAyOC4yMTU3IDIxNS4xMzMgMjkuODE4MSAyMTYuODc0IDMxLjExNTdDMjE5Ljc5NyAzMy4yOTM4IDIyMS44MDYgMzYuMjk5MyAyMjQuMTI1IDM5LjAyNjJDMjI1LjI2NiA0MC4zNjc2IDIyNS45MDEgNDIuMDA4MyAyMjYuODQ4IDQzLjQ2MjFDMjI5LjI5NCA0Ny4yMjA0IDIzMC42OSA1MS40NDEyIDIzMS45NjQgNTUuNjY5OUMyMzIuODU0IDU4LjYyMjkgMjMzLjMzOCA2MS43MTE0IDIzMy43NDQgNjQuNzgzM0MyMzMuOTMxIDY2LjIwMjMgMjMzLjc4NiA2Ny42NTQ2IDIzMy45MTggNjkuMDkwN0MyMzQuMDEzIDcwLjEyNzQgMjMzLjkyMSA3MS4xNzI4IDIzNC4wNDUgNzIuMjE3MkMyMzQuMTgyIDczLjM3MzggMjMzLjg3MiA3NC41MTk2IDIzMy43NiA3NS42NjlDMjMzLjU4NiA3Ny40NjIyIDIzMy4yODQgNzkuMjQzMyAyMzMuMTIxIDgxLjAzNzJDMjMyLjk4NSA4Mi41MzM5IDIzMi40MjEgODMuOTEyIDIzMi4wNzMgODUuMzQ4NEMyMzEuNjk3IDg2Ljg5OTkgMjMxLjI0NiA4OC40MzUgMjMwLjc3MiA4OS45NjAxQzIzMC4yNjEgOTEuNjA0MiAyMjkuMzI5IDkzLjA3MjIgMjI4LjcwNSA5NC42Njk3QzIyNy4xNjYgOTguNjA5OCAyMjQuNTcgMTAxLjkwNSAyMjIuMTU5IDEwNS4yOTlDMjIxLjI1NiAxMDYuNTcgMjE5Ljk2OCAxMDcuNTY2IDIxOC44NjcgMTA4LjY5N0MyMTguNjQyIDEwOC45MjggMjE4LjQ1MyAxMDguNzk3IDIxOC4yNCAxMDguNzE1QzIxNS4yNzQgMTA3LjU3IDIxMi4yMTMgMTA2LjcwMyAyMDkuMTExIDEwNi4wNzRDMjA1Ljk5NCAxMDUuNDQxIDIwMi44NjkgMTA0Ljc2NSAxOTkuNjU1IDEwNC42NzRDMTk3LjU1MiAxMDQuNjE0IDE5NS40NTkgMTA0LjI1OCAxOTMuMzQ4IDEwNC4zMDhDMTkwLjk4NSAxMDQuMzY1IDE4OC42MTkgMTA0LjQyNSAxODYuMjYgMTA0LjU4MUMxODEuMTUyIDEwNC45MiAxNzYuMDgyIDEwNS41NzYgMTcxLjEzNyAxMDYuOTQxQzE2OC45NzIgMTA3LjUzOSAxNjYuODU2IDEwOC4zMTggMTY0LjczMiAxMDkuMDU3QzE2NC4yNTYgMTA5LjIyMiAxNjMuOTg0IDEwOS4xMTYgMTYzLjYyOSAxMDguODAyQzE2MC44NTggMTA2LjM0MyAxNTguODA0IDEwMy4zMTcgMTU2LjcwNyAxMDAuMzA0QzE1NC43MzcgOTcuNDcxOSAxNTMuNDk5IDk0LjI5MDggMTUyLjEyNiA5MS4xODMzQzE1MC44MDUgODguMTk0NyAxNTAuMTM2IDg0Ljk2NTIgMTQ5LjM4NCA4MS43OTYyQzE0OC44OTYgNzkuNzQxOCAxNDguODY2IDc3LjU3OTUgMTQ4LjYxNyA3NS40NjcxQzE0OC40NzkgNzQuMjk0OCAxNDguMjgyIDczLjEyODIgMTQ4LjM0OCA3MS45NDA3QzE0OC40ODYgNjkuNDYzNiAxNDguNDY4IDY2Ljk3NDIgMTQ4LjY3NCA2NC41MDc5QzE0OC44NDIgNjIuNDkyIDE0OS40NDUgNjAuNTE2MyAxNDkuNzY0IDU4LjUwODJDMTUwLjM5MyA1NC41NTE4IDE1Mi4wMTQgNTAuOTE2MyAxNTMuNDU2IDQ3LjIzOTVDMTU0LjIyNyA0NS4yNzI0IDE1NS41NTYgNDMuNTMwNiAxNTYuNTQ2IDQxLjY0MTNDMTU3Ljg3NiAzOS4xMDI4IDE1OS45MjkgMzcuMTI2NSAxNjEuNjQgMzQuODg1M0MxNjIuNTMgMzMuNzE5IDE2My41NDggMzIuNjgwOCAxNjQuNzU5IDMxLjc2NTFaIiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTE0OC4zODQgMjEzLjc2N0MxNDYuOTAxIDIxMy42NDIgMTQ2LjYxOSAyMTMuNDQzIDE0Ni4zNjEgMjEyLjAyN0MxNDUuNzQ0IDIwOC42MzkgMTQ1LjE4MSAyMDUuMjQxIDE0NC41NzQgMjAxLjg1MkMxNDQuMTcgMTk5LjU5NiAxNDMuNzc3IDE5Ny4zMjggMTQzLjc5NyAxOTUuMDQxQzE0My44MDkgMTkzLjcwOSAxNDMuOTcyIDE5Mi4zNTUgMTQ0LjY0NyAxOTEuMDkxQzE0NS41NDkgMTg5LjM5OSAxNDYuOTc0IDE4OC40MjEgMTQ4LjY2OCAxODcuNzhDMTUyLjA1NCAxODYuNDk4IDE1NS41OTMgMTg1LjczNyAxNTkuMDk4IDE4NC44NzNDMTY0Ljg2MSAxODMuNDUxIDE3MC41NTIgMTgxLjgwNCAxNzYuMTEgMTc5LjcxNUMxODAuMDY2IDE3OC4yMjggMTgzLjkyOSAxNzYuNTE1IDE4Ny42NTMgMTc0LjUyNkMxOTEuMjU0IDE3Mi42MDMgMTk0Ljc1MSAxNzAuNDg5IDE5OC4xMjggMTY4LjE4N0MyMDEuNTAxIDE2NS44ODcgMjA0Ljg2NSAxNjMuNTc0IDIwOC4yNTEgMTYxLjI5M0MyMTAuNDA2IDE1OS44NDEgMjEyLjYgMTU4LjQ0NCAyMTQuOTQgMTU3LjMwMUMyMTYuNTQ2IDE1Ni41MTYgMjE4LjIxMSAxNTUuODgyIDIyMC4wMTkgMTU1Ljc0NkMyMjIuMDggMTU1LjU5MSAyMjMuOTAyIDE1Ni4zMDQgMjI1LjU3NCAxNTcuNDFDMjI3LjM2NiAxNTguNTk1IDIyOC44OTQgMTYwLjA3OCAyMzAuMTkzIDE2MS43OTdDMjMwLjU4IDE2Mi4zMDkgMjMwLjcxMiAxNjIuOTMzIDIzMS4wNjYgMTYzLjUwMkMyMzEuMTg3IDE2My41NzkgMjMxLjIxNiAxNjMuNjYgMjMxLjI2IDE2My43ODVDMjMxLjI4NSAxNjMuODIyIDIzMS4yODUgMTYzLjgxNCAyMzEuMjgzIDE2My44MTdDMjMxLjM2MyAxNjMuOTAyIDIzMS40NjEgMTYzLjk5NCAyMzEuNDYgMTY0LjEwOUMyMzEuNDU1IDE2NS4xMjEgMjMxLjY4MSAxNjYuMTEzIDIzMS40NDkgMTY3LjE0OEMyMzAuNzE3IDE3MC40MTggMjI4Ljk3MSAxNzMuMTczIDIyNy4xOTcgMTc1LjkzMkMyMjUuMjkzIDE3OC44OTUgMjIzLjAyIDE4MS41NyAyMjAuNzAxIDE4NC4xOTVDMjE4LjYxMiAxODYuNTU5IDIxNi4yNjkgMTg4LjY4MiAyMTMuODUgMTkwLjcyNUMyMDguNjM4IDE5NS4xMjQgMjAyLjkyIDE5OC43NTEgMTk2Ljg4NiAyMDEuODc2QzE5MS40MTUgMjA0LjcxIDE4NS43NDEgMjA3LjA5NCAxNzkuODYxIDIwOC45NjNDMTczLjM1NSAyMTEuMDMgMTY2LjcxOCAyMTIuNDYgMTU5LjkxOSAyMTMuMTM4QzE1Ni43MzIgMjEzLjQ1NyAxNTMuNTQ3IDIxMy43NjYgMTUwLjM0MiAyMTMuODE2QzE0OS43MDQgMjEzLjgyNiAxNDkuMDYzIDIxNC4xMjYgMTQ4LjM4NCAyMTMuNzY3WiIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0xMjcuNDExIDIxMi43ODhDMTIxLjY0MyAyMTIuODUxIDExNS44ODYgMjEyLjg0NiAxMTAuMTI5IDIxMi44NjRDMTA5LjYxMiAyMTIuODY2IDEwOS40NTggMjEyLjcyNiAxMDkuNDU4IDIxMi4yQzEwOS40NzMgMTk3LjAxOCAxMDkuNDcyIDE4MS44MzUgMTA5LjQ3NSAxNjYuNjUzQzEwOS40NzUgMTY2LjUzOCAxMDkuNDk3IDE2Ni40MjMgMTA5LjU0OCAxNjYuMjcxQzEwOS45MzkgMTY2LjU2OCAxMDkuODU2IDE2Ny4wMDcgMTA5Ljg1NyAxNjcuNDE1QzEwOS44NjYgMTcwLjQxMSAxMDkuODYgMTczLjQwOCAxMDkuODYzIDE3Ni40MDRDMTA5Ljg2NCAxNzcuNDc2IDEwOS44NjggMTc3LjQ3OSAxMTAuOTU3IDE3Ny40NzlDMTE1Ljk3NCAxNzcuNDgxIDEyMC45OTEgMTc3LjQ4MiAxMjYuMDA4IDE3Ny40NzlDMTI2Ljk5NSAxNzcuNDc4IDEyNy4wMTMgMTc3LjQ2IDEyNy4wMTQgMTc2LjQ1N0MxMjcuMDE4IDE3My40NiAxMjcuMDEzIDE3MC40NjQgMTI3LjAxOCAxNjcuNDY4QzEyNy4wMTkgMTY3LjA3NyAxMjYuOTY3IDE2Ni42NzMgMTI3LjI0MiAxNjYuMjY4QzEyNy4yOSAxNjYuMjIxIDEyNy4zNTMgMTY2LjIwNiAxMjcuMzg1IDE2Ni4yMDRDMTI3LjQyMyAxNzUuMTE3IDEyNy40MzMgMTg0LjAzMiAxMjcuNDM0IDE5Mi45NDdDMTI3LjQzNiAxOTkuNTQgMTI3LjQyNiAyMDYuMTMzIDEyNy40MTEgMjEyLjc4OFoiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNMTU0Ljk5NCA4Ni45NjU2QzE1Ni4yNDUgODguNTE4MSAxNTcuMzg0IDkwLjA5MDcgMTU4Ljk4MiA5MS4yNzEyQzE2MC4zMzcgOTIuMjcyMSAxNjEuNzczIDkzLjA2MjMgMTYzLjM3NCA5My41ODg3QzE2NC45NyA5NC4xMTM1IDE2Ni42MDMgOTQuMjI1OSAxNjguMjU0IDk0LjEyMzJDMTY5LjM5MyA5NC4wNTIzIDE3MC41MjUgOTMuNzcxNCAxNzEuNTYgOTMuMzM2NUMxNzUuMTU1IDkxLjgyNjMgMTc3LjgxIDg5LjI3MjMgMTc5LjYzNSA4NS44MkMxODEuNTM0IDgyLjIyNDUgMTgyLjMxMyA3OC4zNzkgMTgyLjMwOSA3NC4zNTA5QzE4Mi4zMDYgNzEuMTAwNCAxODIuMzg2IDY3Ljg0NjUgMTgyLjA3MyA2NC42MDM4QzE4MS43MzcgNjEuMTI1OCAxODAuNzg4IDU3Ljg1NTMgMTc4Ljk2OSA1NC44M0MxNzcuNDk1IDUyLjM3ODQgMTc1LjUyMyA1MC40NTc0IDE3My4wNzMgNDkuMDczNEMxNzEuNTQ0IDQ4LjIxMDEgMTY5Ljg0NCA0Ny43MTUgMTY4LjA0OSA0Ny41Nzg5QzE2NS4yOTUgNDcuMzcwMSAxNjIuNzY0IDQ4LjAxNjEgMTYwLjQzMiA0OS40Mzk4QzE1OC4yNjcgNTAuNzYxIDE1Ni40NSA1Mi40NTY2IDE1NS4xNDQgNTQuNjU5OUMxNTUuMSA1NC43MzM4IDE1NS4wMjkgNTQuNzkxNCAxNTQuOTQxIDU0Ljg5MDNDMTU0LjkzIDU0LjQxMTcgMTU1LjUyOSA1Mi44MDc3IDE1NS45NTYgNTIuMDUzNUMxNTcuMzYgNDkuNTcyOCAxNTkuMDE1IDQ3LjI2MzggMTYxLjE4OSA0NS40MTk4QzE2Mi45OTEgNDMuODkwNCAxNjUuMDEyIDQyLjY2NzIgMTY3LjMwNCA0MS45MTQ5QzE2OS43NTYgNDEuMTA5OSAxNzIuMjIyIDQwLjg4NDIgMTc0Ljc2NyA0MS4yODVDMTc3LjEzOSA0MS42NTg2IDE3OS4yNzYgNDIuNTU2NCAxODEuMyA0My44NDU3QzE4NC41NTUgNDUuOTIwMSAxODYuODM1IDQ4Ljg1IDE4OC41NiA1Mi4xOTIzQzE4OS45MDIgNTQuNzkxMSAxOTAuNjkzIDU3LjYyIDE5MS4xODUgNjAuNTI1MUMxOTEuNTcxIDYyLjgwMjUgMTkxLjY0NCA2NS4wOTg5IDE5MS43MDcgNjcuMzkxMUMxOTEuNzk1IDcwLjU5NDQgMTkxLjgzOSA3My44MDQ1IDE5MS43MyA3Ny4wMDU4QzE5MS42MjcgODAuMDI1NyAxOTEuMDY0IDgyLjk4NTEgMTkwLjExOSA4NS44Nzc0QzE4OS4wMDQgODkuMjg3NSAxODcuMjg0IDkyLjM1NzUgMTg0LjgzNSA5NC45MzI2QzE4Mi40MzIgOTcuNDYwNSAxNzkuNTUxIDk5LjMwMTYgMTc2LjA2NiAxMDAuMTU4QzE3Mi44MyAxMDAuOTUzIDE2OS42NzggMTAwLjcwNCAxNjYuNjM4IDk5LjU3NjhDMTY0LjYxMiA5OC44MjU1IDE2Mi43NzkgOTcuNjI5NSAxNjEuMTExIDk2LjE2ODNDMTU4LjI0OCA5My42NjAxIDE1Ni4zODggOTAuNTEwNCAxNTQuODUzIDg3LjA1MzFDMTU0Ljg3NSA4Ni45ODI3IDE1NC45MDggODYuOTY0MSAxNTQuOTk0IDg2Ljk2NTZaIiBmaWxsPSIjMTExIi8+PHBhdGggZD0iTTkxLjM4MzcgMTc3LjcwNUM5MS40NDQ5IDE3OC4wMzEgOTEuNDY4OCAxNzguMzA5IDkxLjQ2ODggMTc4LjU4N0M5MS40NzA3IDE4OS43MTUgOTEuNDY0MiAyMDAuODQ0IDkxLjQ4NTMgMjExLjk3MkM5MS40ODY2IDIxMi42NTcgOTEuMzQ2MyAyMTIuODc2IDkwLjYxNDEgMjEyLjg3MkM4NC4yNDg1IDIxMi44NCA3Ny44ODI2IDIxMi44NDMgNzEuNTE3IDIxMi44NjlDNzAuODMxMiAyMTIuODcyIDcwLjY4MTcgMjEyLjY2NSA3MC42ODI2IDIxMi4wMDlDNzAuNzAyNyAxOTcuMDAxIDcwLjY5OTggMTgxLjk5MiA3MC43MDMzIDE2Ni45ODRDNzAuNzAzNCAxNjYuNzUzIDcwLjcyOTQgMTY2LjUyMyA3MC43ODY2IDE2Ni4yNTdDNzEuMTgwOCAxNjYuNTU1IDcxLjEwMjIgMTY2Ljk5MyA3MS4xMDMzIDE2Ny40MDFDNzEuMTExNSAxNzAuNDE1IDcxLjEwNTUgMTczLjQyOSA3MS4xMDg2IDE3Ni40NDNDNzEuMTA5NiAxNzcuNDcgNzEuMTE3NiAxNzcuNDc4IDcyLjE2OTQgMTc3LjQ3OEM3OC4xNTEyIDE3Ny40ODEgODQuMTMzIDE3Ny40NzggOTAuMTE0OSAxNzcuNDgyQzkwLjUyNzMgMTc3LjQ4MiA5MC45NTQ0IDE3Ny40MTkgOTEuMzgzNyAxNzcuNzA1WiIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik01Mi41MTk3IDE2Ni4yNzNDNTIuNzgyNCAxNjYuNDEyIDUyLjY4NjQgMTY2LjY2MiA1Mi42ODY1IDE2Ni44ODFDNTIuNjkzMyAxODEuOTU2IDUyLjY5MDQgMTk3LjAzMiA1Mi43MTE0IDIxMi4xMDhDNTIuNzEyMyAyMTIuNzQ5IDUyLjUwNzQgMjEyLjg2OSA1MS45MTg1IDIxMi44NjZDNDcuMjcyOCAyMTIuODQ0IDQyLjYyNyAyMTIuODUgMzcuOTgxMiAyMTIuODZDMzcuNTA5NSAyMTIuODYxIDM3LjIyMzggMjEyLjg0MiAzNy4yMjQ2IDIxMi4yMUMzNy4yNDQ4IDE5Ny4wMTggMzcuMjQyMyAxODEuODI3IDM3LjI0NTcgMTY2LjYzNUMzNy4yNDU4IDE2Ni41MjEgMzcuMjcxOCAxNjYuNDA2IDM3LjMyOTIgMTY2LjI1N0MzNy43MjI5IDE2Ni41NTYgMzcuNjQzMiAxNjYuOTk1IDM3LjY0NDQgMTY3LjQwNEMzNy42NTMyIDE3MC40MjQgMzcuNjQ2MiAxNzMuNDQ0IDM3LjY1MDIgMTc2LjQ2NEMzNy42NTE2IDE3Ny40NjMgMzcuNjY3IDE3Ny40NzggMzguNjYzNSAxNzcuNDc5QzQyLjg5MTggMTc3LjQ4MiA0Ny4xMjAxIDE3Ny40ODMgNTEuMzQ4MyAxNzcuNDc4QzUyLjI1NDcgMTc3LjQ3NyA1Mi4yODk0IDE3Ny40NDIgNTIuMjkxMSAxNzYuNTMzQzUyLjI5NjggMTczLjUxMyA1Mi4yOTA0IDE3MC40OTMgNTIuMjk1OSAxNjcuNDczQzUyLjI5NjYgMTY3LjA4MiA1Mi4yNDY2IDE2Ni42NzggNTIuNTE5NyAxNjYuMjczWiIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik05MS40NDIxIDE3Ny42ODlDODQuODIyOSAxNzcuNzU0IDc4LjIxMzcgMTc3Ljc0OCA3MS42MDQ1IDE3Ny43NjlDNzAuOTk4MyAxNzcuNzcxIDcwLjgxMSAxNzcuNjEyIDcwLjgxNiAxNzYuOTkxQzcwLjg0NDUgMTczLjQ0MyA3MC44MyAxNjkuODk1IDcwLjgzIDE2Ni4yODVDNzEuMDYxIDE2Ni4yMSA3MS4yOTIgMTY2LjE4NyA3MS41MjI5IDE2Ni4xODdDNzcuOTAyMSAxNjYuMTg1IDg0LjI4MTMgMTY2LjE5NCA5MC42NjAzIDE2Ni4xNzJDOTEuMjkxIDE2Ni4xNyA5MS40ODE5IDE2Ni4zMjkgOTEuNDc1NSAxNjYuOTc3QzkxLjQ0MDkgMTcwLjUyNiA5MS40NTQ4IDE3NC4wNzUgOTEuNDQyMSAxNzcuNjg5WiIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik0xMjcuMjI2IDE2Ni4yMDhDMTI3LjI5MSAxNjkuODIxIDEyNy4yOCAxNzMuNDIxIDEyNy4zMDMgMTc3LjAyMUMxMjcuMzA3IDE3Ny42MDEgMTI3LjEzMyAxNzcuNzcgMTI2LjU1NSAxNzcuNzY4QzEyMS4xNDMgMTc3Ljc0OSAxMTUuNzMxIDE3Ny43NDggMTEwLjMyIDE3Ny43NjhDMTA5LjczNyAxNzcuNzcgMTA5LjU3MiAxNzcuNTkyIDEwOS41NzUgMTc3LjAxOEMxMDkuNTk4IDE3My40NjQgMTA5LjU4NyAxNjkuOTEgMTA5LjU4NyAxNjYuMjk2QzEwOS43MjUgMTY2LjIxOCAxMDkuODYyIDE2Ni4xODggMTA5Ljk5OSAxNjYuMTg4QzExNS43MiAxNjYuMTg5IDEyMS40NDEgMTY2LjE5MiAxMjcuMjI2IDE2Ni4yMDhaIiBmaWxsPSIjZmZmIi8+PHBhdGggZD0iTTUyLjUwNSAxNjYuMjEyQzUyLjU2OTIgMTY5LjgwNCA1Mi41NTMgMTczLjM4MiA1Mi41ODQ2IDE3Ni45NTlDNTIuNTkwNCAxNzcuNjE1IDUyLjM4NDUgMTc3Ljc3MyA1MS43NTYgMTc3Ljc3QzQ3LjIyNjUgMTc3Ljc0NSA0Mi42OTY3IDE3Ny43NDMgMzguMTY3MiAxNzcuNzcyQzM3LjUwNDkgMTc3Ljc3NiAzNy4zNTUzIDE3Ny41NjIgMzcuMzYgMTc2LjkzOUMzNy4zODY1IDE3My40MDkgMzcuMzcyOSAxNjkuODc4IDM3LjM3MyAxNjYuMjg1QzM4LjgzMDYgMTY2LjIxIDQwLjI4ODEgMTY2LjE4OCA0MS43NDU2IDE2Ni4xODdDNDUuMzEwOCAxNjYuMTg1IDQ4Ljg3NTkgMTY2LjE5MyA1Mi41MDUgMTY2LjIxMloiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNOTIuNzkzMyAxMDIuMTM1QzkxLjc1NjIgMTAzLjAzNCA5MC43NDQ4IDEwMy44ODggODkuNzYyOCAxMDQuNzc1Qzg4LjMzMjUgMTA2LjA2NiA4Ni41NDggMTA2LjgwMSA4NC45NzYxIDEwNy44NjhDODEuOTUxOCAxMDkuOTIgNzguNTExNCAxMTEuMTAyIDc1LjA3MDkgMTEyLjA1NUM3MS44ODE5IDExMi45MzkgNjguNTY5NyAxMTMuNDYyIDY1LjE5IDExMy41NTlDNjAuODkyNyAxMTMuNjgyIDU2LjcwOTYgMTEzLjA3OCA1Mi41NjcxIDExMi4xNDlDNTAuNjU4MiAxMTEuNzIxIDQ4Ljg2NSAxMTAuNzk1IDQ2Ljk5ODUgMTEwLjE1NkM0NC4zMDUgMTA5LjIzMyA0Mi4wNjEgMTA3LjUwMSAzOS42MTA2IDEwNi4xNDFDMzcuODg0NiAxMDUuMTgzIDM2LjYwMzggMTAzLjY2OSAzNS4wNjY3IDEwMi40NzZDMzIuMjE2OCAxMDAuMjYzIDMwLjIwODggOTcuMzAzMSAyOC4wODE2IDk0LjQ3NTFDMjYuOTQ5IDkyLjk2OTUgMjYuMTYwNyA5MS4xOTAxIDI1LjMxOCA4OS40ODQ0QzIzLjMzMTQgODUuNDYzMSAyMS45NzM3IDgxLjI0MTkgMjEuNDc0MSA3Ni43NjQ3QzIxLjM2MzUgNzUuNzczNSAyMS4yMTg5IDc0Ljc4NTUgMjEuMDY5NSA3My43OTkyQzIwLjc5ODggNzIuMDExNyAyMS4xNjk1IDcwLjIzMjYgMjEuMTI0OCA2OC40NTEzQzIxLjAzNDkgNjQuODYzNiAyMi4xNDU3IDYxLjQ4NjMgMjIuOTA1MSA1OC4wNTFDMjMuMjMwOSA1Ni41Nzc1IDI0LjA4NzMgNTUuMjc4MSAyNC41ODY0IDUzLjg1NjRDMjUuODM2NyA1MC4yOTQzIDI4LjEzMzkgNDcuMzQ1NiAzMC4xOTY5IDQ0LjI2NzFDMzAuODQ3MSA0My4yOTY3IDMxLjgzOTQgNDIuNTYzIDMyLjU5NDQgNDEuNjU0QzM1LjEzOTggMzguNTg5MyAzOC40MDk1IDM2LjM5MzUgNDEuNjU2IDM0LjIwNjZDNDMuMjc3OCAzMy4xMTQyIDQ1LjE2OTQgMzIuNDE5NyA0Ni45NDY4IDMxLjU2MTdDNDkuOTYzMiAzMC4xMDU2IDUzLjIxNSAyOS4zNjQ3IDU2LjQ1OCAyOC43MTU2QzU4Ljc4NzYgMjguMjQ5NCA2MS4yMDYzIDI4LjExNjEgNjMuNTkgMjguMDY2OUM2NS41MDU4IDI4LjAyNzMgNjcuNDI4MiAyOC4zNDUzIDY5LjM0ODggMjguNDg5MUM3Mi42MDE5IDI4LjczMjcgNzUuNzI5MSAyOS42NzAzIDc4LjcxMzQgMzAuODEyQzgyLjI3MDIgMzIuMTcyOCA4NS42NTc1IDMzLjk1ODggODguODAxMiAzNi4yMzY5QzkxLjk2MzcgMzguNTI4NSA5NC42MDMzIDQxLjMwMyA5Ny4xNzI3IDQ0LjE2MzZDOTguMzA4OCA0NS40Mjg1IDk5LjA1MDUgNDcuMDM4NyAxMDAuMDcgNDguNDE5MUMxMDEuNTI3IDUwLjM5MTIgMTAyLjI4IDUyLjY5NTkgMTAzLjMyNSA1NC44NjUyQzEwNC44OTIgNTguMTE1MiAxMDUuMzM2IDYxLjY2MjcgMTA2LjE2NCA2NS4xMDYxQzEwNi4zOTggNjYuMDgxOCAxMDYuMjk0IDY3LjEzODkgMTA2LjM0NSA2OC4xNTg2QzEwNi40ODQgNzAuOTQxIDEwNi4zOTEgNzMuNjk3MSAxMDYuMDc1IDc2LjQ4MzFDMTA1LjY0IDgwLjMyMTIgMTA0LjQxOCA4My45MDkxIDEwMy4xMzggODcuNDgyOEMxMDIuNTI1IDg5LjE5MjQgMTAxLjQ2MSA5MC43Mzg4IDEwMC42MTggOTIuMzY3OUM5OC45NTcyIDk1LjU3NzkgOTYuNTE0NCA5OC4xOTc3IDk0LjE4MTcgMTAwLjg5OEM5My43OTA3IDEwMS4zNTEgOTMuMjg0OSAxMDEuNzA1IDkyLjc5MzMgMTAyLjEzNVoiIGZpbGw9IiNmZmYiLz48cGF0aCBkPSJNODYuMDgyMSA5Ny43OTU3Qzg0LjEwNTEgOTkuNzQzNSA4MS42NDc0IDEwMC45MjMgNzkuMzE1IDEwMi4yOUM3Ny45Njg0IDEwMy4wNzkgNzYuNDU0MiAxMDMuNDg3IDc0Ljk5OTkgMTA0LjAxOEM3MS41ODA5IDEwNS4yNjYgNjguMDM4OCAxMDUuNzU4IDY0LjM5NTIgMTA1Ljg2QzYxLjA2OTEgMTA1Ljk1MyA1Ny44MzUzIDEwNS40NzUgNTQuNjI3NSAxMDQuNzc0QzUzLjE2OSAxMDQuNDU1IDUxLjgwNDggMTAzLjcyNyA1MC4zNzIzIDEwMy4yNjNDNDcuNzA1NiAxMDIuNDAxIDQ1LjQ5MDkgMTAwLjcxMyA0My4xMzQzIDk5LjMwMkM0MS45NDE1IDk4LjU4NzkgNDAuOTggOTcuNDg5NCAzOS45MDcgOTYuNTcyOEMzNy41Nzg1IDk0LjU4MzUgMzUuNzI3NiA5Mi4xNjQ0IDM0LjExIDg5LjYxNDhDMzIuMjYwOCA4Ni43MDA0IDMwLjg2NzQgODMuNTQ2OCAyOS45MjEyIDgwLjE4NTdDMjkuMzY0MSA3OC4yMDY5IDI5LjI1MzUgNzYuMTgzNiAyOC44NDY0IDc0LjIwMUMyOC40NzA4IDcyLjM3MTMgMjguNzQzNSA3MC41NTY0IDI4Ljc1MTggNjguNzM4N0MyOC43NjA3IDY2Ljc3MTYgMjkuMTk2OSA2NC44NTMgMjkuNTg1NCA2Mi45MjE2QzMwLjE1OTcgNjAuMDY2OCAzMS4yNTY4IDU3LjQxMDYgMzIuNTI1MiA1NC44NTAxQzMzLjc5NTkgNTIuMjg1MSAzNS4zNzkgNDkuODY2OCAzNy4zNjk4IDQ3Ljc2MDFDMzcuOTQyNSA0Ny4xNTQxIDM4LjUxNzcgNDYuNTQ5NCAzOS4wNjY1IDQ1LjkyMkM0MC43Njc4IDQzLjk3NzEgNDIuOTk2MiA0Mi42OTMxIDQ1LjAxOTMgNDEuMTUyM0M0Ni4xNTQ5IDQwLjI4NzMgNDcuNTM3NCAzOS44Nzg1IDQ4Ljc2MDkgMzkuMTg0NEM1MS4xNTk4IDM3LjgyMzMgNTMuODIzIDM3LjI4NTEgNTYuNDIzOCAzNi41MzY4QzU3LjgxNjYgMzYuMTM2MSA1OS4yNDc2IDM2LjA5NTkgNjAuNjczMSAzNS45NzQ3QzYxLjQwODMgMzUuOTEyMiA2Mi4xNDI1IDM1LjgyNzkgNjIuODczMyAzNS43MjYzQzYzLjc4MjkgMzUuNiA2NC42NzYxIDM1Ljc4MzMgNjUuNTczNSAzNS44NDg1QzY2Ljg2MTggMzUuOTQyMiA2OC4xNDQ4IDM2LjEwNjggNjkuNDMxNSAzNi4yMjU2QzcwLjk5MTIgMzYuMzY5NyA3Mi40MzAzIDM2Ljk5OTMgNzMuOTQ0OCAzNy4zMjY0Qzc2Ljc3NTkgMzcuOTM4IDc5LjMyNTcgMzkuMzA2IDgxLjc1MjEgNDAuNzUyNUM4NC42NDE5IDQyLjQ3NTIgODcuMjUxMiA0NC42MjE2IDg5LjU2NDkgNDcuMTU3MUM5MS40NDc1IDQ5LjIyMDMgOTIuOTE1NiA1MS41MjQ2IDk0LjQyNjkgNTMuODIxOEM5NS4yNTczIDU1LjA4NCA5NS42NDE5IDU2LjU3MjQgOTYuMzAwNiA1Ny45MjQxQzk3LjU0NTYgNjAuNDc4NyA5Ny44NDQyIDYzLjI5MTkgOTguNTQyOSA2NS45OTUxQzk4LjY5MjEgNjYuNTcyNiA5OC42NTg0IDY3LjIwMzYgOTguNjU1NSA2Ny43ODlDOTguNjQ1IDY5LjkxIDk5LjA4OTMgNzIuMDI1OSA5OC42MjY1IDc0LjE1ODNDOTguMzE4OSA3NS41NzUyIDk4LjIwNTMgNzcuMDM0OSA5OC4wMjA0IDc4LjQ3NzVDOTcuOTM2NiA3OS4xMzExIDk3LjY4NjUgNzkuNzMyOCA5Ny40NjEzIDgwLjMzNzVDOTYuODA2OSA4Mi4wOTUyIDk2LjUxMTYgODMuOTg3MSA5NS41NTU4IDg1LjYyOTNDOTQuNjU5NCA4Ny4xNjk2IDkzLjk2NDggODguODIxNCA5Mi45MTU3IDkwLjMyMjRDOTIuNDk0NyA4OS45OTA4IDkyLjY1MDEgODkuNTIyNyA5Mi42MzM0IDg5LjA5ODlDOTIuNTU1MyA4Ny4xMjY2IDkyLjAyNDEgODUuMzQ5MyA5MC41Mjk4IDgzLjk1NUM4OC45Nzg2IDgyLjUwNzYgODYuNjAzNCA4Mi41MTQ2IDg1LjAyNCA4My45MzM1QzgzLjU2MDkgODUuMjQ4MSA4Mi45MjU1IDg2LjkyNjEgODIuODM2MiA4OC44MjE3QzgyLjc1NTUgOTAuNTM1MSA4Mi43OTQxIDkyLjI1NTEgODMuMjExMiA5My45MzY3QzgzLjU2ODIgOTUuMzc1NiA4NC4zOTQ1IDk2LjQ5MjIgODUuNjE2NyA5Ny4zMjIxQzg1Ljc4OTIgOTcuNDM5MiA4NS45NzI5IDk3LjU0NDkgODYuMDgyMSA5Ny43OTU3WiIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik04Ni4xNDQgOTcuODU2QzgzLjU5MDkgOTYuNDkwOCA4Mi43MDA2IDk0LjI0OTUgODIuNjQ3OSA5MS41NTI0QzgyLjYxNzYgOTAuMDAxOSA4Mi40NzAzIDg4LjQ0NTUgODIuOTI0OCA4Ni45MjE3QzgzLjQxNDEgODUuMjgwOCA4NC4yNzY0IDgzLjkxMDYgODUuODMyNCA4My4xMDgxQzg3Ljg2NjQgODIuMDU5IDkwLjI1NzQgODIuODE0NyA5MS41OTMyIDg0LjgyNDZDOTIuNjg5NyA4Ni40NzQ1IDkyLjg3ODEgODguMzE3MSA5Mi44NjY4IDkwLjI4M0M5Mi44NjcgOTEuNjg5NyA5Mi45MDE0IDkzLjAzOTMgOTIuNDI2NiA5NC4zMjYyQzkxLjc0MTkgOTYuMTgyMiA5MC42MjQzIDk3LjYwMTQgODguNTgyMSA5OC4wNzEyQzg3Ljc2MTcgOTguMjU5OSA4Ni45NzQ3IDk4LjExOCA4Ni4xNDQgOTcuODU2WiIgZmlsbD0iI2ZmZiIvPjxwYXRoIGQ9Ik00OS41MDU4IDYyLjA0NDNDNDkuMDQxMyA2NC4xMTEgNDguMjM2NCA2NS45MTkzIDQ2LjYyOTcgNjcuMzAyOUM0My45NjcxIDY5LjU5NTcgNDAuMTUxNyA2OS4yNzM3IDM3Ljg4NjQgNjYuNTc1OEMzNi41OTA0IDY1LjAzMjIgMzUuODExMyA2My4yNjYgMzUuNjQ0NiA2MS4yODExQzM1LjQxOTYgNTguNjAzNSAzNS4xNTg1IDU1LjkwMjQgMzUuOTA2MyA1My4yNTk4QzM2LjYzMzcgNTAuNjg4OCAzOC4wNDIxIDQ4LjY1MzYgNDAuNjQxNyA0Ny42MzQ3QzQyLjczOTYgNDYuODEyNSA0NS4zNTY1IDQ3LjQzODQgNDYuOTI0OCA0OS4wNjc1QzQ4LjcwOCA1MC45MTk3IDQ5LjUwOTYgNTMuMTU0IDQ5LjYzMTIgNTUuNjY1NkM0OS43MzMzIDU3Ljc3MyA0OS44NjMyIDU5Ljg4NDcgNDkuNTA1OCA2Mi4wNDQzWiIgZmlsbD0iI2ZmZiIvPjwvc3ZnPg=="},"mtoon":{"label":"MToon","source":"https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/layers-2.svg","productSource":"https://github.com/Santarh/MToon","kind":"generic-lucide","lucide":"layers-2","note":"Generic shader symbol, not an official MToon logo.","type":"image/svg+xml","path":"badge-assets/mtoon.svg","bytes":395,"dataUri":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTMgMTMuNzRhMiAyIDAgMCAxLTIgMEwyLjUgOC44N2ExIDEgMCAwIDEgMC0xLjc0TDExIDIuMjZhMiAyIDAgMCAxIDIgMGw4LjUgNC44N2ExIDEgMCAwIDEgMCAxLjc0eiIvPjxwYXRoIGQ9Im0yMCAxNC4yODUgMS41Ljg0NWExIDEgMCAwIDEgMCAxLjc0TDEzIDIxLjc0YTIgMiAwIDAgMS0yIDBsLTguNS00Ljg3YTEgMSAwIDAgMSAwLTEuNzRsMS41LS44NDUiLz48L3N2Zz4="},"liltoon":{"label":"lilToon","source":"https://raw.githubusercontent.com/lilxyzw/lilToon/master/logo/SVG/liltoon-icon-white.svg","productSource":"https://github.com/lilxyzw/lilToon/tree/master/logo","kind":"official-white-icon","note":"Official white icon. Upstream logo terms permit use in works and thumbnails and changing color or resolution.","type":"image/svg+xml","path":"badge-assets/liltoon.svg","bytes":8914,"dataUri":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA0MDk2IDQwOTYiPjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+Cgkuc3Qwe2ZpbGw6I0ZGRkZGRjt9Cjwvc3R5bGU+PHBhdGggY2xhc3M9InN0MCIgZD0iTTIwNDgsMEwyMDQ4LDBDOTE2LjkyLDAsMCw5MTYuOTIsMCwyMDQ4djBjMCwxMTMxLjA4LDkxNi45MiwyMDQ4LDIwNDgsMjA0OGgwICBjMTEzMS4wOCwwLDIwNDgtOTE2LjkyLDIwNDgtMjA0OHYwQzQwOTYsOTE2LjkyLDMxNzkuMDgsMCwyMDQ4LDB6IE01MzUuNTksMjUyOS41MmMtNjcuOSwwLTEzMy4wMS0yNi45Ny0xODEuMDItNzQuOTggIGMtNDguMDEtNDguMDEtNzQuOTgtMTEzLjEyLTc0Ljk4LTE4MS4wMnMyNi45Ny0xMzMuMDEsNzQuOTgtMTgxLjAybDEwMjQtMTAyNGM0OC4wMS00OC4wMSwxMTMuMTItNzQuOTgsMTgxLjAyLTc0Ljk4ICBzMTMzLjAxLDI2Ljk3LDE4MS4wMiw3NC45OGM0OC4wMSw0OC4wMSw3NC45OCwxMTMuMTIsNzQuOTgsMTgxLjAyYzAsNjcuOS0yNi45NywxMzMuMDEtNzQuOTgsMTgxLjAybC0xMDI0LDEwMjQgIEM2NjguNiwyNTAyLjU1LDYwMy40OSwyNTI5LjUyLDUzNS41OSwyNTI5LjUyeiBNMjIzMy4yNCwyMjI0LjdsLTQ4OC40MSw1MTJjLTQ2Ljg2LDQ5LjEzLTExMS4zMyw3Ny42My0xNzkuMiw3OS4yMyAgYy0yLjAxLDAuMDUtNC4wMywwLjA3LTYuMDQsMC4wN2MtNjUuNzMsMC0xMjkuMDItMjUuMjktMTc2LjY5LTcwLjc2Yy00OS4xMy00Ni44Ni03Ny42My0xMTEuMzMtNzkuMjMtMTc5LjIgIGMtMS42LTY3Ljg4LDIzLjgzLTEzMy42MSw3MC42OS0xODIuNzRsNDg4LjQxLTUxMmM0Ni44Ni00OS4xMywxMTEuMzItNzcuNjMsMTc5LjItNzkuMjNjNjcuOS0xLjU4LDEzMy42MSwyMy44MywxODIuNzQsNzAuNjkgIGM0OS4xMyw0Ni44Niw3Ny42MywxMTEuMzIsNzkuMjMsMTc5LjJDMjMwNS41MywyMTA5Ljg0LDIyODAuMSwyMTc1LjU3LDIyMzMuMjQsMjIyNC43eiBNMjMyNC4xMSwxNjM0LjQxICBjLTAuNzktMS45Mi0xLjU4LTMuODctMi4zMi01LjgxYy0wLjc1LTEuOTQtMS40OS0zLjkyLTIuMTktNS44N2MtMC43LTEuOTYtMS4zOS0zLjk1LTIuMDUtNS45M2MtMC42NS0xLjk3LTEuMjktMy45OC0xLjktNS45NyAgYy0wLjYtMS45OS0xLjE5LTQuMDEtMS43NS02LjAyYy0wLjU2LTItMS4xLTQuMDQtMS42MS02LjA2Yy0wLjUxLTIuMDEtMS00LjA3LTEuNDctNi4wOWMtMC40Ni0yLjA0LTAuOS00LjEtMS4zMS02LjE0ICBzLTAuOC00LjEyLTEuMTYtNi4xN2MtMC4zNy0yLjA1LTAuNzEtNC4xNC0xLjAyLTYuMmMtMC4zMS0yLjA2LTAuNi00LjE2LTAuODYtNi4yMmMtMC4yNi0yLjA4LTAuNS00LjE4LTAuNy02LjI1ICBjLTAuMjEtMi4wOC0wLjQtNC4xOS0wLjU2LTYuMjdjLTAuMTUtMi4wOS0wLjI5LTQuMjEtMC4zOS02LjI5Yy0wLjExLTIuMDktMC4xOS00LjIyLTAuMjQtNi4zMWMtMC4wNi0yLjA5LTAuMDgtNC4yMi0wLjA4LTYuMzEgIGMwLTIuMSwwLjAyLTQuMjIsMC4wOC02LjMyYzAuMDUtMi4wOSwwLjEzLTQuMjEsMC4yNC02LjNjMC4xLTIuMDksMC4yNC00LjIsMC4zOS02LjI5YzAuMTYtMi4wOCwwLjM1LTQuMTksMC41Ni02LjI3ICBjMC4yLTIuMDcsMC40NC00LjE4LDAuNy02LjI1czAuNTUtNC4xNiwwLjg2LTYuMjJjMC4zMS0yLjA2LDAuNjUtNC4xNSwxLjAyLTYuMmMwLjM2LTIuMDUsMC43NS00LjEzLDEuMTYtNi4xN3MwLjg1LTQuMTEsMS4zMS02LjE0ICBjMC40Ny0yLjAzLDAuOTYtNC4wOCwxLjQ3LTYuMWMwLjUxLTIuMDEsMS4wNS00LjA1LDEuNjEtNi4wNmMwLjU2LTIsMS4xNS00LjAyLDEuNzUtNi4wMWMwLjYxLTEuOTksMS4yNS00LDEuOS01Ljk3ICBjMC42Ni0xLjk4LDEuMzUtMy45NywyLjA1LTUuOTNjMC43LTEuOTUsMS40NC0zLjkzLDIuMTktNS44N2MwLjc0LTEuOTQsMS41My0zLjg5LDIuMzItNS44MmMwLjgtMS45MiwxLjYzLTMuODUsMi40Ny01Ljc1ICBjMC44NC0xLjksMS43Mi0zLjgyLDIuNjEtNS43YzAuODgtMS44OCwxLjgxLTMuNzgsMi43NC01LjYzYzAuOTMtMS44NiwxLjktMy43NCwyLjg4LTUuNTdjMC45Ny0xLjg0LDEuOTktMy42OSwzLjAxLTUuNSAgYzEuMDItMS44MSwyLjA4LTMuNjQsMy4xNS01LjQyYzEuMDYtMS43OSwyLjE3LTMuNTksMy4yNy01LjM1YzEuMTEtMS43NiwyLjI2LTMuNTMsMy40MS01LjI3YzEuMTYtMS43MywyLjM1LTMuNDgsMy41NC01LjE4ICBjMS4yLTEuNzEsMi40My0zLjQyLDMuNjctNS4xYzEuMjQtMS42OCwyLjUxLTMuMzcsMy43OS01LjAxYzEuMjgtMS42NSwyLjYtMy4zMSwzLjkyLTQuOTJjMS4zMi0xLjYyLDIuNjgtMy4yNCw0LjA0LTQuODMgIGMxLjM3LTEuNTgsMi43Ny0zLjE3LDQuMTctNC43MmMxLjQxLTEuNTYsMi44NS0zLjExLDQuMjktNC42M2MxLjQ1LTEuNTIsMi45My0zLjA0LDQuNDEtNC41MmMxLjQ4LTEuNDgsMy0yLjk2LDQuNTItNC40MSAgYzEuNTItMS40NCwzLjA3LTIuODgsNC42My00LjI5YzEuNTUtMS40LDMuMTQtMi44LDQuNzItNC4xNmMxLjU5LTEuMzcsMy4yMS0yLjczLDQuODMtNC4wNWMxLjYxLTEuMzIsMy4yNy0yLjY0LDQuOTItMy45MiAgYzEuNjQtMS4yOCwzLjMzLTIuNTUsNS4wMS0zLjc5YzEuNjctMS4yNCwzLjM5LTIuNDcsNS4xLTMuNjdjMS43LTEuMTksMy40NS0yLjM4LDUuMTgtMy41NGMxLjc0LTEuMTUsMy41MS0yLjMsNS4yNy0zLjQxICBjMS43Ni0xLjEsMy41Ni0yLjIxLDUuMzUtMy4yN2MxLjc4LTEuMDcsMy42MS0yLjEzLDUuNDItMy4xNWMxLjgxLTEuMDIsMy42Ni0yLjAzLDUuNS0zLjAxYzEuODMtMC45OCwzLjcxLTEuOTUsNS41Ni0yLjg4ICBjMS44Ni0wLjkzLDMuNzYtMS44Niw1LjY0LTIuNzRjMS44OC0wLjg5LDMuNzktMS43Nyw1LjctMi42MWMxLjktMC44NCwzLjgzLTEuNjcsNS43NS0yLjQ3YzEuOTItMC43OSwzLjg4LTEuNTcsNS44Mi0yLjMyICBjMS45NC0wLjc1LDMuOTItMS40OSw1Ljg3LTIuMTljMS45Ni0wLjcsMy45NS0xLjM5LDUuOTItMi4wNGMxLjk4LTAuNjYsMy45OS0xLjMsNS45OC0xLjljMS45OS0wLjYxLDQuMDEtMS4yLDYuMDEtMS43NiAgYzIuMDEtMC41Niw0LjA1LTEuMSw2LjA2LTEuNjFjMi4wMi0wLjUxLDQuMDctMSw2LjEtMS40NmMyLjAzLTAuNDYsNC4xLTAuOTEsNi4xNC0xLjMyczQuMTItMC44LDYuMTctMS4xNiAgYzIuMDUtMC4zNiw0LjE0LTAuNyw2LjItMS4wMmMyLjA2LTAuMzEsNC4xNS0wLjYsNi4yMi0wLjg2YzIuMDctMC4yNiw0LjE4LTAuNDksNi4yNS0wLjdjMi4wOC0wLjIxLDQuMTktMC40LDYuMjctMC41NiAgYzIuMDktMC4xNSw0LjItMC4yOSw2LjI5LTAuMzljMi4wOS0wLjExLDQuMjEtMC4xOSw2LjMtMC4yNGM0LjItMC4xMSw4LjQ0LTAuMTEsMTIuNjMsMGMyLjA5LDAuMDUsNC4yMiwwLjEzLDYuMzEsMC4yNCAgYzIuMDgsMC4xLDQuMiwwLjI0LDYuMjksMC4zOWMyLjA4LDAuMTYsNC4xOSwwLjM1LDYuMjcsMC41NmMyLjA3LDAuMjEsNC4xNywwLjQ0LDYuMjUsMC43YzIuMDYsMC4yNiw0LjE2LDAuNTUsNi4yMiwwLjg2ICBjMi4wNiwwLjMyLDQuMTUsMC42Niw2LjIsMS4wMmMyLjA1LDAuMzYsNC4xMywwLjc1LDYuMTcsMS4xNnM0LjEsMC44Niw2LjEzLDEuMzJjMi4wMywwLjQ2LDQuMDgsMC45NSw2LjEsMS40NiAgYzIuMDIsMC41MSw0LjA2LDEuMDUsNi4wNiwxLjYxYzIuMDEsMC41Niw0LjAzLDEuMTUsNi4wMiwxLjc2YzEuOTksMC42LDQsMS4yNCw1Ljk3LDEuOWMxLjk3LDAuNjUsMy45NywxLjM0LDUuOTIsMi4wNCAgYzEuOTYsMC43LDMuOTQsMS40NCw1Ljg4LDIuMTljMS45MywwLjc1LDMuODksMS41Myw1LjgxLDIuMzJjMS45MiwwLjgsMy44NiwxLjYzLDUuNzYsMi40N2MxLjksMC44NCwzLjgyLDEuNzIsNS43LDIuNjEgIGMxLjg4LDAuODgsMy43NywxLjgxLDUuNjMsMi43NGMxLjg2LDAuOTMsMy43MywxLjksNS41NywyLjg4YzEuODMsMC45OCwzLjY4LDEuOTksNS40OSwzLjAxYzEuODIsMS4wMiwzLjY0LDIuMDgsNS40MywzLjE1ICBjMS43OSwxLjA2LDMuNTgsMi4xNyw1LjM1LDMuMjdjMS43NiwxLjExLDMuNTMsMi4yNiw1LjI2LDMuNDFjMS43NCwxLjE2LDMuNDgsMi4zNSw1LjE5LDMuNTRjMS43MSwxLjIsMy40MiwyLjQzLDUuMSwzLjY3ICBjMS42OCwxLjI0LDMuMzYsMi41MSw1LjAxLDMuNzljMS42NSwxLjI4LDMuMywyLjYsNC45MiwzLjkyYzEuNjIsMS4zMiwzLjI0LDIuNjgsNC44Miw0LjA1YzEuNTksMS4zNiwzLjE4LDIuNzYsNC43Myw0LjE2ICBjMS41NSwxLjQxLDMuMTEsMi44NSw0LjYzLDQuMjljMS41MiwxLjQ1LDMuMDQsMi45Myw0LjUyLDQuNDFjMS40OCwxLjQ4LDIuOTYsMyw0LjQxLDQuNTJjMS40NCwxLjUyLDIuODgsMy4wNyw0LjI5LDQuNjMgIGMxLjQsMS41NSwyLjgsMy4xNCw0LjE2LDQuNzJjMS4zNiwxLjU5LDIuNzIsMy4yMSw0LjA1LDQuODNjMS4zMiwxLjYxLDIuNjMsMy4yNywzLjkxLDQuOTJjMS4yOCwxLjY0LDIuNTYsMy4zMywzLjgsNS4wMSAgYzEuMjMsMS42OCwyLjQ3LDMuMzksMy42Nyw1LjFjMS4xOSwxLjcsMi4zOCwzLjQ1LDMuNTMsNS4xOGMxLjE2LDEuNzQsMi4zLDMuNTEsMy40MSw1LjI3YzEuMTEsMS43NiwyLjIxLDMuNTYsMy4yOCw1LjM1ICBjMS4wNywxLjc4LDIuMTIsMy42MSwzLjE1LDUuNDJjMS4wMiwxLjgxLDIuMDMsMy42NiwzLjAxLDUuNWMwLjk4LDEuODMsMS45NSwzLjcxLDIuODgsNS41N2MwLjkzLDEuODUsMS44NSwzLjc1LDIuNzQsNS42MyAgYzAuODksMS44OCwxLjc2LDMuOCwyLjYxLDUuN2MwLjg0LDEuOSwxLjY3LDMuODMsMi40Niw1Ljc1YzAuOCwxLjkzLDEuNTgsMy44OCwyLjMzLDUuODJzMS40OCwzLjkyLDIuMTksNS44NyAgYzAuNywxLjk2LDEuMzksMy45NSwyLjA0LDUuOTNjMC42NiwxLjk3LDEuMywzLjk4LDEuOSw1Ljk3YzAuNjEsMS45OSwxLjIsNC4wMSwxLjc2LDYuMDFjMC41NiwyLjAxLDEuMSw0LjA1LDEuNjEsNi4wNiAgYzAuNTEsMi4wMiwxLDQuMDcsMS40Niw2LjFzMC45LDQuMSwxLjMxLDYuMTRjMC40MiwyLjA0LDAuODEsNC4xMiwxLjE3LDYuMTdjMC4zNiwyLjA1LDAuNyw0LjE0LDEuMDEsNi4yICBjMC4zMSwyLjA2LDAuNiw0LjE1LDAuODYsNi4yMmMwLjI2LDIuMDcsMC41LDQuMTgsMC43MSw2LjI1YzAuMjEsMi4wOCwwLjQsNC4xOSwwLjU1LDYuMjdjMC4xNiwyLjA5LDAuMjksNC4yLDAuNCw2LjI5ICBjMC4xLDIuMDksMC4xOCw0LjIxLDAuMjQsNi4zYzAuMDUsMi4xLDAuMDgsNC4yMiwwLjA4LDYuMzJjMCwyLjA5LTAuMDMsNC4yMi0wLjA4LDYuMzFjLTAuMDYsMi4wOS0wLjE0LDQuMjItMC4yNCw2LjMxICBjLTAuMTEsMi4wOC0wLjI0LDQuMi0wLjQsNi4yOWMtMC4xNSwyLjA4LTAuMzQsNC4xOS0wLjU1LDYuMjdjLTAuMjEsMi4wNy0wLjQ1LDQuMTctMC43MSw2LjI1Yy0wLjI2LDIuMDYtMC41NSw0LjE2LTAuODYsNi4yMiAgYy0wLjMxLDIuMDYtMC42NSw0LjE1LTEuMDEsNi4yYy0wLjM2LDIuMDUtMC43NSw0LjEzLTEuMTcsNi4xN2MtMC40MSwyLjA0LTAuODUsNC4xLTEuMzEsNi4xNGMtMC40NiwyLjAyLTAuOTUsNC4wOC0xLjQ2LDYuMDkgIGMtMC41MSwyLjAyLTEuMDUsNC4wNi0xLjYxLDYuMDZjLTAuNTYsMi4wMS0xLjE1LDQuMDMtMS43Niw2LjAyYy0wLjYsMS45OS0xLjI0LDQtMS45LDUuOTdjLTAuNjUsMS45OC0xLjM0LDMuOTctMi4wNCw1LjkzICBjLTAuNzEsMS45NS0xLjQ0LDMuOTMtMi4xOSw1Ljg3Yy0wLjc1LDEuOTQtMS41MywzLjg5LTIuMzMsNS44MWMtMC43OSwxLjkyLTEuNjIsMy44Ni0yLjQ2LDUuNzZjLTAuODUsMS45LTEuNzIsMy44Mi0yLjYxLDUuNyAgYy0wLjg5LDEuODgtMS44MSwzLjc4LTIuNzQsNS42M2MtMC45MywxLjg2LTEuOSwzLjczLTIuODgsNS41N2MtMC45OCwxLjg0LTEuOTksMy42OS0zLjAxLDUuNWMtMS4wMywxLjgxLTIuMDgsMy42My0zLjE1LDUuNDIgIGMtMS4wNywxLjc5LTIuMTcsMy41OS0zLjI4LDUuMzVjLTEuMTEsMS43Ni0yLjI1LDMuNTMtMy40MSw1LjI2Yy0xLjE1LDEuNzQtMi4zNCwzLjQ4LTMuNTMsNS4xOWMtMS4yLDEuNzEtMi40NCwzLjQyLTMuNjcsNS4xICBjLTEuMjQsMS42OC0yLjUyLDMuMzYtMy44LDUuMDFzLTIuNTksMy4zLTMuOTEsNC45MmMtMS4zMywxLjYyLTIuNjksMy4yNC00LjA1LDQuODJjLTEuMzYsMS41OS0yLjc2LDMuMTgtNC4xNiw0LjczICBjLTEuNDEsMS41NS0yLjg1LDMuMTEtNC4yOSw0LjYzYy0xLjQ1LDEuNTItMi45MywzLjA0LTQuNDEsNC41MmMtMS40OCwxLjQ4LTMsMi45Ni00LjUyLDQuNDFjLTEuNTIsMS40NC0zLjA4LDIuODgtNC42Myw0LjI5ICBjLTEuNTUsMS40LTMuMTQsMi44LTQuNzMsNC4xNmMtMS41OCwxLjM2LTMuMiwyLjcyLTQuODIsNC4wNWMtMS42MiwxLjMyLTMuMjcsMi42My00LjkyLDMuOTJjLTEuNjUsMS4yNy0zLjMzLDIuNTUtNS4wMSwzLjc5ICBjLTEuNjgsMS4yNC0zLjM5LDIuNDctNS4xLDMuNjdjLTEuNzEsMS4xOS0zLjQ1LDIuMzgtNS4xOSwzLjUzYy0xLjczLDEuMTYtMy41LDIuMy01LjI2LDMuNDFjLTEuNzcsMS4xMS0zLjU2LDIuMjItNS4zNSwzLjI4ICBjLTEuNzksMS4wNy0zLjYxLDIuMTMtNS40MywzLjE1Yy0xLjgxLDEuMDItMy42NiwyLjAzLTUuNDksMy4wMWMtMS44NCwwLjk4LTMuNzEsMS45NS01LjU3LDIuODhjLTEuODYsMC45My0zLjc1LDEuODUtNS42MywyLjc0ICBjLTEuODgsMC44OS0zLjgsMS43Ny01LjcsMi42MWMtMS45LDAuODQtMy44NCwxLjY3LTUuNzYsMi40NmMtMS45MiwwLjgtMy44OCwxLjU4LTUuODEsMi4zM2MtMS45NCwwLjc1LTMuOTIsMS40OS01Ljg4LDIuMTkgIGMtMS45NSwwLjctMy45NSwxLjM5LTUuOTIsMi4wNGMtMS45NywwLjY2LTMuOTgsMS4zLTUuOTcsMS45Yy0xLjk5LDAuNjEtNC4wMSwxLjItNi4wMiwxLjc2Yy0yLDAuNTYtNC4wNCwxLjEtNi4wNiwxLjYxICBjLTIuMDIsMC41MS00LjA3LDEtNi4xLDEuNDZjLTIuMDMsMC40Ni00LjA5LDAuOTEtNi4xMywxLjMycy00LjEyLDAuOC02LjE3LDEuMTZzLTQuMTQsMC43LTYuMiwxLjAyYy0yLjA2LDAuMzEtNC4xNiwwLjYtNi4yMiwwLjg2ICBjLTIuMDgsMC4yNi00LjE4LDAuNDktNi4yNSwwLjdjLTIuMDgsMC4yMS00LjE5LDAuNC02LjI3LDAuNTZjLTIuMDksMC4xNS00LjIxLDAuMjktNi4yOSwwLjM5Yy0yLjA5LDAuMTEtNC4yMiwwLjE5LTYuMzEsMC4yNCAgYy0yLjA5LDAuMDUtNC4yMiwwLjA4LTYuMzEsMC4wOGMtMi4xLDAtNC4yMi0wLjAzLTYuMzItMC4wOGMtMi4wOS0wLjA1LTQuMjEtMC4xMy02LjMtMC4yNGMtMi4wOS0wLjEtNC4yLTAuMjQtNi4yOS0wLjM5ICBjLTIuMDgtMC4xNi00LjE5LTAuMzUtNi4yNy0wLjU2Yy0yLjA3LTAuMjEtNC4xOC0wLjQ0LTYuMjUtMC43Yy0yLjA3LTAuMjYtNC4xNi0wLjU1LTYuMjItMC44NmMtMi4wNi0wLjMyLTQuMTUtMC42Ni02LjItMS4wMiAgYy0yLjA1LTAuMzYtNC4xMy0wLjc1LTYuMTctMS4xNnMtNC4xMS0wLjg2LTYuMTQtMS4zMnMtNC4wOC0wLjk1LTYuMS0xLjQ2Yy0yLjAxLTAuNTEtNC4wNS0xLjA1LTYuMDYtMS42MSAgYy0yLTAuNTYtNC4wMi0xLjE1LTYuMDEtMS43NmMtMS45OS0wLjYtNC0xLjI0LTUuOTgtMS45Yy0xLjk3LTAuNjUtMy45Ni0xLjM0LTUuOTItMi4wNGMtMS45NS0wLjctMy45My0xLjQ0LTUuODctMi4xOSAgYy0xLjk0LTAuNzUtMy45LTEuNTMtNS44Mi0yLjMzYy0xLjkyLTAuNzktMy44NS0xLjYyLTUuNzUtMi40NmMtMS45MS0wLjg0LTMuODItMS43Mi01LjctMi42MWMtMS44OC0wLjg5LTMuNzgtMS44MS01LjY0LTIuNzQgIGMtMS44NS0wLjkzLTMuNzMtMS45LTUuNTYtMi44OGMtMS44NC0wLjk4LTMuNjktMS45OS01LjUtMy4wMWMtMS44MS0xLjAyLTMuNjQtMi4wOC01LjQyLTMuMTVjLTEuNzktMS4wNi0zLjU5LTIuMTctNS4zNS0zLjI4ICBjLTEuNzYtMS4xMS0zLjUzLTIuMjUtNS4yNy0zLjQxYy0xLjczLTEuMTUtMy40OC0yLjM0LTUuMTgtMy41M2MtMS43MS0xLjItMy40My0yLjQzLTUuMS0zLjY3Yy0xLjY4LTEuMjQtMy4zNy0yLjUyLTUuMDEtMy43OSAgYy0xLjY1LTEuMjktMy4zMS0yLjYtNC45Mi0zLjkyYy0xLjYyLTEuMzMtMy4yNC0yLjY5LTQuODMtNC4wNWMtMS41OC0xLjM2LTMuMTctMi43Ni00LjcyLTQuMTZjLTEuNTYtMS40MS0zLjExLTIuODUtNC42My00LjI5ICBjLTEuNTItMS40NS0zLjA0LTIuOTMtNC41Mi00LjQxYy0xLjQ4LTEuNDgtMi45Ni0zLTQuNDEtNC41MmMtMS40NC0xLjUyLTIuODgtMy4wOC00LjI5LTQuNjNjLTEuNC0xLjU1LTIuOC0zLjE0LTQuMTctNC43MyAgYy0xLjM2LTEuNTgtMi43Mi0zLjItNC4wNC00LjgyYy0xLjMyLTEuNjItMi42NC0zLjI3LTMuOTItNC45MmMtMS4yOC0xLjY1LTIuNTUtMy4zMy0zLjc5LTUuMDFjLTEuMjQtMS42OC0yLjQ3LTMuMzktMy42Ny01LjEgIGMtMS4xOS0xLjcxLTIuMzgtMy40NS0zLjU0LTUuMTljLTEuMTUtMS43My0yLjMtMy41LTMuNDEtNS4yNmMtMS4xLTEuNzYtMi4yMS0zLjU2LTMuMjctNS4zNWMtMS4wNy0xLjc5LTIuMTMtMy42MS0zLjE1LTUuNDIgIGMtMS4wMi0xLjgxLTIuMDQtMy42Ni0zLjAxLTUuNWMtMC45OC0xLjg0LTEuOTUtMy43MS0yLjg4LTUuNTdjLTAuOTMtMS44NS0xLjg2LTMuNzUtMi43NC01LjYzYy0wLjg5LTEuODgtMS43Ny0zLjgtMi42MS01LjcgIFMyMzI0LjkxLDE2MzYuMzMsMjMyNC4xMSwxNjM0LjQxeiBNMzc4OC42MSwyMDAzLjVsLTEwMjQsMTAyNGMtNDguMDEsNDguMDEtMTEzLjEyLDc0Ljk4LTE4MS4wMiw3NC45OHMtMTMzLjAxLTI2Ljk3LTE4MS4wMi03NC45OCAgYy00OC4wMS00OC4wMS03NC45OC0xMTMuMTItNzQuOTgtMTgxLjAyczI2Ljk3LTEzMy4wMSw3NC45OC0xODEuMDJsMTAyNC0xMDI0YzQ4LjAxLTQ4LjAxLDExMy4xMi03NC45OCwxODEuMDItNzQuOTggIHMxMzMuMDEsMjYuOTcsMTgxLjAyLDc0Ljk4YzQ4LjAxLDQ4LjAxLDc0Ljk4LDExMy4xMiw3NC45OCwxODEuMDJDMzg2My41OSwxODkwLjM4LDM4MzYuNjIsMTk1NS40OSwzNzg4LjYxLDIwMDMuNXoiLz48Zy8+PGcvPjxnLz48Zy8+PGcvPjwvc3ZnPg=="},"poiyomi":{"label":"Poiyomi","source":"https://raw.githubusercontent.com/poiyomi/PoiyomiDocs/main/static/img/PoiyomiIcon.svg","productSource":"https://github.com/poiyomi/PoiyomiDocs","kind":"official-logo-derived","note":"Official documentation logo, monochrome foreground with transparent background. Paths preserved; source repository MIT notice included.","type":"image/svg+xml","path":"badge-assets/poiyomi.svg","bytes":1289,"dataUri":"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDI0IDEwMjQiPjxkZWZzPjxzdHlsZT4uY2xzLTEsLmNscy0yLC5jbHMtM3tmaWxsOiNmZmZ9PC9zdHlsZT48L2RlZnM+PHBhdGggY2xhc3M9ImNscy0zIiBkPSJNNTEyLDEwLjE1QzIzNC44NCwxMC4xNSwxMC4xNSwyMzQuODQsMTAuMTUsNTEyczIyNC42OSw1MDEuODUsNTAxLjg1LDUwMS44NSw1MDEuODUtMjI0LjY5LDUwMS44NS01MDEuODVTNzg5LjE2LDEwLjE1LDUxMiwxMC4xNVpNNTEyLDk1OC44Yy0yNDYuNzYsMC00NDYuOC0yMDAuMDQtNDQ2LjgtNDQ2LjhTMjY1LjI0LDY1LjIsNTEyLDY1LjJzNDQ2LjgsMjAwLjA0LDQ0Ni44LDQ0Ni44LTIwMC4wNCw0NDYuOC00NDYuOCw0NDYuOFoiLz48cGF0aCBjbGFzcz0iY2xzLTEiIGQ9Ik04MDYuNDksMjgwLjU1Yy0xNC45NSwwLTI1LjE1LDE0LjU5LTI1LjY2LDE1LjQtLjUxLS44LTEwLjcyLTE1LjQtMjUuNjYtMTUuNC0xNy44NSwwLTM0LjA3LDE5Ljg0LTE5Ljg0LDQ5LjM5LDExLjc1LDI0LjE3LDQ0LjIzLDM2LjgxLDQ1LjUxLDM2LjgxczMzLjg1LTEyLjY0LDQ1LjQ5LTM2LjgxYzE0LjI2LTI5LjU0LTEuOTgtNDkuMzktMTkuODItNDkuMzlaIi8+PGc+PHBhdGggY2xhc3M9ImNscy0yIiBkPSJNNTg5LjI2LDM5MS44YzcyLjExLDAsMTI3LjM0LDUxLjEzLDEyNy4zNCwxMjEuNzFzLTU3LjI4LDEyMS43MS0xMjcuMzQsMTIxLjcxLTEyNy44Ny01MS4xMy0xMjcuODctMTIxLjcxLDU2LjI2LTEyMS43MSwxMjcuODctMTIxLjcxWk01ODkuMjYsNDQ3LjU0Yy0zNi44MywwLTY1Ljk4LDI4LjEzLTY1Ljk4LDY1Ljk4czMwLjE5LDY2LjQ4LDY1Ljk4LDY2LjQ4LDY1Ljk4LTI4LjYzLDY1Ljk4LTY2LjQ4LTI5LjE2LTY1Ljk4LTY1Ljk4LTY1Ljk4WiIvPjxyZWN0IGNsYXNzPSJjbHMtMiIgeD0iNzUxLjE2IiB5PSIzOTMuMzQiIHdpZHRoPSI1OS44NSIgaGVpZ2h0PSIyMzkuMzUiLz48cGF0aCBjbGFzcz0iY2xzLTIiIGQ9Ik0yNTIuMDksNTgyLjA2djE0Ni43N2gtNTkuODV2LTMzNC40OWg1OS44NXY0MS40NmMxNC4zMi0yNi4wOSw0MC45Mi00My45OSw3Ny43NC00My45OSw1Ni4yNiwwLDEwOC40Miw0OS4wOSwxMDguNDIsMTE3LjExcy01MC43OSwxMTguMTQtMTE5LjQ4LDExOC4xNGMtLjk1LDAtMi4zNSwwLTMuNTIsMHYtNTQuMjVjLjA4LDAsLjE3LDAsLjI1LDAsMzUuMjksMCw2Mi45MS0yNy4xLDYyLjkxLTYzLjkycy0yNy42My02Mi45MS02Mi45MS02Mi45MS02My40MiwyNi42LTYzLjQyLDYyLjkxdjczLjE1WiIvPjwvZz48L3N2Zz4="}};
const palettes={acid:'#bceb45',red:'#ee2949',blue:'#3055ed',pink:'#d077e7',orange:'#ff6839',champagne:'#a68b62',lavender:'#b5a3db',oat:'#c49c83',coral:'#f47565',ink:'#4b6fe9'};
const geometryNames={signature:'构图推荐',orbit:'交错轨道',slices:'偏心切片',wave:'同心共振',flow:'开放流线',facet:'折面切框',ribbon:'柔波缎环',blocks:'玩趣积木',ring:'极简圆环',burst:'放射碎片',cut:'切角星环',rays:'放射星芒',none:'无几何'};
const catalog=[{id:'mmd',name:'MMD',sub:'COMPATIBLE',icon:'person-standing'},{id:'arkit',name:'ARKit',sub:'COMPATIBLE',icon:'scan-face'},{id:'vrcft',name:'VRCFT',icon:'scan-face',description:'Face Tracking'},{id:'mtoon',name:'MToon',icon:'layers-2'},{id:'liltoon',name:'lilToon',icon:'sparkles'},{id:'poiyomi',name:'Poiyomi',icon:'orbit'},{id:'face',name:'FACE',sub:'TRACKING',icon:'scan-face'}];
const seriesDefaults={atelier:{label:'ATELIER',prefix:'AT',serial:'001',caption:'生来不设限。',subtitle:'SOFT HEART. BOLD ENERGY.'},fur:{label:'FUR',prefix:'FR',serial:'001',caption:'蓬松有形 · 触感想象',subtitle:'SOFT TEXTURE. BOLD SOUL.'},mini:{label:'MINI',prefix:'MN',serial:'001',caption:'小小身形 · 大大个性',subtitle:'SMALL FORM. BIG ENERGY.'}};
const languageKeys=['couture','brutalist','cloud','plush','play','sticker','district','tuner','arcade'];
const languageNotes={couture:'FORM / FEELING',brutalist:'OBJECT IN MOTION',cloud:'SOFT OBJECTS, SLOW DAYS',plush:'TACTILE / MADE TO FEEL',play:'SMALL SHAPE, BIG JOY',sticker:'HELLO, LITTLE ORIGINAL',district:'OWN YOUR FREQUENCY',tuner:'ORIGINAL SIGNAL / PLAY IT LOUD',arcade:'LITTLE REBEL. BIG PERSONALITY.'};
const variantDefaults={couture:{ringSpeed:.65,palette:'champagne',background:'light',pattern:'none',typeface:'serif',badgeStyle:'bare',cutStrength:.6,effects:{shadowStyle:'soft',shadowStrength:.25},shadows:{title:false,badges:false,geometry:true}},brutalist:{palette:'acid',background:'dark',pattern:'grid',typeface:'editorial',badgeStyle:'outline',cutStrength:.9,effects:{shadowStrength:.45,shadowColor:'#030404'},shadows:{badges:false}},cloud:{ringSpeed:.6,palette:'lavender',background:'light',pattern:'none',typeface:'rounded',badgeStyle:'filled',cutStrength:.55,effects:{shadowStyle:'soft',shadowStrength:.28,shadowColor:'#85779c'},shadows:{title:false,badges:false,geometry:true}},plush:{ringSpeed:.55,palette:'oat',background:'light',pattern:'none',typeface:'serif',badgeStyle:'bare',cutStrength:.5,effects:{shadowStyle:'soft',shadowStrength:.3,shadowColor:'#97806c'},shadows:{title:false,badges:false,geometry:true}},play:{palette:'coral',background:'light',pattern:'dots',typeface:'rounded',badgeStyle:'bare',cutStrength:.7,effects:{shadowStyle:'cut',shadowStrength:.25},shadows:{title:false,badges:false}},sticker:{palette:'ink',background:'light',pattern:'none',typeface:'grotesk',badgeStyle:'outline',cutStrength:.7,effects:{shadowStyle:'cut',shadowStrength:.3,shadowColor:'#8b7c53'},shadows:{title:false,badges:false}},orbit:{palette:'acid',background:'light',pattern:'mesh'},poster:{palette:'red',background:'dark',pattern:'dots'},wave:{palette:'blue',background:'light',pattern:'ripple'},dual:{palette:'acid',background:'light',pattern:'grid',typeface:'classic',ringScale:1,dualSplit:.47,dualGuides:false,geometryBySeries:{atelier:'rays',fur:'orbit',mini:'ring'},effects:{shadowStrength:.25},shadows:{title:false,badges:false}}};
Object.assign(variantDefaults,{district:{palette:'acid',background:'dark',pattern:'dots',typeface:'editorial',badgeStyle:'bare',badgePalette:'soft',badgeColor:'#262924',badgeInk:'#e3e8d5',badgeOpacity:.7,ringSpeed:.7,ringScale:1.12,cutStrength:.75,gridOpacity:.04,effects:{shadowStyle:'cut',shadowStrength:.45,shadowColor:'#090b09'},shadows:{title:true,badges:false,geometry:true}},tuner:{palette:'orange',background:'light',pattern:'grid',typeface:'grotesk',badgeStyle:'bare',badgePalette:'soft',badgeColor:'#222321',badgeInk:'#56564e',badgeOpacity:.8,ringSpeed:.5,ringScale:1.07,cutStrength:.55,gridOpacity:.025,effects:{shadowStyle:'soft',shadowStrength:.28,shadowColor:'#5b5545'},shadows:{title:false,badges:false,geometry:true}},arcade:{palette:'blue',background:'light',pattern:'dots',typeface:'rounded',badgeStyle:'outline',badgePalette:'soft',badgeColor:'#222720',badgeInk:'#424e40',badgeOpacity:.6,ringSpeed:.65,ringScale:1.08,cutStrength:.65,gridOpacity:.03,textMotionStyle:'playful',effects:{shadowStyle:'cut',shadowStrength:.22,shadowColor:'#95a88e'},shadows:{title:false,badges:false,geometry:true}}});
const effectDefaults={gradeEnabled:true,grade:'original',gradeStrength:.7,gradeModel:false,gradient:'none',gradientStrength:.25,gradientColor:'#7b55ef',gradientMotion:true,titleGradient:false,grain:0,vignette:0,shadowEnabled:true,shadowStyle:'cut',shadowStrength:.8,shadowDepth:1,shadowColor:'#24302c'};
const shadowDefaults={title:true,badges:true,model:true,geometry:false,floor:true};
const state={version:6,design:'character-explorations',activeDesign:'couture',ratio:'landscape',frame:'none',name:'NOVA',series:'atelier',seriesData:JSON.parse(JSON.stringify(seriesDefaults)),brand:'YOUR STUDIO',modelCredit:'MODEL / YOUR NAME',designCredit:'DESIGN / YOUR STUDIO',topText:'ORIGINAL / CHARACTER ARCHIVE',bottomText:'MAKE SOME NOISE. STAY CUTE.',formats:{fbx:true,vrchat:true,vrm:true,warudo:true},badges:['mmd','arkit','vrcft','mtoon','liltoon'],qrUrl:'',type:true,swapped:false,playing:!reduced.matches,time:4.5,speed:1,edges:{top:{direction:'negative',duration:32},bottom:{direction:'positive',duration:38}},variants:{}};
for(const [key,v]of Object.entries(variantDefaults)){const modern=languageKeys.includes(key);state.variants[key]={typeface:key==='wave'?'grotesk':'editorial',cutStrength:.75,badgePalette:'soft',badgeStyle:'filled',badgeColor:'#dfe5d6',badgeInk:'#334036',badgeOpacity:.85,ringSpeed:1,ringScale:1.15,textMotion:true,textMotionStyle:['cloud','plush','wave'].includes(key)?'soft':['play','sticker'].includes(key)?'playful':'refined',textMotionAmount:.55,textMotionSpeed:1,geometryStrength:1,geometryOpacity:1,geometryBySeries:{atelier:'signature',fur:modern?'signature':'ribbon',mini:modern?'signature':'blocks'},grid:true,gridMoving:true,gridOpacity:modern?.035:.065,gridMotion:.14,modelScale:1,parallax:true,...v,accent:palettes[v.palette],effects:{...effectDefaults,...v.effects},shadows:{...shadowDefaults,...v.shadows}}}
const variantBaseline=JSON.parse(JSON.stringify(state.variants));
// Keep each variant object alive: existing input handlers retain its reference.
function studioRestoreVariants(variants,source){for(const [key,value]of Object.entries(source)){const target=variants[key];if(!target)continue;for(const field of Object.keys(target))delete target[field];Object.assign(target,JSON.parse(JSON.stringify(value)));}}
state.borderAppearance=studioBorderSettings();
state.typography=studioTypographySettings();
const images={qr:'',barcode:'',logo:'',model:'',portrait:'',introCharacter:'',introAuthor:''};
const imageNames={};
state.introDuration=4.5;state.output={resolution:'1080',obsLayers:'combined',transparent:false,includeCharacters:false,start:'intro',fit:'contain',fps:30,aeIntro:true};
state.narrative=studioNarrativeSettings({introStyle:'story'});state.introDuration=studioStoryDuration(state.narrative);state.time=0;
const sharedFields={name:'direction-name',series:'direction-series',ratio:'direction-ratio',frame:'direction-frame',brand:'direction-brand',modelCredit:'direction-model-credit',designCredit:'direction-design-credit',topText:'direction-top-text',bottomText:'direction-bottom-text',qrUrl:'direction-qr'};
const maxLengths={name:32,brand:24,modelCredit:35,designCredit:30,topText:60,bottomText:60,qrUrl:180};
const seriesLengths={label:10,prefix:3,serial:4,caption:14,subtitle:32};
const currentSeries=()=>state.seriesData[state.series];
const choose=(value,values,fallback)=>values.includes(value)?value:fallback;
function cleanSeries(key,value){return key==='serial'?value.replace(/[^0-9]/g,''):key==='prefix'?value.toUpperCase().replace(/[^A-Z0-9]/g,''):value}
function restoreEffects(target,source){if(!source)return;for(const key of ['gradeEnabled','gradeModel','gradientMotion','titleGradient','shadowEnabled'])if(typeof source[key]==='boolean')target[key]=source[key];for(const[key,a,b]of [['gradeStrength',0,1],['gradientStrength',0,.6],['grain',0,.3],['vignette',0,.6],['shadowStrength',0,1],['shadowDepth',0,2]])if(Number.isFinite(source[key]))target[key]=clamp(source[key],a,b);for(const[key,list]of Object.entries({grade:['original','chrome','cold','warm','faded','vivid'],gradient:['none','spotlight','diagonal','halo','aurora'],shadowStyle:['cut','soft']}))if(list.includes(source[key]))target[key]=source[key];for(const key of ['gradientColor','shadowColor'])if(/^#[0-9a-f]{6}$/i.test(source[key]))target[key]=source[key]}
function restore(saved){const source=saved?.privateContent,p=source?.variantEncoding==='tuple-v1'?{...source,variants:decodeStudioVariants(source.variants,variantBaseline)}:source;if(!p)return false;const oldStudio=p.design==='rebel-studio'&&[11,12,13].includes(p.version),oldExploration=p.design==='character-explorations'&&p.version===1,newVersion=p.design===state.design&&[2,3,4,5,6].includes(p.version);if(!oldStudio&&!oldExploration&&!newVersion)return false;
for(const[key,max]of Object.entries(maxLengths))if(typeof p[key]==='string')state[key]=p[key].slice(0,max);
if(Object.hasOwn(seriesDefaults,p.series))state.series=p.series;if(Object.hasOwn(variantDefaults,p.activeDesign))state.activeDesign=p.activeDesign;
state.ratio=choose(p.ratio,['landscape','portrait'],state.ratio);state.frame=choose(p.frame,['none','horizontal','vertical'],state.frame);
state.borderAppearance=studioBorderSettings(p.borderAppearance);
for(const side of ['top','bottom']){const source=p.edges?.[side];if(!source)continue;state.edges[side].direction=choose(source.direction,['negative','positive','still'],state.edges[side].direction);if(Number.isFinite(source.duration))state.edges[side].duration=clamp(source.duration,12,90)}
for(const key of ['swapped','type'])if(typeof p[key]==='boolean')state[key]=p[key];
state.introDuration=Number.isFinite(p.introDuration)?studioIntroDuration(p.introDuration):4.5;
state.narrative=studioNarrativeSettings(p.narrative&&typeof p.narrative==='object'?p.narrative:{});
state.typography=studioTypographySettings(p.typography);
if(state.narrative.introStyle==='story')state.introDuration=studioStoryDuration(state.narrative);
if(p.output&&typeof p.output==='object'){state.output.resolution=choose(p.output.resolution,['1080','2160'],state.output.resolution);state.output.obsLayers=choose(p.output.obsLayers,['combined','separate'],'combined');state.output.start=choose(p.output.start,['intro','show'],state.output.start);state.output.fit=choose(p.output.fit,['contain','cover'],state.output.fit);state.output.fps=choose(p.output.fps,[30,60],30);for(const key of ['transparent','includeCharacters','aeIntro'])if(typeof p.output[key]==='boolean')state.output[key]=p.output[key]}
if(Number.isFinite(p.time))state.time=clamp(p.time,0,studioTotalDuration(state.introDuration,state.narrative));if(Number.isFinite(p.speed))state.speed=clamp(p.speed,.5,1.8);if(typeof p.playing==='boolean')state.playing=p.playing&&!reduced.matches;
for(const key of Object.keys(state.formats))if(typeof p.formats?.[key]==='boolean')state.formats[key]=p.formats[key];if(Array.isArray(p.badges))state.badges=catalog.filter(b=>p.badges.includes(b.id)).map(b=>b.id);
for(const series of Object.keys(seriesDefaults))for(const[key,max]of Object.entries(seriesLengths))if(typeof p.seriesData?.[series]?.[key]==='string')state.seriesData[series][key]=cleanSeries(key,p.seriesData[series][key].slice(0,max));
if(oldExploration)for(const key of ['serial','caption','subtitle'])if(typeof p[key]==='string')currentSeries()[key]=cleanSeries(key,p[key].slice(0,seriesLengths[key]));
for(const name of Object.keys(variantDefaults)){const target=state.variants[name],v=oldStudio?p:p.variants?.[name];if(!v)continue;
if(/^#[0-9a-f]{6}$/i.test(v.accent)){target.accent=v.accent;target.palette=Object.keys(palettes).find(k=>palettes[k].toLowerCase()===v.accent.toLowerCase())||'custom'}
if(['light','dark'].includes(v.background))target.background=v.background;if(['mesh','dots','ripple','grid','none'].includes(v.pattern))target.pattern=v.pattern;
for(const[key,list]of Object.entries({typeface:['editorial','grotesk','classic','serif','rounded'],badgePalette:['soft','mono','custom'],badgeStyle:['filled','outline','bare'],textMotionStyle:['refined','soft','playful']}))if(list.includes(v[key]))target[key]=v[key];
for(const key of ['badgeColor','badgeInk'])if(/^#[0-9a-f]{6}$/i.test(v[key]))target[key]=v[key];
for(const key of ['grid','gridMoving','parallax','textMotion','dualGuides'])if(typeof v[key]==='boolean')target[key]=v[key];
for(const[key,a,b]of [['dualSplit',.35,.6],['ringSpeed',0,3],['ringScale',.6,2.4],['textMotionAmount',0,1],['textMotionSpeed',.25,2],['geometryStrength',.5,1.5],['geometryOpacity',.3,1],['gridOpacity',.02,.15],['gridMotion',0,.5],['modelScale',.75,1.3],['cutStrength',0,1],['badgeOpacity',.2,1]])if(Number.isFinite(v[key]))target[key]=clamp(v[key],a,b);
for(const series of Object.keys(seriesDefaults))if(Object.hasOwn(geometryNames,v.geometryBySeries?.[series]))target.geometryBySeries[series]=v.geometryBySeries[series];
if(oldExploration){if(Object.hasOwn(geometryNames,v.ringStyle))target.geometryBySeries[state.series]=v.ringStyle==='ribbon'?'flow':v.ringStyle;if(typeof v.shadow==='boolean')target.effects.shadowEnabled=v.shadow;if(Number.isFinite(v.intensity))target.gridOpacity=clamp(v.intensity*.1,.02,.15);if(['original','cold','warm','faded','vivid'].includes(v.grade))target.effects.grade=v.grade;if(Number.isFinite(v.grain))target.effects.grain=clamp(v.grain,0,.3);target.effects.gradient=({edge:'spotlight',duotone:'diagonal',none:'none'})[v.gradient]||'none'}
restoreEffects(target.effects,v.effects);for(const key of Object.keys(shadowDefaults))if(typeof v.shadows?.[key]==='boolean')target.shadows[key]=v.shadows[key];
}return true;}
restore(window.openai?.widgetState);
if(globalThis.studioOutput?.enabled===true){const output=globalThis.studioOutput;if(output.playback==='complete'&&state.narrative.outroEnabled)state.narrative.outroTrigger='auto';state.time=output.start==='show'?state.introDuration:0;state.playing=!reduced.matches;state.output.transparent=output.transparent===true;state.output.includeCharacters=output.includeCharacters===true;state.output.obsLayers=output.obsLayers==='separate'?'separate':'combined';state.output.start=output.start==='show'?'show':'intro';state.output.fit=output.fit==='cover'?'cover':'contain';for(const key of Object.keys(images)){const value=globalThis.studioImages?.[key];if(typeof value==='string'&&/^data:image\/(png|jpeg|webp);base64,/i.test(value)){images[key]=value;imageNames[key]='已打包素材'}}}
let motionClock=createMotionClock(state.time,state.variants,state.edges);
const ownSnapshots=new Set();
function stateSignature(value){return JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(key=>[key,item[key]])):item)}
function save(){
const snapshot=JSON.parse(JSON.stringify(state));snapshot.variantEncoding='tuple-v1';snapshot.variants=encodeStudioVariants(state.variants);ownSnapshots.add(stateSignature(snapshot));if(ownSnapshots.size>32)ownSnapshots.delete(ownSnapshots.values().next().value);
// The private tuple snapshot retains every design. Public retrieval only needs
// the active design, leaving room for custom copy within the 16 KiB state cap.
const variants=Object.fromEntries(Object.entries(state.variants).filter(([key])=>key===state.activeDesign).map(([key,v])=>[key,{accent:v.accent,background:v.background,typeface:v.typeface,geometry:v.geometryBySeries[state.series],ringScale:v.ringScale,ringSpeed:v.ringSpeed,textMotion:v.textMotion,textMotionStyle:v.textMotionStyle,textMotionAmount:v.textMotionAmount,textMotionSpeed:v.textMotionSpeed,badgeStyle:v.badgeStyle}]));
window.openai?.setWidgetState?.({modelContent:{design:'角色展示 · 时尚／毛绒／可爱／街头二游 · 十三种设计',characterName:state.name,series:currentSeries().label,seriesCode:currentSeries().prefix,serial:currentSeries().serial,caption:currentSeries().caption,frame:state.frame,sequence:state.narrative,borderMotion:state.edges,aspectRatio:state.ratio==='portrait'?'9:16':'16:9',informationPosition:state.ratio==='portrait'?(state.swapped?'下方':'上方'):(state.swapped?'右侧':'左侧'),formats:Object.keys(state.formats).filter(k=>state.formats[k]),badges:state.badges,variants},privateContent:snapshot})?.catch(()=>{})}
const template=document.getElementById('direction-view-template');
const settingLabels={palette:'点缀配色',background:'背景',ringStyle:'环形与几何',pattern:'背景图案',grade:'影调风格',gradient:'背景渐变',shadowStyle:'投影风格',accent:'自定义点缀色',gradientColor:'渐变第二色',shadowColor:'统一投影颜色',badgePalette:'标识配色',badgeStyle:'标识外观',badgeColor:'标识底色',badgeInk:'标识图形与文字色',typeface:'标题字体',textMotionStyle:'文字动效风格'};
const views=[...root.querySelectorAll('[data-design]')].map(section=>{section.append(template.content.cloneNode(true));const dualControls=section.querySelector('[data-dual-controls]');if(section.dataset.design==='dual')dualControls.hidden=false;else dualControls.remove();const art=section.querySelector('.design-art'),composition=art.querySelector('.composition'),canvas=art.querySelector('.field-canvas');art.dataset.kind=section.dataset.design;if(section.dataset.design==='dual'){const information=document.createElement('div');information.className='dual-information';information.append(art.querySelector('.dual-handle'),art.querySelector('.technical'));composition.append(information);}art.setAttribute('aria-label',section.dataset.variant+' · 角色背景');for(const el of section.querySelectorAll('[data-vfield],[data-efield],[data-vcolor],[data-ecolor]'))el.setAttribute('aria-label',settingLabels[el.dataset.vfield||el.dataset.efield||el.dataset.vcolor||el.dataset.ecolor]);return {section,art,composition,canvas,ctx:canvas.getContext('2d'),key:section.dataset.design,name:art.querySelector('.hero-name'),stack:art.querySelector('.name-stack'),badgeKey:null,codeKey:'',qrKey:null,qrError:false,w:0,h:0,px:0,py:0,sx:0,sy:0}});template.remove();
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

// Keying uses the same shader in preview and full-size frame export.
function studioCreatePreviewKey(canvas){
 const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true,antialias:false,depth:false,stencil:false});
 if(!gl)return null;
 const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
 const vs=compile(gl.VERTEX_SHADER,'attribute vec2 p; varying vec2 uv; void main(){uv=(p+1.0)*0.5;gl_Position=vec4(p,0.0,1.0);}');
 const fs=compile(gl.FRAGMENT_SHADER,`precision highp float;
 varying vec2 uv;uniform sampler2D image;uniform vec3 keyColor;uniform float tolerance;uniform float softness;uniform float spill;
 void main(){vec4 c=texture2D(image,uv);float a=clamp((distance(c.rgb,keyColor)/1.7320508-tolerance)/max(0.001,softness),0.0,1.0);
 if(keyColor.g>keyColor.r&&keyColor.g>keyColor.b)c.g-=max(0.0,c.g-max(c.r,c.b))*spill*(1.0-a);
 gl_FragColor=vec4(c.rgb,c.a*a);}`);
 const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('GPU 抠像初始化失败');
 gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
 const position=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
 const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
 const uniforms=Object.fromEntries(['keyColor','tolerance','softness','spill'].map(k=>[k,gl.getUniformLocation(program,k)]));gl.uniform1i(gl.getUniformLocation(program,'image'),0);
 return {draw(media,key,w,h){if(gl.isContextLost())return false;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);gl.useProgram(program);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,media);gl.uniform3f(uniforms.keyColor,...[1,3,5].map(i=>parseInt(key.color.slice(i,i+2),16)/255));gl.uniform1f(uniforms.tolerance,key.tolerance);gl.uniform1f(uniforms.softness,key.softness);gl.uniform1f(uniforms.spill,key.spill);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);return true;},dispose(){gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);gl.getExtension('WEBGL_lose_context')?.loseContext();}};
}

// Screen-space controls remain the same size at any preview/output resolution.
function studioTransformPointer(initial,mode,start,pointer,center,parent,shift=false){
 const limit=(v,a,b)=>Math.max(a,Math.min(b,v));
 if(mode==='move'){let dx=pointer.x-start.x,dy=pointer.y-start.y;if(shift){if(Math.abs(dx)>Math.abs(dy))dy=0;else dx=0;}return {x:limit(initial.x+dx/parent.width*100,-100,200),y:limit(initial.y+dy/parent.height*100,-100,200)};}
 if(mode==='rotate'){let delta=Math.atan2(pointer.y-center.y,pointer.x-center.x)-Math.atan2(start.y-center.y,start.x-center.x);delta=Math.atan2(Math.sin(delta),Math.cos(delta))*180/Math.PI;let angle=initial.rotate+delta;if(shift)angle=Math.round(angle/15)*15;return {rotate:((angle+180)%360+360)%360-180};}
 const ratio=Math.hypot(pointer.x-center.x,pointer.y-center.y)/Math.max(1,Math.hypot(start.x-center.x,start.y-center.y));const sign=initial.scale<0?-1:1;let scale=limit(Math.max(1,Math.abs(initial.scale))*ratio,1,800);if(shift)scale=limit(Math.round(scale/5)*5,1,800);return {scale:sign*scale};
}
function mountStudioViewportTransform({stage,getState,select,pause,repaint,commit,refreshProperties,setTransform}){
 const overlay=document.createElement('div');overlay.className='studio-transform-frame';overlay.hidden=true;overlay.dataset.transform='move';overlay.setAttribute('aria-label','素材变换框');
 for(const [mode,position,label]of [['scale','nw','左上缩放'],['scale','ne','右上缩放'],['scale','sw','左下缩放'],['scale','se','右下缩放'],['rotate','rotate','旋转素材']]){const b=document.createElement('button');b.type='button';b.className='studio-transform-handle studio-transform-'+position;b.dataset.transform=mode;b.setAttribute('aria-label',label);b.title=label+' · 按住 Shift 吸附';overlay.append(b);}
 const caption=document.createElement('span');caption.className='studio-transform-caption';caption.textContent='拖动画面移动 · 四角缩放 · 顶部旋转';overlay.append(caption);stage.append(overlay);stage.tabIndex=0;stage.setAttribute('aria-label','剪辑视口');let gesture=null;
 const geometry=(c,n)=>{c=studioAnimatedClip(c,getState().time);const rect=n.box.getBoundingClientRect(),parent=n.box.parentElement.getBoundingClientRect();return {center:{x:rect.left+rect.width/2,y:rect.top+rect.height/2},parent,width:n.box.offsetWidth*(parent.width/n.box.parentElement.clientWidth)*Math.abs(c.scale)/100,height:n.box.offsetHeight*(parent.height/n.box.parentElement.clientHeight)*Math.abs(c.scale)/100};};
 function update(){const s=getState(),c=s.project.clips.find(c=>c.id===s.selected),n=c&&s.nodes.get(c.id);if(s.rendering||s.hidden||s.playing||!c||!n||n.asset.kind==='audio'||n.box.hidden||!n.box.offsetWidth){overlay.hidden=true;return;}const g=geometry(c,n),r=stage.getBoundingClientRect();overlay.hidden=false;overlay.style.left=g.center.x-r.left+'px';overlay.style.top=g.center.y-r.top+'px';overlay.style.width=Math.max(20,g.width)+'px';overlay.style.height=Math.max(20,g.height)+'px';overlay.style.transform=`translate(-50%,-50%) rotate(${studioAnimatedClip(c,s.time).rotate}deg)`;}
 function hit(event){const s=getState(),priority={'under-text':1,'above-text':2,'under-border':3,'above-border':4};const candidates=s.project.clips.map((c,i)=>({c,i})).filter(({c})=>!studioAudioLayer(c.layer)).sort((a,b)=>priority[studioEditorLayer(b.c.layer)]-priority[studioEditorLayer(a.c.layer)]||studioClipTrackRank(s.project,b.c)-studioClipTrackRank(s.project,a.c)||b.i-a.i);
  for(const {c}of candidates){const n=s.nodes.get(c.id);if(!n||n.asset.kind==='audio'||n.box.hidden||!n.box.offsetWidth)continue;const g=geometry(c,n);if(['under-post','under-text','above-text'].includes(studioEditorLayer(c.layer))&&(event.clientX<g.parent.left||event.clientX>g.parent.right||event.clientY<g.parent.top||event.clientY>g.parent.bottom))continue;const pose=studioAnimatedClip(c,s.time);if(Math.abs(pose.scale)<.001)continue;const angle=-pose.rotate*Math.PI/180,dx=event.clientX-g.center.x,dy=event.clientY-g.center.y,x=(dx*Math.cos(angle)-dy*Math.sin(angle))*(pose.scale<0?-1:1),y=(dx*Math.sin(angle)+dy*Math.cos(angle))*(pose.flipY?-1:1);if(x>=g.width*(-.5+c.cropLeft/100)&&x<=g.width*(.5-c.cropRight/100)&&y>=g.height*(-.5+c.cropTop/100)&&y<=g.height*(.5-c.cropBottom/100))return c;}
 }
 stage.addEventListener('pointerdown',event=>{const s=getState();if(event.button!==0||s.hidden||s.rendering)return;const control=event.target.closest('[data-transform]');const c=control?s.project.clips.find(c=>c.id===s.selected):hit(event);if(!c)return;event.preventDefault();pause();select(c.id,false);const n=s.nodes.get(c.id);if(!n||!n.box.offsetWidth)return;const g=geometry(c,n);gesture={id:event.pointerId,clip:c,original:structuredClone(c),initial:Object.fromEntries(['x','y','scale','rotate'].map(k=>[k,studioAnimatedClip(c,s.time)[k]])),before:structuredClone(s.project),start:{x:event.clientX,y:event.clientY},...g,mode:control?.dataset.transform||'move',moved:false};stage.focus({preventScroll:true});stage.setPointerCapture(event.pointerId);update();});
 stage.addEventListener('pointermove',event=>{if(!gesture||event.pointerId!==gesture.id)return;const g=gesture;if(Math.hypot(event.clientX-g.start.x,event.clientY-g.start.y)<2&&!g.moved)return;g.moved=true;setTransform(g.clip,studioTransformPointer(g.initial,g.mode,g.start,{x:event.clientX,y:event.clientY},g.center,g.parent,event.shiftKey));repaint();update();});
 function finish(cancel=false){if(!gesture)return;const g=gesture;gesture=null;if(stage.hasPointerCapture(g.id))stage.releasePointerCapture(g.id);if(cancel){Object.assign(g.clip,g.original);repaint();}else if(g.moved)commit(g.before);refreshProperties();update();}
 stage.addEventListener('pointerup',()=>finish());stage.addEventListener('pointercancel',()=>finish(true));stage.addEventListener('lostpointercapture',()=>{if(gesture)finish(true);});
 stage.addEventListener('keydown',event=>{if(event.key==='Escape'&&gesture){event.preventDefault();event.stopPropagation();finish(true);}});
 return {update,get dragging(){return !!gesture;}};
}

function mountStudioVideoEditor(root,views,{modeButton,layout,tabs,sizePreview}){
 const make=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text)e.textContent=text;return e;};
 const button=(text,fn)=>{const e=make('button','btn',text);e.type='button';e.onclick=fn;return e;};
 const emptyGrade=()=>({exposure:0,contrast:1,saturation:1,hue:0});
 let project={version:1,assets:[],clips:[],grade:emptyGrade(),output:{width:state.ratio==='portrait'?1080:1920,height:state.ratio==='portrait'?1920:1080,fps:30,duration:studioTotalDuration(state.introDuration,state.narrative),durationMode:'auto',bitrate:20,codec:'h264',acceleration:'auto'},designSync:false},selected=null,time=0,playing=false,view=null,home=null,rendering=false,busy=false,jobId=null,saveTimer,origin='',ready=false,history=[],future=[],lastWall=0,hardware={},lastDesignPlaying=false;
 const nodes=new Map(),pending=new Map();let audioContext,restoringProject=false,onlineOnly=false;
 let selectedAsset=null,animatedProperty='transform',keyframeDetailsOpen=false,monitoring=false,monitorActive=false,monitorSignature='',monitorStamp=0,monitorContentStamp=0;
 const rpc=(action,payload)=>new Promise((resolve,reject)=>{const id=crypto.randomUUID(),timeout=setTimeout(()=>{pending.delete(id);reject(Error('本机服务响应超时，请检查 start-editor.cmd'));},action==='import'?3600000:60000);pending.set(id,{resolve,reject,timeout});parent.postMessage({type:'studio-editor-request',id,action,payload},'*');});
 window.addEventListener('message',e=>{if(e.source!==parent||e.data?.type!=='studio-editor-response')return;const p=pending.get(e.data.id);if(p){pending.delete(e.data.id);clearTimeout(p.timeout);e.data.error?p.reject(Error(e.data.error)):p.resolve(e.data.result);}});
 const panel=make('section','studio-edit-workspace');panel.hidden=true;panel.setAttribute('aria-label','剪辑工作台');
 panel.innerHTML=`<div class="studio-edit-head"><div><span class="studio-kicker">SHOWCASE / EDIT</span><h2>剪辑工作台</h2><p>透明素材、展示包装与输出，在同一条时间线上。</p></div><div class="studio-edit-head-actions"><label class="studio-import-button">＋ 导入素材<input data-editor-import type="file" accept="video/*,audio/*,.mp3,.wav,.flac,.m4a,.aac,.ogg,.opus,.aiff,.aif,.wma,image/png,image/jpeg,image/webp,.mov,.webm,.mp4,.mkv,.avi,.mxf,.mts,.m2ts" multiple></label><button class="btn" data-editor-export>导出视频 ↗</button><button class="btn" data-editor-design>返回展示</button></div></div>
 <div class="studio-editor-status" role="status" aria-live="polite">正在连接本机视频引擎…</div>
 <div class="studio-edit-main"><aside class="studio-edit-assets"><div class="studio-edit-section-title"><strong>素材库</strong><span data-count></span></div><div class="studio-drop-zone" tabindex="0">拖入视频 / 图片 / 音频<small>MOV / WebM Alpha · MP3 / WAV / FLAC / M4A</small></div><div class="studio-asset-list"></div><details open class="studio-editor-output"><summary>输出设置 / 全片调色</summary><div data-output></div><div data-global-grade></div><p class="studio-edit-property-note">ProRes 4444 / VP9 可保留透明底。H.264 / H.265 / AV1 使用实色背景。</p><label class="studio-editor-field">透明背景<input type="checkbox" data-transparent></label><p class="studio-edit-property-note">ProRes 使用质量编码，码率由编码器决定；其余为目标平均码率。</p><p class="studio-edit-property-note">工程包含视觉方案、文字和模板图片；视频与音频引用本机素材。</p><button class="btn" data-save-project>保存剪辑工程</button><label class="studio-import-button">打开剪辑工程<input type="file" accept="application/json,.json" data-load-project></label></details></aside>
 <div class="studio-edit-preview"><div class="studio-edit-stage"></div><div class="studio-edit-transport"><button class="btn" data-play>播放</button><button class="btn" data-split>分割</button><button class="btn" data-undo>撤销</button><button class="btn" data-redo>重做</button><button class="btn" data-preview-large>放大预览</button><button class="btn" data-monitor>独立监视</button><button class="btn" data-assets-toggle>素材库</button><button class="btn" data-properties-toggle>属性</button><span class="studio-preview-quality">流畅预览 · 长边 ≤960px</span><span data-time>0.00 s</span></div></div>
 <aside class="studio-edit-properties"><div class="studio-edit-section-title"><strong>片段属性</strong><span data-selected>未选择</span></div><div class="studio-edit-property-body"></div></aside></div>
 <div class="studio-edit-timeline"><div class="studio-timeline-resizer" role="separator" aria-label="调整时间轴高度" aria-orientation="horizontal" tabindex="0"></div><div class="studio-edit-section-title"><strong>时间轴</strong><span>画面按层叠放 · 两条音轨与素材原声混音</span></div><input type="range" min="0" step=".001" value="0" data-seek aria-label="剪辑播放头"><div data-tracks></div></div>
 <div class="studio-editor-export-progress" hidden><strong>正在逐帧合成与编码</strong><progress max="1" value="0"></progress><span data-progress></span><button class="btn" data-cancel>取消导出</button></div>`;
 root.append(panel);
 const onlineDialog=make('dialog','studio-editor-online');onlineDialog.setAttribute('aria-label','本机剪辑入口');onlineDialog.innerHTML='<h3>视频剪辑在本机进行</h3><p>线上可以编辑展示模板并输出 HTML、OBS 和 AE。视频素材、音轨和 GPU 编码请使用本机剪辑版。</p><p>首次使用：下载并解压，先运行 <strong>setup-editor.cmd</strong>，再运行 <strong>start-editor.cmd</strong>。已启动后，点击下方按钮进入。</p><div><button type="button" class="btn" data-online-download>下载本机剪辑版</button><button type="button" class="btn" data-online-launch>打开本机剪辑</button><button type="button" class="btn" data-online-close>关闭</button></div><p data-online-error role="status"></p>';root.append(onlineDialog);
 onlineDialog.querySelector('[data-online-close]').onclick=()=>onlineDialog.close();
 for(const [selector,action]of [['[data-online-download]','downloadLocalEditor'],['[data-online-launch]','openLocalEditor']])onlineDialog.querySelector(selector).onclick=()=>rpc(action).catch(e=>onlineDialog.querySelector('[data-online-error]').textContent=e.message);
 const q=s=>panel.querySelector(s),stage=q('.studio-edit-stage'),properties=q('.studio-edit-property-body'),status=q('.studio-editor-status'),seek=q('[data-seek]');
 const syncChecks=[];
 function syncControl(parent,label){const wrap=make('label','studio-design-sync-toggle'),input=make('input');input.type='checkbox';input.dataset.designSync='';input.setAttribute('aria-label',label);wrap.append(input,make('span','',label));wrap.title='在展示工作台同步当前时间轴素材，方便调整配色、边框和后处理';input.onchange=()=>{checkpoint();project.designSync=input.checked;syncChecks.forEach(c=>c.checked=!!project.designSync);applyDesignSync();save();};parent.append(wrap);syncChecks.push(input);}
 syncControl(panel.querySelector('.studio-edit-head-actions'),'展示页同步素材');syncControl(layout.querySelector('.studio-canvas-toolbar'),'同步剪辑素材');
 const transforms=mountStudioViewportTransform({stage,getState:()=>({view,project,selected,time,playing,rendering,nodes,hidden:panel.hidden}),select:(id,reveal)=>selectClip(id,reveal),pause:()=>seekTo(time),repaint:()=>paint(time),commit:before=>{history.push(before);if(history.length>60)history.shift();future=[];changed();},refreshProperties:()=>renderProperties(),setTransform:(c,values)=>{for(const [key,value]of Object.entries(values))studioSetAnimatedProperty(c,key,value,time);}});
 const report=(text,error=false)=>{status.textContent=text;status.dataset.error=String(error);};
 const serialize=()=>structuredClone(project);
 const serializeProject=()=>({...serialize(),template:{version:1,design:structuredClone({...state,time:panel.hidden?state.time:time,playing:false}),images:structuredClone(images),imageNames:structuredClone(imageNames)}});
 root.addEventListener('studio-template-change',()=>{if(ready&&!restoringProject)save();});
 const checkpoint=()=>{history.push(serialize());if(history.length>60)history.shift();future=[];};
 const save=()=>{if(!ready||restoringProject||rendering||monitoring)return;clearTimeout(saveTimer);saveTimer=setTimeout(()=>{if(!restoringProject&&!rendering&&!monitoring)rpc('save',serializeProject()).catch(e=>report('自动保存失败：'+e.message,true));},500);};
 const changed=()=>{save();renderTimeline();paint(time);};
 function field(parent,label,value,onChange,{min,max,step=.01,type='number',options}={}){
  const wrap=make('label','studio-editor-field'),text=make('span','',label),input=make(options?'select':'input');
  input.setAttribute('aria-label',label);if(options){for(const [v,t]of options){const o=make('option','',t);o.value=v;input.append(o);}input.value=value;}else{input.type=type;if(type==='checkbox')input.checked=!!value;else input.value=value;if(min!==undefined)input.min=min;if(max!==undefined)input.max=max;input.step=step;}
  input.onchange=()=>{let v=options?input.value:type==='checkbox'?input.checked:type==='color'?input.value:Number(input.value);if(type==='number'&&!options){if(!Number.isFinite(v))return;v=Math.max(min??-Infinity,Math.min(max??Infinity,v));input.value=v;}checkpoint();onChange(v);changed();};wrap.append(text,input);parent.append(wrap);return input;
 }
 function grades(parent,g){field(parent,'曝光 EV',g.exposure,v=>g.exposure=v,{min:-3,max:3,step:.1});field(parent,'对比度',g.contrast,v=>g.contrast=v,{min:0,max:3,step:.05});field(parent,'饱和度',g.saturation,v=>g.saturation=v,{min:0,max:3,step:.05});field(parent,'色相 °',g.hue,v=>g.hue=v,{min:-180,max:180,step:1});}
 function section(title,open=false){const e=make('details','studio-editor-section');e.open=open;e.append(make('summary','',title));properties.append(e);return e;}
 function syncCanvasOrientation(){const ratio=monitoring?'landscape':project.output.width<project.output.height?'portrait':'landscape';if(state.ratio!==ratio){state.ratio=ratio;sync();}}
 function renderOutput(){syncDuration(false);const p=q('[data-output]');p.replaceChildren();field(p,'时长模式',project.output.durationMode||'custom',v=>{project.output.durationMode=v;syncDuration(false);renderOutput();resize();},{options:[['auto','自动 · 片头＋展示＋片尾'],['custom','自定义全片时长']]});field(p,'剪辑画幅',studioEditorOutputAspect(project.output),v=>{if(v!=='custom'){Object.assign(project.output,studioEditorAspectSize(project.output,v));syncCanvasOrientation();renderOutput();resize();}},{options:[['landscape','横屏 · 16:9'],['portrait','竖屏 · 9:16'],['custom','自定义 · 输入宽高']]});for(const [key,label,min,max,step]of [['width','宽度 px',64,7680,2],['height','高度 px',64,7680,2],['fps','帧率',1,60,1],['duration','全片时长 s',.1,3600,.1],['bitrate','目标码率 Mbps',.1,250,.1]])field(p,label,project.output[key],v=>{project.output[key]=v;if(key==='duration'){project.output.durationMode='custom';p.querySelector('[aria-label="时长模式"]').value='custom';}if(key==='width'||key==='height'){syncCanvasOrientation();p.querySelector('[aria-label="剪辑画幅"]').value=studioEditorOutputAspect(project.output);}resize();},{min,max,step});
  field(p,'编码器',project.output.codec,v=>{project.output.codec=v;renderOutput();},{options:[['h264','H.264 / MP4'],['h265','H.265 / MP4'],['av1','AV1 / MP4'],['vp9','VP9 Alpha / WebM'],['prores','ProRes 4444 Alpha / MOV']]});p.querySelector('[aria-label="目标码率 Mbps"]').disabled=project.output.codec==='prores';const gpuOptions=[['auto',['vp9','prores'].includes(project.output.codec)?'自动 · CPU 保留透明':'自动 · 优先 GPU'],['cpu','CPU 软件编码']];if(['h264','h265','av1'].includes(project.output.codec))for(const device of hardware[project.output.codec]||[])gpuOptions.push([device,{nvenc:'NVIDIA NVENC',qsv:'Intel QSV',amf:'AMD AMF'}[device]]);if(['vp9','prores'].includes(project.output.codec)&&!['auto','cpu'].includes(project.output.acceleration||'auto'))project.output.acceleration='auto';field(p,'编码设备',project.output.acceleration||'auto',v=>project.output.acceleration=v,{options:gpuOptions});field(p,'导出并行度',project.output.workers||0,v=>project.output.workers=Number(v),{options:[[0,'自动 · 按 CPU 和内存'],[1,'1 路 · 节省资源'],[2,'2 路'],[4,'4 路'],[8,'8 路 · 高性能'],[12,'12 路 · 激进'],[16,'16 路 · 激进'],[24,'24 路 · 极限并行']]});p.append(make('p','studio-edit-property-note','短片建议自动；12–24 路占用更多资源，初始化也更久。实际并行度按空闲内存和输出尺寸限制。'));const g=q('[data-global-grade]');g.replaceChildren();g.append(make('h4','','全片调色'));grades(g,project.grade);q('[data-transparent]').checked=!!project.transparent;syncChecks.forEach(c=>c.checked=!!project.designSync);applyDesignSync();
 }
 function syncDuration(persist=true){if(!project.output.durationMode)project.output.durationMode=Math.abs(project.output.duration-studioTotalDuration(state.introDuration,state.narrative))<.11?'auto':'custom';if(project.output.durationMode!=='auto'||rendering||monitoring)return;const duration=Math.max(.1,Math.min(3600,studioTotalDuration(state.introDuration,state.narrative)));if(Math.abs(project.output.duration-duration)<.0001)return;project.output.duration=duration;time=Math.min(time,duration);const input=q('[aria-label="全片时长 s"]');if(input)input.value=duration.toFixed(2);if(persist){renderTimeline();save();}}
 function renderProperties(){properties.replaceChildren();const c=project.clips.find(c=>c.id===selected);q('[data-selected]').textContent=c?'已选择':'未选择';if(!c){properties.append(make('p','','点击时间轴片段，调整时间、变换、层级和效果。'));return;}
  const asset=project.assets.find(a=>a.id===c.assetId);properties.append(make('strong','studio-editor-filename',asset?.name||'离线素材'));
  const timing=section('时间与层级',true);
  field(timing,'开始时间 s',c.start,v=>c.start=v,{min:0,max:3600});field(timing,'素材入点 s',c.in,v=>{c.in=Math.min(v,c.out-.01);renderProperties();},{min:0,max:Math.max(0,c.out-.01)});field(timing,'素材出点 s',c.out,v=>{c.out=Math.max(c.in+.01,v);renderProperties();},{min:c.in+.01,max:asset?.image?3600:asset?.duration||3600});
  if(asset?.kind==='audio'){field(timing,'音轨',c.layer,v=>{c.layer=v;attachLayers();},{options:[['audio-1','音轨 1'],['audio-2','音轨 2']]});const sound=section('声音',true);soundFields(sound,c);clipActions(c);return;}
  field(timing,'合成层级',studioClipTrackId(c),v=>{const track=studioEditorTimelineRows(project).find(t=>t.id===v);studioSetClipTrack(c,track);attachLayers();renderProperties();},{options:studioVideoLayers.flatMap(layer=>studioVideoTracks(project,layer).map(t=>[t.id,t.label]))});
  if(['under-text','above-text'].includes(studioEditorLayer(c.layer)))timing.append(make('p','studio-edit-property-note','片头、展示页和片尾的文字都在同一文字层。文字上下的素材均接受后处理；如需保持原画，请放到后处理上方。'));
  renderKeyframes(c);
  const evaluated=studioAnimatedClip(c,time),trans=section('变换与裁切',true);for(const [key,label,min,max]of [['x','水平位置 %',-100,200],['y','垂直位置 %',-100,200],['scale','缩放 %',-800,800],['rotate','旋转 °',-360,360],['opacity','不透明度 %',0,100],['cropLeft','裁切左 %',0,49],['cropRight','裁切右 %',0,49],['cropTop','裁切上 %',0,49],['cropBottom','裁切下 %',0,49]])field(trans,label,evaluated[key],v=>{studioAnimatedKeys.includes(key)?studioSetAnimatedProperty(c,key,v,time):c[key]=v;renderProperties();},{min,max,step:1});
  const flip=make('div','studio-keyframe-actions');flip.append(button('水平翻转',()=>{checkpoint();studioSetAnimatedProperty(c,'scale',-(studioAnimatedClip(c,time).scale||100),time);renderProperties();changed();}),button('垂直翻转',()=>{checkpoint();c.flipY=!c.flipY;renderProperties();changed();}));flip.lastChild.setAttribute('aria-pressed',String(!!c.flipY));trans.append(flip,make('p','studio-edit-property-note','负缩放 = 左右镜像；−100% 与 100% 等大。垂直翻转单独控制，0% 隐藏画面。'));
  trans.append(button('重置变换',()=>{checkpoint();delete c.keyframes;Object.assign(c,{x:50,y:50,scale:100,flipY:false,rotate:0,opacity:100,cropLeft:0,cropRight:0,cropTop:0,cropBottom:0});renderProperties();changed();}));
  const transition=section('过渡与声音',true);field(transition,'入场时长 s',c.fadeIn,v=>c.fadeIn=v,{min:0,max:studioClipDuration(c)/2});field(transition,'退场时长 s',c.fadeOut,v=>c.fadeOut=v,{min:0,max:studioClipDuration(c)/2});field(transition,'过渡效果',c.transition,v=>c.transition=v,{options:[['fade','淡入淡出 / 叠化'],['slide','滑入滑出'],['zoom','缩放淡入淡出']]});soundFields(transition,c);
  const key=section('色度键');field(key,'启用色度键',c.key.enabled,v=>c.key.enabled=v,{type:'checkbox'});field(key,'抠像颜色',c.key.color,v=>c.key.color=v,{type:'color'});field(key,'容差',c.key.tolerance,v=>c.key.tolerance=v,{min:0,max:1});field(key,'边缘柔化',c.key.softness,v=>c.key.softness=v,{min:.001,max:1});field(key,'绿色溢色抑制',c.key.spill,v=>c.key.spill=v,{min:0,max:1});
  grades(section('素材调色'),c.grade);
  clipActions(c);
 }
 function soundFields(parent,c){field(parent,'声音淡入 s',c.audioFadeIn??c.fadeIn,v=>c.audioFadeIn=v,{min:0,max:studioClipDuration(c)});field(parent,'声音淡出 s',c.audioFadeOut??c.fadeOut,v=>c.audioFadeOut=v,{min:0,max:studioClipDuration(c)});field(parent,'音量',c.volume,v=>c.volume=v,{min:0,max:2,step:.05});}
 function clipActions(c){
  properties.append(button('复制片段',()=>{checkpoint();const n=structuredClone(c);n.id=crypto.randomUUID();n.start+=studioClipDuration(c);project.clips.push(n);selected=n.id;rebuild();changed();}),button('同轨置顶',()=>{checkpoint();project.clips=project.clips.filter(n=>n!==c).concat(c);rebuild();changed();}),button('删除片段',()=>removeSelected()));
 }

 const animationLabels={x:'水平位置 %',y:'垂直位置 %',scale:'缩放 %',rotate:'旋转 °',opacity:'不透明度 %'};
 function keySource(c){return Math.max(c.in,Math.min(c.out,c.in+time-c.start));}
 function refreshAnimatedFields(){const c=project.clips.find(c=>c.id===selected);if(!c)return;for(const [key,label]of Object.entries(animationLabels)){const input=properties.querySelector('[aria-label="'+label+'"]');if(input&&document.activeElement!==input)input.value=Number(studioAnimatedValue(c,key,keySource(c)).toFixed(3));}const label=properties.querySelector('[data-keyframe-time]');if(label)label.textContent='片段内 '+Math.max(0,time-c.start).toFixed(2)+' s';}
 function renderKeyframes(c){
  const group=section('关键帧动画',true),source=keySource(c),keys=studioKeyframeKeys(animatedProperty);
  const update=()=>{renderProperties();changed();};
  const quick=make('div','studio-keyframe-actions');quick.append(button('记录当前变换',()=>{checkpoint();studioRecordPose(c,studioAnimatedKeys,time);update();}));group.append(quick);
  group.append(make('p','studio-edit-property-note','先记录一次，再移动播放头并拖动画面、缩放或旋转，会自动记录新关键帧。位置 X / Y 一起记录。'));
  const stamp=make('span','studio-keyframe-time');stamp.dataset.keyframeTime='';group.append(stamp);
  const frames=[...new Set(keys.flatMap(key=>(c.keyframes?.[key]||[]).map(f=>f.time)))].sort((a,b)=>a-b).map(time=>({time})),currentFrames=keys.map(key=>c.keyframes?.[key]?.find(f=>Math.abs(f.time-source)<.0005)).filter(Boolean),current=currentFrames[0];
  const nav=make('div','studio-keyframe-actions');for(const [label,frame]of [['上一关键帧',[...frames].reverse().find(f=>f.time<source-.0005&&f.time>=c.in)],['下一关键帧',frames.find(f=>f.time>source+.0005&&f.time<=c.out)]]){const b=button(label,()=>seekTo(c.start+frame.time-c.in));b.disabled=!frame;nav.append(b);}group.append(nav);
  const easing=field(group,'到下一帧的变化',current?.easing||'linear',v=>{for(const f of currentFrames)f.easing=v;renderProperties();},{options:[['linear','匀速'],['smooth','平滑缓入缓出'],['hold','保持 · 到点切换']]});easing.disabled=!current;
  const list=make('div','studio-keyframe-list');for(const frame of frames.filter(f=>f.time>=c.in&&f.time<=c.out)){const b=button((Math.abs(frame.time-source)<.0005?'◆ ':'◇ ')+(frame.time-c.in).toFixed(2)+' s',()=>seekTo(c.start+frame.time-c.in));b.title='跳到此时间，直接修改变换或拖动画面';list.append(b);}group.append(list);
  const advanced=make('details','studio-keyframe-advanced');advanced.open=keyframeDetailsOpen;const summary=make('summary','','按属性调整 / 删除关键帧');summary.onclick=()=>{keyframeDetailsOpen=!advanced.open;};advanced.append(summary);group.append(advanced);
  const property=field(advanced,'动画属性',animatedProperty,()=>{},{options:[['transform','整体变换'],['position','位置 · X + Y'],['scale','缩放'],['rotate','旋转'],['opacity','不透明度'],['x','仅水平位置'],['y','仅垂直位置']]});property.onchange=()=>{animatedProperty=property.value;renderProperties();};
  const actions=make('div','studio-keyframe-actions');actions.append(button('添加 / 更新关键帧',()=>{checkpoint();studioRecordPose(c,keys,time);update();}),button('删除当前关键帧',()=>{if(!current)return;checkpoint();const values=Object.fromEntries(keys.map(key=>[key,studioAnimatedValue(c,key,source)]));for(const key of keys){if(!c.keyframes?.[key])continue;c.keyframes[key]=c.keyframes[key].filter(f=>Math.abs(f.time-source)>=.0005);if(!c.keyframes[key].length){delete c.keyframes[key];c[key]=values[key];}}update();}));actions.lastChild.disabled=!current;advanced.append(actions);
  const clear=button('清除全部动画 · 保留当前变换',()=>{checkpoint();const pose=studioAnimatedClip(c,Math.max(c.start,Math.min(c.start+studioClipDuration(c),time)));for(const key of studioAnimatedKeys)c[key]=pose[key];delete c.keyframes;update();});clear.disabled=!studioAnimatedKeys.some(key=>c.keyframes?.[key]?.length);advanced.append(clear);refreshAnimatedFields();
 }
 function removeAsset(id){if(rendering||jobId||!project.assets.some(a=>a.id===id))return;seekTo(time);checkpoint();const count=project.clips.filter(c=>c.assetId===id).length;project.assets=project.assets.filter(a=>a.id!==id);project.clips=project.clips.filter(c=>c.assetId!==id);if(!project.clips.some(c=>c.id===selected))selected=null;rebuild();changed();report(`已删除素材${count?'及 '+count+' 个关联片段':''} · 可撤销恢复 · 原始文件保留在本机`);}
 function renderAssets(){const list=q('.studio-asset-list');list.replaceChildren();q('[data-count]').textContent=project.assets.length+' 个素材';for(const a of project.assets){const row=make('div','studio-asset-row'),b=button('',()=>{selectedAsset=a.id;selected=null;for(const card of list.querySelectorAll('.studio-asset-card'))card.setAttribute('aria-pressed',String(card===b));renderProperties();renderTimeline();transforms.update();report('已选择 '+a.name+' · 拖入时间轴对应轨道添加片段');});b.className='studio-asset-card';b.setAttribute('aria-pressed',String(selectedAsset===a.id));b.append(make('span','studio-asset-thumb',a.kind==='audio'?'♫':a.alpha?'α':'▶'),make('span','studio-asset-name',a.name),make('span','studio-asset-type',`${a.codec||''} ${a.alpha?'· ALPHA':''} · 拖入轨道添加`));b.draggable=true;b.ondragstart=e=>{selectedAsset=a.id;e.dataTransfer.effectAllowed='copy';e.dataTransfer.setData('application/studio-asset',a.id);};b.ondragend=()=>{for(const lane of panel.querySelectorAll('.is-asset-drop'))lane.classList.remove('is-asset-drop');};
  const remove=button('删除',()=>{const count=project.clips.filter(c=>c.assetId===a.id).length;if(!count){removeAsset(a.id);return;}confirm.replaceChildren(make('p','',`时间轴中有 ${count} 个片段使用此素材。删除素材会一并移除这些片段，可撤销恢复。`),button('删除素材及关联片段',()=>removeAsset(a.id)),button('取消',()=>{confirm.hidden=true;remove.focus();}));confirm.hidden=false;confirm.querySelector('button').focus();});remove.className='btn studio-asset-remove';remove.setAttribute('aria-label','删除素材 '+a.name);remove.title='从当前工程删除素材，可撤销恢复';remove.disabled=!!jobId;
  const confirm=make('div','studio-asset-remove-confirm');confirm.hidden=true;confirm.setAttribute('role','group');confirm.setAttribute('aria-label','删除素材确认');confirm.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();confirm.hidden=true;remove.focus();}};row.append(b,remove,confirm);list.append(row);}}
 function addVideoTrack(source){if(studioCustomTracks(project).length>=64||jobId)return;checkpoint();project.videoTracks??=[];const label=studioTrackLabels[source.layer].split(' · ')[0];let number=2;while(project.videoTracks.some(t=>t.name===label+' '+number))number++;const track={id:crypto.randomUUID(),layer:source.layer,name:label+' '+number};let index=project.videoTracks.findIndex(t=>t.id===source.id);if(index<0){index=project.videoTracks.length;for(let i=project.videoTracks.length-1;i>=0;i--)if(project.videoTracks[i].layer===source.layer){index=i+1;break;}}project.videoTracks.splice(index,0,track);renderProperties();changed();q('[data-track-id="'+track.id+'"]').scrollIntoView({block:'nearest'});report('已新增 '+track.name+' · 与原轨道保持相同的文字与后处理关系');}
 function removeVideoTrack(id){if(jobId||project.clips.some(c=>c.trackId===id))return;checkpoint();project.videoTracks=studioCustomTracks(project).filter(t=>t.id!==id);renderProperties();changed();}
 function renderTimeline(){seek.max=project.output.duration;seek.value=time;const tracks=q('[data-tracks]');tracks.replaceChildren();for(const track of studioEditorTimelineRows(project)){const {id,layer,label}=track,row=make('div','studio-edit-track'),lane=make('div','studio-edit-track-lane'),heading=make('div','studio-edit-track-label');heading.append(make('span','studio-track-name',label));row.append(heading,lane);if(studioVideoLayers.includes(layer)){const add=button('+',()=>addVideoTrack(track));add.className='studio-track-action';add.title='在上方新增一条相同性质的视频轨道';add.setAttribute('aria-label','新增同类轨道 '+label);add.disabled=studioCustomTracks(project).length>=64||!!jobId;heading.append(add);if(id!==layer){const remove=button('×',()=>removeVideoTrack(id));remove.className='studio-track-action';remove.setAttribute('aria-label','删除空轨道 '+label);remove.disabled=project.clips.some(c=>c.trackId===id)||!!jobId;remove.title=remove.disabled?'请先移走此轨道的片段':'删除空轨道，可撤销恢复';heading.append(remove);}}lane.style.position='relative';lane.style.minHeight='32px';if(!layer){row.classList.add('studio-editor-fixed-track');lane.textContent=id==='showcase'?`0 — ${project.output.duration.toFixed(2)} s · 当前展示设计`:'';}else{lane.onclick=e=>{if(e.target===lane)seekTo((e.clientX-lane.getBoundingClientRect().left)/lane.clientWidth*project.output.duration);};lane.dataset.layer=layer;lane.dataset.trackId=id;if(studioAudioLayer(layer))row.classList.add('studio-audio-track');lane.setAttribute('aria-label',label+'轨道');lane.dataset.dropHint=studioAudioLayer(layer)?'拖入音频到这一轨':'拖入画面素材到这一层';lane.ondragover=e=>{if(!e.dataTransfer.types.includes('application/studio-asset'))return;e.preventDefault();e.dataTransfer.dropEffect='copy';lane.classList.add('is-asset-drop');};lane.ondragleave=e=>{if(!lane.contains(e.relatedTarget))lane.classList.remove('is-asset-drop');};lane.ondrop=e=>{e.preventDefault();lane.classList.remove('is-asset-drop');const a=project.assets.find(a=>a.id===e.dataTransfer.getData('application/studio-asset'));if(a)addClip(a,Math.max(0,(e.clientX-lane.getBoundingClientRect().left)/lane.clientWidth*project.output.duration),layer,id);};for(const c of project.clips.filter(c=>studioClipTrackId(c)===id)){const clip=button(project.assets.find(a=>a.id===c.assetId)?.name||'离线素材',()=>selectClip(c.id));clip.className='studio-edit-clip';clip.dataset.selected=String(c.id===selected);clip.style.cssText=`position:absolute;left:${c.start/project.output.duration*100}%;width:${studioClipDuration(c)/project.output.duration*100}%;min-width:8px;max-width:${Math.max(0,100-c.start/project.output.duration*100)}%;`;clip.title=`${clip.textContent} / ${c.start.toFixed(2)} s → ${(c.start+studioClipDuration(c)).toFixed(2)} s`;clip.onpointerdown=e=>{if(e.button!==0)return;const x=e.clientX,y=e.clientY,oldStart=c.start,oldLayer=c.layer,oldTrack=c.trackId;let moved=false;clip.setPointerCapture(e.pointerId);clip.onpointermove=ev=>{if(Math.hypot(ev.clientX-x,ev.clientY-y)>4&&!moved){checkpoint();moved=true;}if(!moved)return;const target=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.studio-edit-track-lane[data-layer]');for(const el of panel.querySelectorAll('.is-clip-drop'))el.classList.remove('is-clip-drop');if(target&&studioAssetFitsLayer(project.assets.find(a=>a.id===c.assetId),target.dataset.layer)){target.classList.add('is-clip-drop');if(studioClipTrackId(c)!==target.dataset.trackId){studioSetClipTrack(c,{id:target.dataset.trackId,layer:target.dataset.layer});attachLayers();}}c.start=Math.max(0,Math.min(project.output.duration-.01,oldStart+(ev.clientX-x)/lane.clientWidth*project.output.duration));clip.style.left=c.start/project.output.duration*100+'%';const rect=tracks.parentElement.getBoundingClientRect();if(ev.clientY>rect.bottom-30)tracks.parentElement.scrollTop+=12;else if(ev.clientY<rect.top+45)tracks.parentElement.scrollTop-=12;paint(time);};const finish=cancel=>{clip.onpointermove=null;clip.onpointerup=null;clip.onpointercancel=null;for(const el of panel.querySelectorAll('.is-clip-drop'))el.classList.remove('is-clip-drop');if(!moved)return;if(cancel){c.start=oldStart;c.layer=oldLayer;if(oldTrack)c.trackId=oldTrack;else delete c.trackId;history.pop();attachLayers();}selected=c.id;renderProperties();changed();};clip.onpointerup=()=>finish(false);clip.onpointercancel=()=>finish(true);};;lane.append(clip);}}
  const head=make('i','studio-editor-playhead');head.style.left=time/project.output.duration*100+'%';lane.append(head);tracks.append(row);}}
 function addClip(a,start=time,layer=a.kind==='audio'?'audio-1':'under-border',trackId=layer){if(!studioAssetFitsLayer(a,layer)){report(a.kind==='audio'?'请将音频拖入音轨 1 或音轨 2。':'请将视频或图片拖入画面轨道。',true);return;}checkpoint();const c=studioNewClip(a,start);studioSetClipTrack(c,{id:trackId,layer});project.clips.push(c);syncDuration(false);selected=c.id;renderOutput();rebuild();changed();}
 function assetURL(a){const url=rendering?a.proxy:(a.preview||a.proxy);return url?.startsWith('http')?url:origin+url;}
 function positionMedia(n,target){
  if(Math.abs(n.media.currentTime-target)<.008)return;
  if(n.media.seeking){n.pendingSeek=target;return;}
  n.pendingSeek=null;n.stats.seeks++;n.media.currentTime=target;
 }
 function makeNode(c){
  const a=project.assets.find(a=>a.id===c.assetId);if(!a)return;
  const still=a.image||(rendering&&a.renderFrames),media=document.createElement(a.kind==='audio'?'audio':still?'img':'video');media.crossOrigin='anonymous';if(a.kind==='audio')media.src=(a.preview?.startsWith('http')?a.preview:origin+a.preview);else if(!a.renderFrames||!rendering)media.src=assetURL(a);
  if(!still){media.preload=a.kind==='audio'&&rendering?'none':'auto';media.playsInline=true;media.muted=true;}
  const box=make('div','studio-editor-clip-surface'),canvas=make('canvas');box.dataset.clipId=c.id;box.append(canvas);
  if(!rendering)box.append(media);canvas.hidden=true;
  const n={box,canvas,media,asset:a,needsSeek:true,frameVersion:0,drawKey:'',stats:{seeks:0,uploads:0},disposed:false};nodes.set(c.id,n);
  const refresh=()=>{if(view&&!n.disposed){n.frameVersion++;drawClip(project.clips.find(x=>x.id===c.id)||c,n,studioClipPose(c,time));transforms.update();}};
  if(!a.renderFrames||!rendering)media.addEventListener(still?'load':'loadeddata',refresh);
  if(!still){media.addEventListener('seeked',()=>{if(n.pendingSeek!==null&&n.pendingSeek!==undefined){const target=n.pendingSeek;n.pendingSeek=null;positionMedia(n,target);}refresh();});
   if(!rendering&&media.requestVideoFrameCallback){const decoded=()=>{if(n.disposed)return;refresh();n.frameRequest=media.requestVideoFrameCallback(decoded);};n.frameRequest=media.requestVideoFrameCallback(decoded);}
  }
  media.onerror=()=>report('素材读取失败：'+a.name,true);return n;
 }
 function disposeNode(n){n.audioSource?.disconnect();n.audioGain?.disconnect();n.disposed=true;n.media.onerror=null;if(n.frameRequest)n.media.cancelVideoFrameCallback?.(n.frameRequest);n.keyRenderer?.dispose();n.media.pause?.();n.media.removeAttribute('src');n.media.load?.();n.box.remove();}
 function layerTarget(c,t=time){
  if(studioAudioLayer(c.layer))return {parent:view.art,z:'0',visible:true};const z=String(studioClipTrackRank(project,c)),layer=studioEditorLayer(c.layer);if(['under-text','above-text'].includes(layer))return {parent:layer==='under-text'?view.editorTextLayers.below:view.editorTextLayers.above,z,visible:true};
  view.editorVideoStacks??={};if(!view.editorVideoStacks[layer]){const stack=make('div','studio-editor-track-stack');stack.style.zIndex=layer==='above-border'?'30':'10';view.art.append(stack);view.editorVideoStacks[layer]=stack;}return {parent:view.editorVideoStacks[layer],z,visible:true};
 }
 function attachLayers(){if(!view?.post)return;studioEditorTextLayers(view,project.clips.some(c=>['under-text','above-text'].includes(studioEditorLayer(c.layer))));for(const c of project.clips){const n=nodes.get(c.id)||makeNode(c);if(!n)continue;const target=layerTarget(c);target.parent.append(n.box);n.box.style.zIndex=target.z;}}
 function rebuild(){for(const [id,n]of nodes)if(!project.clips.some(c=>c.id===id)){disposeNode(n);nodes.delete(id);}attachLayers();renderAssets();renderProperties();renderTimeline();}
 function drawClip(c,n,p){
  if(n.asset.kind==='audio'){n.box.hidden=true;return;}
  c=studioAnimatedClip(c,time);
  const target=layerTarget(c);if(n.box.parentElement!==target.parent)target.parent.append(n.box);n.box.style.zIndex=target.z;n.box.hidden=!p.visible||!target.visible;if(n.box.hidden)return;
  const m=n.media,mw=m.videoWidth||m.naturalWidth,mh=m.videoHeight||m.naturalHeight;if(!mw||!mh||(!n.asset.image&&m.readyState<2))return;
  const useCanvas=rendering||c.key.enabled;n.canvas.hidden=!useCanvas;if(!rendering)m.hidden=useCanvas;
  if(useCanvas){
   const bound=rendering?Math.max(mw,mh):640,scale=Math.min(1,bound/Math.max(mw,mh)),w=Math.max(1,Math.round(mw*scale)),h=Math.max(1,Math.round(mh*scale));
   const frameStamp=rendering?m.currentTime:n.asset.image?'image':m.requestVideoFrameCallback?n.frameVersion:Math.floor(m.currentTime*Math.min(30,n.asset.fps||30));const stamp=[frameStamp,w,h,JSON.stringify(c.key)].join('|');
   if(stamp!==n.drawKey){
    if(c.key.enabled&&!n.keyTried){n.keyTried=true;try{n.keyRenderer=studioCreatePreviewKey(n.canvas);}catch{}if(!n.keyRenderer){n.canvas.remove();n.canvas=make('canvas');n.box.prepend(n.canvas);}}
    if(n.keyRenderer){n.keyRenderer.draw(m,c.key,w,h);n.box.dataset.previewPath=rendering?'export-gpu-key':'gpu-key';}
    else{if(!n.ctx)n.ctx=n.canvas.getContext('2d',{willReadFrequently:!!c.key.enabled});if(n.canvas.width!==w||n.canvas.height!==h){n.canvas.width=w;n.canvas.height=h;}n.ctx.clearRect(0,0,w,h);n.ctx.drawImage(m,0,0,w,h);if(c.key.enabled){const image=n.ctx.getImageData(0,0,w,h);studioKeyPixels(image.data,c.key.color,c.key.tolerance,c.key.softness,c.key.spill);n.ctx.putImageData(image,0,0);}n.box.dataset.previewPath=rendering?'export':'cpu-key';}
    n.drawKey=stamp;n.stats.uploads++;
   }
  }else n.box.dataset.previewPath='direct';
  const w=n.asset.width||mw,h=n.asset.height||mh,container=n.box.parentElement,fit=Math.min(container.clientWidth/w,container.clientHeight/h),transition=p.transitionOpacity,slide=c.transition==='slide'?(1-transition)*15:0,zoom=c.transition==='zoom'?.85+.15*transition:1;
  const layoutKey=[container.clientWidth,container.clientHeight,c.x,c.y,c.scale,c.flipY,c.rotate,c.opacity,c.cropTop,c.cropRight,c.cropBottom,c.cropLeft,c.transition,p.opacity,JSON.stringify(c.grade)].join('|');
  if(layoutKey!==n.layoutKey){n.layoutKey=layoutKey;n.box.style.left=(c.x+slide)+'%';n.box.style.top=c.y+'%';n.box.style.width=(w*fit)+'px';n.box.style.height=(h*fit)+'px';n.box.style.opacity=p.opacity;n.box.style.transform=`translate(-50%,-50%) rotate(${c.rotate}deg) scale(${c.scale/100*zoom},${Math.abs(c.scale)/100*zoom*(c.flipY?-1:1)})`;n.box.style.clipPath=`inset(${c.cropTop}% ${c.cropRight}% ${c.cropBottom}% ${c.cropLeft}%)`;n.box.style.filter=studioGradeCSS(c.grade);}
 }
 function paint(t,scene=true){
  syncDuration();
  if(!view)return;if(scene){state.time=t;state.playing=false;motionClock=createMotionClock(t,state.variants,state.edges);draw(view);}const mediaPlaying=scene?playing:state.playing;
  const artKey=JSON.stringify([project.grade,project.transparent]);if(view.editorArtKey!==artKey){view.editorArtKey=artKey;view.art.style.filter=studioGradeCSS(project.grade);view.art.classList.toggle('studio-editor-transparent',!!project.transparent);root.classList.toggle('is-transparent-output',!!project.transparent);}
  for(const c of project.clips){const n=nodes.get(c.id);if(!n)continue;const p=studioClipPose(c,t),m=n.media;p.visible=p.visible&&layerTarget(c,t).visible;
   if(!n.asset.image&&!rendering){if(p.visible){if(!mediaPlaying||n.needsSeek||!n.active){positionMedia(n,p.source);n.needsSeek=false;}if(n.asset.kind==='audio'&&audioContext){if(!n.audioGain){n.audioSource=audioContext.createMediaElementSource(m);n.audioGain=audioContext.createGain();n.audioSource.connect(n.audioGain).connect(audioContext.destination);}n.audioGain.gain.value=c.volume*p.audioGain;m.volume=1;}else m.volume=monitoring?0:Math.min(1,c.volume*p.audioGain);m.muted=monitoring||!mediaPlaying||c.volume===0;if(!mediaPlaying&&!m.paused)m.pause();if(mediaPlaying&&m.paused&&!n.playRequest){n.playRequest=m.play().catch(()=>{}).finally(()=>n.playRequest=null);}}else{m.pause();n.needsSeek=true;}n.active=p.visible;}
   drawClip(c,n,p);
  }
  studioDrawEditorTextLayers(view);refreshAnimatedFields();
  q('[data-time]').textContent=`${t.toFixed(2)} / ${project.output.duration.toFixed(2)} s`;seek.value=t;for(const h of panel.querySelectorAll('.studio-editor-playhead'))h.style.left=t/project.output.duration*100+'%';transforms.update();
 }
 function seekTo(t){playing=false;for(const n of nodes.values()){n.media.pause?.();n.needsSeek=true;}time=Math.max(0,Math.min(project.output.duration,Number(t)||0));q('[data-play]').textContent='播放';paint(time);if(selected)renderProperties();}
 function resize(){if(!view)return;syncCanvasOrientation();const bw=monitoring?1920:project.output.width<project.output.height?1080:1920,bh=monitoring?1080:bw*project.output.height/project.output.width;const scale=rendering?project.output.width/bw:(monitoring?Math.max:Math.min)(stage.clientWidth/bw,stage.clientHeight/bh);view.outputScale=Math.max(.001,scale);view.previewRasterScale=rendering?0:.5;view.art.style.setProperty('--preview-width',bw+'px');view.art.style.width=bw+'px';view.art.style.height=bh+'px';view.art.style.aspectRatio='auto';view.art.style.transform=`scale(${Math.max(.001,scale)})`;view.art.style.transformOrigin='center';measure(view);paint(time);}
 function enter(inheritDesign=true){if(!rendering&&inheritDesign&&state.ratio!==(project.output.width<project.output.height?'portrait':'landscape')){checkpoint();Object.assign(project.output,studioEditorAspectSize(project.output,state.ratio));renderOutput();save();}syncCanvasOrientation();time=Math.max(0,Math.min(project.output.duration,time));root.classList.remove('is-focused');view=views.find(v=>v.key===state.activeDesign)||views[0];home=view.art.parentElement;view.editorSeek=true;stage.append(view.art);panel.hidden=false;layout.hidden=true;tabs.hidden=true;root.classList.add('is-editing-mode');root.dataset.editorMode='editing';modeButton.textContent='返回展示工作台';modeButton.setAttribute('aria-pressed','true');state.playing=false;attachLayers();requestAnimationFrame(resize);}
 function leave(){seekTo(time);panel.hidden=true;layout.hidden=false;tabs.hidden=false;root.classList.remove('is-editing-mode');root.dataset.editorMode='design';modeButton.textContent='剪辑工作台';modeButton.setAttribute('aria-pressed','false');if(view){view.editorSeek=false;view.previewRasterScale=0;view.editorArtKey=null;home.append(view.art);view.art.style.removeProperty('width');view.art.style.removeProperty('height');view.art.style.removeProperty('aspect-ratio');view.art.style.removeProperty('transform');view.art.style.removeProperty('filter');view.art.classList.remove('studio-editor-transparent');root.classList.remove('is-transparent-output');for(const n of nodes.values())n.box.hidden=true;if(!project.designSync)studioEditorTextLayers(view,false);const previousView=view;requestAnimationFrame(()=>sizePreview(previousView));}view=null;transforms.update();applyDesignSync();}
 function clearDesignView(v){if(!v)return;studioEditorTextLayers(v,false);v.art.style.removeProperty('filter');v.art.classList.remove('studio-editor-transparent');v.editorArtKey=null;root.classList.remove('is-transparent-output');}
 function applyDesignSync(){if(!panel.hidden||rendering)return;
  if(!project.designSync){clearDesignView(view);for(const n of nodes.values()){n.box.hidden=true;n.media.pause?.();n.active=false;n.needsSeek=true;}view=null;return;}
  const target=views.find(v=>!v.section.hidden)||views.find(v=>v.key===state.activeDesign);if(!target)return;if(view!==target){clearDesignView(view);view=target;attachLayers();}time=state.time;paint(time,false);
 }
 function selectClip(id,reveal=true){selected=id;const c=project.clips.find(c=>c.id===id);if(c&&reveal&&!studioClipPose(c,time).visible)seekTo(Math.min(project.output.duration,c.start+Math.min(.1,studioClipDuration(c)/2)));renderProperties();renderTimeline();if(view)paint(time,!panel.hidden);}
 function removeSelected(){if(!project.clips.some(c=>c.id===selected))return;seekTo(time);checkpoint();project.clips=project.clips.filter(c=>c.id!==selected);selected=null;rebuild();changed();}
 document.addEventListener('keydown',event=>{if(panel.hidden||rendering||monitoring||jobId||transforms.dragging||event.target.closest?.('input,textarea,select,[contenteditable="true"],[role="textbox"]'))return;if(event.key==='Delete'&&selected){event.preventDefault();removeSelected();}else if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();undo(event.shiftKey);}});
 modeButton.onclick=()=>onlineOnly?onlineDialog.showModal():panel.hidden?enter():leave();q('[data-editor-design]').onclick=leave;
 async function importFiles(files){if(busy)return;busy=true;try{if(!ready)throw Error('视频引擎未就绪，请运行 setup-editor.cmd 后通过 start-editor.cmd 打开');for(const file of files){report('正在导入 '+file.name+' …');const result=await rpc('import',{file,name:file.name});let a=result;while(a.status==='preparing'){await new Promise(r=>setTimeout(r,750));a=await rpc('asset',{id:a.id});}if(a.status!=='ready')throw Error(a.error||'导入失败');checkpoint();project.assets.push(a);selectedAsset=a.id;renderAssets();changed();report(`已导入 ${a.name} · ${a.codec} ${a.alpha?'· 检测到 Alpha 透明通道':''}`);}}catch(e){report(e.message,true);}finally{busy=false;q('[data-editor-import]').value='';}}
 q('[data-editor-import]').onchange=e=>importFiles(e.target.files);const drop=q('.studio-drop-zone');drop.onclick=()=>q('[data-editor-import]').click();drop.onkeydown=e=>{if(e.key==='Enter')drop.click();};drop.ondragover=e=>{e.preventDefault();drop.classList.add('is-dragging');};drop.ondragleave=()=>drop.classList.remove('is-dragging');drop.ondrop=e=>{e.preventDefault();drop.classList.remove('is-dragging');importFiles(e.dataTransfer.files);};
 q('[data-play]').onclick=()=>{if(time>=project.output.duration)time=0;playing=!playing;if(playing&&!monitoring&&project.assets.some(a=>a.kind==='audio')){audioContext??=new AudioContext();audioContext.resume().catch(()=>{});}for(const n of nodes.values())n.needsSeek=true;lastWall=0;q('[data-play]').textContent=playing?'暂停':'播放';if(!playing)for(const n of nodes.values())n.media.pause?.();};seek.oninput=()=>seekTo(seek.value);
 q('[data-split]').onclick=()=>{const c=project.clips.find(c=>c.id===selected);if(!c)return;checkpoint();const right=studioSplitClip(c,time,crypto.randomUUID());if(right){project.clips.push(right);selected=right.id;rebuild();changed();}else report('将播放头移动到片段内部再分割。');};
 const undo=redo=>{const from=redo?future:history,to=redo?history:future;if(!from.length)return;const snapshot=from.pop();to.push(snapshot.template?serializeProject():serialize());if(snapshot.template)applyProject(snapshot);else{project=snapshot;selected=null;for(const n of nodes.values())disposeNode(n);nodes.clear();renderOutput();rebuild();resize();}save();};q('[data-undo]').onclick=()=>undo(false);q('[data-redo]').onclick=()=>undo(true);
 q('[data-transparent]').onchange=e=>{checkpoint();project.transparent=e.target.checked;changed();};
 function applyProject(p){
  const editing=!panel.hidden;restoringProject=true;clearTimeout(saveTimer);
  try{
   seekTo(time);if(editing)leave();clearDesignView(view);view=null;
   for(const n of nodes.values())disposeNode(n);nodes.clear();
   project=structuredClone(p);delete project.template;selected=null;selectedAsset=null;
   if(p.template){
    restore({privateContent:p.template.design});
    for(const key of Object.keys(images)){images[key]=p.template.images?.[key]||'';delete imageNames[key];if(images[key])imageNames[key]=p.template.imageNames?.[key]||'工程内图片';const input=document.getElementById('direction-'+key+'-file');if(input)input.value='';}
    state.playing=false;motionClock=createMotionClock(state.time,state.variants,state.edges);update();
   }
   time=Math.max(0,Math.min(project.output.duration,Number(p.template?.design?.time)||0));renderOutput();rebuild();if(editing)enter(false);
  }finally{restoringProject=false;}
 }
 async function downloadJSON(){if(busy||jobId)return;try{const snapshot=serializeProject();clearTimeout(saveTimer);await rpc('save',snapshot);await rpc('projectDownload',snapshot);report('工程已保存 · 包含视觉方案、文字、配色、边框、展示节奏和模板图片。视频与音频保存在本机素材目录。');}catch(e){report(e.message,true);}}
 q('[data-save-project]').onclick=downloadJSON;q('[data-load-project]').onchange=async e=>{if(busy||jobId)return;busy=true;try{const file=e.target.files[0];if(!file)return;const p=JSON.parse(await file.text());await rpc('validateProject',p);for(const a of p.assets){const local=await rpc('asset',{id:a.id});if(local.status!=='ready')throw Error('找不到素材：'+a.name);Object.assign(a,local);}history.push(serializeProject());if(history.length>60)history.shift();future=[];applyProject(p);save();report(p.template?'工程已恢复 · 视觉方案、文字、模板图片与剪辑内容已一并载入。':'旧版剪辑工程已恢复 · 此文件未保存展示模板，沿用当前视觉方案。');}catch(e){report(e.message,true);}finally{busy=false;e.target.value='';}};
 q('[data-editor-export]').onclick=async()=>{if(jobId||busy)return;try{if(!ready)throw Error('请使用本机视频引擎启动剪辑版');if(project.transparent&&!['vp9','prores'].includes(project.output.codec))throw Error('透明背景请选择 ProRes 4444 或 VP9 Alpha 编码器');seekTo(time);const result=await rpc('export',{project:serialize(),design:structuredClone(state),images:structuredClone(images)});jobId=result.id;q('.studio-editor-export-progress').hidden=false;let job;do{await new Promise(r=>setTimeout(r,800));job=await rpc('job',{id:jobId});q('.studio-editor-export-progress strong').textContent=job.phase==='preparing-media'?'正在准备全尺寸导出素材':job.phase==='preparing-workers'?'正在启动并行合成':job.phase==='encoding'?'正在完成视频编码':'正在逐帧合成与编码';q('progress').value=job.progress;q('[data-progress]').textContent=[Math.round(job.progress*100)+'%',job.encoding,job.pipeline==='sequential'?'连续解码':'',job.workers?job.workers+' 路合成':'',job.fps?'合成 '+job.fps.toFixed(1)+' 帧/秒':'',job.notice||''].filter(Boolean).join(' · ');}while(job.status==='rendering');if(job.status==='complete'){await rpc('download',{url:job.download});report('导出完成 · '+(job.encoding||'视频')+' · 视频已下载。'+(job.notice||''));}else report(job.status==='cancelled'?'导出已取消':job.error,true);}catch(e){report(e.message,true);}finally{jobId=null;q('.studio-editor-export-progress').hidden=true;}};
 q('[data-cancel]').onclick=()=>jobId&&rpc('cancel',{id:jobId}).catch(e=>report(e.message,true));

 q('[data-preview-large]').onclick=()=>{panel.classList.toggle('studio-preview-expanded');q('[data-preview-large]').textContent=panel.classList.contains('studio-preview-expanded')?'恢复布局':'放大预览';requestAnimationFrame(resize);};
 for(const [selector,cls]of [['[data-assets-toggle]','studio-hide-assets'],['[data-properties-toggle]','studio-hide-properties']])q(selector).onclick=()=>{panel.classList.toggle(cls);q(selector).setAttribute('aria-pressed',String(!panel.classList.contains(cls)));requestAnimationFrame(resize);};
 const resizer=q('.studio-timeline-resizer');resizer.onpointerdown=e=>{const y=e.clientY,height=q('.studio-edit-timeline').offsetHeight;resizer.setPointerCapture(e.pointerId);resizer.onpointermove=ev=>panel.style.setProperty('--timeline-height',Math.max(120,Math.min(innerHeight*.65,height+y-ev.clientY))+'px');resizer.onpointerup=()=>resizer.onpointermove=null;};resizer.onkeydown=e=>{if(!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();panel.style.setProperty('--timeline-height',Math.max(120,Math.min(innerHeight*.65,q('.studio-edit-timeline').offsetHeight+(e.key==='ArrowUp'?20:-20)))+'px');};
 q('[data-monitor]').onclick=async()=>{try{const result=await rpc('monitorOpen');if(result.notice)report(result.notice,true);monitorActive=true;monitorSignature='';publishMonitor(true);}catch(e){report(e.message,true);}};
 window.addEventListener('message',e=>{if(e.source!==parent)return;if(e.data?.type==='studio-monitor-active'){monitorActive=e.data.active;monitorSignature='';}if(e.data?.type==='studio-monitor-state')applyMonitor(e.data.payload).catch(e=>report('监视画面加载失败：'+e.message,true));});
 let monitorBusy=false,nextMonitor=null;
 async function applyMonitor(packet){nextMonitor={...packet,content:packet.content||nextMonitor?.content};if(monitorBusy)return;monitorBusy=true;try{while(nextMonitor){const p=nextMonitor;nextMonitor=null;if(p.content){clearDesignView(view);await globalThis.studioEditorAPI.loadRender(p.content);monitoring=true;rendering=false;state.ratio='landscape';sync();for(const n of nodes.values()){n.box.append(n.media);if(!n.asset.image&&n.media.requestVideoFrameCallback){const decoded=()=>{if(n.disposed)return;n.frameVersion++;n.frameRequest=n.media.requestVideoFrameCallback(decoded);};n.frameRequest=n.media.requestVideoFrameCallback(decoded);}}project.output.durationMode='custom';origin=p.origin||origin;view.previewRasterScale=.5;resize();}if(!view)continue;const seek=!p.playing||!playing||Math.abs(time-p.time)>.5;if(seek){time=p.time;for(const n of nodes.values())n.needsSeek=true;}if(playing!==p.playing||seek)lastWall=0;playing=p.playing;paint(time);parent.postMessage({type:'studio-monitor-render-ready'},'*');}}finally{monitorBusy=false;}}
 function publishMonitor(force=false){if(!monitorActive||monitoring||rendering)return;const now=performance.now();if(!force&&now-monitorStamp<120)return;monitorStamp=now;let content;if(force||now-monitorContentStamp>300){monitorContentStamp=now;const design={...state,time:0,playing:false},signature=JSON.stringify([project,design,images]);if(signature!==monitorSignature){content={project:serialize(),design:structuredClone(design),images:structuredClone(images)};monitorSignature=signature;for(const a of content.project.assets){a.proxy=assetURL(a);a.preview=a.proxy;}}}parent.postMessage({type:'studio-editor-monitor-update',payload:{content,time:panel.hidden?state.time:time,playing:panel.hidden?state.playing:playing,origin}},'*');}

 new ResizeObserver(()=>{if(!panel.hidden&&!rendering)resize();}).observe(stage);
 const tick=now=>{if(!root.isConnected)return;if(!monitoring&&!rendering)syncDuration();publishMonitor();if(!rendering&&panel.hidden&&project.designSync){if(lastDesignPlaying!==state.playing){for(const n of nodes.values())n.needsSeek=true;lastDesignPlaying=state.playing;}applyDesignSync();}if(!rendering&&!panel.hidden&&playing){if(lastWall){const master=project.clips.map(c=>({c,n:nodes.get(c.id)})).find(({c,n})=>n&&!n.asset.image&&n.active&&!n.media.paused&&!n.media.seeking&&n.media.readyState>=2&&n.media.currentTime>=c.in&&n.media.currentTime<c.out);time=Math.min(project.output.duration,master?master.c.start+master.n.media.currentTime-master.c.in:time+(now-lastWall)/1000);}if(time>=project.output.duration)seekTo(time);paint(time);}lastWall=now;requestAnimationFrame(tick);};requestAnimationFrame(tick);
 globalThis.studioEditorAPI={
  renderLayerWindows(){return {};},
  previewStats(){return [...nodes.values()].map(n=>({id:n.asset.id,path:n.box.dataset.previewPath,width:n.media.videoWidth||n.media.naturalWidth,height:n.media.videoHeight||n.media.naturalHeight,seeks:n.stats.seeks,uploads:n.stats.uploads,quality:n.media.getVideoPlaybackQuality?{total:n.media.getVideoPlaybackQuality().totalVideoFrames,dropped:n.media.getVideoPlaybackQuality().droppedVideoFrames}:null,time:n.media.currentTime,paused:n.media.paused}));},
  async loadRender(payload){clearTimeout(saveTimer);for(const n of nodes.values())disposeNode(n);nodes.clear();rendering=true;monitoring=false;project=payload.project;restore({privateContent:payload.design});Object.assign(images,payload.images);state.playing=false;sync();enter();view.art.classList.add('studio-editor-render-art');root.classList.add('studio-editor-render');document.documentElement.style.setProperty('background','transparent','important');document.body.style.setProperty('background','transparent','important');await document.fonts.ready;rebuild();resize();for(const n of nodes.values())await new Promise((resolve,reject)=>{if(n.asset.kind==='audio'||n.asset.renderFrames)return resolve();if(n.asset.image?n.media.complete:n.media.readyState>=2)return resolve();const timeout=setTimeout(()=>reject(Error('素材加载超时：'+n.asset.name)),60000);n.media.addEventListener(n.asset.image?'load':'loadeddata',()=>{clearTimeout(timeout);resolve();},{once:true});n.media.addEventListener('error',()=>reject(Error('素材加载失败')),{once:true});});await Promise.all([...view.art.querySelectorAll('img')].map(img=>img.complete?Promise.resolve():img.decode().catch(()=>{})));},
  async seekRender(t,decodedFrames=[]){time=t;state.time=t;motionClock=createMotionClock(t,state.variants,state.edges);state.playing=false;await Promise.all(decodedFrames.map(async f=>{const n=nodes.get(f.id);if(!n?.asset.renderFrames)throw Error('导出帧不匹配');if(n.renderFrame===f.index)return;n.media.src=f.url||('data:image/png;base64,'+f.png);await n.media.decode();n.renderFrame=f.index;n.drawKey='';}));for(const c of project.clips){const n=nodes.get(c.id),p=studioClipPose(c,t);if(!n||n.asset.kind==='audio'||n.asset.image||n.asset.renderFrames||!p.visible)continue;await new Promise((resolve,reject)=>{const m=n.media;if(Math.abs(m.currentTime-p.source)<.0001&&m.readyState>=2)return resolve();const timeout=setTimeout(()=>reject(Error('视频定位超时')),30000);m.addEventListener('seeked',()=>{clearTimeout(timeout);resolve();},{once:true});m.currentTime=p.source;});}paint(t);/* Commit canvas updates before CDP captures the compositor surface. */await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));},
 };
 async function refreshAssetPreview(a){
  try{let updated=await rpc('preview',{id:a.id});while(updated.previewStatus==='preparing'){await new Promise(r=>setTimeout(r,700));updated=await rpc('asset',{id:a.id});}if(updated.previewStatus==='error')throw Error(updated.previewError);if(rendering)return;const previous=assetURL(a);Object.assign(a,updated);if(previous!==assetURL(a)){for(const [id,n]of nodes)if(n.asset.id===a.id){disposeNode(n);nodes.delete(id);}attachLayers();paint(time);}renderAssets();save();}catch(e){report('预览优化失败，保留现有素材：'+e.message,true);}
 }
 renderOutput();renderAssets();renderProperties();renderTimeline();
 setTimeout(async()=>{if(rendering)return;try{const c=await rpc('capabilities');if(rendering||c.renderOnly)return;if(c.localOnly){onlineOnly=true;modeButton.title='视频素材、音轨及编码使用本机剪辑版';if(c.openEditor)onlineDialog.showModal();return;}origin=c.origin;hardware=c.hardware||{};const saved=await rpc('load');if(rendering)return;if(saved?.version===1){applyProject(saved);if(view&&!panel.hidden)resize();}else renderOutput();ready=c.ready;if(c.ready&&!saved?.template)save();if(!rendering)for(const a of project.assets)refreshAssetPreview(a);if(c.openEditor&&panel.hidden)enter(false);report(c.ready?'本机视频引擎已连接 · '+(c.exportPipeline==='sequential'?'原尺寸连续解码导出 · ':'')+'Alpha 素材由 FFmpeg 保留 · 自动保存已开启'+(c.maxExportWorkers>=24?'':' · 后端仍是旧版，请重启 start-editor.cmd 启用 24 路并行导出'):c.error,!c.ready);}catch(e){report('剪辑需要本机视频引擎：请运行 start-editor.cmd。'+e.message,true);}},0);
 return {enter,leave};
}

// Editor chrome only. Existing inputs and listeners are retained, never cloned.
function mountStudioWorkspace(root,views){
  root.classList.add('studio-editor');root.dataset.panel='preview';
  let visualResetSnapshot=null;
  const make=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text)el.textContent=text;return el};
  const button=(text,aria)=>{const el=make('button','btn',text);el.type='button';if(aria)el.setAttribute('aria-label',aria);return el};
  const note=text=>make('p','studio-note',text);
  const group=(title,open=false)=>{const el=make('details','studio-group');el.open=open;el.append(make('summary','cursor-interaction',title));return el};
  const fields=items=>{const box=make('div','direction-settings');for(const el of items)if(el)box.append(el);return box};
  const field=id=>root.querySelector('#'+id)?.closest('.direction-field');
  const global=root.querySelector('.direction-global');
  const oldHeading=root.querySelector('.direction-heading'),oldCanvasOptions=oldHeading.nextElementSibling;
  const phase=oldHeading.querySelector('[data-phase]');
  const sourceGroups=[...global.querySelectorAll(':scope > details')];
  const findGroup=text=>sourceGroups.find(el=>el.querySelector('summary').textContent===text);
  const originalViews=root.querySelector('.viz-carousel');originalViews.className='studio-views';

  const header=make('header','studio-header');
  const brand=make('div','studio-brand');
  brand.innerHTML='<span class="studio-emblem" aria-hidden="true">✳</span><div><span class="studio-kicker">SHOWCASE STUDIO</span><h1>角色展示工作台</h1></div>';
  const headerActions=make('div','studio-header-actions');
  const localLabel=make('span','studio-local-label','本地编辑 · 即时预览');
  const modeButton=button('剪辑工作台');modeButton.classList.add('studio-mode-button');modeButton.dataset.editorMode='editing';modeButton.setAttribute('aria-pressed','false');
  const focusButton=button('专注预览');focusButton.classList.add('studio-focus-button');focusButton.dataset.focusPreview='';focusButton.setAttribute('aria-pressed','false');
  const help=make('details','studio-help');
  help.innerHTML='<summary>使用说明</summary><div class="studio-help-body"><strong>从作品内容到展示画面</strong><ol><li>在左侧选择系列，填写名字与系列资料。</li><li>上传角色图，再选择中间的视觉方案。</li><li>在右侧调整配色、圆环和动效，立即预览。</li></ol><p>系列名称、编号和短句分别保存。配色等视觉设置按方案保存，几何样式按方案与系列保存。</p><p>参数记在当前浏览器。上传的图片仅在本次打开时有效，刷新前请保留原始素材。</p></div>';
  headerActions.append(localLabel,help,modeButton,focusButton);header.append(brand,headerActions);
  const tabs=make('nav','studio-mobile-tabs');tabs.setAttribute('aria-label','工作台区域');
  for(const [key,label]of [['content','作品内容'],['preview','画面预览'],['style','画面样式']]){const tab=button(label);tab.dataset.panelTab=key;tab.setAttribute('aria-pressed',String(key==='preview'));tab.addEventListener('click',()=>setPanel(key));tabs.append(tab)}

  const layout=make('div','studio-layout');
  const left=make('aside','studio-content');left.id='studio-content-panel';left.setAttribute('aria-label','作品内容与系列');
  const leftTitle=make('div','studio-panel-title');leftTitle.append(make('h2','','作品内容'),make('span','studio-scope-label','所有方案共用'));left.append(leftTitle,note('先准备作品资料，再调整画面。'));
  const series=group('系列管理',true);series.dataset.studioGroup='series';
  const seriesSelect=root.querySelector('#direction-series');seriesSelect.hidden=true;seriesSelect.setAttribute('aria-hidden','true');
  const seriesTabs=make('div','studio-series-tabs');seriesTabs.setAttribute('role','group');seriesTabs.setAttribute('aria-label','选择作品系列');
  const seriesDescriptions={atelier:'时装精作',fur:'毛绒触感',mini:'Q版简约'};
  for(const key of Object.keys(seriesDescriptions)){const el=button('');el.dataset.seriesChoice=key;el.innerHTML='<strong></strong><small></small>';el.querySelector('small').textContent=seriesDescriptions[key];el.addEventListener('click',()=>{state.series=key;update()});seriesTabs.append(el)}
  const seriesSummary=make('div','studio-series-summary');
  const seriesEdit=group('系列名称、编号与短句');seriesEdit.classList.add('studio-subgroup');seriesEdit.append(fields(['direction-series-name','direction-prefix','direction-serial','direction-caption','direction-subtitle'].map(field)));
  series.append(seriesSelect,seriesTabs,seriesSummary,note('名称、编号和短句随系列分别保存。'),seriesEdit);left.append(series);

  const identity=group('角色与品牌',true);
  identity.append(fields([field('direction-name'),field('direction-brand')]));
  const credits=group('署名与品牌 Logo');credits.classList.add('studio-subgroup');credits.append(fields([field('direction-model-credit'),field('direction-design-credit'),field('direction-logo-file')]),root.querySelector('[data-clear="logo"]'));
  identity.append(credits);left.append(identity);
  const uploads=group('角色图片',true);const uploadNames={};
  for(const [key,label]of [['model','主角色图片'],['portrait','补充 / 特写图片']]){const card=make('div','studio-upload-card'),entry=field('direction-'+key+'-file');entry.querySelector('label').firstChild.textContent=label;const status=make('span','studio-upload-name','尚未选择图片');status.dataset.uploadStatus=key;uploadNames[key]=status;card.append(entry,status,root.querySelector('[data-clear="'+key+'"]'));uploads.append(card)}
  uploads.append(note('PNG / WebP / JPG，单张不超过 12 MB。图片仅在本次打开时保留。'));left.append(uploads);
  const storyUploads=group('片头镜头素材');storyUploads.classList.add('studio-subgroup');
  for(const [key,label]of [['introCharacter','第一幕 · 角色镜头'],['introAuthor','第二幕 · 作者镜头']]){
    const card=make('div','studio-upload-card'),entry=make('div','direction-field'),labelNode=make('label','',label),input=make('input','form-control'),status=make('span','studio-upload-name','尚未选择图片'),clear=button('清除图片');
    input.type='file';input.accept='image/png,image/jpeg,image/webp';input.id='direction-'+key+'-file';labelNode.htmlFor=input.id;clear.dataset.clear=key;status.dataset.uploadStatus=key;uploadNames[key]=status;entry.append(labelNode,input);card.append(entry,status,clear);storyUploads.append(card);
  }
  storyUploads.append(note('两个镜头可独立选图。不选时，第一幕使用主角色图，第二幕优先使用特写图。模型动作可在 AE / OBS 叠加，或替换导出后的镜头素材。'));uploads.append(storyUploads);
  const formats=findGroup('交付格式与适配标识');formats.classList.add('studio-group');formats.dataset.studioGroup='formats';formats.querySelector('summary').textContent='交付格式与适配标识';formats.insertBefore(note('勾选需要出现在画面里的格式与标识。'),formats.children[1]);left.append(formats);
  const codes=group('作品链接与条码');codes.append(fields(['direction-qr','direction-qr-file','direction-barcode-file'].map(field)),root.querySelector('[data-clear="qr"]'),root.querySelector('[data-clear="barcode"]'));left.append(codes);
  left.append(global.querySelector('[data-error]'));

  const toolbar=make('div','studio-canvas-toolbar');toolbar.setAttribute('aria-label','预览与画布设置');
  const designRow=make('div','studio-design-row'),designField=make('label','studio-design-field');designField.append(make('span','','视觉方案'));
  const designSelect=make('select','form-select');designSelect.id='studio-design';designSelect.setAttribute('aria-label','视觉方案');
  const originalDesigns=make('optgroup'),urbanDesigns=make('optgroup');originalDesigns.label='原有方案';urbanDesigns.label='街头二游 · 新增';for(const view of views){const option=make('option','',view.section.dataset.variant);option.value=view.key;(['district','tuner','arcade'].includes(view.key)?urbanDesigns:originalDesigns).append(option)}designSelect.append(urbanDesigns,originalDesigns);designField.append(designSelect);
  const previous=button('‹','上一个视觉方案'),next=button('›','下一个视觉方案');previous.classList.add('studio-design-step');next.classList.add('studio-design-step');designRow.append(designField,previous,next);
  const canvasOptions=make('div','studio-canvas-options');for(const el of [...oldCanvasOptions.children])canvasOptions.append(el);
  const borderButton=button('边框外观');borderButton.title='设置边框颜色、底板与描边样式';borderButton.addEventListener('click',()=>{if(state.frame==='none'){state.frame='horizontal';update();}const active=views.find(v=>v.key===state.activeDesign);if(!active)return;active.edgePanel.open=true;setPanel('style');active.edgePanel.scrollIntoView({block:'nearest',behavior:'smooth'});});canvasOptions.append(borderButton);
  const typeToggle=root.querySelector('#direction-type').closest('label');typeToggle.querySelector('.form-check-label').textContent='显示文字信息';canvasOptions.append(typeToggle);
  const previewMeta=make('div','studio-preview-meta');previewMeta.append(make('span','','实时预览'),phase,make('span','studio-loop-note','片头 4.5s · 展示循环 12s'));
  toolbar.append(designRow,canvasOptions,previewMeta);
  const sharedPlayback=make('div','studio-playback-settings');const speedField=field('direction-speed');speedField.classList.add('studio-speed');speedField.querySelector('label').firstChild.textContent='播放速度';sharedPlayback.append(speedField);
  const scopeNote=note('视觉设置随方案保存；几何样式可按系列分别选择。');

  // Split the old combined controls into task-based sections, moving real nodes.
  function reorganizeInspector(view){
    const section=view.section;
    const preview=make('div','studio-preview');const stage=section.querySelector('.stage-viewport'),transport=section.querySelector('.direction-transport'),seek=section.querySelector('.seek-row');
    const playback=make('div','studio-playback');playback.append(transport,seek);preview.append(stage,playback);section.append(preview);
    const inspector=make('aside','studio-inspector');inspector.setAttribute('aria-label','当前方案画面样式');
    const title=make('div','studio-panel-title');title.append(make('h2','','画面样式'),make('span','studio-scope-label','仅当前方案'));
    inspector.append(title,make('div','studio-active-design',section.dataset.variant),scopeNote.cloneNode(true));if(section.dataset.description)inspector.append(note(section.dataset.description));
    const resets=make('div','studio-visual-reset'),reset=button('所有视觉方案恢复默认'),undo=button('撤销恢复默认');reset.dataset.resetVisuals='';undo.dataset.undoVisuals='';undo.hidden=true;
    reset.addEventListener('click',()=>{visualResetSnapshot=JSON.parse(JSON.stringify(state.variants));studioRestoreVariants(state.variants,variantBaseline);update();});
    undo.addEventListener('click',()=>{if(!visualResetSnapshot)return;studioRestoreVariants(state.variants,visualResetSnapshot);visualResetSnapshot=null;update();});
    resets.append(reset,undo,note('恢复十三套方案各自的画面参数，保留当前文字与素材。'));inspector.append(resets);
    const original=[...section.querySelectorAll(':scope > details')];
    const old=text=>original.find(el=>el.querySelector('summary').textContent===text);
    const take=selector=>section.querySelector(selector)?.closest('.direction-field');
    const takeCheck=selector=>section.querySelector(selector)?.closest('label.form-check');
    const styleGroup=(name,items,checks=[],open=false)=>{const box=group(name,open);box.append(fields(items));if(checks.length){const row=make('div','direction-checks');for(const el of checks)if(el)row.append(el);box.append(row)}inspector.append(box);return box};
    const dual=section.querySelector('[data-dual-controls]');if(dual){dual.classList.add('studio-group');dual.open=true;inspector.append(dual)}
    styleGroup('配色与字体',['palette','background','accent','typeface'].map(key=>take('[data-vfield="'+key+'"],[data-vcolor="'+key+'"]')),[],true);
    const geometry=styleGroup('圆环与几何',['ringStyle','ringScale','ringSpeed'].map(key=>take('[data-vfield="'+key+'"],[data-vrange="'+key+'"]')),[],true);
    const geometryAdvanced=group('线条与装饰细节');geometryAdvanced.classList.add('studio-subgroup');geometryAdvanced.append(fields(['geometryStrength','cutStrength'].map(key=>take('[data-vrange="'+key+'"]'))));
    const opacity=make('div','direction-field');opacity.innerHTML='<label class="range-title">几何装饰不透明度<output data-value="geometryOpacity">100%</output></label><input class="form-range" type="range" min="30" max="100" step="5" data-vrange="geometryOpacity" data-factor="100" aria-label="几何装饰不透明度">';geometryAdvanced.querySelector('.direction-settings').append(opacity);geometry.append(geometryAdvanced);
    const background=styleGroup('动态背景',['pattern','gridOpacity','gridMotion'].map(key=>take('[data-vfield="'+key+'"],[data-vrange="'+key+'"]')),['grid','gridMoving','parallax'].map(key=>takeCheck('[data-vbool="'+key+'"]')));background.dataset.studioGroup='background';
    const motion=old('文字与信息动效');motion.classList.add('studio-group');motion.querySelector('summary').textContent='文字与信息动效';inspector.append(motion);
    const badge=old('标识颜色与样式');badge.classList.add('studio-group');badge.querySelector('summary').textContent='标识外观';badge.insertBefore(note('添加或移除标识，请在左侧「交付格式与适配标识」勾选。'),badge.children[1]);inspector.append(badge);
    const shadows=old('阴影与空间层次');shadows.classList.add('studio-group');const shadowSwitch=takeCheck('[data-effect="shadowEnabled"]');shadows.insertBefore(shadowSwitch,shadows.children[1]);inspector.append(shadows);
    const effects=old('滤镜、影调与渐变');effects.classList.add('studio-group');effects.querySelector('summary').textContent='滤镜与画面质感';inspector.append(effects);
    const model=old('角色素材与动效调节');model.classList.add('studio-group');model.querySelector('summary').textContent='角色图片大小';inspector.append(model);
    const edge=group('边框外观、文字与滚动 · 全局');edge.dataset.studioGroup='edges';
    // Borders are shared settings; the single source panel follows the active inspector.
    inspector.append(edge);edge.append(note('边框外观、文字与滚动由所有方案共用，片头至片尾持续显示。AE 导出后，每侧边框的底板与文字可分别编辑。'));
    for(const el of original)if(el.parentElement===section)el.remove();
    section.append(preview,inspector);view.preview=preview;view.inspector=inspector;view.playback=playback;view.edgePanel=edge;
  }
  for(const view of views)reorganizeInspector(view);
  const edgeControls=make('div','studio-shared-edges');const edgeSource=findGroup('边框滚动');edgeControls.append(fields([field('direction-top-text'),field('direction-bottom-text')]));for(const el of [...edgeSource.children].slice(1))edgeControls.append(el);
  const borderAppearance=group('自定义边框颜色与样式',true);borderAppearance.classList.add('studio-subgroup');
  const borderFields=fields([]);
  const borderField=(key,label,type,options)=>{
    const wrap=make('div','direction-field'),title=make('label','',label),input=make(options?'select':'input',options?'form-select':'form-control');input.id='studio-border-'+key;input.setAttribute('aria-label',label);title.htmlFor=input.id;
    if(options){for(const [value,text]of options){const option=make('option','',text);option.value=value;input.append(option)}}else input.type=type;
    if(type==='range'){input.className='form-range';input.min=key==='opacity'?0:.04;input.max=key==='opacity'?100:.4;input.step=key==='opacity'?1:.01;const output=make('output');output.dataset.borderValue=key;title.className='range-title';title.append(output);}
    input.addEventListener(options?'change':'input',()=>{const b=state.borderAppearance;b[key]=options||type==='color'?input.value:Number(input.value)/(key==='opacity'?100:1);update();});wrap.append(title,input);borderFields.append(wrap);
  };
  borderField('mode','边框配色','',[['theme','默认 · 强调色跟随方案'],['custom','自定义颜色与样式']]);
  borderField('style','边框外观','',[['solid','纯色底板'],['outline','细线描边'],['double','双线描边']]);
  for(const [key,label]of [['background','边框底色'],['text','边框文字色'],['accent','边框强调色']])borderField(key,label,'color');
  borderField('opacity','边框底板不透明度','range');borderField('lineWidth','边框线宽','range');
  const resetBorder=button('恢复默认边框');resetBorder.addEventListener('click',()=>{state.borderAppearance=studioBorderSettings();update();});
  borderAppearance.append(borderFields,resetBorder,note('底板透明度单独调整，文字保持清晰。描边使用强调色；所有方案和画幅共用。'));edgeControls.prepend(borderAppearance);
  layout.append(left,toolbar,originalViews);oldHeading.remove();oldCanvasOptions.remove();global.remove();root.append(header,tabs,layout);

  if(!globalThis.studioOutput?.enabled)mountStudioVideoEditor(root,views,{modeButton,layout,tabs,sizePreview});

  const rename={
    'direction-series-name':'系列显示名称','direction-prefix':'编号前缀','direction-serial':'作品编号',
    'direction-caption':'系列中文短句','direction-subtitle':'系列英文短句','direction-name':'角色名字',
    'direction-brand':'品牌字标','direction-frame':'信息边框','direction-ratio':'画幅',
    'direction-qr':'作品链接 · 自动生成二维码'
  };
  for(const[id,label]of Object.entries(rename)){const el=root.querySelector('label[for="'+id+'"]');if(el)el.firstChild.textContent=label}
  const labelByField={ringStyle:'几何样式',cutStrength:'装饰丰富度',geometryStrength:'线条粗细',shadowDepth:'阴影偏移'};
  for(const view of views)for(const [key,text]of Object.entries(labelByField)){const input=view.section.querySelector('[data-vfield="'+key+'"],[data-vrange="'+key+'"],[data-erange="'+key+'"]');const label=input?.closest('label')||input?.closest('.direction-field')?.querySelector('label');if(label?.firstChild?.nodeType===3)label.firstChild.textContent=text;}

  function setPanel(panel){root.dataset.panel=panel;for(const el of tabs.querySelectorAll('button'))el.setAttribute('aria-pressed',String(el.dataset.panelTab===panel));requestAnimationFrame(()=>{const view=views.find(v=>!v.section.hidden);if(view)sizePreview(view)})}
  function setDesign(key){state.activeDesign=key;update()}
  function stepDesign(delta){const index=views.findIndex(v=>v.key===state.activeDesign);setDesign(views[(index+delta+views.length)%views.length].key)}
  designSelect.addEventListener('change',()=>setDesign(designSelect.value));previous.addEventListener('click',()=>stepDesign(-1));next.addEventListener('click',()=>stepDesign(1));
  focusButton.addEventListener('click',()=>{const focused=root.classList.toggle('is-focused');focusButton.setAttribute('aria-pressed',String(focused));focusButton.textContent=focused?'退出专注':'专注预览';setPanel('preview')});
  root.addEventListener('keydown',event=>{if(event.key==='Escape'&&root.classList.contains('is-focused'))focusButton.click()});
  function sizePreview(view){
    const stage=view.preview.querySelector('.stage-viewport');if(!stage.clientWidth||!stage.clientHeight)return;
    const style=getComputedStyle(stage),width=stage.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),height=stage.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);if(width<=0||height<=0)return;
    if(root.classList.contains('is-clean-output')){
      const layout=studioOutputLayout(width,height,state.ratio==='portrait',state.output.fit==='cover');
      view.outputScale=layout.scale;view.art.style.setProperty('--preview-width',layout.width+'px');
      view.art.style.transform='scale('+layout.scale+')';view.art.style.transformOrigin='center';
    }else{
      view.outputScale=0;view.art.style.removeProperty('transform');view.art.style.removeProperty('transform-origin');
      const ratio=state.ratio==='portrait'?9/16:16/9;view.art.style.setProperty('--preview-width',Math.max(1,Math.min(width,height*ratio))+'px');
    }
    measure(view);draw(view);
  }
  for(const view of views)new ResizeObserver(()=>sizePreview(view)).observe(view.preview.querySelector('.stage-viewport'));
  const ui={sync(){
    const selected=views.find(v=>v.key===state.activeDesign)||views[0];state.activeDesign=selected.key;designSelect.value=selected.key;
    const visualsAreDefault=JSON.stringify(state.variants)===JSON.stringify(variantBaseline);for(const el of root.querySelectorAll('[data-reset-visuals]'))el.disabled=visualsAreDefault;for(const el of root.querySelectorAll('[data-undo-visuals]'))el.hidden=!visualResetSnapshot;
    for(const view of views)view.section.hidden=view!==selected;
    if(sharedPlayback.parentElement!==selected.playback)selected.playback.append(sharedPlayback);
    if(edgeControls.parentElement!==selected.edgePanel)selected.edgePanel.append(edgeControls);
    for(const view of views){view.edgePanel.hidden=state.frame==='none';const variant=state.variants[view.key];
      const disable=(selector,value)=>view.section.querySelectorAll(selector).forEach(el=>el.disabled=value);
      disable('[data-vrange="gridOpacity"]',!variant.grid||variant.pattern==='none');disable('[data-vrange="gridMotion"]',!variant.grid||variant.pattern==='none'||!variant.gridMoving);
      disable('[data-vfield="textMotionStyle"],[data-vrange="textMotionAmount"],[data-vrange="textMotionSpeed"]',!variant.textMotion);
      disable('[data-efield="shadowStyle"],[data-ecolor="shadowColor"],[data-erange="shadowStrength"],[data-erange="shadowDepth"],[data-shadow]',!variant.effects.shadowEnabled);
      disable('[data-efield="grade"],[data-erange="gradeStrength"],[data-effect="gradeModel"]',!variant.effects.gradeEnabled);
      disable('[data-erange="gradientStrength"],[data-ecolor="gradientColor"],[data-effect="gradientMotion"]',variant.effects.gradient==='none');
    }
    for(const el of seriesTabs.children){const key=el.dataset.seriesChoice;el.setAttribute('aria-pressed',String(key===state.series));el.querySelector('strong').textContent=state.seriesData[key].label||seriesDefaults[key].label;el.setAttribute('aria-label',(state.seriesData[key].label||seriesDefaults[key].label)+' · '+seriesDescriptions[key])}
    seriesSummary.textContent='当前系列  '+(currentSeries().label||'EDITION')+' / '+(currentSeries().prefix||'ID')+'-'+(currentSeries().serial||'001');
    for(const[key,el]of Object.entries(uploadNames)){el.textContent=images[key]?(imageNames[key]||'已载入图片'):'尚未选择图片';el.classList.toggle('has-file',!!images[key]);root.querySelector('[data-clear="'+key+'"]').disabled=!images[key]}
    const frameDirection=state.frame==='vertical';root.querySelector('label[for="direction-top-text"]').textContent=frameDirection?'左边框文字':'上边框文字';root.querySelector('label[for="direction-bottom-text"]').textContent=frameDirection?'右边框文字':'下边框文字';
    requestAnimationFrame(()=>sizePreview(selected));
  }};
  ui.sync();return ui;
}
function syncStudioBorderControls(){
 const b=state.borderAppearance,custom=b.mode==='custom';
 for(const key of ['mode','style','background','text','accent','opacity','lineWidth']){
  const input=document.getElementById('studio-border-'+key);if(!input)continue;
  input.value=key==='opacity'?Math.round(b.opacity*100):b[key];input.disabled=key!=='mode'&&(!custom||(key==='lineWidth'&&b.style==='solid'));
 }
 for(const key of ['opacity','lineWidth']){const output=root.querySelector('[data-border-value="'+key+'"]');if(output)output.value=key==='opacity'?Math.round(b.opacity*100)+'%':b.lineWidth.toFixed(2)+'% 画宽';}
}

const workspace=mountStudioWorkspace(root,views);
// Shared text overrides. Empty values retain the visual language of each design.
function studioTypographySettings(value={}){
  const source=value&&typeof value==='object'?value:{};
  const pick=(v,list,fallback)=>list.includes(v)?v:fallback;
  const bounded=(v,a,b,fallback)=>Number.isFinite(v)?Math.max(a,Math.min(b,v)):fallback;
  const clean=(v,max=64)=>typeof v==='string'?v.replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,max):'';
  const result={};
  for(const key of ['name','character','author','caption','subtitle']){
    const item=source[key]&&typeof source[key]==='object'?source[key]:{};
    result[key]={text:clean(item.text),font:pick(item.font,['auto','manrope','grotesk','condensed','serif','rounded','system'],'auto'),scale:bounded(item.scale,.6,1.5,1),tracking:Number.isFinite(item.tracking)?bounded(item.tracking,-.12,.25,0):null,weight:pick(item.weight,['auto','400','500','600','700','800','900'],'auto'),italic:pick(item.italic,['auto','normal','italic'],'auto'),colorMode:pick(item.colorMode,['auto','custom'],'auto'),color:/^#[0-9a-f]{6}$/i.test(item.color)?item.color:'#f3f0e5',case:pick(item.case,['original','uppercase','lowercase'],'original')};
  }
  result.copy={};for(const role of ['character','author']){const item=source.copy?.[role]||{};result.copy[role]={kicker:clean(item.kicker,80),label:clean(item.label,80),meta:clean(item.meta,120)};}
  return result;
}
function studioTypographyValue(settings,key,fallback){
  const item=settings?.[key]||{},text=(item.text||'').trim()||fallback||'';
  return item.case==='uppercase'?text.toUpperCase():item.case==='lowercase'?text.toLowerCase():text;
}
function studioTypographyCopy(settings,role,key,fallback){return (settings?.copy?.[role]?.[key]||'').trim()||fallback||'';}
function studioTypographyLayoutChanged(settings){return ['name','caption','subtitle'].some(key=>{const item=settings?.[key];return item&&(item.scale!==1||item.font!=='auto'||item.weight!=='auto'||item.italic!=='auto'||item.tracking!==null||item.text||item.case!=='original');});}
function studioTypographyStyle(el,key){
  if(!el)return;const item=state.typography[key],fonts={manrope:'"Manrope","Microsoft YaHei UI",sans-serif',grotesk:'"Space Grotesk","Microsoft YaHei UI",sans-serif',condensed:'"Barlow Condensed","Microsoft YaHei UI",sans-serif',serif:'"Cormorant Garamond","Noto Serif SC","Songti SC",SimSun,serif',rounded:'"Nunito","ChillRoundF","Microsoft YaHei UI",sans-serif',system:'"Microsoft YaHei UI","PingFang SC",sans-serif'};
  for(const[property,value]of Object.entries({'font-family':fonts[item.font]||'','font-weight':item.weight==='auto'?'':item.weight,'font-style':item.italic==='auto'?'':item.italic,'letter-spacing':item.tracking===null?'':item.tracking+'em',color:item.colorMode==='custom'?item.color:''}))value?el.style.setProperty(property,value):el.style.removeProperty(property);
  // Case is written into textContent, so editable AE text matches the preview.
  el.style.removeProperty('text-transform');
}
function studioTypographyFontSize(el,key){
  el.style.removeProperty('font-size');const item=state.typography[key],base=parseFloat(getComputedStyle(el).fontSize),size=base*item.scale;
  if(item.scale!==1)el.style.fontSize=size+'px';return size;
}
function applyStudioTypography(view){for(const[key,el]of [['name',view.name],['caption',view.art.querySelector('.copy-caption')],['subtitle',view.art.querySelector('.copy-subtitle')]])studioTypographyStyle(el,key);}
function applyStudioStoryTypography(view,part,role){
  const {el}=part,key=JSON.stringify([state.typography[role],state.typography.copy[role],state.variants?.[view.key]?.typeface,view.w,view.h,el.dataset.corner,el.querySelector('.story-title').textContent]);if(part.textLayoutKey===key)return;part.textLayoutKey=key;
  const title=el.querySelector('.story-title'),primary=el.querySelector('.story-primary'),secondary=el.querySelector('.story-secondary');studioTypographyStyle(title,role);studioTypographyFontSize(title,role);secondary.style.removeProperty('top');
  // Long centered names still leave room for the smaller credit block.
  if(el.dataset.corner==='center'&&el.clientHeight){const limit=el.clientHeight*.42;if(primary.offsetHeight>limit){const current=parseFloat(getComputedStyle(title).fontSize);title.style.fontSize=Math.max(11,current*limit/primary.offsetHeight)+'px';}secondary.style.top=(el.clientHeight*.5+primary.offsetHeight*.5+Math.max(6,el.clientWidth*.025))+'px';}
}
function mountStudioTypography(root,views){
  const group=document.createElement('details');group.className='studio-group studio-typography';group.open=false;
  const fontOptions=[['auto','跟随视觉方案'],['manrope','现代无衬线 · Manrope'],['grotesk','几何字体 · Space Grotesk'],['condensed','紧凑海报 · Barlow Condensed'],['serif','时尚衬线 · Cormorant'],['rounded','圆润可爱 · 寒蝉全圆体 / Nunito'],['system','清晰中文 · 系统字体']].map(([v,t])=>`<option value="${v}">${t}</option>`).join('');
  group.innerHTML=`<summary>文字排版</summary><p class="studio-note">各方案共用。文案留空时沿用角色、品牌与系列资料；选择「跟随方案」保留原有设计。</p>
    <div class="direction-field studio-text-target"><label for="studio-text-target">正在编辑</label><select id="studio-text-target" class="form-select"><option value="name">展示页 · 角色名</option><option value="character">第一幕 · 角色标题</option><option value="author">第二幕 · 作者标题</option><option value="caption">展示页 · 系列短句</option><option value="subtitle">展示页 · 英文说明</option></select></div>
    <div class="direction-settings"><div class="direction-field"><label for="studio-text-content">自定义文案</label><input id="studio-text-content" class="form-control" type="text" maxlength="64" data-text-field="text"><small data-text-fallback></small></div>
    <div class="direction-field"><label for="studio-text-font">字体</label><select id="studio-text-font" class="form-select" data-text-field="font">${fontOptions}</select></div>
    <div class="direction-field"><label for="studio-text-scale" class="range-title">字号比例<output data-text-value="scale"></output></label><input id="studio-text-scale" class="form-range" type="range" min="60" max="150" step="5" data-text-field="scale"><small>文字过长时自动缩小，避免超出文字区域。</small></div>
    <div class="studio-text-row"><div class="direction-field"><label for="studio-text-weight">字重</label><select id="studio-text-weight" class="form-select" data-text-field="weight"><option value="auto">跟随方案</option><option value="400">常规 · 400</option><option value="500">中等 · 500</option><option value="600">半粗 · 600</option><option value="700">粗体 · 700</option><option value="800">特粗 · 800</option><option value="900">黑体 · 900</option></select></div><div class="direction-field"><label for="studio-text-italic">倾斜</label><select id="studio-text-italic" class="form-select" data-text-field="italic"><option value="auto">跟随方案</option><option value="normal">正体</option><option value="italic">斜体</option></select></div></div>
    <div class="direction-field"><label for="studio-text-case">英文大小写</label><select id="studio-text-case" class="form-select" data-text-field="case"><option value="original">保留输入</option><option value="uppercase">全部大写</option><option value="lowercase">全部小写</option></select></div>
    <div class="direction-field"><label for="studio-text-tracking-mode">字距</label><select id="studio-text-tracking-mode" class="form-select"><option value="auto">跟随方案</option><option value="custom">自定义</option></select><label for="studio-text-tracking" class="range-title studio-text-range-label" data-tracking-custom>字间距<output data-text-value="tracking"></output></label><input id="studio-text-tracking" class="form-range" type="range" min="-120" max="250" step="5" data-text-field="tracking" data-tracking-custom></div>
    <div class="studio-text-row"><div class="direction-field"><label for="studio-text-color-mode">文字颜色</label><select id="studio-text-color-mode" class="form-select" data-text-field="colorMode"><option value="auto">跟随方案</option><option value="custom">自定义颜色</option></select></div><div class="direction-field" data-color-custom><label for="studio-text-color">自定义颜色</label><input id="studio-text-color" class="form-control form-control-color" type="color" data-text-field="color"></div></div></div>
    <details class="studio-subgroup" data-story-text-copy><summary>引导小字与辅助信息</summary><p class="studio-note">以下只修改当前片头镜头。留空即可恢复资料里的内容。</p><div class="direction-settings"><div class="direction-field"><label for="studio-text-kicker">标题上方小字</label><input id="studio-text-kicker" class="form-control" type="text" maxlength="80" data-text-copy="kicker"></div><div class="direction-field"><label for="studio-text-label">辅助信息第一行</label><input id="studio-text-label" class="form-control" type="text" maxlength="80" data-text-copy="label"></div><div class="direction-field"><label for="studio-text-meta">辅助信息第二行</label><input id="studio-text-meta" class="form-control" type="text" maxlength="120" data-text-copy="meta"></div></div></details>
    <button class="btn studio-text-reset" type="button" data-text-reset>恢复当前文字默认</button><p class="studio-note studio-text-font-note">圆润字体内置中文寒蝉全圆体与英文 Nunito，可离线使用；其他中文沿用系统字体。AE 打开时需要安装对应桌面字体。</p>`;
  const identity=root.querySelector('.studio-content > details:nth-of-type(2)');identity.after(group);
  const target=group.querySelector('#studio-text-target');let selected='name';
  const fallback=key=>key==='name'||key==='character'?state.name:key==='author'?state.brand:key==='caption'?currentSeries().caption:currentSeries().subtitle;
  for(const input of group.querySelectorAll('[data-text-field]'))input.addEventListener(input.tagName==='SELECT'?'change':'input',()=>{const field=input.dataset.textField,item=state.typography[selected];item[field]=field==='scale'?input.valueAsNumber/100:field==='tracking'?input.valueAsNumber/1000:input.value;if(field==='color')item.colorMode='custom';update();});
  for(const input of group.querySelectorAll('[data-text-copy]'))input.addEventListener('input',()=>{state.typography.copy[selected][input.dataset.textCopy]=input.value;for(const view of views)view.storyShots?.forEach(part=>part.textLayoutKey='');update();});
  target.addEventListener('change',()=>{selected=target.value;sync();});
  group.querySelector('#studio-text-tracking-mode').addEventListener('change',event=>{state.typography[selected].tracking=event.target.value==='auto'?null:0;update();});
  group.querySelector('[data-text-reset]').addEventListener('click',()=>{const defaults=studioTypographySettings();state.typography[selected]=defaults[selected];if(['character','author'].includes(selected))state.typography.copy[selected]=defaults.copy[selected];update();});
  function sync(){const item=state.typography[selected];for(const input of group.querySelectorAll('[data-text-field]')){const key=input.dataset.textField,value=key==='scale'?Math.round(item.scale*100):key==='tracking'?Math.round((item.tracking||0)*1000):item[key];if(String(input.value)!==String(value))input.value=value;}const inherited=fallback(selected)||'';group.querySelector('#studio-text-content').placeholder=inherited;group.querySelector('[data-text-fallback]').textContent='留空沿用：'+inherited;group.querySelector('[data-text-value="scale"]').value=Math.round(item.scale*100)+'%';group.querySelector('[data-text-value="tracking"]').value=(item.tracking||0).toFixed(3)+' em';group.querySelector('#studio-text-tracking-mode').value=item.tracking===null?'auto':'custom';group.querySelectorAll('[data-tracking-custom]').forEach(el=>el.hidden=item.tracking===null);group.querySelector('[data-color-custom]').hidden=item.colorMode!=='custom';const story=['character','author'].includes(selected);group.querySelector('[data-story-text-copy]').hidden=!story;for(const input of group.querySelectorAll('[data-text-copy]'))input.value=story?state.typography.copy[selected][input.dataset.textCopy]:'';}
  return {sync};
}

const typographyUI=mountStudioTypography(root,views);
// Seekable opening overlays. Every effect is painted from the shot's local time.
function studioPaintStoryEffect(ctx,w,h,options={}){
  ctx.clearRect(0,0,w,h);
  const effect=options.effect||'none',strength=Math.max(0,Math.min(1,Number.isFinite(options.strength)?options.strength:.3));
  if(effect==='none'||!strength||!w||!h)return;
  const time=(Number.isFinite(options.time)?options.time:0)*(Number.isFinite(options.speed)?options.speed:.7),accent=/^#[0-9a-f]{6}$/i.test(options.accent)?options.accent:'#bceb45';
  const color=(hex,a)=>{const n=parseInt(hex.slice(1),16);return `rgba(${n>>16},${n>>8&255},${n&255},${a})`};
  ctx.save();ctx.scale(w/1920,h/1080);
  if(effect==='crt'){
    // Fine scanlines, a soft moving band, and an optical edge falloff.
    ctx.fillStyle=`rgba(0,0,0,${strength*.14})`;
    for(let y=0;y<1080;y+=5)ctx.fillRect(0,y,1920,1);
    const y=((time*105)%1480)-200,band=ctx.createLinearGradient(0,y-120,0,y+120);
    band.addColorStop(0,color(accent,0));band.addColorStop(.48,color(accent,strength*.13));band.addColorStop(.52,`rgba(255,255,245,${strength*.15})`);band.addColorStop(1,color(accent,0));ctx.fillStyle=band;ctx.fillRect(0,y-120,1920,240);
    const vignette=ctx.createRadialGradient(960,540,220,960,540,1120);vignette.addColorStop(0,'rgba(0,0,0,0)');vignette.addColorStop(.6,'rgba(0,0,0,0)');vignette.addColorStop(1,`rgba(0,0,0,${strength*.55})`);ctx.fillStyle=vignette;ctx.fillRect(0,0,1920,1080);
  }else if(effect==='holo'){
    // Broad, restrained interference ripples using the selected accent only.
    const cx=1440+Math.sin(time*.45)*140,cy=220+Math.cos(time*.35)*90;
    for(let i=0;i<8;i++){
      const r=120+i*175+((time*56)%175),alpha=strength*.16*(1-i/10);
      ctx.strokeStyle=color(accent,alpha);ctx.lineWidth=13+i*2;ctx.beginPath();ctx.ellipse(cx,cy,r,r*.58,-.25,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle=`rgba(255,255,255,${alpha*.6})`;ctx.lineWidth=1.3;ctx.beginPath();ctx.ellipse(cx,cy,r+13,r*.58+9,-.25,0,Math.PI*2);ctx.stroke();
    }
    const film=ctx.createLinearGradient(0,0,1920,1080);film.addColorStop(0,color(accent,strength*.1));film.addColorStop(.44,color(accent,0));film.addColorStop(1,color(accent,strength*.08));ctx.fillStyle=film;ctx.fillRect(0,0,1920,1080);
  }else if(effect==='polar'){
    const x=((time*280)%3300)-700;
    ctx.translate(x,0);ctx.transform(1,0,-.5,1,0,0);
    const light=ctx.createLinearGradient(-350,0,350,0);light.addColorStop(0,color(accent,0));light.addColorStop(.35,color(accent,strength*.08));light.addColorStop(.5,`rgba(255,255,245,${strength*(options.dark?.2:.35)})`);light.addColorStop(.64,color(accent,strength*.12));light.addColorStop(1,color(accent,0));ctx.fillStyle=light;ctx.fillRect(-350,0,700,1080);
    ctx.fillStyle=color(accent,strength*.1);ctx.fillRect(365,0,1.5,1080);
  }
  ctx.restore();
}
function mountStudioStoryIntro(view){
  const layer=document.createElement('div');layer.className='story-intro';layer.setAttribute('aria-label','双镜头片头');
  for(const role of ['character','author']){
    const shot=document.createElement('section');shot.className='story-shot';shot.dataset.storyRole=role;
    shot.innerHTML='<div class="story-media"><img class="story-image" alt=""></div><div class="story-primary"><span class="story-kicker"></span><span class="story-title"></span><span class="story-rule" aria-hidden="true"></span></div><div class="story-secondary"><span class="story-meta-label"></span><span class="story-meta"></span></div><span class="story-shot-number" aria-hidden="true"></span>';
    layer.append(shot);
  }
  const flash=document.createElement('div');flash.className='story-flash';layer.append(flash);
  view.art.append(layer);view.storyLayer=layer;view.storyShots=[...layer.querySelectorAll('.story-shot')].map(el=>({el,image:el.querySelector('img')}));
}
function drawStudioStoryIntro(view,pose){
  const layer=view.storyLayer;if(!layer)return;
  const story=pose.story,n=state.narrative,active=!!story?.active;
  layer.style.display=active?'block':'none';layer.style.visibility=active?'visible':'hidden';layer.setAttribute('aria-hidden',String(!active));
  if(!active)return;
  const series=currentSeries();
  for(const part of view.storyShots){
    const {el,image}=part,role=el.dataset.storyRole,visible=role===story.role;
    el.style.visibility=visible?'visible':'hidden';el.style.opacity=visible?1-story.main:0;el.dataset.corner=n[role+'Corner'];
    if(!visible)continue;
    const source=n.storyPackagingOnly?'':role==='character'?(images.introCharacter||images.model||images.portrait):(images.introAuthor||images.portrait||images.model);
    if(source){if(image.getAttribute('src')!==source)image.src=source;image.style.display='block';}else{image.removeAttribute('src');image.style.display='none';}
    image.style.transform=`translate(${n[role+'X']-50}%,${n[role+'Y']-50}%) scale(${n[role+'Scale']})`;
    image.style.opacity=1;
    const text=role==='character'?{kicker:'CHARACTER / '+series.label,title:state.name,label:'EDITION / '+series.prefix+'-'+series.serial,meta:series.caption}:{kicker:'CREATOR / CREDITS',title:state.brand||'YOUR STUDIO',label:state.modelCredit,meta:state.designCredit};
    text.title=studioTypographyValue(state.typography,role,text.title);text.kicker=studioTypographyCopy(state.typography,role,'kicker',text.kicker);text.label=studioTypographyCopy(state.typography,role,'label',text.label);text.meta=studioTypographyCopy(state.typography,role,'meta',text.meta);
    for(const [selector,value]of [['.story-kicker',text.kicker],['.story-title',text.title],['.story-meta-label',text.label],['.story-meta',text.meta]]){const node=el.querySelector(selector);if(node.textContent!==value)node.textContent=value;}
    applyStudioStoryTypography(view,part,role);
    el.querySelector('.story-shot-number').textContent=role==='character'?'01 / CHARACTER STUDY':'02 / BEHIND THE DESIGN';
    const copyAlpha=story.main<1?Math.min(1,story.alpha/Math.max(.0001,1-story.main)):0;
    for(const selector of ['.story-primary','.story-secondary']){const copy=el.querySelector(selector);copy.style.opacity=state.type?copyAlpha:0;const direction=n[role+'Corner'].startsWith('t')?1:-1;copy.style.transform=`translateY(${story.shift*100*direction}cqh)`;}
    el.querySelector('.story-shot-number').style.opacity=state.type?copyAlpha*.42:0;
  }
  layer.querySelector('.story-flash').style.opacity=story.flash;
}

// One optical surface for every scene. Borders stay outside this surface;
// images, native text and geometry all pass through the same optical filter.
function studioPostSceneWeight(time,intro,n){
  const ease=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)},events=[];
  const push=(start,on)=>events.push({start,on:on?1:0});
  if(n.introStyle==='story'&&intro>0){
    const nominal=studioStoryDuration(n),scale=nominal?intro/nominal:1;let start=0;
    if(n.characterShotEnabled){push(start,n.postCharacter);start+=n.characterShotDuration*scale;}
    if(n.authorShotEnabled){push(start,n.postAuthor);start+=n.authorShotDuration*scale;}
    push(Math.max(0,intro-n.storyTransitionDuration*scale),n.postShow);
  }else{
    if(intro>0)push(0,n.postCharacter);
    push(intro,n.postShow);
  }
  if(n.outroEnabled)push(intro+n.showDuration,n.postOutro);
  let before=0,value=0;
  for(const event of events){value+=(event.on-before)*ease((time-event.start)/n.postFade);before=event.on;}
  return Math.max(0,Math.min(1,value));
}
function mountStudioPostProcessing(view){
  const viewport=document.createElement('div');viewport.className='studio-post-viewport';
  const surface=document.createElement('div');surface.className='studio-post-surface';
  // These elements keep their own size containers, so existing cqw/cqh layouts
  // and measured export coordinates do not change when grouped for processing.
  for(const el of [view.composition,view.storyLayer,view.ending])if(el)surface.append(el);
  const canvas=document.createElement('canvas');canvas.className='studio-post-optics';canvas.setAttribute('aria-hidden','true');
  viewport.append(surface,canvas);view.art.append(viewport);
  // Showcase models sit above picture processing; poster-shot media stay inside
  // the optical surface. Match the composition's size container and safe area.
  const foreground=document.createElement('div');foreground.className='studio-show-foreground';
  for(const el of [...view.composition.querySelectorAll('.character-layer,.portrait-layer')])foreground.append(el);
  view.art.append(foreground);
  const id='studio-optics-'+view.key,prism=id+'-prism',svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.classList.add('studio-post-defs');svg.setAttribute('aria-hidden','true');svg.setAttribute('width','0');svg.setAttribute('height','0');
  svg.innerHTML=`<defs><filter id="${id}" x="-4%" y="-4%" width="108%" height="108%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency=".002 .028" numOctaves="1" seed="7" result="noise"/>
    <feDisplacementMap in="SourceGraphic" in2="noise" scale="0" xChannelSelector="R" yChannelSelector="G" result="picture"/>
    <feColorMatrix in="picture" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  .2126 .7152 .0722 0 -.67" result="highlights"/>
    <feGaussianBlur in="highlights" stdDeviation="2" result="soft"/>
    <feComponentTransfer in="soft" result="glow"><feFuncA type="linear" slope="0"/></feComponentTransfer>
    <feBlend in="picture" in2="glow" mode="screen"/>
  </filter><filter id="${prism}" x="-2%" y="-2%" width="104%" height="104%" color-interpolation-filters="sRGB">
    <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red"/>
    <feOffset in="red" dx="0" dy="0" result="red-shift"/>
    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green"/>
    <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue"/>
    <feOffset in="blue" dx="0" dy="0" result="blue-shift"/>
    <feBlend in="red-shift" in2="green" mode="screen" result="rg"/><feBlend in="rg" in2="blue-shift" mode="screen"/>
  </filter></defs>`;
  view.art.append(svg);
  view.post={viewport,surface,foreground,canvas,ctx:canvas.getContext('2d'),svg,id,prism,amount:0,lastWall:0,lastEffect:'polar',paintKey:'',
    noise:svg.querySelector('feTurbulence'),warp:svg.querySelector('feDisplacementMap'),blur:svg.querySelector('feGaussianBlur'),glow:svg.querySelector('feFuncA'),offsets:[...svg.querySelectorAll('feOffset')]};
}
// Split actual text nodes only while the editor needs independent text ordering.
// Empty scene shells retain container units, layout selectors and animation refs.
function studioEditorTextLayers(view,enabled){
  if(!enabled){
    const split=view.editorTextLayers;if(!split)return;
    for(const {node,marker} of split.moved){marker.replaceWith(node);}
    split.pictureStory.remove();split.root.remove();split.below.remove();split.above.remove();view.editorTextLayers=null;return;
  }
  if(view.editorTextLayers)return;
  const root=document.createElement('div');root.className='studio-editor-text-layers';
  const textComposition=view.composition.cloneNode(false);textComposition.classList.add('studio-editor-text-composition');root.append(textComposition);
  const moved=[];
  const move=(node,parent)=>{const marker=document.createComment('editor text home');node.before(marker);moved.push({node,marker});parent.append(node);};
  for(const node of [...view.composition.children])if(node.matches('.packaging,.dual-information'))move(node,textComposition);
  const pictureStory=view.storyLayer.cloneNode(false);pictureStory.classList.add('studio-editor-story-picture');
  const shots=[];
  for(const part of view.storyShots){const picture=part.el.cloneNode(false);pictureStory.append(picture);const media=part.el.querySelector('.story-media');if(media)move(media,picture);shots.push({source:part.el,picture});}
  view.post.surface.append(pictureStory);move(view.storyLayer,root);
  if(view.ending)move(view.ending,root);
  const below=document.createElement('div'),above=document.createElement('div');below.className='studio-editor-footage-below';above.className='studio-editor-footage-above';move(view.post.foreground,view.post.surface);view.post.surface.append(below,root,above);view.editorTextLayers={root,textComposition,pictureStory,shots,moved,below,above};
  studioDrawEditorTextLayers(view);
}
function studioDrawEditorTextLayers(view){
  const split=view.editorTextLayers;if(!split)return;
  split.textComposition.style.cssText=view.composition.style.cssText;
  // The text and both footage lanes are filtered together by their parent.
  split.pictureStory.style.cssText=view.storyLayer.style.cssText;
  for(const {source,picture} of split.shots){picture.style.cssText=source.style.cssText;picture.dataset.corner=source.dataset.corner;}
}
function studioPaintPostOptics(ctx,w,h,o){
  ctx.clearRect(0,0,w,h);if(o.amount<.001)return;
  const t=o.time,s=o.amount,accent=/^#[0-9a-f]{6}$/i.test(o.accent)?o.accent:'#bceb45';
  const rgba=(hex,a)=>{const c=parseInt(hex.slice(1),16);return `rgba(${c>>16},${c>>8&255},${c&255},${a})`};
  ctx.save();ctx.scale(w/1920,h/1080);
  const fill=gradient=>{ctx.fillStyle=gradient;ctx.fillRect(0,0,1920,1080)};
  const glow=(x,y,r,color,a)=>{const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,rgba(color,a));g.addColorStop(.23,rgba(color,a*.6));g.addColorStop(1,rgba(color,0));fill(g)};
  if(o.effect==='crt'){
    ctx.fillStyle=`rgba(0,0,0,${s*.23})`;for(let y=0;y<1080;y+=4)ctx.fillRect(0,y,1920,1.1);
    const y=(t*125%1530)-220,g=ctx.createLinearGradient(0,y-140,0,y+140);
    g.addColorStop(0,rgba(accent,0));g.addColorStop(.47,rgba(accent,s*.11));g.addColorStop(.5,`rgba(255,255,245,${s*.16})`);g.addColorStop(.65,rgba(accent,s*.06));g.addColorStop(1,rgba(accent,0));fill(g);
    ctx.fillStyle=`rgba(0,0,0,${s*.055})`;for(let x=0;x<1920;x+=6)ctx.fillRect(x,0,.7,1080);
  }else if(o.effect==='holo'){
    const cx=1340+Math.sin(t*.35)*180,cy=240+Math.cos(t*.3)*140;
    for(let i=0;i<9;i++){const r=80+i*180+(t*70%180),a=s*.23*(1-i/12);
      ctx.strokeStyle=rgba(i%3===0?'#9cfcff':accent,a);ctx.lineWidth=9+i*1.7;ctx.beginPath();ctx.ellipse(cx,cy,r,r*.59,-.28,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle=`rgba(255,255,255,${a*.9})`;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(cx,cy,r+12,r*.59+8,-.28,0,Math.PI*2);ctx.stroke();}
    const g=ctx.createLinearGradient(0,0,1920,1080);g.addColorStop(0,rgba('#8af8ef',s*.13));g.addColorStop(.5,rgba(accent,0));g.addColorStop(1,rgba('#be9dff',s*.12));fill(g);
  }else if(o.effect==='polar'){
    const x=960+Math.sin(t*.55)*1250;ctx.save();ctx.translate(x,0);ctx.transform(1,0,-.55,1,0,0);
    const g=ctx.createLinearGradient(-500,0,500,0);g.addColorStop(0,rgba(accent,0));g.addColorStop(.32,rgba(accent,s*.13));g.addColorStop(.5,`rgba(255,255,247,${s*.38})`);g.addColorStop(.66,rgba(accent,s*.24));g.addColorStop(1,rgba(accent,0));ctx.fillStyle=g;ctx.fillRect(-500,0,1000,1080);
    ctx.fillStyle=`rgba(255,255,255,${s*.19})`;ctx.fillRect(525,0,1.8,1080);ctx.restore();
    glow(1750,100,700,accent,s*.11);
  }else if(o.effect==='bloom'){
    const x=1480+Math.sin(t*.37)*220,y=140+Math.cos(t*.28)*100;
    glow(x,y,900,accent,s*.28);glow(x,y,470,'#fff5d8',s*.34);glow(240+Math.sin(t*.22)*110,900,650,'#c8d8ff',s*.17);
    ctx.strokeStyle=rgba(accent,s*.13);ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,310+Math.sin(t*.4)*22,0,Math.PI*2);ctx.stroke();
  }else if(o.effect==='anamorphic'){
    const x=1410+Math.sin(t*.38)*420,y=340+Math.cos(t*.25)*130;
    ctx.save();ctx.translate(x,y);ctx.scale(1,.12);
    for(const [r,c,a]of [[1120,accent,.42],[580,'#e5f9ff',.64]]){const flare=ctx.createRadialGradient(0,0,0,0,0,r);flare.addColorStop(0,rgba(c,s*a));flare.addColorStop(.23,rgba(c,s*a*.6));flare.addColorStop(1,rgba(c,0));ctx.fillStyle=flare;ctx.fillRect(-r,-r,r*2,r*2);}
    ctx.restore();
    const g=ctx.createLinearGradient(0,0,1920,0);g.addColorStop(0,rgba(accent,0));g.addColorStop(.72,`rgba(240,252,255,${s*.6})`);g.addColorStop(1,rgba(accent,0));ctx.fillStyle=g;ctx.fillRect(0,y-1.1,1920,2.2);
    glow(x,y,150,'#ffffff',s*.5);
    for(let i=0;i<4;i++){const k=.26+i*.19,gx=960+(960-x)*k,gy=540+(540-y)*k;ctx.strokeStyle=rgba(i%2?accent:'#b0efff',s*.13);ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(gx,gy,34+i*22,45+i*27,.16,0,Math.PI*2);ctx.stroke();}
  }else if(o.effect==='prism'){
    const x=960+Math.sin(t*.32)*850;ctx.save();ctx.translate(x,0);ctx.transform(1,0,-.6,1,0,0);
    const g=ctx.createLinearGradient(-600,0,600,0);for(const [p,c,a]of [[0,'#76f4ff',0],[.27,'#76f4ff',.19],[.45,'#bfa2ff',.19],[.55,'#ffbbcf',.19],[.73,accent,.17],[1,accent,0]])g.addColorStop(p,rgba(c,s*a));ctx.fillStyle=g;ctx.fillRect(-600,0,1200,1080);ctx.restore();
  }else if(o.effect==='film'){
    const tick=Math.floor(t*24);ctx.fillStyle=`rgba(0,0,0,${s*.14})`;
    // Fixed hashes make film grain seekable, without a random shimmer on pause.
    for(let i=0;i<2300;i++){const x=((i*127.1+tick*41.7)%1920+1920)%1920,y=((i*269.5+tick*67.3)%1080+1080)%1080;ctx.fillRect(x,y,1.8,1.8);}
    glow(140+Math.sin(t*.16)*130,530,840,'#ffd5ac',s*.13);glow(1840,100,650,accent,s*.1);
  }
  if(['crt','film'].includes(o.effect)){const v=ctx.createRadialGradient(960,540,280,960,540,1120);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(.5,'rgba(0,0,0,0)');v.addColorStop(1,`rgba(0,0,0,${s*(o.effect==='crt'?.43:.28)})`);fill(v);}
  ctx.restore();
}
function drawStudioPostProcessing(view,pose){
  const p=view.post;if(!p)return;
  p.foreground.style.opacity=(1-pose.outro)*(pose.story?pose.story.main:1);
  p.foreground.style.visibility=pose.outro>=1?'hidden':'visible';
  const n=state.narrative,v=state.variants[view.key],now=performance.now(),dt=p.lastWall?Math.min(.1,(now-p.lastWall)/1000):1;p.lastWall=now;
  const target=n.postEffect==='none'?0:studioPostSceneWeight(state.time,state.introDuration,n)*n.postStrength*(1-Math.min(1,pose.shutdown*2));
  if(globalThis.studioOutput?.sync||view.editorSeek===true)p.amount=target;
  else p.amount+=(target-p.amount)*(1-Math.exp(-dt/Math.max(.04,n.postFade/3)));
  if(Math.abs(target-p.amount)<.0003)p.amount=target;
  if(n.postEffect!=='none'){p.lastEffect=n.postEffect;p.lastGlow=n.postGlow;}
  const effect=p.lastEffect,s=p.amount,t=(reduced.matches?0:motionClock.elapsed)*n.postSpeed,w=p.viewport.clientWidth,h=p.viewport.clientHeight;
  if(!w||!h)return;
  if(s<.0005){p.surface.style.filter='none';p.canvas.style.opacity='0';return;}
  p.canvas.style.opacity='1';const scale=w/1920,warp=effect==='crt'?2.7:effect==='holo'?4.2:effect==='prism'?1.5:0;
  p.warp.setAttribute('scale',(warp*s*scale).toFixed(3));
  p.noise.setAttribute('baseFrequency',`${(.0018+Math.sin(t*.42)*.00025).toFixed(5)} ${(.024+Math.cos(t*.31)*.004).toFixed(5)}`);
  p.blur.setAttribute('stdDeviation',(Math.max(.1,scale)*(effect==='bloom'?8:3.2)).toFixed(2));
  p.glow.setAttribute('slope',((p.lastGlow+(effect==='bloom'?.65:effect==='anamorphic'?.18:0))*s*2.8).toFixed(3));
  const fringe=(effect==='prism'?3.3:effect==='crt'?.85:effect==='holo'?.6:0)*s*scale*(n.postDispersion??.25);
  p.offsets[0].setAttribute('dx',fringe.toFixed(3));p.offsets[1].setAttribute('dx',(-fringe).toFixed(3));
  const contrast=1+s*(effect==='crt'?.10:effect==='film'?-.055:.025),saturate=1+s*(effect==='holo'?.12:effect==='film'?-.15:effect==='prism'?.10:0),light=1+(effect==='film'?Math.sin(t*8.5)*.009*s:0);
  p.surface.style.filter=`${fringe>0.001?`url(#${p.prism}) `:''}url(#${p.id}) contrast(${contrast.toFixed(4)}) saturate(${saturate.toFixed(4)}) brightness(${light.toFixed(4)})`;
  const ratio=view.previewRasterScale||Math.min((globalThis.devicePixelRatio||1)*Math.max(1,view.outputScale||1),2),pw=Math.max(1,Math.round(w*ratio)),ph=Math.max(1,Math.round(h*ratio));
  if(p.canvas.width!==pw||p.canvas.height!==ph){p.canvas.width=pw;p.canvas.height=ph;}
  const key=[pw,ph,effect,s.toFixed(4),t.toFixed(3),v.accent].join('|');
  if(p.paintKey!==key){studioPaintPostOptics(p.ctx,pw,ph,{effect,amount:s,time:t,accent:v.accent});p.paintKey=key;}
  p.viewport.dataset.effect=effect;p.viewport.dataset.effectAmount=s.toFixed(3);
}

// Sequence controls are shared by all designs, including pure output and AE.
function mountStudioNarrative(root,views){
  const group=document.createElement('details');group.className='studio-group studio-narrative';group.open=true;
  let legacyIntroDuration=state.narrative.introStyle==='story'?4.5:state.introDuration;
  const percentKeys=['nameDelay','characterEffectStrength','authorEffectStrength','postStrength','postGlow','postDispersion'];
  function storyRange(role,key,label,min,max,step){return `<div class="direction-field"><label for="studio-${role}-${key}" class="range-title">${label}<output data-story-value="${role+key}"></output></label><input id="studio-${role}-${key}" data-narrative="${role+key}" class="form-range" type="range" min="${min}" max="${max}" step="${step}"></div>`}
  function storyShot(role,index,label){return `<section class="studio-story-shot" data-story-shot="${role}">
    <div class="studio-story-shot-head"><span><b>${index}</b>${label}</span><label class="form-check form-switch"><input class="form-check-input" data-narrative="${role}ShotEnabled" type="checkbox"><span>启用</span></label></div>
    <div class="direction-settings" data-story-enabled="${role}">
      <div class="studio-story-pair"><div class="direction-field"><label for="studio-${role}-duration">镜头时长 · 秒</label><input id="studio-${role}-duration" data-narrative="${role}ShotDuration" class="form-control" type="number" min=".5" max="600" step=".1" inputmode="decimal"></div><div class="direction-field"><label for="studio-${role}-corner">字幕位置</label><select id="studio-${role}-corner" data-narrative="${role}Corner" class="form-select"><option value="tl-br">左上 ↔ 右下</option><option value="tr-bl">右上 ↔ 左下</option><option value="bl-tr">左下 ↔ 右上</option><option value="br-tl">右下 ↔ 左上</option><option value="center">画面正中</option></select></div></div>
      <details class="studio-story-media"><summary>画面缩放与位置</summary>${storyRange(role,'Scale','画面缩放',.6,2.4,.05)}${storyRange(role,'X','水平位置',0,100,1)}${storyRange(role,'Y','垂直位置',0,100,1)}</details>
    </div>
    <button type="button" class="btn studio-story-jump" data-story-jump="${role}">预览${label}</button>
  </section>`}
  group.innerHTML=`<summary>片头、展示与片尾</summary>
    <div class="studio-sequence-map" aria-hidden="true"><span data-intro-map>01 引入</span><i>→</i><span data-show-map>02 展示</span><i>→</i><span data-ending-map>03 片尾</span></div>
    <div class="direction-settings">
      <div class="direction-field"><label for="studio-intro-style">引入方式</label><select class="form-select" id="studio-intro-style" data-narrative="introStyle"><option value="story">双镜头海报 · 角色 → 作者</option><option value="model">模型先行 · 信息稍后出现</option><option value="title">大字开场 · 原版</option></select></div>
      <div class="direction-field" data-legacy-intro><label for="studio-intro-duration">引入页时长 · 秒</label><input id="studio-intro-duration" class="form-control" type="number" min="0" max="1800" step="0.5" inputmode="decimal"><small>0 秒跳过 · 按 1× 播放计算</small></div>
      <div class="direction-field" data-model-intro><label for="studio-name-reveal">角色名何时出现</label><select class="form-select" id="studio-name-reveal" data-narrative="nameReveal"><option value="show">到展示页再淡入</option><option value="delayed">片头后段轻轻浮现</option></select></div>
      <div class="direction-field" data-name-delay><label for="studio-name-delay" class="range-title">延迟到片头的<output data-name-delay-value></output></label><input class="form-range" id="studio-name-delay" data-narrative="nameDelay" type="range" min="20" max="90" step="5"></div>
    </div>
    <div class="studio-story-controls" data-story-controls>
      <div class="studio-story-total"><span>角色镜头 → 作者镜头 → 主展示</span><output data-story-total></output></div>
      ${storyShot('character','01','角色镜头')}${storyShot('author','02','作者镜头')}
      <div class="direction-field"><label for="studio-story-transition">转入展示 · 秒</label><input id="studio-story-transition" data-narrative="storyTransitionDuration" class="form-control" type="number" min=".15" max="3" step=".05" inputmode="decimal"><small>包含在引入总时长内；最后一幕轻退，主展示同步出现。</small></div>
      <label class="form-check form-switch"><input class="form-check-input" data-narrative="storyPackagingOnly" type="checkbox"><span>仅预览文字包装与效果</span></label>
      <label class="form-check form-switch"><input class="form-check-input" data-narrative="storyFlash" type="checkbox"><span>镜头切换时短曝光</span></label>
      <div class="studio-story-actions"><button type="button" class="btn" data-story-jump="start">从片头播放</button><button type="button" class="btn" data-story-jump="show">跳到主展示</button></div>
    </div>
    <p class="studio-note" data-intro-note></p>
    <div class="direction-settings studio-showcase-settings">
      <div class="direction-field" data-show-playback><label for="studio-show-playback">无片尾时的播放方式</label><select id="studio-show-playback" data-narrative="showPlayback" class="form-select"><option value="continuous">持续展示 · 不回到起点</option><option value="repeat">按时长循环 · 重播展示入场</option></select></div>
      <div class="direction-field"><label for="studio-show-duration" data-show-duration-label>展示时长 · 秒</label><input id="studio-show-duration" data-narrative="showDuration" class="form-control" type="number" min="1" max="60" step="0.5" inputmode="decimal"><small data-show-duration-note></small></div>
    </div>
    <div class="studio-ending-settings"><label class="form-check form-switch"><input class="form-check-input" id="studio-outro-enabled" data-narrative="outroEnabled" type="checkbox"><span>启用品牌片尾</span></label>
    <div class="direction-settings" data-ending-controls>
      <div class="direction-field"><label for="studio-outro-trigger">进入片尾的方式</label><select id="studio-outro-trigger" data-narrative="outroTrigger" class="form-select"><option value="auto">展示结束后自动进入</option><option value="manual">保持展示循环 · 手动进入</option></select></div>
      <div class="direction-field"><label for="studio-outro-duration">片尾时长 · 秒</label><input id="studio-outro-duration" data-narrative="outroDuration" class="form-control" type="number" min="1.5" max="12" step="0.5" inputmode="decimal"></div>
      <div class="direction-field"><label for="studio-outro-style">品牌小动画</label><select id="studio-outro-style" data-narrative="outroStyle" class="form-select"><option value="signature">签名落版 · 一笔收束</option><option value="orbit">轨道回声 · 环绕落版</option><option value="quiet">安静留白 · 轻柔淡入</option></select></div>
      <div class="direction-field"><label for="studio-outro-content">片尾内容</label><select id="studio-outro-content" data-narrative="outroContent" class="form-select"><option value="auto">优先 Logo，否则品牌字样</option><option value="word">品牌字样</option><option value="logo">品牌 Logo</option></select></div>
      <div class="direction-field"><label for="studio-outro-color-mode">品牌字样颜色</label><select id="studio-outro-color-mode" data-narrative="outroColorMode" class="form-select"><option value="theme">跟随视觉方案</option><option value="custom">自定义颜色</option></select></div>
      <div class="direction-field" data-ending-color><label for="studio-outro-color">自定义品牌字样颜色</label><input id="studio-outro-color" data-narrative="outroColor" type="color" class="form-control form-control-color"><small>各方案共用，仅调整片尾的品牌文字。</small></div>
      <label class="form-check form-switch"><input class="form-check-input" id="studio-shutdown-enabled" data-narrative="shutdownEnabled" type="checkbox"><span>老电视关机 · 亮线、光点与余辉</span></label>
      <div class="direction-field" data-shutdown-controls><label for="studio-shutdown-duration">关机动画时长 · 秒</label><input id="studio-shutdown-duration" data-narrative="shutdownDuration" class="form-control" type="number" min="0.3" max="1.5" step="0.1" inputmode="decimal"><small>包含在片尾内，不额外增加总时长。最多占片尾的 45%。</small></div>
    </div><p class="studio-note" data-ending-note></p></div>`;
  const postGroup=document.createElement('details');postGroup.className='studio-group studio-narrative studio-postprocessing';postGroup.open=true;
  const postRange=(key,label,min,max,step)=>`<div class="direction-field"><label for="studio-${key}" class="range-title">${label}<output data-post-value="${key}"></output></label><input id="studio-${key}" data-narrative="${key}" class="form-range" type="range" min="${min}" max="${max}" step="${step}"></div>`;
  postGroup.innerHTML=`<summary>画面后处理</summary>
    <div class="direction-settings">
      <div class="direction-field"><label for="studio-post-effect">滤镜方案</label><select id="studio-post-effect" data-narrative="postEffect" class="form-select"><option value="none">关闭 · 保留原画</option><option value="polar">偏振流光 · Polar</option><option value="crt">显像管 · CRT</option><option value="holo">全息波纹 · Holo</option><option value="bloom">柔光泛晕 · Bloom</option><option value="anamorphic">电影横向炫光 · Lens Flare</option><option value="prism">棱镜色散 · Prism</option><option value="film">胶片光漏 · Film</option></select></div>
      <div data-post-controls>
        <div class="studio-post-label">应用到哪些镜头</div>
        <div class="studio-post-scenes"><label><input type="checkbox" data-narrative="postCharacter"><span>角色镜头</span></label><label><input type="checkbox" data-narrative="postAuthor"><span>作者镜头</span></label><label><input type="checkbox" data-narrative="postShow"><span>展示页</span></label><label><input type="checkbox" data-narrative="postOutro"><span>片尾</span></label></div>
        ${postRange('postStrength','效果强度',0,100,5)}${postRange('postGlow','附加辉光',0,100,5)}${postRange('postDispersion','RGB 色散强度',0,100,1)}<p class="studio-note">0 关闭 RGB 彩边，保留棱镜彩色光带。默认 25%，100% 对应原版色散。</p>${postRange('postSpeed','动态速度',.1,2,.1)}${postRange('postFade','淡入淡出 · 秒',.15,1.5,.05)}
      </div>
    </div>
    <p class="studio-note">片头：素材与字幕一起处理。展示页：角色位于滤镜上方，背景与文字接受处理。边框始终独立。效果连续运动，离开所选镜头时柔和淡出。</p>
    <button type="button" class="btn studio-post-preview" data-story-jump="start">从片头预览效果</button>`;
  const left=root.querySelector('.studio-content'),identity=left.querySelectorAll(':scope > details')[1];identity.after(group,postGroup);
  const controlGroups=[group,postGroup];
  const duration=group.querySelector('#studio-intro-duration');
  function changeDuration(final){if(state.narrative.introStyle==='story')return;const value=duration.valueAsNumber;if(!Number.isFinite(value)){if(final)duration.value=state.introDuration;return}const next=studioIntroDuration(value);state.time=studioRetime(state.time,state.introDuration,next);state.introDuration=legacyIntroDuration=next;state.time=Math.min(state.time,studioTotalDuration(next,state.narrative));if(final)duration.value=next;update()}
  duration.addEventListener('input',()=>changeDuration(false));duration.addEventListener('change',()=>changeDuration(true));
  for(const input of controlGroups.flatMap(el=>[...el.querySelectorAll('[data-narrative]')])){const apply=final=>{
    const key=input.dataset.narrative,value=input.type==='checkbox'?input.checked:input.type==='number'||input.type==='range'?input.valueAsNumber/(percentKeys.includes(key)?100:1):input.value;
    if((input.type==='number'||input.type==='range')&&!Number.isFinite(value)){if(final)input.value=state.narrative[key];return}
    const before=state.narrative,beforeIntro=state.introDuration;state.narrative=studioNarrativeSettings({...before,[key]:value});
    if(before.introStyle!=='story'&&state.narrative.introStyle==='story')legacyIntroDuration=beforeIntro;
    if(state.narrative.introStyle==='story')state.introDuration=studioStoryDuration(state.narrative);else if(before.introStyle==='story')state.introDuration=legacyIntroDuration;
    if(state.introDuration!==beforeIntro)state.time=studioRetime(state.time,beforeIntro,state.introDuration);
    if(key==='showDuration')state.time=studioRetimeShow(state.time,state.introDuration,before,state.narrative);state.time=Math.min(state.time,studioTotalDuration(state.introDuration,state.narrative));if(final&&input.type==='number')input.value=state.narrative[key];update();
  };input.addEventListener(['range','number','color'].includes(input.type)?'input':'change',()=>apply(false));if(input.type==='number')input.addEventListener('change',()=>apply(true));}
  for(const button of controlGroups.flatMap(el=>[...el.querySelectorAll('[data-story-jump]')]))button.addEventListener('click',()=>{const role=button.dataset.storyJump,n=state.narrative;state.time=role==='show'?state.introDuration:role==='author'&&n.characterShotEnabled?n.characterShotDuration:0;state.playing=true;last=0;update()});
  if(state.narrative.introStyle==='story'){const next=studioStoryDuration(state.narrative);state.time=studioRetime(state.time,state.introDuration,next);state.introDuration=next;}
  for(const view of views){
    const ending=document.createElement('div');ending.className='brand-ending';ending.setAttribute('aria-label','品牌片尾');
    ending.innerHTML='<div class="ending-content"><div class="ending-orbit" aria-hidden="true"></div><div class="ending-spark" aria-hidden="true"></div><div class="ending-lockup"><img class="ending-logo" alt="品牌 Logo"><span class="ending-word"></span><span class="ending-stroke" aria-hidden="true"></span></div></div>';
    view.art.append(ending);view.ending=ending;
    const shutdown=document.createElement('div');shutdown.className='cyber-shutdown';shutdown.setAttribute('aria-hidden','true');shutdown.innerHTML='<div class="shutdown-scan"></div><div class="shutdown-flash"></div><div class="shutdown-shutter shutdown-top"></div><div class="shutdown-shutter shutdown-bottom"></div><div class="shutdown-beam-glow"></div><div class="shutdown-line"></div><div class="shutdown-dot-glow"></div><div class="shutdown-dot"></div>';view.art.append(shutdown);view.shutdown=shutdown;
    const button=document.createElement('button');button.className='btn';button.type='button';button.textContent='片尾';button.dataset.endingPreview='';view.section.querySelector('[data-show]').after(button);
    button.addEventListener('click',()=>{state.time=state.introDuration+studioShowDuration(state.narrative);state.playing=true;last=0;update()});
    if(typeof mountStudioStoryIntro==='function')mountStudioStoryIntro(view);
    if(typeof mountStudioPostProcessing==='function')mountStudioPostProcessing(view);
  }
  return {sync(){
    if(document.activeElement!==duration)duration.value=state.introDuration;
    const n=state.narrative;
    const continuous=studioContinuousShow(n);
    for(const el of controlGroups.flatMap(el=>[...el.querySelectorAll('[data-narrative]')])){const key=el.dataset.narrative;if(el.type==='checkbox')el.checked=n[key];else if(document.activeElement!==el)el.value=percentKeys.includes(key)?n[key]*100:n[key]}
    postGroup.querySelector('[data-post-controls]').hidden=n.postEffect==='none';
    for(const output of postGroup.querySelectorAll('[data-post-value]')){const key=output.dataset.postValue,value=n[key];output.value=percentKeys.includes(key)?Math.round(value*100)+'%':key==='postSpeed'?value.toFixed(1)+'×':value.toFixed(2).replace(/0$/,'')+' 秒';}
    const story=n.introStyle==='story';group.querySelector('[data-story-controls]').hidden=!story;group.querySelector('[data-legacy-intro]').hidden=story;
    group.querySelector('[data-intro-map]').textContent=story?'01 / 02 海报':'01 引入';group.querySelector('[data-show-map]').textContent=story?'03 主展示':'02 展示';group.querySelector('[data-ending-map]').textContent=story?'04 片尾':'03 片尾';
    group.querySelector('[data-story-total]').value=studioStoryDuration(n).toFixed(2).replace(/0$/,'')+' 秒';
    for(const role of ['character','author']){const enabled=n[role+'ShotEnabled'];group.querySelector(`[data-story-enabled="${role}"]`).hidden=!enabled;group.querySelector(`[data-story-jump="${role}"]`).disabled=!enabled;group.querySelector(`[data-story-shot="${role}"]`).classList.toggle('is-disabled',!enabled);}
    for(const output of group.querySelectorAll('[data-story-value]')){const key=output.dataset.storyValue,value=n[key];output.value=/Strength$/.test(key)?Math.round(value*100)+'%':/Speed$/.test(key)?value.toFixed(1)+'×':/Scale$/.test(key)?value.toFixed(2)+'×':Math.round(value)+'%';}
    group.querySelector('[data-name-delay-value]').value=Math.round(n.nameDelay*100)+'%';
    group.querySelector('[data-name-delay]').hidden=n.introStyle!=='model'||n.nameReveal!=='delayed';
    group.querySelector('[data-model-intro]').hidden=n.introStyle!=='model';
    group.querySelector('[data-intro-note]').textContent=story?(n.characterShotEnabled||n.authorShotEnabled?'角色与作者是两张独立海报镜头，每幕可设 0.5–600 秒，并分别调整画面和字幕位置。统一滤镜在下方「画面后处理」设置；圆环运动始终连续。':'两个镜头都已关闭，直接进入主展示。'):n.introStyle==='model'?'先让模型与动态几何出场。名字保持正常排版大小，信息在展示页淡入。':'沿用原版大字开场，角色名从画面中心缩回信息区。';
    group.querySelector('[data-ending-controls]').hidden=!n.outroEnabled;
    group.querySelector('[data-ending-color]').hidden=n.outroColorMode!=='custom';
    group.querySelector('[data-show-playback]').hidden=n.outroEnabled;
    group.querySelector('[data-show-duration-label]').textContent=continuous?'导出展示时长 · 秒':'展示时长 · 秒';
    group.querySelector('[data-show-duration-note]').textContent=continuous?'网页 / OBS 持续播放，不受此时长限制；此处用于 AE 导出及进度预览。':'1–60 秒 · 循环播放时为每轮时长 · AE 同步使用';
    group.querySelector('[data-shutdown-controls]').hidden=!n.shutdownEnabled;
    group.querySelector('#studio-shutdown-duration').max=Math.min(1.5,n.outroDuration*.45);
    group.querySelector('[data-ending-map]').classList.toggle('is-disabled',!n.outroEnabled);
    group.querySelector('[data-ending-note]').textContent=!n.outroEnabled?(continuous?'引入只播放一次，随后停留在展示页。圆环、背景、文字与滚动边框持续运动；暂停后继续也不会重播。':'引入只播放一次，展示页按设定时长重新播放入场。'):(n.outroContent==='logo'&&!images.logo?'尚未上传 Logo，暂用品牌字样。请在「角色与品牌 → 署名与品牌 Logo」上传。':'沿用「角色与品牌」中的字样 / Logo。')+(n.outroTrigger==='manual'?'点击预览下的「片尾」，或在 OBS 源交互中按 E 进入。AE 按 '+n.showDuration+' 秒展示段落导出。':'展示 '+n.showDuration+' 秒后进入片尾。')+(n.shutdownEnabled?'最后 '+n.shutdownDuration+' 秒收成亮线与光点，连同边框一起关机，最后停在全黑画面。':'最后停在品牌画面。');
    for(const view of views){view.section.querySelector('[data-ending-preview]').disabled=!n.outroEnabled;view.ending.dataset.style=n.outroStyle;view.ending.classList.toggle('uses-logo',n.outroContent!=='word'&&!!images.logo);const word=view.ending.querySelector('.ending-word');word.textContent=state.brand||'YOUR STUDIO';word.style.color=n.outroColorMode==='custom'?n.outroColor:'';if(images.logo)view.ending.querySelector('img').src=images.logo;}
  }};
}
function drawStudioNarrative(view,pose){
  view.art.classList.toggle('model-first-intro',state.narrative.introStyle==='model');
  view.art.style.setProperty('--detail',pose.info);view.art.style.setProperty('--model-detail',pose.model);
  view.stack.style.opacity=pose.titleAlpha;
  view.composition.style.opacity=(1-pose.outro)*(pose.story?pose.story.main:1);
  // Borders are persistent framing, independent of the title/content sequence.
  view.art.querySelectorAll('.edge').forEach(el=>el.style.opacity='1');
  const ending=view.ending,quiet=state.narrative.outroStyle==='quiet';
  ending.style.opacity=pose.outro;ending.style.visibility=pose.outro>0?'visible':'hidden';ending.setAttribute('aria-hidden',String(pose.outro===0));
  const lockup=ending.querySelector('.ending-lockup');lockup.style.opacity=pose.brand;
  lockup.style.transform=`translateY(${(1-pose.brand)*12}px) scale(${.975+.025*pose.brand})`;
  const stroke=ending.querySelector('.ending-stroke');stroke.style.transform=`scaleX(${pose.mark})`;
  const orbit=ending.querySelector('.ending-orbit');orbit.style.opacity=quiet?0:pose.mark*(state.narrative.outroStyle==='orbit'?.65:.16);
  orbit.style.transform=`translate(-50%,-50%) rotate(${-24+motionClock.elapsed*3}deg) scale(${.86+.14*pose.mark})`;
  const spark=ending.querySelector('.ending-spark');spark.style.opacity=quiet?0:pose.mark;spark.style.transform=`rotate(${45+pose.mark*90}deg) scale(${pose.mark})`;
  const content=ending.querySelector('.ending-content');content.style.transform=`translateX(${pose.jitter*100}cqw) scaleY(${1-pose.shutter})`;content.style.opacity=pose.flicker;
  const shutdown=view.shutdown;shutdown.style.visibility=pose.shutdown>0?'visible':'hidden';
  shutdown.querySelectorAll('.shutdown-shutter').forEach(el=>el.style.transform=`scaleY(${pose.shutter})`);
  const signal=shutdown.querySelector('.shutdown-line');signal.style.opacity=pose.signal;signal.style.transform=`translate(-50%,-50%) scaleX(${pose.signalWidth})`;
  const glow=shutdown.querySelector('.shutdown-beam-glow');glow.style.opacity=pose.signal*.72;glow.style.transform=signal.style.transform;
  for(const selector of ['.shutdown-dot','.shutdown-dot-glow']){const dot=shutdown.querySelector(selector);dot.style.opacity=pose.dot;dot.style.transform=`translate(-50%,-50%) scale(${pose.dotScale})`;}
  shutdown.querySelector('.shutdown-flash').style.opacity=pose.flash;
  shutdown.querySelector('.shutdown-scan').style.opacity=pose.scan;
  if(typeof drawStudioStoryIntro==='function')drawStudioStoryIntro(view,pose);
  if(typeof drawStudioPostProcessing==='function')drawStudioPostProcessing(view,pose);
}

const narrativeUI=mountStudioNarrative(root,views);
// Resolution changes sampling density, never the design's logical layout.
function studioReferenceSize(portrait){return portrait?{width:1080,height:1920}:{width:1920,height:1080}}
function studioOutputLayout(width,height,portrait,cover=false){
  const reference=studioReferenceSize(portrait);
  return {...reference,scale:(cover?Math.max:Math.min)(width/reference.width,height/reference.height)};
}
function scaleStudioAEScene(scene,width,height){
  const scale=width/scene.width;
  if(Math.abs(height/scene.height-scale)>.00001)throw Error('输出尺寸必须与画幅比例一致');
  const box=value=>{const result={...value};for(const key of ['x','y','w','h','fontSize','radius'])if(typeof result[key]==='number')result[key]*=scale;return result};
  const points=value=>value.map(pair=>pair.map(n=>n*scale));
  const paths=value=>value.map(p=>({...p,v:points(p.v),i:points(p.i),o:points(p.o)}));
  const layer=value=>({...box(value),...(value.points?{points:points(value.points)}:{}),...(value.icon?{icon:box(value.icon)}:{})});
  return {...scene,width,height,frameThickness:scene.frameThickness*scale,
    ...(scene.borderAppearance?{borderAppearance:{...scene.borderAppearance,lineWidth:scene.borderAppearance.lineWidth*scale}}:{}),
    layers:scene.layers.map(layer),
    ...(scene.story?{story:{...scene.story,shots:scene.story.shots.map(shot=>({...shot,layers:shot.layers.map(layer)}))}}:{}),
    geometry:scene.geometry.map(op=>({...op,...(op.introTransform?{introTransform:{...op.introTransform,from:op.introTransform.from.map(n=>n*scale),to:op.introTransform.to.map(n=>n*scale)}}:{}),width:op.width*scale,paths:paths(op.paths),samples:op.samples.map(sample=>({...sample,...(typeof sample.width==='number'?{width:sample.width*scale}:{}),paths:paths(sample.paths)}))})),
    ending:{...scene.ending,word:box(scene.ending.word)}
  };
}

// Canvas paths recorded as AE-native vector vertices in composition coordinates.
// Lighting gradients become their middle colour; original artwork stays in HTML.
function createAECanvasRecorder(){
  let m=[1,0,0,1,0,0],paths=[],path=null,introTransform=null,introOpacity=null,introRotation=0;const stack=[],ops=[];
  const round=x=>Math.round(x*100)/100,pt=(x,y)=>[round(m[0]*x+m[2]*y+m[4]),round(m[1]*x+m[3]*y+m[5])];
  const ctx={globalAlpha:1,fillStyle:'#000000',strokeStyle:'#000000',lineWidth:1,lineCap:'butt',lineJoin:'miter',shadowBlur:0,shadowOffsetX:0,shadowOffsetY:0,shadowColor:'transparent'};
  const color=value=>typeof value==='string'?value:value?.stops?.[Math.floor((value.stops?.length||1)/2)]?.[1]||'#888888';
  const next=(x,y)=>{path={v:[pt(x,y)],i:[[0,0]],o:[[0,0]],closed:false};paths.push(path)};
  ctx.beginPath=()=>{paths=[];path=null};ctx.moveTo=next;
  ctx.lineTo=(x,y)=>{if(!path)return next(x,y);path.v.push(pt(x,y));path.i.push([0,0]);path.o.push([0,0])};
  ctx.bezierCurveTo=(x1,y1,x2,y2,x,y)=>{if(!path)next(x,y);const a=path.v.at(-1),b=pt(x1,y1),c=pt(x2,y2),d=pt(x,y);path.o[path.o.length-1]=[round(b[0]-a[0]),round(b[1]-a[1])];path.v.push(d);path.i.push([round(c[0]-d[0]),round(c[1]-d[1])]);path.o.push([0,0])};
  ctx.quadraticCurveTo=(x1,y1,x,y)=>{if(!path)return next(x,y);const a=path.v.at(-1),b=pt(x1,y1),c=pt(x,y);path.o[path.o.length-1]=[round((b[0]-a[0])*2/3),round((b[1]-a[1])*2/3)];path.v.push(c);path.i.push([round((b[0]-c[0])*2/3),round((b[1]-c[1])*2/3)]);path.o.push([0,0])};
  ctx.closePath=()=>{if(path)path.closed=true};
  ctx.rect=(x,y,w,h)=>{next(x,y);ctx.lineTo(x+w,y);ctx.lineTo(x+w,y+h);ctx.lineTo(x,y+h);ctx.closePath()};
  const multiply=n=>{const a=m;m=[a[0]*n[0]+a[2]*n[1],a[1]*n[0]+a[3]*n[1],a[0]*n[2]+a[2]*n[3],a[1]*n[2]+a[3]*n[3],a[0]*n[4]+a[2]*n[5]+a[4],a[1]*n[4]+a[3]*n[5]+a[5]]};
  ctx.transform=(...a)=>multiply(a);ctx.setTransform=(...a)=>{m=a};ctx.translate=(x,y)=>multiply([1,0,0,1,x,y]);ctx.scale=(x,y)=>multiply([x,0,0,y,0,0]);ctx.rotate=a=>multiply([Math.cos(a),Math.sin(a),-Math.sin(a),Math.cos(a),0,0]);
  ctx.getTransform=()=>({a:m[0],b:m[1],c:m[2],d:m[3],e:m[4],f:m[5]});
  const keys=['globalAlpha','fillStyle','strokeStyle','lineWidth','lineCap','lineJoin','shadowBlur','shadowOffsetX','shadowOffsetY','shadowColor'];
  ctx.studioIntroTransform=pose=>{introTransform={from:pt(pose.fromX,pose.fromY),to:pt(pose.toX,pose.toY),scale:pose.scale}};
  ctx.studioIntroOpacity=value=>{introOpacity=value};
  ctx.studioIntroRotation=value=>{introRotation=value};
  ctx.save=()=>stack.push({m:[...m],s:Object.fromEntries(keys.map(k=>[k,ctx[k]])),introTransform,introOpacity,introRotation});ctx.restore=()=>{const s=stack.pop();if(s){m=s.m;introTransform=s.introTransform;introOpacity=s.introOpacity;introRotation=s.introRotation;Object.assign(ctx,s.s)}};
  ctx.ellipse=(x,y,rx,ry,rotation,start,end,ccw=false)=>{
    let delta=end-start;if(!ccw){while(delta<0)delta+=Math.PI*2;delta=Math.min(delta,Math.PI*2)}else{while(delta>0)delta-=Math.PI*2;delta=Math.max(delta,-Math.PI*2)}
    const pieces=Math.max(1,Math.ceil(Math.abs(delta)/(Math.PI/2)-1e-9)),step=delta/pieces;
    const p=a=>[x+Math.cos(rotation)*rx*Math.cos(a)-Math.sin(rotation)*ry*Math.sin(a),y+Math.sin(rotation)*rx*Math.cos(a)+Math.cos(rotation)*ry*Math.sin(a)];
    const tangent=a=>[-Math.cos(rotation)*rx*Math.sin(a)-Math.sin(rotation)*ry*Math.cos(a),-Math.sin(rotation)*rx*Math.sin(a)+Math.cos(rotation)*ry*Math.cos(a)];
    const first=p(start);if(!path)next(...first);else ctx.lineTo(...first);
    for(let j=0;j<pieces;j++){const a=start+j*step,b=a+step,k=4/3*Math.tan(step/4),u=p(a),v=p(b),ta=tangent(a),tb=tangent(b);ctx.bezierCurveTo(u[0]+k*ta[0],u[1]+k*ta[1],v[0]-k*tb[0],v[1]-k*tb[1],...v)}
  };
  ctx.arc=(x,y,r,a,b,c)=>ctx.ellipse(x,y,r,r,0,a,b,c);
  const emit=kind=>{if(!paths.length)return;let pose=introTransform&&structuredClone(introTransform);if(pose&&introRotation){const to=[m[4],m[5]],delta=to.map((n,d)=>n-pose.to[d]);pose={...pose,from:pose.from.map((n,d)=>n+delta[d]*pose.scale),to,rotation:introRotation*180/Math.PI*(m[0]*m[3]-m[1]*m[2]<0?-1:1)}}ops.push({paths:structuredClone(paths),kind,color:color(kind==='fill'?ctx.fillStyle:ctx.strokeStyle),alpha:round(Math.max(0,Math.min(1,ctx.globalAlpha))),width:round(ctx.lineWidth*Math.hypot(m[0],m[1])),cap:ctx.lineCap==='round'?2:1,...(pose?{introTransform:pose}:{}),...(introOpacity!==null?{introOpacity}:{})})};
  ctx.fill=()=>emit('fill');ctx.stroke=()=>emit('stroke');ctx.fillRect=(...a)=>{const old=paths,oldPath=path;paths=[];ctx.rect(...a);emit('fill');paths=old;path=oldPath};
  ctx.clearRect=()=>{};ctx.clip=()=>{};ctx.setLineDash=()=>{};ctx.getLineDash=()=>[];
  ctx.createLinearGradient=ctx.createRadialGradient=()=>{const g={stops:[],addColorStop(t,c){this.stops.push([t,c])}};return g};
  return {ctx,ops};
}

// Measure the actual in-between curve, rather than assuming a rotating path
// can be linearly morphed between widely spaced snapshots.
function studioAEGeometryError(a,b,actual,fraction){
  if(!a||!b||!actual||a.kind!==b.kind||a.kind!==actual.kind||a.paths.length!==b.paths.length||a.paths.length!==actual.paths.length)return Infinity;
  const mix=(x,y)=>x+(y-x)*fraction;
  let error=Math.max(Math.abs(mix(a.alpha,b.alpha)-actual.alpha)*100,Math.abs(mix(a.width,b.width)-actual.width));
  for(let p=0;p<a.paths.length;p++){
    const x=a.paths[p],y=b.paths[p],z=actual.paths[p];
    if(x.closed!==y.closed||x.closed!==z.closed||x.v.length!==y.v.length||x.v.length!==z.v.length)return Infinity;
    for(let j=0;j<x.v.length;j++)for(const tangent of [null,'i','o']){
      const vx=mix(x.v[j][0]+(tangent?x[tangent][j][0]:0),y.v[j][0]+(tangent?y[tangent][j][0]:0));
      const vy=mix(x.v[j][1]+(tangent?x[tangent][j][1]:0),y.v[j][1]+(tangent?y[tangent][j][1]:0));
      error=Math.max(error,Math.hypot(vx-z.v[j][0]-(tangent?z[tangent][j][0]:0),vy-z.v[j][1]-(tangent?z[tangent][j][1]:0)));
    }
  }
  return error;
}
async function captureStudioAEGeometry(paint,duration,options={}){
  const tolerance=options.tolerance??.25,reference=paint(duration),limit=options.limit??100,minStep=1/((options.fps===60?60:30)*4);
  const score=op=>{const points=op.paths.flatMap(p=>p.v);if(!points.length)return 0;const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return (Math.max(...xs)-Math.min(...xs))*(Math.max(...ys)-Math.min(...ys))+op.width*100};
  const selected=reference.map((op,i)=>({i,score:score(op)})).sort((a,b)=>b.score-a.score).slice(0,limit).map(item=>item.i).sort((a,b)=>a-b);
  const geometry=selected.map(i=>({...reference[i],samples:[]}));
  let captures=1;
  if(!geometry.length)return {geometry,captures,total:reference.length};
  // Export must also finish in a background tab, where animation frames pause.
  const pause=options.yield||(()=>new Promise(resolve=>setTimeout(resolve,0)));
  async function frame(time){
    if(++captures%32===0)await pause();
    const ops=paint(time);return selected.map(i=>ops[i]);
  }
  function append(index,time,op){
    const samples=geometry[index].samples,sample={time,paths:op.paths,alpha:op.alpha,width:op.width};
    // Keep the start/end of a hold. Dropping every identical key would let the
    // next moving key drift backward through what should be a stationary span.
    const asOp=s=>({...s,kind:geometry[index].kind});
    if(samples.length>1&&studioAEGeometryError(asOp(samples.at(-2)),asOp(samples.at(-1)),op,0)<1e-8&&studioAEGeometryError(asOp(samples.at(-1)),asOp(samples.at(-1)),op,0)<1e-8)samples[samples.length-1]=sample;
    else samples.push(sample);
  }
  let left=await frame(0);for(let i=0;i<geometry.length;i++){
    if(!Number.isFinite(studioAEGeometryError(left[i],left[i],reference[selected[i]],0)))throw Error('几何路径的结构发生变化，请更换几何样式后重试。');
    append(i,0,left[i]);
  }
  const all=geometry.map((_,i)=>i);
  for(let start=0;start<duration;){
    const end=Math.min(duration,start+.5),right=await frame(end),cache=new Map([[start,left],[end,right]]);
    const get=async time=>{if(!cache.has(time))cache.set(time,await frame(time));return cache.get(time)};
    async function refine(aTime,bTime,a,b,active){
      const span=bTime-aTime,mid=(aTime+bTime)/2,q1=await get(aTime+span*.25),m=await get(mid),q3=await get(aTime+span*.75),split=[];
      for(const i of active){
        const error=Math.max(studioAEGeometryError(a[i],b[i],q1[i],.25),studioAEGeometryError(a[i],b[i],m[i],.5),studioAEGeometryError(a[i],b[i],q3[i],.75));
        if(!Number.isFinite(error))throw Error('几何路径的结构发生变化，请更换几何样式后重试。');
        if(error>tolerance&&span>minStep)split.push(i);else append(i,bTime,b[i]);
      }
      if(split.length){await refine(aTime,mid,a,m,split);await refine(mid,bTime,m,b,split)}
    }
    await refine(start,end,left,right,all);left=right;start=end;
  }
  return {geometry,captures,total:reference.length};
}

// Capture at the shared logical resolution; uniformly scale editable data last.
async function collectStudioAEScene(view,options){
  const {width,height}=studioReferenceSize(options.width<options.height),v=state.variants[view.key],art=view.art;
  const saved={style:art.style.cssText,time:state.time,clock:motionClock,motion:v.textMotion,playing:state.playing};
  const packedAssets=[],layers=[],warnings=['Canvas 金属、云雾渐变转为近似纯色形状；细毛纤维简化。CSS 滤镜、毛玻璃与颗粒不会逐像素还原。'];
  const addAsset=(data,ext='png')=>{const file='assets/asset-'+String(packedAssets.length+1).padStart(3,'0')+'.'+ext;packedAssets.push({name:file,data});return file};
  const round=x=>Math.round(x*100)/100;
  const rgba=value=>{const c=document.createElement('canvas');c.width=c.height=1;const cx=c.getContext('2d');cx.fillStyle=value||'#000';cx.fillRect(0,0,1,1);return [...cx.getImageData(0,0,1,1).data].map(x=>x/255)};
  let scene,base;
  const visible=el=>{for(let n=el;n&&n!==art;n=n.parentElement){const s=getComputedStyle(n);if(s.display==='none'||s.visibility==='hidden'||+s.opacity===0)return false}return el.getBoundingClientRect().width>0};
  function geometry(el){const r=el.getBoundingClientRect(),s=getComputedStyle(el),mat=new DOMMatrix(s.transform==='none'?undefined:s.transform);return {x:round(r.x-base.x+r.width/2),y:round(r.y-base.y+r.height/2),w:round(el.offsetWidth||r.width),h:round(el.offsetHeight||r.height),rotation:round(Math.atan2(mat.b,mat.a)*180/Math.PI)}}
  function alpha(el){let opacity=1;for(let n=el;n&&n!==art;n=n.parentElement)opacity*=+getComputedStyle(n).opacity;return round(opacity)}
  function text(el,name,index=0,target=layers,opaque=false){if(!el||!visible(el)||!el.textContent.trim())return;const css=getComputedStyle(el),g=geometry(el),range=document.createRange();range.selectNodeContents(el);const box=range.getBoundingClientRect();if(box.width&&box.height){g.x=round(box.x-base.x+box.width/2);g.y=round(box.y-base.y+box.height/2);g.w=round(box.width);g.h=round(box.height)}let value=el.textContent.trim().replace(/\s+/g,' ');if(css.textTransform==='uppercase')value=value.toUpperCase();target.push({kind:'text',name,text:value,...g,color:rgba(css.color),opacity:opaque?1:alpha(el),fontFamily:css.fontFamily,fontSize:round(+css.fontSize.replace('px','')),weight:+css.fontWeight||500,italic:css.fontStyle==='italic',tracking:round((+css.letterSpacing.replace('px','')||0)/(+css.fontSize.replace('px','')||1)*1000),entry:index,title:name==='角色名字',shadow:v.effects.shadowEnabled&&v.shadows.title&&name==='角色名字'})}
  function plate(el,pseudo,name){if(!el||!visible(el))return;const s=getComputedStyle(el,pseudo);if(s.display==='none'||s.content==='none'||s.backgroundColor==='rgba(0, 0, 0, 0)'||s.backgroundColor==='transparent')return;const g=geometry(el),n=value=>Number.parseFloat(value)||0;let w=n(s.width),h=n(s.height);if(!w)w=g.w-n(s.left)-n(s.right);if(!h)h=g.h-n(s.top)-n(s.bottom);if(w<=0||h<=0)return;
    let x=n(s.left),y=s.top==='auto'?g.h-n(s.bottom)-h:n(s.top);const m=new DOMMatrix(s.transform==='none'?undefined:s.transform),angle=g.rotation+Math.atan2(m.b,m.a)*180/Math.PI;
    let points=[[0,0],[w,0],[w,h],[0,h]];const poly=s.clipPath.match(/^polygon\((.*)\)$/);if(poly)points=poly[1].split(',').map(p=>p.trim().split(/\s+/).map((n,i)=>n.endsWith('%')?parseFloat(n)/100*(i?h:w):parseFloat(n)));
    const a=g.rotation*Math.PI/180,c=Math.cos(a),sn=Math.sin(a),cx=x+w/2-g.w/2,cy=y+h/2-g.h/2;
    layers.push({kind:'plate',name,x:round(g.x+cx*c-cy*sn),y:round(g.y+cx*sn+cy*c),w,h,rotation:round(angle),points:points.map(p=>p.map(round)),color:rgba(s.backgroundColor),opacity:alpha(el)*(+s.opacity||1),entry:-1,title:true});
  }
  function image(el,name,data,entry=6,modelRole){if(!el||!data||!visible(el))return;const ext=data.startsWith('data:image/jpeg')?'jpg':data.startsWith('data:image/webp')?'webp':'png';layers.push({kind:'image',name,...geometry(el),opacity:alpha(el),asset:addAsset(data,ext),fit:getComputedStyle(el).objectFit==='cover'?'cover':'contain',entry,...(modelRole?{modelRole}:{})})}
  const iconJobs=[];
  function surface(el,name){if(!el||!visible(el))return;const css=getComputedStyle(el),color=rgba(css.backgroundColor);if(color[3]<.01)return;const g=geometry(el);let points=[[0,0],[g.w,0],[g.w,g.h],[0,g.h]];const polygon=css.clipPath.match(/^polygon\((.*)\)$/);if(polygon)points=polygon[1].split(',').map(p=>p.trim().split(/\s+/).map((n,i)=>n.endsWith('%')?parseFloat(n)/100*(i?g.h:g.w):parseFloat(n)));layers.push({kind:'plate',name,...g,color,points,opacity:alpha(el),entry:0,title:false})}
  try{
    state.playing=false;
    art.style.setProperty('position','fixed','important');art.style.setProperty('left','-100000px','important');art.style.setProperty('top','0px','important');art.style.setProperty('width',width+'px','important');art.style.setProperty('height',height+'px','important');art.style.setProperty('max-width','none','important');art.style.setProperty('transform','none','important');art.style.setProperty('--preview-width',width+'px');
    state.time=state.introDuration+Math.min(6,studioShowDuration(state.narrative)*.98);motionClock=createMotionClock(0,state.variants,state.edges);v.textMotion=false;measure(view);draw(view);base=art.getBoundingClientRect();
    const cs=getComputedStyle(art),composition=view.composition.getBoundingClientRect();
    scene={version:1,name:state.name||'SHOWCASE',design:view.key,width,height,fps:options.fps===60?60:30,intro:options.includeIntro?state.introDuration/state.speed:0,duration:((options.includeIntro?state.introDuration:0)+studioShowDuration(state.narrative)+(state.narrative.outroEnabled?state.narrative.outroDuration:0))/state.speed,speed:state.speed,offset:options.includeIntro?0:state.introDuration,background:rgba(cs.getPropertyValue('--paper')),ink:rgba(cs.getPropertyValue('--ink')),accent:rgba(v.accent),transparent:options.transparent,frame:state.frame,frameThickness:round(parseFloat(cs.getPropertyValue('--frame-thickness'))),layers,assets:[],warnings,geometry:[],motion:{enabled:saved.motion,style:v.textMotionStyle,amount:v.textMotionAmount,speed:v.textMotionSpeed},shadow:{enabled:v.effects.shadowEnabled,color:rgba(v.effects.shadowColor),strength:v.effects.shadowStrength,depth:v.effects.shadowDepth,soft:v.effects.shadowStyle==='soft'},pattern:{kind:v.grid?v.pattern:'none',opacity:v.gridOpacity,moving:v.gridMoving,amount:v.gridMotion},edges:JSON.parse(JSON.stringify(state.edges)),borderText:{top:[state.brand,state.topText,currentSeries().label+' / '+currentSeries().prefix+'-'+currentSeries().serial,state.name].filter(Boolean).join('     /     '),bottom:[state.modelCredit,state.bottomText,state.designCredit].filter(Boolean).join('     /     ')}};
    scene.showDuration=studioShowDuration(state.narrative)/state.speed;
    const border=state.borderAppearance,customBorder=border.mode==='custom';
    scene.borderAppearance={style:customBorder?border.style:'solid',background:rgba(customBorder?border.background:'#090b10'),text:rgba(customBorder?border.text:'#f4efe1'),accent:rgba(customBorder?border.accent:v.accent),opacity:customBorder?border.opacity:1,lineWidth:width*border.lineWidth/100};
    scene.narrative={introStyle:state.narrative.introStyle,nameReveal:state.narrative.nameReveal,nameDelay:state.narrative.nameDelay,transitionStart:scene.intro/6,transitionDuration:scene.intro*.8,infoDuration:.85/state.speed,endingTransitionDuration:Math.min(.8/state.speed,(state.narrative.outroEnabled?state.narrative.outroDuration/state.speed:3.5)*.28)};
    const post=state.narrative;
    scene.post={effect:post.postEffect,strength:post.postStrength,glow:post.postGlow,speed:post.postSpeed*state.speed,fade:post.postFade/state.speed,scenes:{character:post.postCharacter,author:post.postAuthor,show:post.postShow,outro:post.postOutro}};
    if(scene.post.effect!=='none'&&scene.post.strength>0&&Object.values(scene.post.scenes).some(Boolean))warnings.push('后处理已拆为独立原生调整层与光效层，素材可自由叠放。AE 对炫光、波纹、辉光与色散使用内置效果及矢量近似，外观不与网页逐像素一致。');
    if(options.includeIntro&&scene.intro>0&&state.narrative.introStyle==='story'){
      const n=state.narrative,shots=[];let cursor=0;
      for(const role of ['character','author'])if(n[role+'ShotEnabled']!==false){const duration=Number.isFinite(n[role+'ShotDuration'])?n[role+'ShotDuration']:(role==='character'?2.5:2);shots.push({role,start:cursor/state.speed,duration:duration/state.speed,corner:n[role+'Corner']|| (role==='character'?'tl-br':'tr-bl'),effect:'none',strength:0,effectSpeed:scene.post.speed,layers:[]});cursor+=duration;}
      const transition=Number.isFinite(n.storyTransitionDuration)?n.storyTransitionDuration:.6;
      scene.story={enabled:true,transitionStart:cursor/state.speed,transitionDuration:transition/state.speed,packagingOnly:n.storyPackagingOnly===true,flash:n.storyFlash===true,shots};
      scene.narrative.transitionStart=scene.story.transitionStart;scene.narrative.transitionDuration=scene.story.transitionDuration;scene.narrative.infoDuration=scene.story.transitionDuration;
    }
    scene.ending={shutdownEnabled:state.narrative.shutdownEnabled,shutdownDuration:state.narrative.shutdownDuration/state.speed,duration:state.narrative.outroEnabled?state.narrative.outroDuration/state.speed:0,style:state.narrative.outroStyle,brand:state.brand||'YOUR STUDIO',colorMode:state.narrative.outroColorMode,color:rgba(getComputedStyle(view.ending.querySelector('.ending-word')).color),logoAsset:'',word:geometry(view.ending.querySelector('.ending-word'))};
    if(scene.ending.duration&&state.narrative.outroContent!=='word'&&images.logo){const data=images.logo;scene.ending.logoAsset=addAsset(data,data.startsWith('data:image/jpeg')?'jpg':data.startsWith('data:image/webp')?'webp':'png')}
    if(state.type){
      surface(art.querySelector('.art-edition'),'系列标牌底板');surface(art.querySelector('.edition-label'),'系列标签底板');surface(art.querySelector('.dual-handle'),'贴纸底板');
      plate(view.name,'::before','标题色块');plate(view.name,'::after','标题细线');
      for(const [selector,name,index]of [['.brand-word','品牌',0],['.edition-label','系列',0],['.edition-type','系列编号',0],['.hello','引导短句',0],['.hero-name','角色名字',-1],['.copy-caption','中文短句',1],['.copy-subtitle','英文短句',2],['.serial','作品编号',7],['.model-credit','模型署名',7],['.design-credit','设计署名',7],['.issue-stamp','档案编号',7],['.language-note','装饰文字',7],['.dual-handle','双画面贴纸',7]])text(art.querySelector(selector),name,index);
      text(art.querySelector('.formats'),'交付格式',3);const formats=layers.find(l=>l.name==='交付格式');if(formats)formats.text=Object.keys(state.formats).filter(k=>state.formats[k]).map(k=>k.toUpperCase()).join('  /  ');
      for(const badge of art.querySelectorAll('.compatibility')){if(!visible(badge))continue;const g=geometry(badge),css=getComputedStyle(badge),id=badge.dataset.badge;layers.push({kind:'badge',name:'适配 · '+id,...g,color:rgba(css.backgroundColor),ink:rgba(css.color),radius:round(parseFloat(css.borderRadius)||0),opacity:alpha(badge),style:v.badgeStyle,entry:4,text:badge.querySelector('.badge-name').textContent,sub:badge.querySelector('.badge-compatible')?.textContent||''});
        const symbol=badge.querySelector('.badge-symbol'),sg=geometry(symbol),official=assetsForAE(id),svg=symbol.querySelector('svg');
        if(official)iconJobs.push({layer:layers.at(-1),box:sg,uri:official,color:css.color,mask:true});else if(svg)iconJobs.push({layer:layers.at(-1),box:sg,svg:new XMLSerializer().serializeToString(svg),color:css.color});
      }
      const qr=art.querySelector('.qr-mark');if(qr.classList.contains('has-image'))image(qr.querySelector('img'),'二维码',images.qr,6);else if(qr.classList.contains('has-code'))image(qr.querySelector('canvas'),'二维码',qr.querySelector('canvas').toDataURL('image/png'),6);
      const barcode=art.querySelector('.barcode-slot');image(barcode.querySelector(images.barcode?'img':'canvas'),'条码',images.barcode||barcode.querySelector('canvas').toDataURL('image/png'),7);
      image(art.querySelector('.art-brand .brand-image'),'品牌 Logo',images.logo,0);
    }
    if(options.includeCharacters){image(art.querySelector('.character-image'),'角色主图',images.model,2,'show');image(art.querySelector('.portrait-crop img'),'角色特写',images.portrait,3,'show')}
    if(scene.story){
      const mainTime=state.time,series=currentSeries(),layer=view.storyLayer||art.querySelector('.story-intro');
      for(const shot of scene.story.shots){
        state.time=(shot.start+shot.duration*.55)*state.speed;measure(view);draw(view);base=art.getBoundingClientRect();
        const element=layer?.querySelector('[data-story-role="'+shot.role+'"]'),changed=[];
        const force=(node,values)=>{if(!node)return;changed.push([node,node.style.cssText]);for(const[key,value]of Object.entries(values))node.style.setProperty(key,value,'important')};
        force(layer,{display:'block',visibility:'visible',opacity:'1'});force(element,{display:'block',visibility:'visible',opacity:'1',transform:'none'});
        const label=shot.role==='character'?'片头角色':'片头作者',fallback=shot.role==='character'?[
          ['.story-kicker','引导','CHARACTER / '+series.label],['.story-title','名字',state.name],['.story-meta-label','编号','EDITION / '+series.prefix+'-'+series.serial],['.story-meta','说明',series.caption]
        ]:[['.story-kicker','引导','CREATOR / CREDITS'],['.story-title','名字',state.brand||'YOUR STUDIO'],['.story-meta-label','署名',state.modelCredit],['.story-meta','说明',state.designCredit]];
        try{
          if(element){
            const img=element.querySelector('.story-image'),data=shot.role==='character'?(images.introCharacter||images.model||images.portrait):(images.introAuthor||images.portrait||images.model);
            if(options.includeCharacters&&!scene.story.packagingOnly&&img&&data){
              force(img,{visibility:'visible',opacity:'1'});const css=getComputedStyle(img),g=geometry(img),rect=img.getBoundingClientRect(),pos=css.objectPosition.split(/\s+/).map(value=>parseFloat(value)/100);
              shot.layers.push({kind:'image',name:label+' · 素材',...g,w:round(rect.width),h:round(rect.height),opacity:1,asset:addAsset(data,data.startsWith('data:image/jpeg')?'jpg':data.startsWith('data:image/webp')?'webp':'png'),fit:css.objectFit==='contain'?'contain':'cover',objectPosition:pos.length===2&&pos.every(Number.isFinite)?pos:[.5,.5],entry:0});
            }
            for(const[selector,title]of fallback){const node=element.querySelector(selector);force(node,{visibility:'visible',opacity:'1',transform:'none'});text(node,label+' · '+title,0,shot.layers,true)}
          }else{
            warnings.push(label+'版式无法测量，已用可编辑的逻辑海报版式代替。');
            const centered=shot.corner==='center',right=['tr-bl','br-tl'].includes(shot.corner),flipped=['bl-tr','br-tl'].includes(shot.corner),x=width*(centered?.5:right?.73:.27),opposite=width*(centered?.5:right?.27:.73),top=height*.15,bottom=height*.84;
            for(let i=0;i<fallback.length;i++){const title=i===1,size=width*(title?.10:.014),primary=i<2,y=centered?height*([.39,.49,.59,.63][i]):primary?(flipped?bottom:top)+(title?(flipped?-1:1)*height*.09:0):(flipped?top:bottom)+(i===3?height*.035:0);shot.layers.push({kind:'text',name:label+' · '+fallback[i][1],text:fallback[i][2],x:primary?x:opposite,y,w:width*(title?.42:.4),h:size*1.3,rotation:0,color:scene.ink,opacity:1,fontFamily:getComputedStyle(view.name).fontFamily,fontSize:size,weight:title?800:600,italic:false,tracking:title?-30:80,entry:0,title:false,shadow:false})}
          }
        }finally{for(const[node,style]of changed.reverse())node.style.cssText=style}
      }
      state.time=mainTime;measure(view);draw(view);base=art.getBoundingClientRect();
      if(scene.story.shots.some(shot=>shot.effect!=='none'&&shot.strength>0))warnings.push('双镜头片头特效以独立原生扫描线 / 全息光带 / 偏振色带近似重建；网页滤镜和素材着色不会逐像素复制。');
    }
    // Continuous rotation is sampled at its settled pose. Native AE group
    // transforms carry the independently editable intro transition.
    const captured=await captureStudioAEGeometry(time=>{const t=time*state.speed+scene.offset,r=createAECanvasRecorder();r.ctx.translate(composition.x-base.x,composition.y-base.y);paintExploration(r.ctx,composition.width,composition.height,t,view.key,{...v,transparent:true,pattern:'none',grid:false,floor:false,ringTime:t*v.ringSpeed,introProgress:1,ringStyle:v.geometryBySeries[state.series],portrait:state.ratio==='portrait',swapped:state.swapped,motion:true,shadow:false});return r.ops},scene.duration,{fps:scene.fps,limit:view.key==='plush'?70:100});
    if(captured.geometry.length<captured.total)warnings.push('细密纤维已简化：保留 '+captured.geometry.length+' 组可编辑主形状。');
    scene.geometry=captured.geometry.map(op=>({...op,color:rgba(op.color)}));
    if(v.effects.gradient!=='none'||v.effects.grain||v.effects.vignette)warnings.push('背景渐变、暗角与颗粒未映射；可在 AE 中继续添加效果。');
  }finally{art.style.cssText=saved.style;state.time=saved.time;state.playing=saved.playing;motionClock=saved.clock;v.textMotion=saved.motion;measure(view);draw(view);workspace.sync()}
  function assetsForAE(id){return ['vrcft','liltoon','poiyomi'].includes(id)?assets[id]?.dataUri:null}
  // Rasterize only graphic marks; all copy, badge surfaces and main geometry stay native.
  for(const job of iconJobs){
    const size=256*options.width/width,c=document.createElement('canvas');c.width=c.height=size;const cx=c.getContext('2d'),img=new Image();
    let uri=job.uri;if(job.svg){let svg=job.svg.replace(/currentColor/g,job.color);if(!svg.includes('xmlns='))svg=svg.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" ');uri='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg)}
    try{await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('图标加载超时')),8000);img.onload=()=>{clearTimeout(timer);resolve()};img.onerror=()=>{clearTimeout(timer);reject(Error('图标加载失败'))};img.src=uri});cx.drawImage(img,0,0,size,size);if(job.mask){cx.globalCompositeOperation='source-in';cx.fillStyle=job.color;cx.fillRect(0,0,size,size)}job.layer.icon={asset:addAsset(c.toDataURL('image/png')),...job.box}}catch{warnings.push(job.layer.name+' 图形未能打包，保留可编辑文字标识。')}
  }
  for(const asset of packedAssets)if(asset.name.endsWith('.webp')){const img=new Image();await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('素材加载超时')),8000);img.onload=()=>{clearTimeout(timer);resolve()};img.onerror=()=>{clearTimeout(timer);reject(Error('素材加载失败'))};img.src=asset.data});const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);const old=asset.name;asset.name=old.replace('.webp','.png');asset.data=c.toDataURL('image/png');for(const group of [layers,...(scene.story?.shots||[]).map(shot=>shot.layers)])for(const l of group)if(l.asset===old)l.asset=asset.name;if(scene.ending.logoAsset===old)scene.ending.logoAsset=asset.name}
  scene.assets=packedAssets.map(a=>a.name);return {scene:scaleStudioAEScene(scene,options.width,options.height),assets:packedAssets};
}

// Clean stage previews and export controls. Native Spout transport belongs to OBS.
function mountStudioOutput(root,views){
  const exported=globalThis.studioOutput?.enabled===true;
  const make=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text)el.textContent=text;return el};
  const action=(text)=>{const el=make('button','btn',text);el.type='button';return el};
  const actions=root.querySelector('.studio-header-actions'),open=action('输出 / AE 模板');open.classList.add('studio-output-button');open.dataset.outputOpen='';actions.append(open);
  const dialog=make('dialog','studio-output-dialog');dialog.setAttribute('aria-labelledby','studio-output-heading');
  dialog.innerHTML=`<div class="studio-output-heading"><div><span class="studio-kicker">EXPORT STUDIO</span><h2 id="studio-output-heading">把设计带到下一站</h2></div></div>
  <div class="studio-output-tabs" role="tablist" aria-label="输出用途"><button type="button" role="tab" id="output-tab-obs" aria-controls="output-panel-obs" aria-selected="true" data-output-tab="obs">OBS 纯画面</button><button type="button" role="tab" id="output-tab-ae" aria-controls="output-panel-ae" aria-selected="false" data-output-tab="ae">AE 可编辑模板</button></div>
  <div class="studio-output-panel" id="output-panel-obs" role="tabpanel" aria-labelledby="output-tab-obs" data-output-panel="obs"><p><strong>只把展示页面送进 OBS。</strong><br>下载后添加为「浏览器」源。无需将浏览器窗口全屏，也不会录入编辑面板和地址栏。</p></div>
  <div class="studio-output-panel" id="output-panel-ae" role="tabpanel" aria-labelledby="output-tab-ae" data-output-panel="ae" hidden><p><strong>文字、角色、圆环、滤镜与边框分层编辑。</strong><br>下载 ZIP，在 AE 运行导入脚本，即可另存为可编辑 .aep。绿色 MODEL / REPLACE 容器用于替换角色素材，紫色 FX 图层用于修改后处理。</p><p>片头素材与字幕一起经过滤镜，展示角色位于滤镜上方。边框始终独立；即使没有上传角色图，也会保留空素材容器。</p><p>滤镜使用 AE 内置效果与矢量近似；复杂渐变、金属、云雾与细毛会简化，不逐像素还原。桌面未安装的字体会被 AE 替代。</p></div>
  <div class="studio-output-fields"><div class="direction-field studio-output-wide" data-obs-field><label for="studio-output-layers">OBS 输出结构</label><select id="studio-output-layers" class="form-select"><option value="combined">一体网页源 · 一次导入完整画面</option><option value="separate">三层网页源 · 画面 + 光效 + 边框</option></select><small>三层输出方便在 OBS 中自由叠放角色素材。</small></div><div class="direction-field"><label for="studio-output-resolution">输出尺寸</label><select id="studio-output-resolution" class="form-select"><option value="1080">1080p</option><option value="2160">4K</option></select></div>
  <div class="direction-field" data-obs-field><label for="studio-output-start">打开时从哪里开始</label><select id="studio-output-start" class="form-select"><option value="intro">完整片头 → 展示 → 已启用的片尾</option><option value="show">直接展示（按片尾设置）</option></select></div>
  <div class="direction-field" data-obs-field><label for="studio-output-fit">画幅不同时如何适配</label><select id="studio-output-fit" class="form-select"><option value="contain">完整显示 · 可能留边</option><option value="cover">铺满裁切 · 可能裁边</option></select></div>
  <div class="direction-field" data-ae-field hidden><label for="studio-output-fps">AE 帧率</label><select id="studio-output-fps" class="form-select"><option value="30">30 fps</option><option value="60">60 fps</option></select></div></div>
  <p class="studio-note">1080p 与 4K 使用相同排版。4K 仅提高清晰度，文字、标识、圆环和边框占比保持一致。</p>
  <div class="studio-output-checks"><label class="form-check"><input class="form-check-input" type="checkbox" id="studio-output-transparent"><span>透明底 · 用于叠加</span></label><label class="form-check"><input class="form-check-input" type="checkbox" id="studio-output-characters"><span>包含角色预览图片</span></label><label class="form-check" data-ae-field hidden><input class="form-check-input" type="checkbox" id="studio-output-ae-intro"><span>包含引入页动画</span></label></div>
  <div class="studio-output-summary" data-output-summary></div>
  <div class="studio-output-layer-guide" data-layer-guide hidden><strong>OBS 图层顺序 · 从上到下</strong><ol><li><span>03</span> 边框 <small>始终清晰，独立编辑</small></li><li><span>02</span> 光效 <small>透明的扫描线、波纹与炫光</small></li><li><span>01</span> 画面 <small>背景、文字与预览素材</small></li></ol><p>外部角色素材：开场放在「光效」下方，展示页放在「光效」上方、边框下方。运行 START-LAYERS.cmd 打开同步控制页，统一重播、暂停或切换镜头。首次使用需要 Node.js 18 或更新版本。</p><p>光效源仅作透明叠加，无法读取其他 OBS 源的像素。真正的辉光、色散与画面变形保留在「画面」源内；外部角色需要这类处理时，请在 OBS 或 AE 中添加。</p></div>
  <p class="studio-output-preview-note" data-obs-field>「单独 HTML」导出完整自动流程：从片头开始，按设定时长播放展示和已启用的片尾；关闭片尾时持续展示或循环。起点和手动片尾选项仅用于 OBS 输出包。</p>
  <details class="studio-output-guide" data-obs-field><summary>OBS 导入方式 / Spout2</summary><ol><li>下载输出包并完整解压，双击 PREPARE-OBS.cmd 生成场景文件。</li><li>OBS「场景集合 → 导入」选择生成的 IMPORT-IN-OBS.json。</li><li>OBS「设置 → 视频」基础画布设为上方所示尺寸；场景集合不会可靠地修改全局视频设置。</li></ol><p data-output-import-guide>也可手动添加浏览器源 → 本地文件 → output.html，宽高与输出尺寸相同。不要使用窗口捕获。</p><p>若需要 Spout2，可在 OBS 中为各浏览器源添加 obs-spout2-plugin 的 Spout Filter。网页自身不直接发送 Spout2。</p><p>快捷键：空格暂停 / 继续，R 重播引入页，S 跳至展示，E 进入片尾（OBS 中先打开源的「交互」）。</p></details>
  <details class="studio-output-guide" data-ae-field hidden><summary>AE 导入与编辑</summary><ol><li>先生成模板，再点击「下载 AE 模板」。解压 ZIP，保持 assets 素材文件夹完整。</li><li>AE「文件 → 脚本 → 运行脚本文件」选择 IMPORT_TO_AE.jsx。</li><li>打开 01 MAIN，在 CONTROLS 调颜色与动效；各合成内可继续编辑文字、路径和素材，最后保存为 .aep。</li></ol><p>转场可以在 AE 继续调整：Show Transition Start / Duration 控制圆环与大字过渡，Information Start / Fade Duration 控制信息入场，Ending Start / Transition Duration 控制进入片尾。单位均为秒，不改变圆环旋转速度。</p><p>老电视关机的亮线、光点、余辉和遮罩是独立图层；边框始终独立。改变转场参数不会自动延长合成总时长。</p><p>这会添加独立文件夹与合成，不关闭已有项目。模板使用当前设置的片头、展示时长，以及已启用的品牌片尾与关机动画。</p></details>
  <p class="studio-output-status" role="status" aria-live="polite"></p>`;
  const footer=make('div','studio-output-footer'),close=action('返回编辑'),preview=action('预览纯画面'),htmlDownload=action('单独 HTML'),download=action('下载 OBS 输出包');download.classList.add('btn-primary');download.dataset.outputDownload='';preview.dataset.outputPreview='';close.dataset.outputClose='';footer.append(close,preview,htmlDownload,download);dialog.append(footer);root.append(dialog);
  const resolution=dialog.querySelector('#studio-output-resolution'),layers=dialog.querySelector('#studio-output-layers'),start=dialog.querySelector('#studio-output-start'),fit=dialog.querySelector('#studio-output-fit'),fps=dialog.querySelector('#studio-output-fps'),aeIntro=dialog.querySelector('#studio-output-ae-intro'),transparent=dialog.querySelector('#studio-output-transparent'),characters=dialog.querySelector('#studio-output-characters'),status=dialog.querySelector('[role="status"]');
  let mode='obs',prepared=null,busy=false;
  function dimensions(){const scale=state.output.resolution==='2160'?2:1;return state.ratio==='portrait'?[1080*scale,1920*scale]:[1920*scale,1080*scale]}
  function config(kind='obs'){const [width,height]=dimensions();return {enabled:true,width,height,transparent:state.output.transparent,includeCharacters:state.output.includeCharacters,start:kind==='html'?'intro':state.output.start,fit:state.output.fit,obsLayers:kind==='html'?'combined':state.output.obsLayers,...(kind==='html'?{playback:'complete'}:{})}}
  function downloadLabel(){return state.output.obsLayers==='separate'?'下载 OBS 三层输出包':'下载 OBS 输出包'}
  function resetPrepared(){prepared=null;download.textContent=mode==='ae'?'生成 AE 模板':downloadLabel()}
  function settingsChanged(){state.output={...state.output,resolution:resolution.value,obsLayers:layers.value,start:start.value,fit:fit.value,fps:+fps.value,aeIntro:aeIntro.checked,transparent:transparent.checked,includeCharacters:characters.checked};resetPrepared();status.textContent='';update()}
  for(const input of [resolution,layers,start,fit,fps,aeIntro,transparent,characters])input.addEventListener('change',settingsChanged);
  function switchMode(next){mode=next;resetPrepared();status.textContent='';for(const tab of dialog.querySelectorAll('[data-output-tab]')){tab.setAttribute('aria-selected',String(tab.dataset.outputTab===mode));tab.tabIndex=tab.dataset.outputTab===mode?0:-1}for(const panel of dialog.querySelectorAll('[data-output-panel]'))panel.hidden=panel.dataset.outputPanel!==mode;for(const field of dialog.querySelectorAll('[data-obs-field]'))field.hidden=mode!=='obs';for(const field of dialog.querySelectorAll('[data-ae-field]'))field.hidden=mode!=='ae';htmlDownload.hidden=preview.hidden=mode!=='obs';ui.sync()}
  for(const tab of dialog.querySelectorAll('[data-output-tab]')){tab.addEventListener('click',()=>switchMode(tab.dataset.outputTab));tab.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();switchMode(mode==='obs'?'ae':'obs');dialog.querySelector('[aria-selected="true"]').focus()}})}
  open.addEventListener('click',()=>{status.textContent='';resetPrepared();ui.sync();dialog.showModal()});close.addEventListener('click',()=>dialog.close());
  const exitHint=make('div','studio-clean-hint','纯画面预览 · Esc 返回编辑');exitHint.hidden=true;root.append(exitHint);
  function setClean(enabled){
    root.classList.toggle('is-clean-output',enabled);root.classList.toggle('is-transparent-output',enabled&&state.output.transparent);root.classList.toggle('output-hide-characters',enabled&&!state.output.includeCharacters);
    document.documentElement.classList.toggle('studio-output-root',enabled);document.body.classList.toggle('studio-output-body',enabled);
    exitHint.hidden=!enabled||exported;exitHint.classList.toggle('is-visible',enabled&&!exported);workspace.sync();
  }
  preview.addEventListener('click',()=>{dialog.close();setClean(true)});
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&!exported&&root.classList.contains('is-clean-output')){event.preventDefault();setClean(false);return}
    if(!exported||event.ctrlKey||event.altKey||event.metaKey||/INPUT|SELECT|TEXTAREA/.test(event.target?.tagName))return;
    if(event.code==='Space'){event.preventDefault();if(!state.playing&&!studioContinuousShow(state.narrative)&&state.time>=studioTotalDuration(state.introDuration,state.narrative)){state.time=0;motionClock=createMotionClock(0,state.variants,state.edges)}state.playing=!state.playing;last=0;update()}
    else if(event.key.toLowerCase()==='r'){state.time=0;motionClock=createMotionClock(0,state.variants,state.edges);state.playing=true;last=0;update()}
    else if(event.key.toLowerCase()==='s'){state.time=state.introDuration;state.playing=true;last=0;update()}
    else if(event.key.toLowerCase()==='e'&&state.narrative.outroEnabled){state.time=state.introDuration+studioShowDuration(state.narrative);state.playing=true;last=0;update()}
  });
  function htmlPayload(kind){const packed=Object.fromEntries(Object.entries(images).filter(([key,value])=>value&&(state.output.includeCharacters||!['model','portrait','introCharacter','introAuthor'].includes(key))&&(!state.narrative.storyPackagingOnly||!['introCharacter','introAuthor'].includes(key))));const snapshot=JSON.parse(JSON.stringify(state));if(kind==='html')snapshot.output.obsLayers='combined';snapshot.variantEncoding='tuple-v1';snapshot.variants=encodeStudioVariants(state.variants);return {kind,state:snapshot,images:packed,config:config(kind)}}
  async function exportDesign(kind){
    if(busy)return;busy=true;download.disabled=htmlDownload.disabled=close.disabled=true;for(const field of dialog.querySelectorAll('input,select,[data-output-tab]'))field.disabled=true;
    try{
      if(!globalThis.downloadStudioOutput)throw new Error('请从完整本地工作台打开此功能。');
      if(kind==='ae'&&!prepared){status.textContent='正在生成原生图层与圆环关键帧…';download.textContent='生成中…';const [width,height]=dimensions();prepared=await collectStudioAEScene(views.find(v=>!v.section.hidden),{width,height,fps:state.output.fps,includeIntro:state.output.aeIntro,transparent:state.output.transparent,includeCharacters:state.output.includeCharacters});download.textContent='下载 AE 模板';status.textContent='模板已就绪：'+prepared.scene.layers.length+' 个信息图层 / '+prepared.scene.geometry.length+' 组可编辑几何。点击「下载 AE 模板」保存 ZIP。';return}
      status.textContent='正在打包下载…';
      // A second deliberate click downloads an asynchronously prepared AE package.
      // This preserves the sandbox user-activation boundary even for large assets.
      const result=await globalThis.downloadStudioOutput(kind==='ae'?{kind,...prepared}:htmlPayload(kind));
      status.textContent='已发起下载：'+result.filename+'。请查看浏览器下载列表。';
    }catch(err){status.textContent='导出未完成：'+err.message;if(kind==='ae')resetPrepared()}finally{busy=false;download.disabled=htmlDownload.disabled=close.disabled=false;for(const field of dialog.querySelectorAll('input,select,[data-output-tab]'))field.disabled=false}
  }
  download.addEventListener('click',()=>exportDesign(mode));htmlDownload.addEventListener('click',()=>exportDesign('html'));
  const ui={sync(){
    resolution.value=state.output.resolution;layers.value=state.output.obsLayers||'combined';start.value=state.output.start;transparent.checked=state.output.transparent;characters.checked=state.output.includeCharacters;fit.value=state.output.fit;fps.value=String(state.output.fps);aeIntro.checked=state.output.aeIntro;
    const separate=mode==='obs'&&state.output.obsLayers==='separate';dialog.querySelector('[data-layer-guide]').hidden=!separate;dialog.querySelector('[data-output-import-guide]').textContent=separate?'三层模式请先运行 START-LAYERS.cmd，再导入生成的场景文件。若手动添加，请使用服务生成的网页地址，并保持三个源宽高一致。':'也可手动添加浏览器源 → 本地文件 → output.html，宽高与输出尺寸相同。不要使用窗口捕获。';if(mode==='obs'&&!busy)download.textContent=downloadLabel();
    const [width,height]=dimensions();dialog.querySelector('[data-output-summary]').textContent=width+' × '+height+' · '+(state.output.transparent?'透明底':'完整背景')+(mode==='obs'?(separate?' · 三层源 / 同步控制':' · 一体网页源'):' · '+state.output.fps+' fps 可编辑合成')+' · 引入 '+((mode==='ae'&&!state.output.aeIntro)||(mode==='obs'&&state.output.start==='show')?0:state.introDuration)+' 秒 / '+(mode==='obs'&&studioContinuousShow(state.narrative)?'持续展示':'展示 '+state.narrative.showDuration+' 秒')+(state.narrative.outroEnabled?' / 片尾 '+state.narrative.outroDuration+' 秒':mode==='obs'&&!studioContinuousShow(state.narrative)?' · 循环':'');
    for(const option of resolution.options){const scale=option.value==='2160'?2:1,portrait=state.ratio==='portrait';option.textContent=(scale===2?'4K':'1080p')+' · '+(portrait?1080*scale:1920*scale)+' × '+(portrait?1920*scale:1080*scale)}
    const loop=root.querySelector('.studio-loop-note');if(loop)loop.textContent='引入 '+state.introDuration+'s'+(studioContinuousShow(state.narrative)?'':' · 展示 '+state.narrative.showDuration+'s')+(state.narrative.outroEnabled?(state.narrative.outroTrigger==='manual'?' 循环 · 片尾待命':' · 片尾 '+state.narrative.outroDuration+'s'):studioContinuousShow(state.narrative)?' · 持续展示 ∞':' 循环');
  }};
  ui.sync();if(exported){root.classList.add('is-exported-output');setClean(true)}return ui;
}

// All three OBS sources sample one clock. Reloading / reactivating one source
// catches it up to the others instead of replaying its own opening.
let studioSharedLayerClock=null;
const studioLayerConfig=globalThis.studioOutput?.sync?globalThis.studioOutput:null;
function mountStudioLayerSync(){
  if(!studioLayerConfig)return;
  const config=studioLayerConfig;
  root.dataset.outputLayer=config.layer;
  state.playing=false;
  window.addEventListener('message',event=>{
    const value=event.data;
    if(event.source!==window.parent||value?.type!=='studio:layer-clock'||value.key!==config.sync.key)return;
    const c=value.clock;
    if(!c||c.key!==config.sync.key||!Number.isFinite(c.elapsed)||c.elapsed<0||!Number.isFinite(c.timestampMs)||typeof c.playing!=='boolean'||!['intro','show','ending'].includes(c.mode))return;
    studioSharedLayerClock={elapsed:c.elapsed,timestampMs:c.timestampMs,playing:c.playing,mode:c.mode};
  });
  document.addEventListener('keydown',event=>{
    if(event.ctrlKey||event.altKey||event.metaKey||/INPUT|SELECT|TEXTAREA/.test(event.target?.tagName))return;
    const key=event.key.toLowerCase(),command=event.code==='Space'?(studioSharedLayerClock?.playing?'pause':'resume'):key==='r'?'restart':key==='s'?'show':key==='e'?'ending':null;
    if(!command)return;event.preventDefault();event.stopImmediatePropagation();
    window.parent.postMessage({type:'studio:layer-command',key:config.sync.key,command},'*');
  },true);
  window.parent.postMessage({type:'studio:layer-ready',key:config.sync.key},'*');
}
function studioLayerClockPose(clock,now,intro,narrative,speed){
  const base=clock.mode==='show'?intro:clock.mode==='ending'?intro+studioShowDuration(narrative):0;
  const elapsed=Math.max(0,clock.elapsed+(clock.playing?Math.max(0,now-clock.timestampMs)/1000:0))*speed;
  const time=studioAdvanceTime(base,elapsed,intro,narrative),total=studioTotalDuration(intro,narrative),finished=narrative.outroEnabled&&time>=total;
  return {time,motionTime:finished?total:base+elapsed,playing:clock.playing&&!finished};
}
function studioApplyLayerClock(){
  if(!studioLayerConfig)return false;
  const clock=studioSharedLayerClock;
  if(!clock){state.playing=false;return true;}
  const pose=studioLayerClockPose(clock,Date.now(),state.introDuration,state.narrative,state.speed);
  state.time=pose.time;state.playing=pose.playing;
  motionClock=createMotionClock(pose.motionTime,state.variants,state.edges);return true;
}

const outputUI=mountStudioOutput(root,views);
mountStudioLayerSync();
function glyph(b){const holder=document.createElement('span');holder.className='badge-symbol';const src=['vrcft','liltoon','poiyomi'].includes(b.id)?assets[b.id]?.dataUri:null;if(src){const mark=document.createElement('span');mark.className='badge-official';mark.setAttribute('aria-hidden','true');mark.style.maskImage=`url("${src}")`;mark.style.webkitMaskImage=`url("${src}")`;holder.append(mark)}else{const icon=document.createElement('i');icon.dataset.lucide=b.icon;icon.setAttribute('aria-hidden','true');holder.append(icon)}return holder}
const picker=root.querySelector('[data-badge-options]');for(const b of catalog){const label=document.createElement('label');label.className='form-check';const input=document.createElement('input');input.type='checkbox';input.className='form-check-input';input.dataset.badge=b.id;const text=document.createElement('span');text.className='form-check-label';text.textContent=b.name+(b.sub==='COMPATIBLE'?' Compatible':b.id==='face'?' Tracking':'');label.append(input,text);picker.append(label);input.addEventListener('change',()=>{const list=new Set(state.badges);input.checked?list.add(b.id):list.delete(b.id);state.badges=catalog.filter(x=>list.has(x.id)).map(x=>x.id);update()})}
function renderBadges(view){const key=state.badges.join('|');if(view.badgeKey===key)return;view.badgeKey=key;view.informationItems=null;view.art.querySelectorAll('.compatibility').forEach(x=>x.remove());const row=view.art.querySelector('.marks'),qr=row.querySelector('.qr-mark');for(const b of catalog.filter(x=>state.badges.includes(x.id))){const item=document.createElement('div');item.className='compatibility';item.dataset.badge=b.id;item.dataset.layer='badge-'+b.id;item.setAttribute('aria-label',b.name+' '+(b.description||b.sub||'Shader'));const label=document.createElement('strong');label.className='badge-name';label.textContent=b.name;item.append(glyph(b),label);if(b.sub){const sub=document.createElement('span');sub.className='badge-compatible';sub.textContent=b.sub;item.append(sub)}row.insertBefore(item,qr)}globalThis.lucide?.createIcons({attrs:{width:16,height:16}})}
function error(text){const box=root.querySelector('[data-error]');box.textContent=text;box.hidden=!text}
function renderCodes(view){const e=currentSeries(),id=(e.prefix||'ID')+'-'+(e.serial||'001');if(view.codeKey!==id){view.codeKey=id;JsBarcode(view.art.querySelector('.barcode'),id,{format:'CODE128',displayValue:false,lineColor:'#000',background:'#fff',margin:5,marginTop:2,marginBottom:2,height:32,width:2})}
const slot=view.art.querySelector('.qr-mark');slot.classList.toggle('has-image',!!images.qr);if(images.qr)slot.querySelector('img').src=images.qr;
const barcode=view.art.querySelector('.barcode-slot');barcode.classList.toggle('has-image',!!images.barcode);if(images.barcode)barcode.querySelector('img').src=images.barcode;
if(view.qrKey!==state.qrUrl){view.qrKey=state.qrUrl;view.qrError=false;slot.classList.remove('has-code');if(state.qrUrl.trim()){try{const url=new URL(state.qrUrl);if(!['http:','https:'].includes(url.protocol))throw Error('url');const qr=qrcode(0,'M');qr.addData(url.href);qr.make();const n=qr.getModuleCount(),unit=5,quiet=4,c=slot.querySelector('canvas'),ctx=c.getContext('2d');c.width=c.height=(n+quiet*2)*unit;ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#000';for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(qr.isDark(y,x))ctx.fillRect((x+quiet)*unit,(y+quiet)*unit,unit,unit);slot.classList.add('has-code')}catch{view.qrError=true}}}}
function rgba(hex,alpha){const n=parseInt(hex.slice(1),16);return `rgba(${n>>16},${(n>>8)&255},${n&255},${alpha})`}
function blendHex(a,b,p){const x=parseInt(a.slice(1),16),y=parseInt(b.slice(1),16);return '#'+[16,8,0].map(shift=>Math.round(((x>>shift)&255)*(1-p)+((y>>shift)&255)*p).toString(16).padStart(2,'0')).join('')}
function badgeColors(v){if(v.badgePalette==='custom')return [v.badgeColor,v.badgeInk];if(v.badgePalette==='mono')return ['#000000','#ffffff'];const key=Object.keys(state.variants).find(key=>state.variants[key]===v),p=designLanguagePalette(key,v.background==='dark');if(p)return [blendHex(p.paper,v.accent,v.background==='dark'?.13:.10),p.ink];return v.background==='dark'?['#363d41','#d5d9d3']:['#dce2d5','#405045']}
function effects(view){const v=state.variants[view.key],e=v.effects,dark=v.background==='dark',art=view.art,palette=languageKeys.includes(view.key)?designLanguagePalette(view.key,dark):view.key==='dual'?{ink:dark?'#eef0df':'#232b24',paper:dark?'#171e1b':'#eeefdf'}:{ink:dark?'#f3f0e5':'#212a24',paper:dark?'#141b20':'#eff1e8'};art.dataset.background=v.background;art.style.setProperty('--accent',v.accent);art.style.setProperty('--ink',palette.ink);art.style.setProperty('--paper',palette.paper);art.style.setProperty('--language-muted',palette.muted||palette.ink);art.style.setProperty('--ornament-alpha',v.cutStrength);
art.dataset.typeface=v.typeface;art.dataset.badgeStyle=v.badgeStyle;const [badgeColor,badgeInk]=badgeColors(v);art.style.setProperty('--badge-surface',rgba(badgeColor,v.badgeOpacity));art.style.setProperty('--badge-ink',badgeInk);const rgb=v.accent.match(/[0-9a-f]{2}/gi).map(s=>parseInt(s,16)/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4);art.style.setProperty('--accent-contrast',rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722>.27?'#16201a':'#fff8ea');
const strength=e.gradeEnabled?e.gradeStrength:0,grades={original:[1,1,1,0,0],chrome:[1.02,1.24,.12,.03,0],cold:[.99,1.14,.78,.20,155],warm:[1.07,1.05,.85,.31,-12],faded:[1.13,.8,.7,.14,0],vivid:[1.03,1.17,1.35,0,0]},g=grades[e.grade];const filter=`brightness(${lerp(1,g[0],strength)}) contrast(${lerp(1,g[1],strength)}) saturate(${lerp(1,g[2],strength)}) sepia(${g[3]*strength}) hue-rotate(${g[4]*strength}deg)`;art.style.setProperty('--field-filter',filter);art.style.setProperty('--model-grade',e.gradeModel?filter:'none');
const ac=rgba(v.accent,.9),bc=rgba(e.gradientColor,.9),x=state.ratio==='portrait'?'50%':state.swapped?'33%':'67%',fills={none:'none',spotlight:`radial-gradient(ellipse at 92% 6%,${ac},transparent 65%)`,diagonal:`linear-gradient(125deg,${ac},transparent 48%,${bc})`,halo:`radial-gradient(ellipse at ${x} 52%,${bc},transparent 64%)`,aurora:`radial-gradient(ellipse at 80% 10%,${ac},transparent 58%),radial-gradient(ellipse at 25% 90%,${bc},transparent 60%)`};art.style.setProperty('--atmosphere',fills[e.gradient]);art.style.setProperty('--wash-alpha',e.gradient==='none'?0:e.gradientStrength);art.style.setProperty('--grain',e.grain);art.style.setProperty('--vignette',e.vignette);art.style.setProperty('--title-fill',e.titleGradient?`linear-gradient(125deg,color-mix(in srgb,${v.accent},#fff 20%),${v.accent} 45%,color-mix(in srgb,${v.accent},#111 24%))`:v.accent);
const active=e.shadowEnabled&&e.shadowStrength>0&&e.shadowDepth>0,s=e.shadowStrength,d=e.shadowDepth,soft=e.shadowStyle==='soft',unit=n=>(n*d).toFixed(3)+'cqw',ink=rgba(e.shadowColor,s*(soft?.6:.75)),ambient=rgba(e.shadowColor,s*.4);const cast=soft?`drop-shadow(${unit(.3)} ${unit(.8)} ${unit(1.05)} ${ambient}) drop-shadow(0 ${unit(.12)} ${unit(.18)} ${ink})`:`drop-shadow(${unit(.65)} ${unit(.8)} 0 ${ink}) drop-shadow(0 ${unit(.2)} ${unit(.3)} ${ambient})`;art.style.setProperty('--name-cast',active&&v.shadows.title?cast:'none');art.style.setProperty('--mark-cast',active&&v.shadows.badges?`${unit(soft?.2:.36)} ${unit(soft?.55:.46)} ${unit(soft?.65:0)} ${ink},0 ${unit(.3)} ${unit(.5)} ${ambient}`:'none');art.style.setProperty('--character-cast',active&&v.shadows.model?`drop-shadow(${unit(.65)} ${unit(1.1)} ${unit(soft?1.2:.3)} ${ink})`:'none');}
function grain(view){const c=view.art.querySelector('.grain-canvas');c.width=192;c.height=108;const ctx=c.getContext('2d'),image=ctx.createImageData(c.width,c.height);let seed=2718;for(let i=0;i<image.data.length;i+=4){seed=(1664525*seed+1013904223)>>>0;image.data[i]=image.data[i+1]=image.data[i+2]=seed>>>24;image.data[i+3]=255}ctx.putImageData(image,0,0)}
// Use unanimated layout coordinates, so the clearance never chases moving text.
function fitPosterCopy(view){
if(!['poster','district','tuner','arcade'].includes(view.key)&&!studioTypographyLayoutChanged(state.typography))return;
const title=view.name,caption=view.art.querySelector('.copy-caption'),subtitle=view.art.querySelector('.copy-subtitle');
caption.style.removeProperty('top');subtitle.style.removeProperty('top');
if(!title.offsetWidth||!caption.offsetHeight)return;
const transform=(point,css)=>{const [ox,oy]=css.transformOrigin.split(' ').map(parseFloat),m=new DOMMatrix(css.transform==='none'?undefined:css.transform);return {x:m.a*(point.x-ox)+m.c*(point.y-oy)+m.e+ox,y:m.b*(point.x-ox)+m.d*(point.y-oy)+m.f+oy}};
const corners=(x,y,w,h)=>[{x,y},{x:x+w,y},{x:x+w,y:y+h},{x,y:y+h}];
const css=getComputedStyle(title),points=corners(0,0,title.offsetWidth,title.offsetHeight);
for(const pseudo of ['::before','::after']){const s=getComputedStyle(title,pseudo);if(s.content==='none'||s.display==='none')continue;const n=value=>parseFloat(value)||0,w=n(s.width),h=n(s.height);if(!w||!h)continue;const x=s.left==='auto'?title.offsetWidth-n(s.right)-w:n(s.left),y=s.top==='auto'?title.offsetHeight-n(s.bottom)-h:n(s.top);for(const p of corners(0,0,w,h)){const q=transform(p,s);points.push({x:q.x+x,y:q.y+y})}}
const v=state.variants[view.key],e=v.effects,shadow=e.shadowEnabled&&v.shadows.title&&e.shadowStrength>0?view.w/100*e.shadowDepth*(e.shadowStyle==='soft'?2.9:1.4):0;
const motion=v.textMotion?clamp(view.w/736,.6,2.4)*v.textMotionAmount*8:0,gap=Math.max(4,view.w*.012)+motion;
const bottom=view.stack.offsetTop+title.offsetTop+Math.max(...points.map(p=>transform(p,css).y))+shadow;
const c=getComputedStyle(caption),relative=corners(0,0,caption.offsetWidth,caption.offsetHeight).map(p=>transform(p,c).y),top=Math.max(caption.offsetTop,bottom+gap-Math.min(...relative));
caption.style.top=top.toFixed(3)+'px';
if(subtitle.offsetHeight)subtitle.style.top=Math.max(subtitle.offsetTop,top+Math.max(...relative)+Math.max(3,view.w*.007)+motion*.5).toFixed(3)+'px';
}
function fitText(view){if(!view.w)return;for(const [key,el] of [['name',view.name],['caption',view.art.querySelector('.copy-caption')],['subtitle',view.art.querySelector('.copy-subtitle')]]){el.style.fontSize='';el.style.whiteSpace='';el.style.overflowWrap='';if(key==='subtitle'&&!studioTypographyLayoutChanged({subtitle:state.typography.subtitle}))continue;studioTypographyStyle(el,key);const base=studioTypographyFontSize(el,key),style=getComputedStyle(el),ctx=view.ctx;ctx.font=`${style.fontStyle} ${style.fontWeight} ${base}px ${style.fontFamily}`;const text=el.textContent,width=ctx.measureText(text).width+(Array.from(text).length-1)*(parseFloat(style.letterSpacing)||0),usable=el.clientWidth*.97;if(width>usable&&usable>0){const target=base*usable/width;el.style.fontSize=Math.max(11,target)+'px';if(target<11){el.style.whiteSpace='normal';el.style.overflowWrap='anywhere'}}}
fitPosterCopy(view);
const compact=state.ratio==='portrait'&&view.w<340;view.art.classList.toggle('compact-portrait',compact);for(const b of catalog){const label=view.art.querySelector(`[data-badge="${b.id}"] .badge-name`);if(label)label.textContent=state.ratio==='portrait'&&view.w<390&&b.id==='poiyomi'?'POI':b.name}}
function edgeColumn(lines){const unit=document.createElement('span');unit.className='edge-unit';const column=document.createElement('span');column.className='edge-column';for(const [text,className]of lines){const line=document.createElement('span');line.className='edge-line '+(className||'');line.textContent=text;column.append(line)}unit.append(column);return unit}
function renderEdgeContent(view){
const e=currentSeries(),edition=(e.label||'EDITION')+' / '+(e.prefix||'ID')+'-'+(e.serial||'001'),key=JSON.stringify([state.brand,state.topText,state.name,state.modelCredit,state.bottomText,state.designCredit,edition]);
if(view.edgeKey===key&&view.edgeLogo===images.logo)return;
view.edgeKey=key;view.edgeLogo=images.logo;view.edgeTracks={};
for(const side of ['top','bottom']){const edge=view.art.querySelector('.edge.'+side),track=edge.querySelector('.edge-track'),cycle=document.createElement('div');cycle.className='edge-cycle';
const first=side==='top'?edgeColumn([[state.brand,''],[state.topText,'edge-small']]):edgeColumn([[state.modelCredit,''],[state.bottomText,'edge-small']]);
if(side==='top'&&images.logo){const line=first.querySelector('.edge-line');line.textContent='';const logo=document.createElement('img');logo.className='edge-marquee-logo';logo.alt='';logo.onload=()=>{measureEdgeTracks(view);drawBorderMotion(view)};logo.src=images.logo;line.append(logo)}
const second=side==='top'?edgeColumn([[edition,'edge-highlight'],[state.name,'edge-small']]):edgeColumn([[state.designCredit,'edge-highlight']]);
for(const item of [first,second]){cycle.append(item);const separator=document.createElement('span');separator.className='edge-separator';separator.textContent='✦';cycle.append(separator)}
track.replaceChildren(cycle,cycle.cloneNode(true));view.edgeTracks[side]={edge,track,cycle,width:0};}
}
function measureEdgeTracks(view){if(!view.edgeTracks||state.frame==='none')return;const lane=state.frame==='vertical'?view.art.offsetHeight:view.art.offsetWidth;for(const part of Object.values(view.edgeTracks)){for(const cycle of part.track.children)cycle.style.minWidth=lane+'px';part.width=parseFloat(getComputedStyle(part.cycle).width)||lane}}
function renderBorderControls(){syncStudioBorderControls();for(const side of ['top','bottom']){const select=document.getElementById('direction-edge-'+side),vertical=state.frame==='vertical',negative=vertical?(side==='top'?'向下':'向上'):'向左',positive=vertical?(side==='top'?'向上':'向下'):'向右';select.querySelector('[value="negative"]').textContent=negative;select.querySelector('[value="positive"]').textContent=positive;select.querySelector('[value="still"]').textContent='静态排版';select.value=state.edges[side].direction;document.getElementById('direction-edge-'+side+'-duration').value=state.edges[side].duration;root.querySelector(`[data-edge-duration="${side}"]`).value=state.edges[side].duration+' s'}}
function drawBorderMotion(view){if(!view.edgeTracks)return;for(const side of ['top','bottom']){const part=view.edgeTracks[side],active=state.edges[side].direction!=='still'&&!reduced.matches;part.edge.classList.toggle('is-scrolling',active);part.track.style.transform=`translateX(${marqueeOffset(motionClock.edges[side],part.width).toFixed(3)}px)`}}
function informationItems(view){if(view.informationItems)return view.informationItems;const items=[['.art-edition',0,1],['.copy-caption',1,1],['.copy-subtitle',2,.6],['.formats',3,1],['.art-credit',7,.6]].map(([selector,index,alpha])=>({el:view.art.querySelector(selector),index,alpha}));
view.art.querySelectorAll('.compatibility').forEach((el,index)=>items.push({el,index:4+index*.22,alpha:1}));items.push({el:view.art.querySelector('.qr-mark'),index:6.1,alpha:1,code:true},{el:view.art.querySelector('.archive-line'),index:7,alpha:1,code:true});view.informationItems=items;return items}
function drawInformationMotion(view){const v=state.variants[view.key],np=studioNarrativePose(state.time,state.introDuration,state.narrative),active=v.textMotion&&!reduced.matches&&v.textMotionAmount>0,phase=motionClock.texts[view.key],scale=clamp(view.w/736,.6,2.4),title=view.name;
view.art.querySelector('.technical').style.opacity=active?'1':'';
if(active){const pose=informationMotionPose(studioNarrativeTime(state.time,state.introDuration),phase,-1,v.textMotionStyle,v.textMotionAmount*.6);title.style.translate=`${(pose.x*scale).toFixed(3)}px ${(pose.y*scale).toFixed(3)}px`;title.style.scale=pose.scale.toFixed(5)}else{title.style.removeProperty('translate');title.style.removeProperty('scale')}
for(const item of informationItems(view)){const {el,index,alpha}=item;if(!active){for(const property of ['translate','scale','opacity'])el.style.removeProperty(property);continue}const pose=informationMotionPose(studioNarrativeTime(state.time,state.introDuration),phase,index,v.textMotionStyle,v.textMotionAmount),entrance=(1-pose.entry)*v.textMotionAmount*scale;el.style.opacity=(pose.entry*alpha*np.info).toFixed(4);
if(item.code){el.style.removeProperty('translate');el.style.removeProperty('scale');continue}
const x=pose.x*scale-(v.textMotionStyle==='refined'?6*entrance:0),y=pose.y*scale+(v.textMotionStyle==='refined'?0:8*entrance);el.style.translate=`${x.toFixed(3)}px ${y.toFixed(3)}px`;el.style.scale=pose.scale.toFixed(5);}}
function measure(view){if(view.section.hidden)return;
const output=!!view.outputScale,outer=output?{width:view.art.offsetWidth,height:view.art.offsetHeight}:view.art.getBoundingClientRect();if(!outer.width)return;
const frame=state.frame==='none'?0:Math.max(32,Math.min(66,outer.width*.048));view.art.style.setProperty('--frame-thickness',frame+'px');view.art.style.setProperty('--outer-height',outer.height+'px');view.art.style.setProperty('--safe-x',state.frame==='vertical'?frame+'px':'0px');view.art.style.setProperty('--safe-y',state.frame==='horizontal'?frame+'px':'0px');
const rect=output?{width:view.composition.clientWidth,height:view.composition.clientHeight}:view.composition.getBoundingClientRect(),dpr=view.previewRasterScale||Math.min((devicePixelRatio||1)*(output?Math.max(1,view.outputScale):1),2);
view.w=rect.width;view.h=rect.height;const width=Math.round(view.w*dpr),height=Math.round(view.h*dpr);if(view.canvas.width!==width||view.canvas.height!==height){view.canvas.width=width;view.canvas.height=height}view.ctx.setTransform(dpr,0,0,dpr,0,0);fitText(view);measureEdgeTracks(view)}
function sync(){workspace.sync();typographyUI.sync();narrativeUI.sync();outputUI.sync();renderBorderControls();const e=currentSeries();for(const[key,id]of Object.entries(sharedFields)){const input=document.getElementById(id);if(input.value!==state[key])input.value=state[key]}root.querySelectorAll('[data-series-field]').forEach(el=>{el.value=e[el.dataset.seriesField]});document.getElementById('direction-type').checked=state.type;document.getElementById('direction-speed').value=state.speed;root.querySelector('[data-speed-value]').value=state.speed.toFixed(1)+'×';root.querySelectorAll('[data-format]').forEach(el=>el.checked=state.formats[el.dataset.format]);picker.querySelectorAll('[data-badge]').forEach(el=>el.checked=state.badges.includes(el.dataset.badge));
for(const view of views){const {art,section,key}=view,v=state.variants[key];section.querySelector('[data-seek]').max=studioTotalDuration(state.introDuration,state.narrative);art.classList.toggle('is-portrait',state.ratio==='portrait');art.classList.toggle('is-swapped',state.swapped);art.classList.toggle('has-frame',state.frame!=='none');art.classList.toggle('no-type',!state.type);art.classList.toggle('is-dense',state.badges.length>5);if(key==='dual'){art.classList.toggle('dual-guides',v.dualGuides);art.style.setProperty('--dual-split',(v.dualSplit*100)+'%');}art.dataset.frame=state.frame;const border=state.borderAppearance,custom=border.mode==='custom';art.dataset.frameStyle=custom?border.style:'solid';art.style.setProperty('--frame-background',custom?rgba(border.background,border.opacity):'#090b10');art.style.setProperty('--frame-text',custom?border.text:'#f4efe1');art.style.setProperty('--frame-accent',custom?border.accent:v.accent);art.style.setProperty('--frame-line-width',border.lineWidth+'cqw');for(const kind of ['logo','model','portrait'])art.classList.toggle('has-'+(kind==='model'?'character':kind),!!images[kind]);if(images.logo)art.querySelectorAll('.brand-image').forEach(img=>img.src=images.logo);if(images.model)art.querySelector('.character-image').src=images.model;if(images.portrait)art.querySelector('.portrait-crop img').src=images.portrait;
art.querySelector('.language-note').textContent=languageNotes[key]||'';const urbanHello={district:'CHARACTER / SELECT',tuner:'ORIGINAL SIGNAL',arcade:'HEY, ORIGINAL!'};if(urbanHello[key])art.querySelector('.hello').textContent=urbanHello[key];art.querySelector('.field-canvas').setAttribute('aria-label',(section.dataset.variant||'角色展示')+' · 动态背景与开放展示空间');
view.name.textContent=studioTypographyValue(state.typography,'name',state.name.trim()||'NOVA');art.querySelector('.edition-label').textContent=e.label||'EDITION';art.querySelectorAll('.edition-number,.serial').forEach(el=>el.textContent=(e.prefix||'ID')+'-'+(e.serial||'001'));art.querySelectorAll('.brand-word').forEach(el=>el.textContent=state.brand);for(const[selector,value]of Object.entries({'.copy-caption':studioTypographyValue(state.typography,'caption',e.caption),'.copy-subtitle':studioTypographyValue(state.typography,'subtitle',e.subtitle),'.model-credit':state.modelCredit,'.design-credit':state.designCredit}))art.querySelector(selector).textContent=value;
for(const span of art.querySelectorAll('[data-edge]')){const key=span.dataset.edge;span.textContent=key==='edition'?(e.label||'EDITION')+' / '+(e.prefix||'ID')+'-'+(e.serial||'001'):key==='name'?state.name||'NOVA':state[key]}
art.querySelectorAll('[data-format-item]').forEach(el=>el.hidden=!state.formats[el.dataset.formatItem]);section.querySelector('[data-play]').textContent=state.playing?'暂停动态':'播放动态';section.querySelector('[data-play]').setAttribute('aria-pressed',String(state.playing));section.querySelector('[data-swap]').setAttribute('aria-pressed',String(state.swapped));section.querySelector('[data-swap] span').textContent=state.ratio==='portrait'?'上下互换':'左右互换';
for(const el of section.querySelectorAll('[data-vfield]'))el.value=el.dataset.vfield==='ringStyle'?v.geometryBySeries[state.series]:v[el.dataset.vfield];for(const el of section.querySelectorAll('[data-efield]'))el.value=v.effects[el.dataset.efield];const resolvedBadges=badgeColors(v);for(const el of section.querySelectorAll('[data-vcolor]'))el.value=el.dataset.vcolor==='badgeColor'?resolvedBadges[0]:el.dataset.vcolor==='badgeInk'?resolvedBadges[1]:v[el.dataset.vcolor];for(const el of section.querySelectorAll('[data-ecolor]'))el.value=v.effects[el.dataset.ecolor];for(const el of section.querySelectorAll('[data-vbool]'))el.checked=v[el.dataset.vbool];for(const el of section.querySelectorAll('[data-effect]'))el.checked=v.effects[el.dataset.effect];for(const el of section.querySelectorAll('[data-shadow]'))el.checked=v.shadows[el.dataset.shadow];
for(const el of section.querySelectorAll('[data-vrange],[data-erange]')){const key=el.dataset.vrange||el.dataset.erange,factor=Number(el.dataset.factor)||1,value=(el.dataset.vrange?v[key]:v.effects[key])*factor;el.value=value;section.querySelector(`[data-value="${key}"]`).value=['ringSpeed','textMotionSpeed'].includes(key)?value.toFixed(2)+'×':(Number.isInteger(value)?value:value.toFixed(1))+'%'}renderBadges(view);renderCodes(view);effects(view);applyStudioTypography(view);renderEdgeContent(view);drawBorderMotion(view);measure(view);draw(view)}error(views.some(v=>v.qrError)&&!images.qr?'请输入完整的 http:// 或 https:// 链接，或上传二维码图片。':'');root.dispatchEvent?.(new Event('studio-template-change'));}
function update(){sync();save()}
for(const side of ['top','bottom']){document.getElementById('direction-edge-'+side).addEventListener('change',event=>{state.edges[side].direction=event.target.value;update()});document.getElementById('direction-edge-'+side+'-duration').addEventListener('input',event=>{state.edges[side].duration=Number(event.target.value);update()})}
/* Original urban graphic systems: a utility dial, an after-hours signal orbit,
   and a soft arcade loop. No third-party logos, character art, or type assets. */
function urbanLanguagePalette(variant,dark){
  const palettes={
    district:dark?['#191c19','#f0f0df','#8c9986']:['#efefdf','#20271e','#8b947f'],
    tuner:dark?['#1a1918','#f6e8cf','#a49a87']:['#f2eadc','#292722','#a69b86'],
    arcade:dark?['#172a32','#eaf3de','#7baba5']:['#e6f1e3','#1b3533','#8baa9f']
  };
  const colors=palettes[variant];
  return colors?{paper:colors[0],ink:colors[1],muted:colors[2]}:null;
}

function paintUrbanLanguage(ctx,w,h,t,variant,settings){
  if(!['district','tuner','arcade'].includes(variant))return false;
  const input=settings||{};
  if((input.ringStyle||'signature')!=='signature')return false;
  if(!ctx||!(w>0)||!(h>0))return true;
  const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
  const num=(v,fallback)=>Number.isFinite(v)?v:fallback;
  const rgba=(hex,alpha)=>{const n=parseInt(hex.slice(1),16);return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+clamp(alpha)+')'};
  const mix=(first,second,amount)=>{const a=parseInt(first.slice(1),16),b=parseInt(second.slice(1),16),v=clamp(amount),f=shift=>Math.round(((a>>shift)&255)*(1-v)+((b>>shift)&255)*v);return '#'+[f(16),f(8),f(0)].map(n=>n.toString(16).padStart(2,'0')).join('')};
  const portrait=!!input.portrait,swapped=!!input.swapped,dark=input.background==='dark',side=swapped?-1:1;
  const colors=urbanLanguagePalette(variant,dark),paper=colors.paper,ink=colors.ink,muted=colors.muted;
  const accent=/^#[0-9a-f]{6}$/i.test(input.accent||'')?input.accent:({district:'#d4fa32',tuner:'#ff7a3d',arcade:'#b8ed66'})[variant];
  const shadowColor=/^#[0-9a-f]{6}$/i.test(input.shadowColor||'')?input.shadowColor:'#101c20';
  const unit=Math.min(w,h),strength=clamp(num(input.geometryStrength,1),.5,1.5),opacity=clamp(num(input.geometryOpacity,1),.3,1),cut=clamp(num(input.cutStrength,.75));
  const a=input.motion===false?0:Math.PI*2*num(input.ringTime,num(t,0))/12;
  const ga=input.motion===false||input.gridMoving===false?0:Math.PI*2*num(t,0)/12,gm=clamp(num(input.gridMotion,.14),0,.5);
  const intro=clamp(num(input.introProgress,1)),introScale=1+.44*(1-intro);
  const finalCx=w*(portrait?.52:swapped?.285:.715)+num(input.px,0)*w*.007;
  const finalCy=h*(portrait?(swapped?.34:.56):.49)+num(input.py,0)*h*.005;
  const cx=w*.5+(finalCx-w*.5)*intro,cy=h*.48+(finalCy-h*.48)*intro;
  const baseR=(portrait?Math.min(w*.35,h*.26):h*.38)*clamp(num(input.ringScale,1.15),.6,2.4),r=baseR*introScale;
  const shadowStrength=clamp(num(input.shadowStrength,.8),0,1.5),shadowDepth=clamp(num(input.shadowDepth,1),0,2);
  const shadowEnabled=input.shadow!==false&&shadowStrength>0&&shadowDepth>0;

  function line(points,color,width,alpha=1,cap='butt',closed=false){
    ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap=cap;ctx.lineJoin='round';ctx.beginPath();
    points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));if(closed)ctx.closePath();ctx.stroke();ctx.restore();
  }
  function poly(points,color,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();ctx.restore()}
  function disc(x,y,radius,color,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();ctx.restore()}
  function ellipse(rx,ry,rot,start,end,color,width,alpha=1,x=0,y=0){
    const c=Math.cos(rot),s=Math.sin(rot),points=[],count=Math.max(24,Math.ceil(Math.abs(end-start)*14-1e-9));
    for(let i=0;i<=count;i++){const b=start+(end-start)*i/count,u=Math.cos(b)*rx,v=Math.sin(b)*ry;points.push([x+u*c-v*s,y+u*s+v*c])}line(points,color,width,alpha);
  }
  function band(rx,ry,start,end,thickness,color,alpha=1){
    const points=[],count=Math.max(12,Math.ceil(Math.abs(end-start)*16-1e-9));
    for(let i=0;i<=count;i++){const b=start+(end-start)*i/count;points.push([Math.cos(b)*rx,Math.sin(b)*ry])}
    for(let i=count;i>=0;i--){const b=start+(end-start)*i/count;points.push([Math.cos(b)*(rx-thickness),Math.sin(b)*(ry-thickness)])}poly(points,color,alpha);
  }
  function roundRect(x,y,width,height,radius,color,alpha=1){
    const rr=Math.min(radius,width*.5,height*.5);ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x+rr,y);ctx.lineTo(x+width-rr,y);ctx.quadraticCurveTo(x+width,y,x+width,y+rr);ctx.lineTo(x+width,y+height-rr);ctx.quadraticCurveTo(x+width,y+height,x+width-rr,y+height);ctx.lineTo(x+rr,y+height);ctx.quadraticCurveTo(x,y+height,x,y+height-rr);ctx.lineTo(x,y+rr);ctx.quadraticCurveTo(x,y,x+rr,y);ctx.closePath();ctx.fill();ctx.restore();
  }
  function cast(draw){
    ctx.save();if(shadowEnabled){const tr=typeof ctx.getTransform==='function'?ctx.getTransform():null,dpr=tr?Math.hypot(tr.a,tr.b)||1:1;ctx.shadowColor=rgba(shadowColor,shadowStrength*.31);ctx.shadowBlur=(input.shadowStyle==='soft'?unit*.018:0)*shadowDepth*dpr;ctx.shadowOffsetX=unit*.007*shadowDepth*dpr;ctx.shadowOffsetY=unit*.012*shadowDepth*dpr}draw();ctx.restore();
  }
  function star(x,y,size,rotation,color,alpha=1){
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);poly([[0,-size],[size*.24,-size*.24],[size,0],[size*.24,size*.24],[0,size],[-size*.24,size*.24],[-size,0],[-size*.24,-size*.24]],color,alpha);ctx.restore();
  }
  function pattern(){
    if(input.grid===false||input.pattern==='none')return;
    const kind=input.pattern||'dots',alpha=clamp(num(input.gridOpacity,.065),.02,.15)*(dark?1:1.2);
    if(kind==='ripple'){
      for(let j=0;j<12;j++){
        const radius=unit*(.12+j*.073),points=[];
        for(let i=0;i<=88;i++){const b=i*Math.PI/44;points.push([cx+Math.cos(b)*radius,cy+baseR*.53+Math.sin(b)*radius*.31+Math.sin(b*3-j*.42+ga)*unit*.028*gm])}
        line(points,ink,unit*.0008,alpha*(1-j/14));
      }return;
    }
    if(kind==='mesh'){
      for(let j=0;j<19;j++){
        const d=j/18,z=1/(.9+d*4.3),points=[];
        for(let i=0;i<=58;i++){const u=(i/58-.5)*5.6;points.push([cx+u*w*.40*z,h*.22+h*.64*z+Math.sin(u*1.3-d*3.5+ga)*unit*.045*gm*z])}
        line(points,ink,unit*.00085,alpha*(1-d)*.85);
      }
      for(let i=0;i<25;i++){
        const u=(i/24-.5)*5.6,points=[];
        for(let j=0;j<=36;j++){const d=j/36,z=1/(.9+d*4.3);points.push([cx+u*w*.40*z,h*.22+h*.64*z+Math.sin(u*1.3-d*3.5+ga)*unit*.045*gm*z])}
        line(points,ink,unit*.0007,alpha*.5);
      }return;
    }
    if(kind==='grid'){
      const cols=portrait?16:26,rows=portrait?25:16;
      for(let j=0;j<=rows;j++){const y=h*j/rows,points=[];for(let i=0;i<=46;i++){const x=w*i/46;points.push([x,y+Math.sin(x/w*5+ga+j*.12)*unit*.022*gm])}line(points,ink,unit*.0007,alpha*.65)}
      for(let j=0;j<=cols;j++){const x=w*j/cols,points=[];for(let i=0;i<=40;i++){const y=h*i/40;points.push([x+Math.sin(y/h*4+ga+j*.14)*unit*.020*gm,y])}line(points,ink,unit*.0007,alpha*.55)}return;
    }
    // One compound path per row keeps the dot field economical when recording.
    const cols=portrait?14:25,rows=portrait?25:15,stepX=w/cols,stepY=h/rows;
    for(let row=0;row<rows;row++){
      ctx.save();ctx.fillStyle=ink;ctx.globalAlpha*=alpha*(.30+.50*Math.sin((row+.5)/rows*Math.PI));ctx.beginPath();
      for(let col=0;col<cols;col++){
        const x=(col+.5)*stepX+Math.sin(ga+row*.34)*unit*.014*gm,y=(row+.5)*stepY+Math.sin(ga+col*.34+row*.23)*unit*.025*gm;
        const fade=clamp(1-Math.abs(x-cx)/(w*.85),.18,1),radius=unit*.0012*fade;
        ctx.moveTo(x+radius,y);ctx.arc(x,y,radius,0,Math.PI*2);ctx.closePath();
      }ctx.fill();ctx.restore();
    }
  }
  function floor(){
    if(!input.floor||shadowStrength<=0||shadowDepth<=0)return;
    const yy=Math.min(h*.9,cy+baseR*.88),rr=Math.min(baseR*.68,w*.31);ctx.save();ctx.translate(cx,yy);ctx.scale(1,.07);const g=ctx.createRadialGradient(0,0,0,0,0,rr);g.addColorStop(0,rgba(shadowColor,shadowStrength*(dark?.34:.13)));g.addColorStop(1,rgba(shadowColor,0));ctx.fillStyle=g;ctx.fillRect(-rr,-rr,rr*2,rr*2);ctx.restore();
  }

  function district(){
    // Coarse, asymmetric dial sectors make a strong silhouette without a starburst.
    const sectors=[[-2.92,-2.05],[-1.92,-1.29],[-1.19,.32],[.43,1.49],[1.65,2.33],[2.45,3.18]];
    ctx.save();ctx.rotate(a-.24);
    cast(()=>sectors.forEach(([from,to],i)=>band(r*1.035,r*1.035,from,to,r*(i===2?.112:.066)*strength,i===2?accent:mix(ink,paper,dark?.08:.05),i===4?.35:.88)));
    ellipse(r*.887,r*.887,0,-2.89,2.90,muted,r*.003,.34);
    ellipse(r*1.088,r*1.088,0,-2.02,.37,accent,r*.006,.72);
    ellipse(r*1.088,r*1.088,0,.57,2.21,ink,r*.002,.22);
    for(let i=0;i<12;i++){
      const b=-1.15+i*.104,c=Math.cos(b),s=Math.sin(b),ri=r*1.14,ro=r*(i%3===0?1.205:1.175);
      line([[c*ri,s*ri],[c*ro,s*ro]],i%3===0?accent:ink,r*(i%3===0?.007:.003),i%3===0?.9:.38);
    }
    ctx.save();ctx.rotate(-2.29);roundRect(r*.952,-r*.046,r*.208,r*.092,r*.012,ink,.91);line([[r*.995,-r*.014],[r*1.11,-r*.014]],paper,r*.007,.85);line([[r*.995,r*.017],[r*1.06,r*.017]],paper,r*.005,.5);ctx.restore();
    ctx.save();ctx.rotate(.81);poly([[r*.99,-r*.051],[r*1.145,-r*.051],[r*1.18,0],[r*1.145,r*.051],[r*.99,r*.051]],accent,.95);ctx.restore();
    ctx.restore();
    ctx.save();ctx.globalAlpha*=cut;
    // These stationary brackets anchor the rotating mechanism, like a dial housing.
    line([[-r*1.17,-r*.30],[-r*1.17,-r*.50],[-r*1.04,-r*.50]],ink,r*.007,.63);
    line([[r*1.05,r*.73],[r*1.19,r*.73],[r*1.19,r*.53]],accent,r*.010,.91);
    for(let i=0;i<3;i++)poly([[r*(.84+i*.062),-r*1.10],[r*(.875+i*.062),-r*1.10],[r*(.84+i*.062),-r*1.03],[r*(.805+i*.062),-r*1.03]],ink,.36);
    ctx.restore();
  }
  function tuner(){
    // A wide tape orbit, with narrow rail lines instead of a heavy round dial.
    const tilt=-.34,cream=mix(ink,paper,dark?.06:.02);
    ctx.save();ctx.rotate(tilt);
    cast(()=>band(r*1.22,r*.79,-2.99,2.61,r*.040*strength,cream,.86));
    ellipse(r*1.27,r*.835,0,-2.99,2.61,muted,r*.0025,.40);
    ellipse(r*1.155,r*.724,0,-2.95,2.56,ink,r*.0023,.38);
    // The accent is a short signal sweep moving steadily along the fixed rails.
    ctx.save();ctx.scale(1,.79/1.22);ctx.rotate(a);band(r*1.22,r*1.22,-.58,.12,r*.052*strength,accent,.98);ctx.restore();
    ctx.save();ctx.scale(1,.79/1.22);ctx.rotate(-a);ellipse(r*1.28,r*1.28,0,1.84,2.18,accent,r*.008,.72);ctx.restore();
    ctx.save();ctx.translate(-r*1.123,-r*.258);ctx.rotate(-.96);cast(()=>roundRect(-r*.153,-r*.065,r*.306,r*.13,r*.025,accent));
    for(let i=0;i<4;i++)line([[-r*.104+i*r*.063,-r*.028],[-r*.104+i*r*.063,r*.028]],paper,r*.010,.8);ctx.restore();
    ctx.save();ctx.translate(r*.927,r*.532);ctx.rotate(-.78);roundRect(-r*.129,-r*.045,r*.258,r*.09,r*.012,cream,.9);line([[-r*.079,0],[r*.079,0]],paper,r*.009,.84);ctx.restore();
    ctx.restore();
    ctx.save();ctx.globalAlpha*=cut;
    // An offset fine orbit makes a second unmistakable ellipse, never a frame box.
    ellipse(r*1.02,r*.94,.40,-1.19,2.04,muted,r*.0028,.37,r*.052,-r*.045);
    ellipse(r*1.02,r*.94,.40,2.20,3.59,accent,r*.004,.48,r*.052,-r*.045);
    const bx=r*.052,by=-r*.045,b=a+.38,cc=Math.cos(.40),ss=Math.sin(.40),xx=Math.cos(b)*r*1.02,yy=Math.sin(b)*r*.94;
    disc(bx+xx*cc-yy*ss,by+xx*ss+yy*cc,r*.018,accent,.95);
    for(let i=0;i<5;i++)line([[r*(.80+i*.062),-r*.93],[r*(.83+i*.062),-r*.985]],i===0?accent:ink,r*.005,i===0?.95:.40);
    line([[-r*1.22,r*.68],[-r*.91,r*.68]],ink,r*.004,.34);
    disc(-r*1.28,r*.68,r*.015,accent,.83);
    ctx.restore();
  }
  function arcade(){
    // A deliberately uneven soft-rectangle is more playful than another circle.
    const loop=[];
    for(let i=0;i<=128;i++){
      const b=i*Math.PI/64,c=Math.cos(b),s=Math.sin(b),corner=3.3;
      const x=Math.sign(c)*Math.pow(Math.abs(c),2/corner)*r*(1+.045*Math.sin(b*3+.3));
      const y=Math.sign(s)*Math.pow(Math.abs(s),2/corner)*r*(.94+.035*Math.cos(b*3-.7));loop.push([x,y]);
    }
    ctx.save();ctx.rotate(-.19+Math.sin(a)*.045);
    cast(()=>line(loop,mix(accent,ink,dark?.04:.13),r*.102*strength,.94,'round',true));
    line(loop,mix(accent,paper,.30),r*.073*strength,.98,'round',true);
    // A single inset pen line keeps it graphic, with no shiny plastic gradient.
    ctx.save();ctx.scale(.933,.933);line(loop,ink,r*.0028,.22,'round',true);ctx.restore();
    ctx.save();ctx.translate(r*.88,-r*.69);ctx.rotate(.16);cast(()=>roundRect(-r*.176,-r*.075,r*.352,r*.15,r*.062,ink,.97));
    roundRect(-r*.117,-r*.023,r*.15,r*.046,r*.023,paper,.95);disc(r*.088,0,r*.023,accent,.98);ctx.restore();
    ctx.save();ctx.translate(-r*.85,r*.74);ctx.rotate(-.24);cast(()=>roundRect(-r*.127,-r*.092,r*.254,r*.184,r*.059,mix(paper,ink,dark?.88:.91),.96));
    disc(-r*.045,-r*.006,r*.018,paper,.9);disc(r*.045,-r*.006,r*.018,paper,.9);line([[-r*.043,r*.045],[0,r*.060],[r*.043,r*.045]],accent,r*.008,.88,'round');ctx.restore();
    ctx.restore();
    ctx.save();ctx.globalAlpha*=cut;
    star(-r*1.10,-r*.66,r*.098,-.20+a,accent,.92);
    star(r*1.11,r*.73,r*.064,.18-a,ink,.70);
    ctx.save();ctx.translate(-r*.64,-r*1.11);ctx.rotate(-.18);roundRect(-r*.116,-r*.022,r*.232,r*.044,r*.022,ink,.43);ctx.restore();
    disc(r*1.11,-r*.42,r*.033,accent,.88);disc(r*1.19,-r*.30,r*.014,ink,.36);
    ellipse(r*.09,r*.04,-.23,0,Math.PI*2,ink,r*.004,.35,r*.81,r*1.14);
    ctx.restore();
  }

  ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.setLineDash([]);ctx.shadowColor='rgba(0,0,0,0)';ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;ctx.clearRect(0,0,w,h);
  if(!input.transparent){ctx.fillStyle=paper;ctx.fillRect(0,0,w,h)}
  pattern();floor();
  ctx.save();ctx.studioIntroTransform?.({fromX:w*.5,fromY:h*.48,toX:finalCx,toY:finalCy,scale:1.44});ctx.globalAlpha*=opacity;ctx.translate(cx,cy);ctx.scale(portrait?1:side,1);
  ({district,tuner,arcade})[variant]();ctx.restore();
  // Crop accents sit at the far display-side corners. The information third is clear.
  if(cut>0){
    ctx.save();ctx.globalAlpha*=cut*opacity;if(swapped&&!portrait){ctx.translate(w,0);ctx.scale(-1,1)}
    if(variant==='district'){
      poly([[w*.88,-h*.02],[w*1.02,-h*.02],[w*1.02,h*.095],[w*.96,h*.095]],accent,.88);
      line([[w*.89,h*.97],[w*1.01,h*.85]],ink,unit*.014,.28);
      line([[w*.92,h*1.01],[w*1.03,h*.90]],accent,unit*.018,.80);
    }else if(variant==='tuner'){
      for(let i=0;i<4;i++)line([[w*(.88+i*.033),-h*.01],[w*(.93+i*.033),h*.06]],i===0?accent:ink,unit*.012,i===0?.72:.16);
      poly([[w*.84,h*1.01],[w*1.01,h*.90],[w*1.01,h*1.01]],accent,.15);
    }else{
      ctx.save();ctx.translate(w*.99,h*.075);ctx.rotate(-.29);cast(()=>roundRect(-unit*.075,-unit*.048,unit*.15,unit*.096,unit*.038,accent,.80));ctx.restore();
      star(w*.93,h*.94,unit*.025,.12,ink,.40);
    }ctx.restore();
  }
  ctx.restore();return true;
}

/* Six material and composition systems. All paths are presentation geometry,
   deliberately kept away from the model's central silhouette. */
function designLanguagePalette(variant,dark){
  const urban=urbanLanguagePalette(variant,dark);if(urban)return urban;
  const palettes={
    couture:dark?['#17171a','#eee9e1','#a09b94']:['#efede8','#252522','#77766f'],
    brutalist:dark?['#151719','#f1f0e7','#969b95']:['#e9eae3','#20241f','#767d72'],
    cloud:dark?['#292c36','#f1e7ed','#a7a3b4']:['#f5f0ee','#4b4b59','#96909d'],
    plush:dark?['#302b29','#eee4d3','#b5a593']:['#f1e9dc','#514a40','#9c8f7d'],
    play:dark?['#202c32','#f5f0dd','#98b0ac']:['#f4f3e8','#263c3c','#819b91'],
    sticker:dark?['#25282d','#f8efdb','#b4ae9e']:['#f2efdf','#353936','#8c9182']
  };
  const colors=palettes[variant];
  if(!colors)return null;
  return {paper:colors[0],ink:colors[1],muted:colors[2]};
}

function paintDesignLanguage(ctx,w,h,t,variant,settings){
  if(!['couture','brutalist','cloud','plush','play','sticker'].includes(variant))return false;
  const input=settings||{};
  if((input.ringStyle||'signature')!=='signature')return false;
  if(!ctx||!(w>0)||!(h>0))return true;
  const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
  const num=(v,fallback)=>Number.isFinite(v)?v:fallback;
  const rgba=(hex,alpha)=>{const n=parseInt(hex.slice(1),16);return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+clamp(alpha)+')'};
  const mix=(first,second,amount)=>{const a=parseInt(first.slice(1),16),b=parseInt(second.slice(1),16),v=clamp(amount),f=shift=>Math.round(((a>>shift)&255)*(1-v)+((b>>shift)&255)*v);return '#'+[f(16),f(8),f(0)].map(n=>n.toString(16).padStart(2,'0')).join('')};
  const dark=input.background==='dark',portrait=!!input.portrait,swapped=!!input.swapped;
  const colors=designLanguagePalette(variant,dark),paper=colors.paper,ink=colors.ink,muted=colors.muted;
  const accent=/^#[0-9a-f]{6}$/i.test(input.accent||'')?input.accent:({couture:'#c1b5a5',brutalist:'#ddfb4b',cloud:'#c3a7e5',plush:'#d8a183',play:'#8bc9a4',sticker:'#f7bf4f'})[variant];
  const shadowColor=/^#[0-9a-f]{6}$/i.test(input.shadowColor||'')?input.shadowColor:'#282c31';
  // Background and geometry receive independent continuous clocks. A paused ring
  // must not stop the ambient grid, and neither clock resets at the intro boundary.
  const a=input.motion===false?0:Math.PI*2*num(input.ringTime,num(t,0))/12,sa=Math.sin(a),ca=Math.cos(a),s2=Math.sin(2*a);
  const ga=input.motion===false||input.gridMoving===false?0:Math.PI*2*num(t,0)/12,gm=clamp(num(input.gridMotion,.14),0,.5);
  const intro=clamp(num(input.introProgress,1));
  const side=swapped?-1:1;
  const finalCx=w*(portrait?.52:swapped?.285:.715)+num(input.px,0)*w*.007;
  const finalCy=h*(portrait?(swapped?.34:.56):.49)+num(input.py,0)*h*.005;
  const cx=w*.5+(finalCx-w*.5)*intro,cy=h*.48+(finalCy-h*.48)*intro;
  const r=(portrait?Math.min(w*.35,h*.26):h*.38)*clamp(num(input.ringScale,1.15),.6,2.4)*(1+.44*(1-intro));
  const unit=Math.min(w,h),strength=clamp(num(input.geometryStrength,1),.5,1.5);
  const opacity=clamp(num(input.geometryOpacity,1),.3,1),cut=clamp(num(input.cutStrength,.75));
  const shadowEnabled=input.shadow!==false&&num(input.shadowStrength,.8)>0&&num(input.shadowDepth,1)>0;
  const shadowStrength=clamp(num(input.shadowStrength,.8),0,1.5),shadowDepth=clamp(num(input.shadowDepth,1),0,2);

  function line(points,color,width,alpha=1,cap='round'){
    if(points.length<2)return;ctx.save();ctx.globalAlpha*=alpha;ctx.lineWidth=width;ctx.lineCap=cap;ctx.lineJoin='round';ctx.strokeStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();ctx.restore();
  }
  function poly(points,color,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();ctx.restore()}
  function disc(x,y,radius,color,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,Math.max(.01,radius),0,Math.PI*2);ctx.fill();ctx.restore()}
  function ell(rx,ry,rot,start,end,color,width,alpha=1,x=0,y=0){
    const points=[],c=Math.cos(rot),s=Math.sin(rot),count=Math.max(28,Math.ceil(Math.abs(end-start)*20-1e-9));
    for(let i=0;i<=count;i++){const b=start+(end-start)*i/count,u=Math.cos(b)*rx,v=Math.sin(b)*ry;points.push([x+u*c-v*s,y+u*s+v*c])}line(points,color,width,alpha);
  }
  function ringBand(rx,ry,rot,start,end,thickness,color,alpha=1){
    ctx.save();ctx.rotate(rot);ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.beginPath();const count=90;
    for(let i=0;i<=count;i++){const b=start+(end-start)*i/count,u=Math.cos(b)*rx,v=Math.sin(b)*ry;i?ctx.lineTo(u,v):ctx.moveTo(u,v)}
    for(let i=count;i>=0;i--){const b=start+(end-start)*i/count;ctx.lineTo(Math.cos(b)*(rx-thickness),Math.sin(b)*(ry-thickness))}ctx.closePath();ctx.fill();ctx.restore();
  }
  function roundedPath(x,y,width,height,radius){
    const rr=Math.min(radius,width*.5,height*.5);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.lineTo(x+width-rr,y);ctx.quadraticCurveTo(x+width,y,x+width,y+rr);ctx.lineTo(x+width,y+height-rr);ctx.quadraticCurveTo(x+width,y+height,x+width-rr,y+height);ctx.lineTo(x+rr,y+height);ctx.quadraticCurveTo(x,y+height,x,y+height-rr);ctx.lineTo(x,y+rr);ctx.quadraticCurveTo(x,y,x+rr,y);ctx.closePath();
  }
  function roundRect(x,y,width,height,radius,color,alpha=1,strokeWidth=0){ctx.save();ctx.globalAlpha*=alpha;roundedPath(x,y,width,height,radius);if(strokeWidth){ctx.lineWidth=strokeWidth;ctx.strokeStyle=color;ctx.stroke()}else{ctx.fillStyle=color;ctx.fill()}ctx.restore()}
  function cast(draw,soft=false){
    ctx.save();if(shadowEnabled){const tr=typeof ctx.getTransform==='function'?ctx.getTransform():null,dpr=tr?Math.hypot(tr.a,tr.b)||1:1;ctx.shadowColor=rgba(shadowColor,shadowStrength*(soft?.25:.33));ctx.shadowBlur=(soft||input.shadowStyle==='soft'?unit*.024:0)*shadowDepth*dpr;ctx.shadowOffsetX=unit*.009*shadowDepth*dpr;ctx.shadowOffsetY=unit*.014*shadowDepth*dpr}draw();ctx.restore();
  }
  function halo(x,y,radius,color,alpha,inner=.03){
    const g=ctx.createRadialGradient(x,y,radius*inner,x,y,radius);g.addColorStop(0,rgba(color,alpha));g.addColorStop(.48,rgba(color,alpha*.36));g.addColorStop(1,rgba(color,0));ctx.save();ctx.fillStyle=g;ctx.fillRect(x-radius,y-radius,radius*2,radius*2);ctx.restore();
  }
  function gridAlpha(x,y){
    const dx=(x-cx)/(w*(portrait?.7:.65)),dy=(y-cy)/(h*.8);
    return clamp(1-Math.sqrt(dx*dx+dy*dy),.07,1)*(portrait?1:clamp((side*(x-cx)/w+.45)*2,.15,1));
  }
  function pattern(){
    if(input.grid===false||input.pattern==='none')return;
    const kind=input.pattern||'dots',density=clamp(num(input.gridOpacity,.065),.02,.15),step=Math.max(19,unit*.046);
    const alpha=density*(dark?1.1:1.45);
    if(kind==='ripple'){
      for(let j=0;j<16;j++){const rx=unit*(.08+j*.063),points=[];for(let i=0;i<=112;i++){const b=i*Math.PI/56;points.push([cx+Math.cos(b)*rx,cy+r*.55+Math.sin(b)*rx*.24+Math.sin(b*3-j*.4+ga)*unit*.025*gm])}line(points,ink,unit*.0008,alpha*(1-j/18))}return;
    }
    if(kind==='mesh'){
      for(let j=0;j<20;j++){const depth=j/19,z=1/(.9+depth*4.4),points=[];for(let i=0;i<=70;i++){const u=(i/70-.5)*5.4,x=cx+u*w*.42*z,y=h*.25+h*.60*z+Math.sin(u*1.1-depth*4+ga)*unit*.05*gm*z;points.push([x,y])}line(points,ink,unit*.0008,alpha*(1-depth)*.75)}
      for(let i=0;i<=32;i++){const u=(i/32-.5)*5.4,points=[];for(let j=0;j<=50;j++){const depth=j/50,z=1/(.9+depth*4.4);points.push([cx+u*w*.42*z,h*.25+h*.60*z+Math.sin(u*1.1-depth*4+ga)*unit*.05*gm*z])}line(points,ink,unit*.00065,alpha*.6)}return;
    }
    if(kind==='grid'){
      for(let x=-step;x<w+step;x+=step){const points=[];for(let y=0;y<=h+8;y+=16)points.push([x+Math.sin(ga+y/h*4)*unit*.018*gm,y]);line(points,ink,unit*.00065,alpha*.68)}
      for(let y=-step;y<h+step;y+=step){const points=[];for(let x=0;x<=w+8;x+=16)points.push([x,y+Math.sin(ga+x/w*5)*unit*.015*gm]);line(points,ink,unit*.00065,alpha*.68)}return;
    }
    for(let row=0,y=step*.5;y<h;y+=step,row++)for(let col=0,x=step*.5;x<w;x+=step,col++){
      const wave=Math.sin(col*.42+row*.29+ga),xx=x+Math.sin(ga+row*.3)*unit*.015*gm,yy=y+wave*unit*.027*gm,fade=gridAlpha(xx,yy);
      disc(xx,yy,unit*.00115*(.75+wave*.13),ink,alpha*fade*1.5);
    }
  }
  function floor(){
    if(!input.floor||shadowStrength<=0||shadowDepth<=0)return;
    const yy=Math.min(h*.89,cy+r*.88),rr=Math.min(r*.65,w*.30);ctx.save();ctx.translate(cx,yy);ctx.scale(1,.075);const g=ctx.createRadialGradient(0,0,0,0,0,rr);g.addColorStop(0,rgba(shadowColor,shadowStrength*(dark?.36:.13)));g.addColorStop(1,rgba(shadowColor,0));ctx.fillStyle=g;ctx.fillRect(-rr,-rr,rr*2,rr*2);ctx.restore();
  }

  function couture(){
    ctx.studioIntroRotation?.(-.11);
    // A single platinum sculpture. Its open ends orbit through a gently turning
    // projection while the highlight travels independently across the metal.
    // There are no floating blades or large accent-coloured metallic surfaces.
    const aperture=portrait?.94:1;
    const rot=-.22+sa*.11-(1-intro)*.11,rx=r*(.92+.055*ca)*aperture,ry=r*(1.07+.024*s2)*aperture;
    const start=a-2.47,end=start+Math.PI*1.72,steps=150;
    const projection=b=>1/(1-Math.sin(b+.30)*(.065+.022*sa));
    function point(b,offset=0){
      const z=projection(b),x=Math.cos(b)*(rx+offset)*z,y=Math.sin(b)*(ry+offset)*z;
      return [x*Math.cos(rot)-y*Math.sin(rot),x*Math.sin(rot)+y*Math.cos(rot)];
    }
    function outline(offset,from=start,to=end){const points=[];for(let i=0;i<=steps;i++)points.push(point(from+(to-from)*i/steps,offset));return points}
    function metalShape(fill,dx=0,dy=0){
      ctx.save();ctx.translate(dx,dy);ctx.beginPath();
      for(let i=0;i<=steps;i++){const b=start+(end-start)*i/steps,p=point(b,r*.031*strength);i?ctx.lineTo(...p):ctx.moveTo(...p)}
      for(let i=steps;i>=0;i--){const b=start+(end-start)*i/steps,p=point(b,-r*.031*strength);ctx.lineTo(...p)}
      ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.restore();
    }
    const silver=ctx.createLinearGradient(-r*(.75+.18*ca),-r,r*.85,r*(.72+.18*sa));
    for(const [stop,color]of [[0,'#646a70'],[.12,'#c1c8cc'],[.25,'#f5f7f6'],[.34,'#777f88'],[.47,'#b8c0c6'],[.53,'#eef2f3'],[.59,'#737c85'],[.73,'#e5e9ea'],[.84,'#9aa3ab'],[1,'#4a535d']])silver.addColorStop(stop,color);
    cast(()=>metalShape(dark?'#616973':'#7c858d',r*.012*ca,r*.021));
    metalShape(silver);
    line(outline(r*.030*strength),'#f8fbfb',r*.0027,.78);
    line(outline(-r*.030*strength),dark?'#49535d':'#67727b',r*.0037,.64);
    // Short reflected streaks slide around the bevel, making slow motion visible.
    const shineStart=start+.40+(Math.sin(a+.6)*.5+.5)*(end-start-1.10);
    line(outline(r*.012*strength,shineStart,shineStart+.47),'#ffffff',r*.007,.54);
    line(outline(-r*.017*strength,start+.10,start+.55),'#d6dfe3',r*.004,.52);
    const p0=point(start,r*.030*strength),p1=point(start,-r*.030*strength),q0=point(end,r*.030*strength),q1=point(end,-r*.030*strength);
    line([p0,p1],'#e5eaed',r*.004,.9,'butt');line([q0,q1],mix(accent,'#c9cdd0',.88),r*.004,.9,'butt');
    if(cut>0){
      line(outline(r*.12,start+.18,end-.20),muted,r*.002,.11*cut);
      line(outline(r*.16,start+.75,start+1.55),ink,r*.002,.10*cut);
    }
  }
  function brutalist(){
    // A genuinely angular, broken architectural frame with a generous void.
    const lean=.08+cut*.14+sa*.012;
    const vertices=[[-r*.91,-r*.95],[r*.83,-r*1.18],[r*1.23,r*.67],[r*.22,r*1.15],[-r*.96,r*.69]];
    const inner=[[-r*.77,-r*.81],[r*.67,-r*.99],[r*1.02,r*.56],[r*.18,r*.94],[-r*.76,r*.58]];
    ctx.save();ctx.transform(1,0,-lean,1,0,0);
    cast(()=>{ctx.beginPath();vertices.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();inner.slice().reverse().forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=mix(ink,paper,dark?.09:.20);ctx.fill('evenodd')});
    poly([[r*.68,-r*1.00],[r*.83,-r*1.18],[r*1.23,r*.67],[r*1.025,r*.56]],accent,.97);
    poly([[-r*.91,-r*.95],[-r*.77,-r*.81],[r*.67,-r*.99],[r*.83,-r*1.18]],mix(accent,paper,.40),.88);
    // Missing corners and a transverse slice create rhythm without filling the centre.
    poly([[-r*1.08,-r*.36],[-r*.73,-r*.47],[-r*.68,-r*.28],[-r*1.02,-r*.16]],paper);
    poly([[r*.14,r*.96],[r*.42,r*.87],[r*.47,r*1.20],[r*.19,r*1.28]],paper);
    line([[-r*1.10,r*.86],[-r*.77,r*.75]],accent,r*.049*strength,.95,'butt');
    line([[r*.77,-r*1.28],[r*1.02,-r*1.31]],ink,r*.008,.45,'butt');ctx.restore();
    for(let i=0;i<7;i++)line([[r*(1.10+i*.035),-r*.30],[r*(1.15+i*.035),-r*.20]],ink,r*.007,.14,'butt');
    poly([[-r*1.13,r*.34],[-r*.96,r*.29],[-r*1.06,r*.49]],accent,.9);
  }
  function puffy(x,y,rx,ry,color,alpha=1,rot=0){
    ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.scale(1,ry/rx);const g=ctx.createRadialGradient(-rx*.28,-rx*.34,rx*.06,0,0,rx);g.addColorStop(0,mix(color,'#ffffff',dark?.22:.65));g.addColorStop(.42,mix(color,paper,.18));g.addColorStop(.83,color);g.addColorStop(1,mix(color,ink,dark?.09:.10));ctx.globalAlpha*=alpha;ctx.beginPath();ctx.arc(0,0,rx,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();ctx.restore();
  }
  function cloud(){
    // Soft floating cloud banks inhabit opposite edges. The middle stays airy.
    const airy=mix(accent,paper,dark?.55:.72),cream=mix(paper,'#ffffff',dark?.09:.64);
    halo(0,r*.02,r*1.30,accent,dark?.08:.11);
    ctx.save();ctx.rotate(-.22+sa*.023);cast(()=>{
      puffy(r*.79,-r*.70,r*.44,r*.25,airy,.92,-.24);
      puffy(r*.54,-r*.93,r*.30,r*.25,cream,.96,.21);
      puffy(r*1.02,-r*.88,r*.29,r*.23,mix(airy,cream,.45),.95,-.18);
      puffy(r*.82,-r*1.02,r*.31,r*.27,airy,.98,.13);
    },true);ctx.restore();
    ctx.save();ctx.translate(0,sa*r*.022);cast(()=>{
      puffy(-r*.70,r*.80,r*.45,r*.22,airy,.82,.16);
      puffy(-r*.97,r*.76,r*.25,r*.20,cream,.91,-.18);
      puffy(-r*.65,r*.63,r*.30,r*.26,mix(airy,cream,.55),.95,.20);
      puffy(-r*.40,r*.85,r*.25,r*.18,cream,.89,-.1);
    },true);ctx.restore();
    ctx.save();ctx.globalAlpha*=cut;
    ell(r*.99,r*.90,-.14,-.90,2.30,muted,r*.0032,.22);
    ell(r*.99,r*.90,-.14,2.65,3.80,accent,r*.014*strength,.32);
    // A thin drifting mist filament is less literal than another ring.
    const points=[];for(let i=0;i<=70;i++){const u=i/70;points.push([r*(.52+u*.70),r*(.32+.055*Math.sin(u*7+a))])}line(points,mix(accent,ink,.1),r*.004,.34);
    puffy(r*1.08,r*.56,r*.065,r*.052,mix(accent,cream,.36),.8,sa*.2);
    disc(-r*.97,-r*.32,r*.018,mix(accent,ink,.20),.6);
    ctx.restore();
  }
  function squirclePoint(b,radius,power=3.8){const c=Math.cos(b),s=Math.sin(b);return [Math.sign(c)*Math.pow(Math.abs(c),2/power)*radius,Math.sign(s)*Math.pow(Math.abs(s),2/power)*radius]}
  function plush(){
    // A bouclé cord cushion outline: densely textured at its edge, empty inside.
    const thread=mix(accent,paper,dark?.25:.15),light=mix(thread,'#fff8e6',.55),deep=mix(thread,ink,.27),angle=-.095+sa*.017;
    const path=[],radius=r*.89;for(let i=0;i<=180;i++){const p=squirclePoint(i*Math.PI/90,radius);path.push([p[0],p[1]*1.09])}
    ctx.save();ctx.rotate(angle);cast(()=>line(path,deep,r*.110*strength,.87),true);line(path,thread,r*.092*strength,.98);line(path,light,r*.050*strength,.17);
    // Bouclé is the material itself, so it remains when optional decoration is zero.
    // Arc-length spacing avoids bald areas on the squircle's almost-flat sides.
    const lengths=[0];for(let i=1;i<path.length;i++)lengths.push(lengths[i-1]+Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]));
    const perimeter=lengths[lengths.length-1],count=Math.max(230,Math.min(390,Math.round(perimeter/(r*.021))));
    ctx.save();ctx.lineCap='round';ctx.lineWidth=Math.max(.42,r*.0032);
    for(let row=0;row<4;row++){
      let segment=1;
      for(let i=0;i<count;i++){
        const distance=((i+(row%2)*.5)/count)*perimeter;
        while(segment<lengths.length-1&&lengths[segment]<distance)segment++;
        const first=path[segment-1],second=path[segment],span=lengths[segment]-lengths[segment-1],u=span?(distance-lengths[segment-1])/span:0;
        const tx=(second[0]-first[0])/span,ty=(second[1]-first[1])/span,nx=-ty,ny=tx;
        const seed=i*2.399+row*1.731,jitter=Math.sin(seed)*r*.0035,offset=((row-1.5)*.0265*strength)*r+jitter;
        const xx=first[0]+(second[0]-first[0])*u+nx*offset+tx*Math.cos(seed*1.3)*r*.003;
        const yy=first[1]+(second[1]-first[1])*u+ny*offset+ty*Math.cos(seed*1.3)*r*.003;
        const rotation=Math.atan2(ty,tx)+Math.sin(seed)*.65;
        const coil=r*(.0092+.0025*Math.sin(seed*.7));
        ctx.beginPath();ctx.ellipse(xx,yy,coil,coil*(.53+.12*Math.cos(seed)),rotation,.15,Math.PI*1.88);
        ctx.strokeStyle=i%4===0?mix(deep,thread,.18):i%3===0?mix(light,thread,.20):mix(light,deep,.43);
        ctx.globalAlpha=opacity*(i%4===0?.57:.78);ctx.stroke();
        // Short edge flyaways break the silicone-like contour, staying on the cord.
        if((row===0||row===3)&&i%2===0){
          const direction=row===0?-1:1,edge=direction*r*.049*strength;
          const ex=first[0]+(second[0]-first[0])*u+nx*edge,ey=first[1]+(second[1]-first[1])*u+ny*edge;
          ctx.beginPath();ctx.moveTo(ex-tx*r*.004,ey-ty*r*.004);ctx.quadraticCurveTo(ex+nx*direction*r*.008,ey+ny*direction*r*.008,ex+tx*r*.006+nx*direction*r*.005,ey+ty*r*.006+ny*direction*r*.005);
          ctx.strokeStyle=i%3===0?light:thread;ctx.globalAlpha=opacity*.70;ctx.lineWidth=Math.max(.35,r*.0026);ctx.stroke();ctx.lineWidth=Math.max(.42,r*.0032);
        }
      }
    }
    ctx.restore();
    // One stitched seam on one side, not a symmetrical upholstered frame.
    ctx.save();ctx.globalAlpha*=cut;
    const seam=[];for(let i=0;i<=55;i++){const b=-1.43+i/55*1.35,p=squirclePoint(b,radius-r*.032);seam.push([p[0],p[1]*1.09])}ctx.save();ctx.setLineDash([r*.017,r*.022]);line(seam,ink,r*.0028,.18);ctx.restore();
    ctx.restore();ctx.restore();
    // The loose yarn makes this language more tactile than the airy Cloud set.
    ctx.save();ctx.globalAlpha*=cut;
    ctx.save();ctx.strokeStyle=deep;ctx.lineWidth=r*.006;ctx.globalAlpha*=.62;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-r*.87,r*.51);ctx.bezierCurveTo(-r*1.27,r*.55,-r*1.30,r*.97,-r*.96,r*1.02);ctx.bezierCurveTo(-r*.66,r*1.07,-r*.55,r*1.24,-r*.82,r*1.22);ctx.bezierCurveTo(-r*1.06,r*1.22,-r*1.06,r*1.06,-r*.94,r*1.11+sa*r*.016);ctx.stroke();ctx.restore();
    ctx.save();ctx.translate(r*.93,-r*.83+ca*r*.015);ctx.rotate(.24);cast(()=>roundRect(-r*.13,-r*.09,r*.26,r*.18,r*.075,mix(thread,paper,.12)),true);line([[-r*.065,-r*.027],[r*.065,-r*.027]],ink,r*.003,.22);line([[-r*.065,r*.021],[r*.025,r*.021]],ink,r*.003,.22);ctx.restore();
    ctx.restore();
  }
  function play(){
    // An oversized cropped toy arc is distinct from Plush's cushion and Sticker's paper loop.
    const mint=mix(accent,paper,dark?.06:.08),peach=dark?'#d6a590':'#e6bda5',cream=dark?'#e4e0c8':'#fffdf0';
    const tilt=-.12+sa*.025;ctx.save();ctx.translate(r*.20,-r*.06);ctx.rotate(tilt);
    cast(()=>ringBand(r*1.06,r*1.06,0,-2.80,1.84,r*.145*strength,mint,.91));
    ell(r*1.055,r*1.055,0,-2.76,-.34,mix(mint,cream,.30),r*.008,.6);
    // A subtly darker rim supplies puck-like thickness while its centre remains open.
    ell(r*(1.06-.145*strength),r*(1.06-.145*strength),0,-.28,1.82,mix(mint,ink,.14),r*.012,.46);
    ctx.restore();
    ctx.save();ctx.globalAlpha*=cut;
    ctx.save();ctx.translate(r*.87,r*.78+Math.sin(a)*r*.04);ctx.rotate(-.28+sa*.04);cast(()=>{
      roundRect(-r*.22,-r*.18,r*.44,r*.36,r*.13,peach);
      roundRect(-r*.22,-r*.18,r*.44,r*.26,r*.115,mix(peach,cream,.27));
    });ctx.restore();
    cast(()=>disc(-r*.94,-r*.69,r*.133,cream));
    disc(-r*.94,-r*.69,r*.060,accent,.83);
    disc(r*.98,-r*.96,r*.041,peach,.95);disc(r*1.12,-r*.78,r*.023,ink,.7);
    ctx.save();ctx.translate(-r*.88,r*.85);ctx.rotate(.18);roundRect(-r*.14,-r*.027,r*.28,r*.054,r*.025,ink,.75);ctx.restore();
    ell(r*.14,r*.055,-.2,0,Math.PI*2,ink,r*.005,.18,r*.86,r*1.10);
    ctx.restore();
  }
  function paperLoop(x,y,rx,ry,thickness,rotation,color){
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);cast(()=>ringBand(rx,ry,0,0,Math.PI*2,thickness,color));ell(rx-thickness*.08,ry-thickness*.08,0,-2.75,-.68,mix(color,'#ffffff',.45),r*.003,.80);ctx.restore();
  }
  function sticker(){
    // Paper-cut modules and torn strips: compact clusters, broad intervening space.
    const warm=dark?'#f1e7cc':'#fffced',contrast=mix(ink,paper,dark?.05:.12),second=dark?'#a8c8be':'#b4cec2';
    const elastic=Math.sin(a)*.026+Math.sin(2*a)*.006;
    paperLoop(r*.16,r*.18,r*1.03,r*.89,r*.053*strength,-.30+elastic,accent);
    ctx.save();ctx.globalAlpha*=cut;
    ctx.save();ctx.translate(r*.94,-r*.78);ctx.rotate(.28+elastic);cast(()=>{
      poly([[-r*.26,-r*.13],[r*.24,-r*.17],[r*.28,r*.10],[-r*.27,r*.16]],warm);
      poly([[-r*.23,-r*.13],[r*.16,-r*.15],[r*.12,-r*.09],[-r*.22,-r*.06]],mix(accent,warm,.37),.9);
    });line([[-r*.17,r*.01],[r*.12,-r*.025]],contrast,r*.015,.7,'butt');ctx.restore();
    ctx.save();ctx.translate(-r*.82,r*.69+sa*r*.018);ctx.rotate(-.24);cast(()=>{
      roundedPath(-r*.21,-r*.17,r*.42,r*.34,r*.075);ctx.fillStyle=second;ctx.fill();
      // A bite-shaped cutout is material geometry, not a pictogram.
      disc(r*.21,-r*.17,r*.072,paper);
    });ctx.restore();
    paperLoop(-r*.97,-r*.51,r*.102,r*.102,r*.029,.20,warm);
    ctx.save();ctx.translate(r*1.02,r*.87);ctx.rotate(-.37+sa*.04);cast(()=>poly([[-r*.16,-r*.06],[r*.15,-r*.06],[r*.11,r*.09],[r*.055,r*.07],[r*.02,r*.10],[-r*.035,r*.072],[-r*.075,r*.10],[-r*.14,r*.07]],contrast));ctx.restore();
    poly([[r*.61,-r*1.11],[r*.66,-r*.99],[r*.78,-r*1.02],[r*.70,-r*.92],[r*.75,-r*.81],[r*.62,-r*.85],[r*.54,-r*.75],[r*.53,-r*.89],[r*.40,-r*.93],[r*.53,-r*.99]],accent,.82);
    for(let i=0;i<3;i++)disc(-r*.67+i*r*.054,r*1.04,r*.012,contrast,.55);
    ctx.restore();
  }

  ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.setLineDash([]);ctx.shadowColor='rgba(0,0,0,0)';ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;ctx.clearRect(0,0,w,h);if(!input.transparent){ctx.fillStyle=paper;ctx.fillRect(0,0,w,h);
  if(variant==='cloud'){halo(cx+w*.12,cy-h*.10,Math.max(w,h)*.70,accent,dark?.065:.09);halo(w*.12,h*.08,unit*.72,dark?'#d9c5df':'#ffffff',dark?.016:.43)}
  else if(variant==='plush'){halo(cx,cy,Math.max(w,h)*.65,accent,dark?.045:.06)}
  else if(variant==='couture'){const wash=ctx.createLinearGradient(0,0,w,h);wash.addColorStop(0,rgba(ink,dark?.018:.025));wash.addColorStop(.57,rgba(accent,.02));wash.addColorStop(1,rgba(ink,dark?.025:.045));ctx.fillStyle=wash;ctx.fillRect(0,0,w,h)}
  }
  pattern();floor();
  ctx.save();ctx.studioIntroTransform?.({fromX:w*.5,fromY:h*.48,toX:finalCx,toY:finalCy,scale:1.44});ctx.globalAlpha*=opacity;ctx.translate(cx,cy);ctx.scale(portrait?1:side,1);
  ({couture,brutalist,cloud,plush,play,sticker})[variant]();ctx.restore();
  // Two assertive edge accents belong to the fashion print, never the model.
  if(variant==='brutalist'&&cut>.05){ctx.save();if(swapped&&!portrait){ctx.translate(w,0);ctx.scale(-1,1)}const offset=sa*unit*.003;cast(()=>poly([[w*.92,h*1.01],[w*1.01,h*(.75-.10*cut)+offset],[w*1.01,h*1.01]],accent,.74*opacity));poly([[w*.54,-h*.01],[w*(.64+.05*cut),-h*.01],[w*.60,h*.045]],ink,.22*opacity);ctx.restore()}
  ctx.restore();return true;
}

/* The archived acid-sticker spread, rebuilt on the shared continuous clock.
   It owns only the background; uploaded characters and editable copy remain DOM. */
function paintDualLanguage(ctx,w,h,t,variant,settings){
  if(variant!=='dual')return false;
  if(!ctx||!(w>0)||!(h>0))return true;
  const input=settings||{},clamp=(v,l=0,u=1)=>Math.max(l,Math.min(u,v)),num=(v,d)=>Number.isFinite(v)?v:d;
  const dark=input.background==='dark',portrait=!!input.portrait,swapped=!!input.swapped;
  const paper=dark?'#171e1b':'#eeefdf',ink=dark?'#eef0df':'#232b24',muted=dark?'#9ba995':'#78816a';
  const accent=/^#[0-9a-f]{6}$/i.test(input.accent||'')?input.accent:'#bceb45';
  const shadowColor=/^#[0-9a-f]{6}$/i.test(input.shadowColor||'')?input.shadowColor:'#24302c';
  const rgba=(hex,alpha)=>{const n=parseInt(hex.slice(1),16);return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+clamp(alpha)+')'};
  const a=input.motion===false?0:Math.PI*2*num(input.ringTime,num(t,0))/12;
  const ga=input.motion===false||input.gridMoving===false?0:Math.PI*2*num(t,0)/12;
  const intro=clamp(num(input.introProgress,1)),split=clamp(num(input.dualSplit,.47),.35,.60),closeStart=swapped?1-split:0,modelStart=swapped?0:split,modelSize=1-split;
  const unit=Math.min(w,h),gm=clamp(num(input.gridMotion,.14),0,.5),grid=clamp(num(input.gridOpacity,.065),.02,.15);
  const strength=clamp(num(input.geometryStrength,1),.5,1.5),detail=clamp(num(input.cutStrength,.75));
  const finalCx=portrait?w*.53:w*(modelStart+modelSize*.52),finalCy=portrait?h*(modelStart+modelSize*.43):h*.445;
  const cx=w*.5+(finalCx-w*.5)*intro+num(input.px,0)*w*.006,cy=h*.48+(finalCy-h*.48)*intro+num(input.py,0)*h*.004;
  const baseRadius=portrait?Math.min(w*.35,h*modelSize*.30):Math.min(w*modelSize*.34,h*.22),r=baseRadius*clamp(num(input.ringScale,1.15),.6,2.4)*(1+.44*(1-intro));
  function line(points,color,width=1,alpha=1,cap='butt'){ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap=cap;ctx.lineJoin='round';ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke();ctx.restore()}
  function disc(x,y,rr,color,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.beginPath();ctx.arc(x,y,Math.max(.1,rr),0,Math.PI*2);ctx.fill();ctx.restore()}
  function poly(points,color,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();ctx.restore()}
  function ellipse(rx,ry,rotation,start,end,color,width,alpha=1){ctx.save();ctx.rotate(rotation);ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,start,end);ctx.stroke();ctx.restore()}
  function star(x,y,rr,color,angle=0,alpha=1){ctx.save();ctx.translate(x,y);ctx.rotate(angle);const pts=[];for(let i=0;i<8;i++){const b=i*Math.PI/4,z=i%2?rr*.16:rr;pts.push([Math.cos(b)*z,Math.sin(b)*z])}poly(pts,color,alpha);ctx.restore()}
  function cast(draw){ctx.save();if(input.shadow!==false&&num(input.shadowStrength,.8)>0&&num(input.shadowDepth,1)>0){const tr=typeof ctx.getTransform==='function'?ctx.getTransform():null,dpr=tr?Math.hypot(tr.a,tr.b)||1:1,depth=num(input.shadowDepth,1);ctx.shadowColor=rgba(shadowColor,num(input.shadowStrength,.8)*.3);ctx.shadowOffsetX=unit*.009*depth*dpr;ctx.shadowOffsetY=unit*.014*depth*dpr;ctx.shadowBlur=(input.shadowStyle==='soft'?unit*.02:0)*depth*dpr}draw();ctx.restore()}
  function field(){
    if(input.grid===false||input.pattern==='none')return;
    const kind=input.pattern||'grid',step=Math.max(18,portrait?w*.095:w*.043),amp=unit*.017*gm;
    const drift=Math.sin(ga*.55)*step*.045*gm;
    function fade(x,y){const dx=(x-w*.5)/w,dy=(y-h*.5)/h;return clamp(1-Math.sqrt(dx*dx+dy*dy)*.45,.45,1)}
    if(kind==='ripple'){
      for(let j=0;j<17;j++){const rr=unit*(.08+j*.08),pts=[];for(let i=0;i<=110;i++){const b=i*Math.PI/55;pts.push([cx+Math.cos(b)*rr,cy+Math.sin(b)*rr*.42+Math.sin(b*3-j*.35+ga)*amp])}line(pts,ink,unit*.00075,grid*(1-j/19)*1.2)}return;
    }
    if(kind==='dots'){
      for(let j=0,y=step*.5;y<h;y+=step,j++)for(let i=0,x=step*.5;x<w;x+=step,i++){const xx=x+Math.sin(j*.36+ga)*amp*.4,yy=y+Math.sin(i*.28+j*.31+ga)*amp;disc(xx,yy,unit*.00105,ink,grid*fade(xx,yy)*(1.1+.3*Math.sin(i*.2+j*.3+ga)))}return;
    }
    const perspective=kind==='mesh';
    for(let x=-step;x<w+step;x+=step){const pts=[];for(let y=-step;y<h+step;y+=14){const xx=x+Math.sin(y/h*4+ga)*amp+(perspective?(x-w*.5)*Math.sin(y/h*Math.PI)*.016:0);pts.push([xx+drift,y])}line(pts,ink,unit*.00065,grid*.68)}
    for(let y=-step;y<h+step;y+=step){const pts=[];for(let x=-step;x<w+step;x+=14)pts.push([x,y+Math.sin(x/w*4.5+ga+.8)*amp*.75+drift]);line(pts,ink,unit*.00065,grid*.68)}
    for(let y=0;y<h;y+=step*2)for(let x=0;x<w;x+=step*2){const xx=x+drift+Math.sin(y/h*4+ga)*amp,yy=y+drift+Math.sin(x/w*4.5+ga+.8)*amp*.75,rr=unit*.0026;line([[xx-rr,yy],[xx+rr,yy]],muted,unit*.0009,grid*1.7*fade(x,y));line([[xx,yy-rr],[xx,yy+rr]],muted,unit*.0009,grid*1.7*fade(x,y))}
  }
  function rays(){
    ellipse(r*.76,r*.76,0,0,Math.PI*2,accent,r*.13*strength,dark?.19:.25);
    ctx.save();ctx.rotate(a*.24);for(let i=0;i<28;i++){const b=i*Math.PI/14,major=i%4===0,inner=r*(major?.90:1.0),outer=r*(major?1.40:1.20);line([[Math.cos(b)*inner,Math.sin(b)*inner],[Math.cos(b)*outer,Math.sin(b)*outer]],major?accent:ink,major?r*.035*strength:r*.008,major?.95:.8)}ctx.restore();
  }
  function geometry(){
    const kind=input.ringStyle||input.geometry||'signature';if(kind==='none')return;
    if(kind==='signature'||kind==='rays'){rays();return}
    if(kind==='orbit'){
      ellipse(r*.79,r*.79,0,0,Math.PI*2,accent,r*.15,dark?.2:.24);
      ellipse(r*1.22,r*.46,-.57+Math.sin(a)*.06,0,Math.PI*2,ink,r*.009,.9);
      ellipse(r*1.16,r*.49,.68+Math.sin(a)*.05,0,Math.PI*2,accent,r*.037*strength,.95);
      ctx.save();ctx.rotate(-.57+Math.sin(a)*.06);disc(Math.cos(a)*r*1.22,Math.sin(a)*r*.46,r*.027,ink);ctx.restore();return;
    }
    if(kind==='ring'){
      ellipse(r,r,0,0,Math.PI*2,accent,r*.14*strength,.22);ellipse(r,r,0,a-.7,a+3.7,accent,r*.14*strength,.97);ellipse(r*1.16,r*1.16,0,-a+.2,-a+2.4,ink,r*.008,.8);disc(Math.cos(-a+2.4)*r*1.16,Math.sin(-a+2.4)*r*1.16,r*.025,ink);return;
    }
    if(kind==='slices'){
      ctx.save();ctx.rotate(-.3+Math.sin(a)*.12);for(let i=0;i<3;i++){ellipse(r*(1+i*.08),r*(.70+i*.07),0,a*.23+i*2.08,a*.23+i*2.08+1.58,i===1?ink:accent,r*(i===1?.03:.075)*strength,i===2?.38:.85)}ctx.restore();return;
    }
    if(kind==='wave'){
      for(let i=0;i<5;i++){const rr=r*(.69+i*.13+.014*Math.sin(a+i));ellipse(rr,rr*(.93+.03*Math.sin(a+i)),Math.sin(a)*.06,a*.15+i*.2,a*.15+i*.2+Math.PI*1.75,i%2?ink:accent,r*(i===0?.08:.008)*strength,i===0?.28:.43)}return;
    }
    if(kind==='flow'||kind==='ribbon'){
      for(let j=0;j<3;j++){const pts=[];for(let i=0;i<=110;i++){const b=i*Math.PI/55;pts.push([Math.cos(b)*r*(1.13+.12*Math.sin(b*2+a+j*.3)),Math.sin(b)*r*(.48+.025*j)+Math.sin(b*3+a)*r*.07])}line(pts,j===1?ink:accent,r*(j===0?.045:.009)*strength,j===2?.4:.9)}return;
    }
    if(kind==='blocks'){
      ctx.save();ctx.rotate(a*.12);for(let i=0;i<10;i++){const b=i*Math.PI/5;ctx.save();ctx.translate(Math.cos(b)*r,Math.sin(b)*r);ctx.rotate(b+a*.08);const sz=r*(i%3===0?.19:.12)*strength;ctx.fillStyle=i%3===0?accent:rgba(ink,.6);ctx.beginPath();if(ctx.roundRect)ctx.roundRect(-sz*.5,-sz*.5,sz,sz,sz*.22);else ctx.rect(-sz*.5,-sz*.5,sz,sz);ctx.fill();ctx.restore()}ctx.restore();ellipse(r*.77,r*.77,0,0,Math.PI*2,accent,r*.055,.25);return;
    }
    if(kind==='facet'||kind==='cut'){
      const count=kind==='facet'?6:8;ctx.save();ctx.rotate(-.24+Math.sin(a)*.07);for(let i=0;i<count;i++){if(kind==='cut'&&(i===1||i===5))continue;const b=i*Math.PI*2/count,c=(i+.88)*Math.PI*2/count;line([[Math.cos(b)*r,Math.sin(b)*r],[Math.cos(c)*r,Math.sin(c)*r]],i%3===0?ink:accent,r*(i%3===0?.024:.09)*strength,.9)}ctx.restore();return;
    }
    if(kind==='burst'){
      ctx.save();ctx.rotate(a*.28);for(let i=0;i<17;i++){const b=i*Math.PI*2/17,rr=r*(i%3===0?1.3:1.12);poly([[Math.cos(b)*r*.91,Math.sin(b)*r*.91],[Math.cos(b+.023)*rr,Math.sin(b+.023)*rr],[Math.cos(b+.075)*r*.94,Math.sin(b+.075)*r*.94]],i%3===0?ink:accent,i%3===0?.8:.92)}ctx.restore();ellipse(r*.74,r*.74,0,0,Math.PI*2,accent,r*.04,.3);return;
    }
    rays();
  }
  ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.setLineDash([]);ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;ctx.clearRect(0,0,w,h);if(!input.transparent){ctx.fillStyle=paper;ctx.fillRect(0,0,w,h);
  const shade=portrait?ctx.createLinearGradient(0,h*closeStart,0,h*(closeStart+split)):ctx.createLinearGradient(w*closeStart,0,w*(closeStart+split),0);
  shade.addColorStop(0,rgba(ink,dark?.055:.035));shade.addColorStop(.30,rgba(ink,.006));shade.addColorStop(.72,rgba(ink,0));shade.addColorStop(1,rgba(ink,dark?.08:.05));ctx.fillStyle=shade;ctx.fillRect(portrait?0:w*closeStart,portrait?h*closeStart:0,portrait?w:w*split,portrait?h*split:h);
  }
  field();
  if(input.floor&&num(input.shadowStrength,.8)>0&&num(input.shadowDepth,1)>0){const yy=portrait?h*(modelStart+modelSize*.79):h*.72,rr=Math.min(r*.83,w*.24),g=ctx.createRadialGradient(cx,yy,0,cx,yy,rr);g.addColorStop(0,rgba(shadowColor,num(input.shadowStrength,.8)*(dark?.24:.11)));g.addColorStop(1,rgba(shadowColor,0));ctx.save();ctx.translate(0,yy);ctx.scale(1,.06);ctx.translate(0,-yy);ctx.fillStyle=g;ctx.fillRect(cx-rr,yy-rr,rr*2,rr*2);ctx.restore()}
  ctx.save();ctx.studioIntroTransform?.({fromX:w*.5,fromY:h*.48,toX:finalCx,toY:finalCy,scale:1.44});ctx.translate(cx,cy);ctx.globalAlpha*=clamp(num(input.geometryOpacity,1),.3,1);cast(geometry);ctx.restore();
  const boundary=swapped?1-split:split;ctx.save();ctx.studioIntroOpacity?.(.24);ctx.globalAlpha*=.24+.76*intro;
  if(portrait){line([[0,h*boundary],[w,h*boundary]],muted,unit*.0011,.47);line([[w*.44,h*boundary],[w*.57,h*boundary]],accent,unit*.007,.95);}
  else{line([[w*boundary,0],[w*boundary,h]],muted,unit*.0011,.47);line([[w*boundary,h*.43],[w*boundary,h*.55]],accent,unit*.006,.95);line([[w*(modelStart+modelSize*.08),h*.74],[w*(modelStart+modelSize*.93),h*.74]],muted,unit*.0009,.36)}
  if(detail>0){const stubX=portrait?w*.11:w*(closeStart+split*.11),stubY=portrait?h*(closeStart+.09):h*.15;ctx.save();ctx.translate(stubX,stubY);ctx.rotate(-.23+Math.sin(ga)*.025);line([[-unit*.035,0],[unit*.035,0]],accent,unit*.018,.95,'round');ctx.restore();if(!portrait)star(w*(modelStart+modelSize*.92),h*.63,unit*.015,ink,-.2+a*.07,detail*.9)}
  if(input.dualGuides){
    const box=portrait?[w*.07,h*(closeStart+split*.15),w*.86,h*split*.57]:[w*(closeStart+split*.08),h*.18,w*split*.84,h*.49],len=unit*.024;
    for(const [x,y,sx,sy]of [[box[0],box[1],1,1],[box[0]+box[2],box[1],-1,1],[box[0],box[1]+box[3],1,-1],[box[0]+box[2],box[1]+box[3],-1,-1]])line([[x+sx*len,y],[x,y],[x,y+sy*len]],muted,unit*.0014,.58);
  }
  ctx.restore();ctx.restore();return true;
}

function paintExploration(ctx,w,h,t,variant,settings){
  if(paintUrbanLanguage(ctx,w,h,t,variant,settings||{}))return;
  if(paintDualLanguage(ctx,w,h,t,variant,settings||{}))return;
  if(paintDesignLanguage(ctx,w,h,t,variant,settings||{}))return;
  if(!ctx||!(w>0)||!(h>0))return;
  const input=settings||{},clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
  const num=(v,fallback)=>Number.isFinite(v)?v:fallback;
  const smooth=v=>{v=clamp(v);return v*v*(3-2*v)};
  const dark=input.background==='dark',swapped=!!input.swapped,side=swapped?-1:1;
  const intensity=clamp(num(input.intensity,.65),0,1.5),strength=clamp(num(input.geometryStrength,1),.5,1.5);
  const a=input.motion===false?0:Math.PI*2*num(input.ringTime,num(t,0))/12;
  const backgroundA=input.motion===false?0:Math.PI*2*num(t,0)/12;
  const sa=Math.sin(a),ca=Math.cos(a),s2=Math.sin(a*2);
  const intro=clamp(num(input.introProgress,1));
  const portrait=!!input.portrait;
  const centre=variant==='poster'?[.74,.43,.40]:variant==='wave'?[.73,.57,.375]:[.71,.46,.365];
  const finalCx=w*(portrait?.57:swapped?1-centre[0]:centre[0])+num(input.px,0)*w*.008,finalCy=h*(portrait?(swapped?.34:.59):centre[1])+num(input.py,0)*h*.005;
  const cx=w*.5+(finalCx-w*.5)*intro,cy=h*.48+(finalCy-h*.48)*intro;
  const r=(portrait?Math.min(w*.43,h*.26):h*centre[2])*clamp(num(input.ringScale,1.1),.6,2.4)*(1+s2*.008)*(1+.44*(1-intro));
  const accent=/^#[0-9a-f]{6}$/i.test(input.accent||'')?input.accent:'#bceb45';
  const languagePalette=designLanguagePalette(variant,dark);
  const bg=languagePalette?languagePalette.paper:dark?'#141b20':variant==='poster'?'#edeede':'#eff1e8';
  const fg=languagePalette?languagePalette.ink:dark?'#e4ede2':'#26382e';
  const weight=.66+.34*intensity;
  const shadowColor=/^#[0-9a-f]{6}$/i.test(input.shadowColor||'')?input.shadowColor:'#24302c';

  function rgba(hex,alpha){const n=parseInt(hex.slice(1),16);return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+clamp(alpha)+')'}
  function stroke(points,color,width,alpha=1,cap='round'){
    if(points.length<2)return;
    ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;
    ctx.lineCap=cap;ctx.lineJoin='round';ctx.beginPath();
    points.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));
    ctx.stroke();ctx.restore();
  }
  function disk(x,y,radius,color,alpha=1){ctx.save();ctx.globalAlpha*=alpha;ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();ctx.restore()}
  function ellipse(rx,ry,rotation,start,end,color,width,alpha=1,dx=0,dy=0,steps=84){
    const points=[],cos=Math.cos(rotation),sin=Math.sin(rotation);
    for(let i=0;i<=steps;i++){const angle=start+(end-start)*i/steps,x=Math.cos(angle)*rx,y=Math.sin(angle)*ry;points.push([dx+x*cos-y*sin,dy+x*sin+y*cos])}
    stroke(points,color,width,alpha);
  }
  function ellipseBand(rx,ry,rotation,start,end,inner,color,alpha=1){
    ctx.save();ctx.rotate(rotation);ctx.globalAlpha*=alpha;ctx.beginPath();
    const steps=56;
    for(let i=0;i<=steps;i++){const angle=start+(end-start)*i/steps,x=Math.cos(angle)*rx,y=Math.sin(angle)*ry;i?ctx.lineTo(x,y):ctx.moveTo(x,y)}
    for(let i=steps;i>=0;i--){const angle=start+(end-start)*i/steps;ctx.lineTo(Math.cos(angle)*rx*inner,Math.sin(angle)*ry*inner)}
    ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.restore();
  }
  function spatialAlpha(x,y){
    if(portrait){const middle=1-smooth(Math.abs(y/h-(swapped?.35:.59))/.43);return (.12+.88*middle)*(.2+.8*smooth(Math.min(x/w,1-x/w)/.12))}
    const display=swapped?1-smooth((x/w-.49)/.24):smooth((x/w-.29)/.24);
    const edge=smooth(Math.min(x/w,1-x/w)/.12);
    const bottom=1-smooth((y/h-.87)/.20);
    return (.13+.87*display)*(.2+.8*edge)*bottom;
  }
  function projected(u,depth){
    const z=.18+depth*4.65,perspective=1/(z+.8);
    const ga=input.gridMoving===false?0:backgroundA,motion=clamp(num(input.gridMotion,.14)/.14,0,3.6),wave=Math.sin(u*1.17-depth*2.3+ga);
    return [cx+(portrait?1:side)*(u+Math.sin(ga)*.038*motion)*w*.30*perspective,
      h*((portrait?.34:.22)+(portrait?.51:.66)*perspective)+h*.018*perspective*wave*motion];
  }
  function surface(kind){
    const cols=44,rows=27,points=[];
    for(let j=0;j<=rows;j++){
      const depth=j/rows,row=[];
      for(let i=0;i<=cols;i++)row.push(projected((i/cols-.5)*7.4,depth));
      points.push(row);
    }
    if(kind==='dots'){
      for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){
        const point=points[j][i],depth=j/rows;
        const fade=Math.pow(1-depth,.70)*spatialAlpha(point[0],point[1]);
        if(fade<.015||point[0]<-2||point[0]>w+2)continue;
        const radius=w*.00125*(.50+.50/(.98+depth*4.65));
        disk(point[0],point[1],radius,(i+j)%9===0?accent:fg,intensity*.28*fade);
      }
      return;
    }
    // Draw independent segments so the information third and horizon can fade.
    for(let j=0;j<=rows;j++)for(let i=0;i<cols;i++){
      const x=points[j][i],y=points[j][i+1],depth=j/rows;
      const fade=Math.pow(1-depth,.72)*spatialAlpha((x[0]+y[0])/2,(x[1]+y[1])/2);
      if(fade>.01)stroke([x,y],j%6===0?accent:fg,w*.00082,intensity*.16*fade);
    }
    for(let i=0;i<=cols;i++)for(let j=0;j<rows;j++){
      const x=points[j][i],y=points[j+1][i],depth=(j+.5)/rows;
      const fade=Math.pow(1-depth,.72)*spatialAlpha((x[0]+y[0])/2,(x[1]+y[1])/2);
      if(fade>.01)stroke([x,y],fg,w*.00075,intensity*.14*fade);
    }
  }
  function rippleField(){
    const count=19,steps=76;
    for(let j=0;j<count;j++){
      const radius=w*(.065+j*.047),ratio=.255+.035*Math.cos(j*.25);
      let previous=null;
      for(let i=0;i<=steps;i++){
        const angle=i*Math.PI*2/steps;
        const ga=input.gridMoving===false?0:backgroundA,motion=clamp(num(input.gridMotion,.14)/.14,0,3.6);
        const point=[cx+Math.cos(angle)*radius,h*(portrait?(swapped?.47:.70):.67)+Math.sin(angle)*radius*ratio+h*.010*Math.sin(angle*3-j*.34+ga)*motion];
        if(previous){
          const fade=spatialAlpha((previous[0]+point[0])/2,(previous[1]+point[1])/2)*(1-j/count)*.86;
          stroke([previous,point],j%5===0?accent:fg,w*.00085,intensity*.18*fade);
        }
        previous=point;
      }
    }
  }
  function cast(draw){
    ctx.save();
    if(input.shadow!==false&&num(input.shadowStrength,.8)>0&&num(input.shadowDepth,1)>0){
      const matrix=typeof ctx.getTransform==='function'?ctx.getTransform():null;
      const dpr=matrix?Math.hypot(matrix.a,matrix.b)||1:1;
      const d=num(input.shadowDepth,1),s=num(input.shadowStrength,.8);
      ctx.shadowColor=rgba(shadowColor,s*.45);
      ctx.shadowBlur=input.shadowStyle==='soft'?r*.06*d*dpr:0;ctx.shadowOffsetY=r*.035*d*dpr;ctx.shadowOffsetX=r*.024*d*dpr;
    }
    draw();ctx.restore();
  }
  function orbit(signature){
    const angle=-.24+sa*.035;
    ellipse(r*1.05,r*.97,angle,0,Math.PI*2,fg,r*.006,.24*weight);
    ellipse(r*1.14,r*1.06,angle,a+.9,a+5.7,fg,r*.004,.12*weight);
    cast(()=>ellipse(r*1.05,r*.97,angle,a+.24,a+4.68,accent,r*(signature?.033:.047)*strength,.88*weight));
    const rx=r*(signature?1.38:1.24),ry=r*(signature?.43:.56),rotation=-.40+ca*.035;
    ellipse(rx,ry,rotation,0,Math.PI*2,fg,r*.006,.31*weight);
    ellipse(rx,ry,rotation,a-.11,a+.24,accent,r*.020,.88*weight);
    const x=Math.cos(a)*rx,y=Math.sin(a)*ry;
    disk(x*Math.cos(rotation)-y*Math.sin(rotation),x*Math.sin(rotation)+y*Math.cos(rotation),r*.022,accent,.96);
  }
  function slices(){
    const tilt=-.29+sa*.065;
    ellipse(r*1.28,r*1.05,tilt,-2.85,2.54,fg,r*.005,.22*weight);
    cast(()=>ellipseBand(r*1.15,r*.94,tilt,-2.72,-.54,1-.075*strength,accent,.87*weight));
    ellipseBand(r*1.15,r*.94,tilt,.18,1.82,.948,fg,.36*weight);
    ellipseBand(r*1.24,r*1.02,tilt,2.15,2.65,.978,accent,.62*weight);
    ellipse(r*1.34,r*.42,tilt+.24,a+.10,a+2.42,fg,r*.007,.29*weight);
    // Two parallel cuts float outside the perimeter, never across the centre.
    ctx.save();ctx.rotate(tilt);
    const bx=r*(.82+ca*.016),by=-r*(.91+sa*.018);
    stroke([[bx-r*.09,by+r*.04],[bx+r*.13,by-r*.08]],accent,r*.045,.90*weight,'butt');
    stroke([[bx-r*.05,by+r*.09],[bx+r*.08,by+r*.02]],fg,r*.009,.42*weight,'butt');ctx.restore();
  }
  function waveSignature(){
    const tilt=-.23+sa*.035;
    for(let i=2;i>=0;i--){
      const extra=i*.145;
      ellipse(r*(1.04+extra),r*(.83+extra*.68),tilt,0,Math.PI*2,fg,r*(i===0?.007:.004),(.31-i*.085)*weight);
    }
    cast(()=>ellipse(r*1.185,r*.929,tilt,a+.25,a+2.76,accent,r*.025*strength,.84*weight));
    ellipse(r*1.04,r*.83,tilt,-a+.60,-a+2.10,accent,r*.010,.44*weight);
    const dx=-r*(1.02+sa*.018),dy=-r*(.78+ca*.025);
    ellipse(r*.19,r*.075,-.37,0,Math.PI*2,accent,r*.012,.72*weight,dx,dy,44);
    disk(dx+Math.cos(a)*r*.17,dy+Math.sin(a)*r*.066,r*.018,fg,.58*weight);
    ellipse(r*.24,r*.085,.24,0,Math.PI*2,fg,r*.008,.32*weight,r*.98,r*(.84+sa*.025),44);
  }
  function ribbon(){
    const bend=sa*r*.025;
    ctx.save();ctx.rotate(-.20+sa*.04);ctx.lineCap='round';ctx.lineJoin='round';
    cast(()=>{
      ctx.beginPath();ctx.moveTo(-r*1.03,-r*.12);
      ctx.bezierCurveTo(-r*1.06,-r*.66,r*-.44,-r*1.12+bend,r*.22,-r*.97);
      ctx.bezierCurveTo(r*.57,-r*.88,r*.86,-r*.66,r*.99,-r*.39);
      ctx.strokeStyle=rgba(accent,.86*weight);ctx.lineWidth=r*.069*strength;ctx.stroke();
    });
    ctx.beginPath();ctx.moveTo(r*.98,r*.15);
    ctx.bezierCurveTo(r*.89,r*.66+bend,r*.35,r*1.08,-r*.23,r*.96);
    ctx.bezierCurveTo(-r*.59,r*.89,-r*.85,r*.61,-r*.98,r*.36);
    ctx.strokeStyle=rgba(fg,.36*weight);ctx.lineWidth=r*.045*strength;ctx.stroke();
    ellipse(r*1.23,r*.99,-.035,-2.02,1.24,fg,r*.005,.20*weight);
    ctx.restore();
  }

  function poly(points,fill,outline,width=1){ctx.beginPath();points.forEach((point,i)=>i?ctx.lineTo(point[0],point[1]):ctx.moveTo(point[0],point[1]));ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill()}if(outline){ctx.strokeStyle=outline;ctx.lineWidth=width;ctx.stroke()}}
  function editorialCuts(){
    const energy=clamp(num(input.cutStrength,.75));if(!energy)return;
    ctx.save();ctx.globalAlpha*=energy;ctx.translate(swapped?w:0,0);ctx.scale(side,1);
    const shift=sa*w*.006;
    if(portrait){
      const y=h*(swapped?.08:.77);
      poly([[w*.96+shift,y-h*.08],[w*1.12,y-h*.12],[w*1.04,y+h*.05],[w*.87+shift,y+h*.085]],rgba(accent,.75));
      stroke([[w*.90,y+h*.055],[w*1.05,y-h*.016]],fg,w*.008,.48,'butt');
      poly([[w*.065,h*.44],[w*.10,h*.421],[w*.125,h*.442],[w*.09,h*.461]],rgba(accent,.65));
    }else if(variant==='poster'){
      poly([[w*.79,h*1.025],[w*1.04,h*.64],[w*1.07,h*.82],[w*.94,h*1.04]],accent);
      poly([[w*.86,h*1.03],[w*1.04,h*.76],[w*1.06,h*.84],[w*.94,h*1.04]],dark?'#eee8d9':'#17271e');
      poly([[w*.81+shift,-h*.05],[w*.96,-h*.02],[w*.90,h*.12]],rgba(accent,.85));
      poly([[w*.87,-h*.02],[w*.93,h*.01],[w*.91,h*.16]],dark?'#eee8d9':'#17271e');
      stroke([[w*.52,h*.13],[w*.555,h*.10]],accent,w*.008,.8,'butt');
    }else if(variant==='wave'){
      poly([[w*.90,h*1.02],[w*1.06,h*.76],[w*1.04,h*.94],[w*.99,h*1.02]],accent);
      stroke([[w*.55,h*.12],[w*.61,h*.10]],accent,w*.006,.85,'butt');
      stroke([[w*.57,h*.145],[w*.605,h*.134]],fg,w*.002,.35,'butt');
      poly([[w*.964+shift,h*.22],[w*.987+shift,h*.18],[w*1.01+shift,h*.22]],rgba(accent,.7));
    }else{
      poly([[w*.85,h*1.025],[w*1.05,h*.78],[w*1.025,h*.91],[w*.94,h*1.02]],rgba(accent,.9));
      poly([[w*.91,h*1.02],[w*1.03,h*.88],[w*1.03,h*.915],[w*.94,h*1.03]],dark?'#e8edde':'#23392a');
      poly([[w*.56+shift,h*.14],[w*.585+shift,h*.10],[w*.61+shift,h*.15],[w*.585+shift,h*.19]],rgba(accent,.9));
      stroke([[w*.96,h*.24],[w*1.015,h*.17]],fg,w*.003,.38,'butt');
    }
    ctx.restore();
  }
  const state={geometryStrength:strength};
  function renderSeriesGeometry(kind,cx,cy,r,a,c,p){
  if(!['facet','ribbon','blocks'].includes(kind)||!Number.isFinite(r)||r<=0)return;
  const R=r;
  const strength=Number.isFinite(state.geometryStrength)?Math.max(.5,Math.min(1.5,state.geometryStrength)):1;
  const s=Math.sin(a),q=Math.cos(a),s2=Math.sin(a*2);

  // All coordinates and widths scale with the supplied radius. Only integer
  // harmonics of a animate the devices, so a and a + 2 PI render identically.
  function stroke(points,color,width,alpha=1,cap='butt',join='miter'){
    ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;
    ctx.lineCap=cap;ctx.lineJoin=join;ctx.miterLimit=2.4;
    ctx.beginPath();points.forEach((pt,i)=>i?ctx.lineTo(pt[0]*R,pt[1]*R):ctx.moveTo(pt[0]*R,pt[1]*R));
    ctx.stroke();ctx.restore();
  }
  function face(points,color,alpha=1){
    ctx.save();ctx.globalAlpha*=alpha;
    poly(points.map(pt=>[pt[0]*R,pt[1]*R]),color);
    ctx.restore();
  }
  function curve(build,color,width,alpha=1,cap='round'){
    ctx.save();ctx.globalAlpha*=alpha;ctx.strokeStyle=color;ctx.lineWidth=width;
    ctx.lineCap=cap;ctx.lineJoin='round';ctx.beginPath();build();ctx.stroke();ctx.restore();
  }
  function tile(x,y,tw,th,round,color,alpha=1,rotation=0){
    ctx.save();ctx.translate(x*R,y*R);ctx.rotate(rotation);ctx.globalAlpha*=alpha;
    const X=-tw*R/2,Y=-th*R/2,W=tw*R,H=th*R,B=Math.min(round*R,W/2,H/2);
    ctx.beginPath();ctx.moveTo(X+B,Y);ctx.lineTo(X+W-B,Y);
    ctx.quadraticCurveTo(X+W,Y,X+W,Y+B);ctx.lineTo(X+W,Y+H-B);
    ctx.quadraticCurveTo(X+W,Y+H,X+W-B,Y+H);ctx.lineTo(X+B,Y+H);
    ctx.quadraticCurveTo(X,Y+H,X,Y+H-B);ctx.lineTo(X,Y+B);
    ctx.quadraticCurveTo(X,Y,X+B,Y);ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.restore();
  }

  ctx.save();ctx.translate(cx,cy);
  if(kind==='facet'){
    // Three separate, cut-ended rails suggest a garment pattern jig rather
    // than a circular halo. The open centre stays clear to roughly .70 R.
    ctx.rotate(-.13+s*.055);
    stroke([[-.88,-.47],[-.24,-1.00],[.42,-.94]],c.accent,R*.10*strength);
    stroke([[.72,-.59],[1.02,.08],[.78,.74]],c.fg,R*.075*strength,.76);
    stroke([[-.94,-.15],[-.85,.61],[-.41,.95]],c.accent,R*.075*strength,.80);
    stroke([[.10,1.03],[.48,.91]],c.fg,R*.032*strength,.80);

    // One short run of stitching, on the material rather than in the centre.
    ctx.save();ctx.translate(-R*.014,R*.026);ctx.setLineDash([R*.023,R*.043]);
    stroke([[-.77,-.56],[-.44,-.83]],c.paper,R*.008,.82);ctx.restore();
    stroke([[.81,-.58],[1.10,.08],[.88,.68]],c.fg,R*.008,.34);

    ctx.save();ctx.translate(R*(.82+s*.025),R*(-.95+q*.018));ctx.rotate(.20+s*.13);
    face([[-.145,-.065],[.115,-.115],[.145,.065],[-.105,.105]],c.fg,.92);
    face([[-.145,-.065],[-.075,-.078],[-.105,.105]],c.accent);
    stroke([[-.055,-.070],[.065,-.090]],c.black,R*.010,.72);ctx.restore();
    ctx.save();ctx.translate(R*(-.46+s2*.016),R*(1.115-q*.012));ctx.rotate(-.28-s*.09);
    face([[-.12,-.028],[.10,-.028],[.13,.028],[-.10,.028]],c.fg,.68);ctx.restore();
  }else if(kind==='ribbon'){
    // Long, continuously curved ribbons: no ears, tufts, or mascot silhouette.
    ctx.rotate(-.18+s*.045);
    curve(()=>{
      ctx.moveTo(-1.01*R,-.12*R);
      ctx.bezierCurveTo((-1.04+s*.02)*R,-.65*R,-.46*R,(-1.11+q*.025)*R,.18*R,(-.99+q*.02)*R);
      ctx.bezierCurveTo(.57*R,-.92*R,(.85+s*.025)*R,-.72*R,.96*R,(-.43+s2*.02)*R);
    },c.accent,R*.105*strength,.94);
    curve(()=>{
      ctx.moveTo(.95*R,(.18+q*.02)*R);
      ctx.bezierCurveTo(.83*R,(.67+s*.025)*R,.38*R,1.07*R,-.23*R,(.94+s*.018)*R);
      ctx.bezierCurveTo(-.55*R,.87*R,(-.82+q*.02)*R,.66*R,-.94*R,.38*R);
    },c.fg,R*.085*strength,.72);

    // A loose counter-curve and one glint give a satin edge, with large gaps.
    curve(()=>{
      ctx.moveTo(-.57*R,-1.15*R);
      ctx.bezierCurveTo(.10*R,(-1.34+s*.03)*R,1.13*R,-.78*R,1.14*R,-.04*R);
      ctx.bezierCurveTo((1.16+q*.02)*R,.52*R,.76*R,1.13*R,.26*R,1.17*R);
    },c.fg,R*.010,.32);
    curve(()=>{
      ctx.moveTo(-.77*R,-.68*R);
      ctx.bezierCurveTo(-.56*R,-.89*R,-.26*R,(-1.00+q*.025)*R,-.01*R,-.97*R);
    },c.paper,R*.012,.72);
    curve(()=>{
      ctx.moveTo(-.65*R,(1.00+s*.016)*R);
      ctx.bezierCurveTo(-.36*R,1.18*R,.03*R,(1.18-q*.025)*R,.29*R,1.06*R);
    },c.accent,R*.025*strength,.72);
  }else{
    // Independent rounded corners leave four openings; one stepped corner
    // and two detached tiles provide the MINI rhythm without filling it in.
    ctx.rotate(-.07+s*.035);
    curve(()=>{
      ctx.moveTo(-.98*R,-.10*R);ctx.lineTo(-.98*R,-.57*R);
      ctx.quadraticCurveTo(-.98*R,-.95*R,-.59*R,-.95*R);ctx.lineTo(-.16*R,-.95*R);
    },c.accent,R*.115*strength,1,'butt');
    curve(()=>{
      ctx.moveTo(.20*R,-.95*R);ctx.lineTo(.56*R,-.95*R);
      ctx.quadraticCurveTo(.95*R,-.95*R,.95*R,-.56*R);ctx.lineTo(.95*R,-.15*R);
    },c.fg,R*.085*strength,.86,'butt');
    curve(()=>{
      ctx.moveTo(1.00*R,.20*R);ctx.lineTo(1.00*R,.59*R);
      ctx.quadraticCurveTo(1.00*R,.92*R,.71*R,.92*R);
      ctx.lineTo(.43*R,.92*R);ctx.lineTo(.43*R,1.055*R);ctx.lineTo(.11*R,1.055*R);
    },c.accent,R*.12*strength,.86,'butt');
    curve(()=>{
      ctx.moveTo(-.22*R,.98*R);ctx.lineTo(-.57*R,.98*R);
      ctx.quadraticCurveTo(-.98*R,.98*R,-.98*R,.58*R);ctx.lineTo(-.98*R,.26*R);
    },c.fg,R*.065*strength,.62,'butt');

    tile(-1.12-s*.020,.065+q*.035,.22,.22,.060,c.accent,1,-.14+s*.14);
    tile(.16+q*.026,-1.16-s*.016,.25,.115,.025,c.fg,.86,.12-s*.075);
    stroke([[.68,1.085],[.91,1.085]],c.fg,R*.012,.44,'round');
  }
  ctx.restore();
}

  function classic(kind){
    const color={accent,fg,paper:dark?'#f5f0e5':'#f9f6eb',black:'#090b10'};
    if(['facet','ribbon','blocks'].includes(kind)){cast(()=>renderSeriesGeometry(kind,0,0,r,a,color,1));return}
    if(kind==='ring'){ellipse(r,r,0,0,Math.PI*2,accent,r*.065*strength,.78);ellipse(r*1.12,r*1.12,0,a,a+4.5,fg,r*.006,.28);return}
    if(kind==='cut'){ctx.save();ctx.rotate(a*.5);for(let i=0;i<8;i++){if(i===2||i===6)continue;const b=i*Math.PI/4,c=(i+.83)*Math.PI/4;stroke([[Math.cos(b)*r,Math.sin(b)*r],[Math.cos(c)*r,Math.sin(c)*r]],accent,r*.08*strength,.9,'butt')}const points=[];for(let i=0;i<8;i++){const b=i*Math.PI/4;points.push([Math.cos(b)*r*1.15,Math.sin(b)*r*1.15])}poly(points,null,fg,r*.008);ctx.restore();return}
    ctx.save();ctx.rotate(a);const rays=kind==='rays',count=rays?24:14;for(let i=0;i<count;i++){const angle=i*Math.PI*2/count,rr=r*(.91+.07*Math.sin(a*2+i)),length=r*(rays?(i%3===0?.30:.09):(i%3===0?.29:.14))*strength;poly([[Math.cos(angle)*rr,Math.sin(angle)*rr],[Math.cos(angle+.028)*(rr+length),Math.sin(angle+.028)*(rr+length)],[Math.cos(angle+.065)*rr,Math.sin(angle+.065)*rr]],i%3===0?color.paper:rgba(accent,.84))}ellipse(r*.77,r*.77,0,0,Math.PI*1.4,fg,r*.006,.2);ctx.restore();
  }
  function flatGrid(){const step=Math.max(22,w*.038),motion=clamp(num(input.gridMotion,.14),0,.5),ga=input.gridMoving===false?0:backgroundA;for(let x=-step;x<w+step;x+=step){const points=[];for(let y=0;y<=h+8;y+=12)points.push([x+Math.sin(y/h*5+ga)*w*.015*motion,y]);stroke(points,fg,.7,intensity*.08)}for(let y=-step;y<h+step;y+=step){const points=[];for(let x=0;x<=w+8;x+=12)points.push([x,y+Math.cos(x/w*6+ga)*h*.018*motion]);stroke(points,fg,.7,intensity*.08)}}
  ctx.save();ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';ctx.setLineDash([]);
  ctx.shadowColor='rgba(0,0,0,0)';ctx.shadowBlur=0;ctx.shadowOffsetX=0;ctx.shadowOffsetY=0;
  ctx.clearRect(0,0,w,h);if(!input.transparent){ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  // A broad, quiet light source adds depth without a visible colour panel.
  const wash=ctx.createRadialGradient(cx,cy,r*.15,cx,cy,Math.max(w,h)*.72);
  wash.addColorStop(0,rgba(accent,dark?.032:.055));wash.addColorStop(.65,rgba(accent,.008));wash.addColorStop(1,rgba(accent,0));
  ctx.fillStyle=wash;ctx.fillRect(0,0,w,h);
  }
  if(input.pattern==='grid')flatGrid();
  else if(input.pattern==='ripple')rippleField();
  else if(input.pattern!=='none')surface(input.pattern==='dots'?'dots':'mesh');
  editorialCuts();

  if(input.floor&&num(input.shadowStrength,.8)>0&&num(input.shadowDepth,1)>0){const floorY=Math.min(h*.88,cy+r*.94+h*.025),radius=Math.min(w*.26,r*.7),g=ctx.createRadialGradient(cx,floorY,0,cx,floorY,radius);g.addColorStop(0,rgba(shadowColor,num(input.shadowStrength,.8)*(dark?.32:.12)));g.addColorStop(1,rgba(shadowColor,0));ctx.save();ctx.translate(0,floorY);ctx.scale(1,.075);ctx.translate(0,-floorY);ctx.fillStyle=g;ctx.fillRect(cx-radius,floorY-radius,radius*2,radius*2);ctx.restore()}
  const style=input.ringStyle||'signature';
  if(style!=='none'){
    ctx.save();ctx.studioIntroTransform?.({fromX:w*.5,fromY:h*.48,toX:finalCx,toY:finalCy,scale:1.44});ctx.globalAlpha*=clamp(num(input.geometryOpacity,1),.3,1);ctx.translate(cx,cy);ctx.scale(portrait?1:side,1);
    if(style==='slices'||style==='signature'&&variant==='poster')slices();
    else if(style==='flow')ribbon();
    else if(style==='wave'||style==='signature'&&variant==='wave')waveSignature();
    else if(['facet','ribbon','blocks','ring','burst','cut','rays'].includes(style))cast(()=>classic(style));
    else orbit(style==='signature');
    ctx.restore();
  }
  ctx.restore();
}

function draw(view){if(view.section.hidden||!view.w)return;const v=state.variants[view.key],np=studioNarrativePose(state.time,state.introDuration,state.narrative),p=np.geometry,t=motionClock.elapsed,a=t/12*Math.PI*2;if(studioLayerConfig?.layer==='borders'){drawBorderMotion(view);return;}drawStudioNarrative(view,np);if(studioLayerConfig?.layer==='effects')return;view.canvas.style.opacity=.68+.32*p;drawInformationMotion(view);drawBorderMotion(view);
const dx=(view.w*.5-(view.stack.offsetLeft+view.stack.offsetWidth*.5))*(1-np.titleMove),dy=(view.h*(state.ratio==='portrait'?.42:.48)-(view.stack.offsetTop+view.stack.offsetHeight*.5))*(1-np.titleMove);view.stack.style.transform=`translate(${dx}px,${dy}px) scale(${1+.48*(1-np.titleMove)})`;
const e=v.effects,move=e.gradientMotion&&!reduced.matches?1:0;view.art.style.setProperty('--wash-x',Math.sin(a)*1.7*move+'%');view.art.style.setProperty('--wash-y',Math.cos(a)*1.2*move+'%');const parallax=v.parallax&&!reduced.matches?1:0;view.art.querySelector('.character-layer').style.transform=`translate(${view.sx*view.w*.008*parallax}px,${(Math.sin(a*2)*view.h*.003+view.sy*view.h*.005)*parallax}px) scale(${v.modelScale})`;view.art.querySelector('.portrait-layer').style.transform=view.key==='dual'?`translateY(${Math.sin(a)*view.h*.003*parallax}px)`:`translateY(${Math.sin(a)*view.h*.006*parallax}px) rotate(${-4+Math.sin(a)*parallax}deg)`;
paintExploration(view.ctx,view.w,view.h,t,view.key,{...v,transparent:root.classList.contains('is-transparent-output'),ringTime:motionClock.rings[view.key],introProgress:p,ringStyle:v.geometryBySeries[state.series],intensity:clamp(v.gridOpacity*10,.05,1.5),pattern:v.grid?v.pattern:'none',portrait:state.ratio==='portrait',swapped:state.swapped,motion:true,shadow:e.shadowEnabled&&v.shadows.geometry,shadowStyle:e.shadowStyle,shadowStrength:e.shadowStrength,shadowDepth:e.shadowDepth,shadowColor:e.shadowColor,floor:e.shadowEnabled&&v.shadows.floor,px:view.sx*parallax,py:view.sy*parallax});
const continuous=studioContinuousShow(state.narrative),showing=state.time>=state.introDuration;
const seek=view.section.querySelector('[data-seek]');seek.value=state.time;seek.setAttribute('aria-valuetext',continuous&&showing?'展示页持续播放，拖动可预览入场':state.time.toFixed(1)+' 秒，'+({intro:'引入',show:'展示',outro:'片尾'}[studioPhase(state.time,state.introDuration,state.narrative)]));view.section.querySelector('[data-time]').textContent=continuous&&showing?Math.max(0,motionClock.elapsed-state.introDuration).toFixed(1)+' s / ∞':state.time.toFixed(1).padStart(4,'0')+' / '+studioTotalDuration(state.introDuration,state.narrative).toFixed(1)+' s';const phase=np.story?.active?(np.story.main>0?'转入主展示':np.story.role==='character'?'第一幕 · 角色镜头':'第二幕 · 作者镜头'):{intro:'引入 · 连续过渡',show:continuous?'展示 · 持续播放':'展示 · 连续动态',outro:'片尾 · 品牌落版'}[studioPhase(state.time,state.introDuration,state.narrative)];if(root.querySelector('[data-phase]').textContent!==phase)root.querySelector('[data-phase]').textContent=phase;}
for(const[key,id]of Object.entries(sharedFields))document.getElementById(id).addEventListener(['series','ratio','frame'].includes(key)?'change':'input',event=>{state[key]=event.target.value;update()});root.querySelectorAll('[data-series-field]').forEach(el=>el.addEventListener('input',()=>{currentSeries()[el.dataset.seriesField]=cleanSeries(el.dataset.seriesField,el.value);update()}));root.querySelectorAll('[data-format]').forEach(el=>el.addEventListener('change',()=>{state.formats[el.dataset.format]=el.checked;update()}));document.getElementById('direction-type').addEventListener('change',event=>{state.type=event.target.checked;update()});document.getElementById('direction-speed').addEventListener('input',event=>{state.speed=Number(event.target.value);update()});
for(const view of views){const {section,key}=view,v=state.variants[key];section.querySelector('[data-play]').addEventListener('click',()=>{if(!state.playing&&!studioContinuousShow(state.narrative)&&state.time>=studioTotalDuration(state.introDuration,state.narrative)){state.time=0;motionClock=createMotionClock(0,state.variants,state.edges)}state.playing=!state.playing;last=0;update()});section.querySelector('[data-intro]').addEventListener('click',()=>{state.time=0;motionClock=createMotionClock(0,state.variants,state.edges);state.playing=true;last=0;update()});section.querySelector('[data-show]').addEventListener('click',()=>{state.time=state.introDuration;last=0;update()});section.querySelector('[data-swap]').addEventListener('click',()=>{state.swapped=!state.swapped;update()});section.querySelector('[data-seek]').addEventListener('input',event=>{state.time=Number(event.target.value);motionClock=createMotionClock(state.time,state.variants,state.edges);state.playing=false;last=0;sync()});section.querySelector('[data-seek]').addEventListener('change',save);
section.querySelectorAll('[data-vfield]').forEach(el=>el.addEventListener('change',()=>{const field=el.dataset.vfield;if(field==='ringStyle')v.geometryBySeries[state.series]=el.value;else{v[field]=el.value;if(field==='palette'&&el.value!=='custom')v.accent=palettes[el.value]}update()}));section.querySelectorAll('[data-efield]').forEach(el=>el.addEventListener('change',()=>{v.effects[el.dataset.efield]=el.value;update()}));section.querySelectorAll('[data-vcolor]').forEach(el=>el.addEventListener('input',()=>{const field=el.dataset.vcolor;if(field==='accent')v.palette='custom';else if(v.badgePalette!=='custom'){[v.badgeColor,v.badgeInk]=badgeColors(v);v.badgePalette='custom'}v[field]=el.value;update()}));section.querySelectorAll('[data-ecolor]').forEach(el=>el.addEventListener('input',()=>{v.effects[el.dataset.ecolor]=el.value;update()}));
for(const [selector,key]of [['[data-vbool]','vbool'],['[data-effect]','effect'],['[data-shadow]','shadow']])section.querySelectorAll(selector).forEach(el=>el.addEventListener('change',()=>{(key==='vbool'?v:key==='effect'?v.effects:v.shadows)[el.dataset[key]]=el.checked;update()}));section.querySelectorAll('[data-vrange],[data-erange]').forEach(el=>el.addEventListener('input',()=>{const field=el.dataset.vrange||el.dataset.erange;(el.dataset.vrange?v:v.effects)[field]=Number(el.value)/(Number(el.dataset.factor)||1);update()}));
view.art.addEventListener('pointermove',event=>{if(reduced.matches||!state.playing)return;const rect=view.art.getBoundingClientRect();view.px=(event.clientX-rect.left)/rect.width-.5;view.py=(event.clientY-rect.top)/rect.height-.5});view.art.addEventListener('pointerleave',()=>{view.px=0;view.py=0});grain(view);new ResizeObserver(()=>{measure(view);draw(view)}).observe(view.art);}
for(const kind of Object.keys(images)){document.getElementById(`direction-${kind}-file`).addEventListener('change',event=>{const file=event.target.files[0];if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>12*1024*1024){error('请选择 12 MB 以内的 PNG、WebP 或 JPG 图片。');return}const reader=new FileReader();reader.onload=()=>{images[kind]=reader.result;imageNames[kind]=file.name;sync()};reader.onerror=()=>error('图片读取失败，请重新选择。');reader.readAsDataURL(file)});root.querySelector(`[data-clear="${kind}"]`).addEventListener('click',()=>{images[kind]='';delete imageNames[kind];document.getElementById(`direction-${kind}-file`).value='';sync()})}
window.addEventListener('openai:set_globals',event=>{const globals=event.detail?.globals;if(Object.hasOwn(globals||{},'widgetState')){if(ownSnapshots.has(stateSignature(globals.widgetState?.privateContent)))return;if(!restore(globals.widgetState))return;motionClock=createMotionClock(state.time,state.variants,state.edges);last=0;sync()}});reduced.addEventListener('change',()=>{if(reduced.matches){state.playing=false;for(const view of views)view.px=view.py=view.sx=view.sy=0;sync()}});
let last=0;sync();globalThis.lucide?.createIcons({attrs:{width:16,height:16}});
// A font first selected after startup can finish loading after the initial fit.
// Invalidate both intro-title measurements and showcase copy once it is ready.
function refreshFontLayout(){if(root.isConnected)for(const view of views){view.storyShots?.forEach(part=>part.textLayoutKey='');measure(view);draw(view)}}
document.fonts?.ready.then(refreshFontLayout);
document.fonts?.addEventListener('loadingdone',refreshFontLayout);
if(globalThis.Tweak&&!root.classList.contains('studio-editor'))for(const view of views){const tweak=new Tweak({container:view.art,onChange:update});tweak.addSlider(state.variants[view.key],'geometryOpacity',{label:'几何装饰透明度',min:.3,max:1,step:.05});}
function frame(now){if(!root.isConnected)return;if(!studioApplyLayerClock()&&last&&state.playing&&!document.hidden){const delta=Math.min((now-last)/1000,.08)*state.speed;state.time=studioAdvanceTime(state.time,delta,state.introDuration,state.narrative);if(state.narrative.outroEnabled&&state.time>=studioTotalDuration(state.introDuration,state.narrative)){state.playing=false;save();views.forEach(v=>{v.section.querySelector('[data-play]').textContent='播放动态';v.section.querySelector('[data-play]').setAttribute('aria-pressed','false')})}advanceMotionClock(motionClock,delta,state.variants,state.edges)}last=now;for(const view of views)if(!view.section.hidden&&!view.editorSeek){if(state.playing){view.sx+=(view.px-view.sx)*.07;view.sy+=(view.py-view.sy)*.07}if(view.w)draw(view);else measure(view)}requestAnimationFrame(frame)}requestAnimationFrame(frame);
})();
