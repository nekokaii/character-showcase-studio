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
