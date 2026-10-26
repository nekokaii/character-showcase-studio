// Capture at the shared logical resolution; uniformly scale editable data last.
async function collectStudioAEScene(view,options){
  const {width,height}=studioReferenceSize(options.width<options.height),v=state.variants[view.key],art=view.art;
  const saved={style:art.style.cssText,time:state.time,clock:motionClock,motion:v.textMotion,playing:state.playing};
  const packedAssets=[],layers=[],warnings=['Canvas 金属、云雾渐变转为近似纯色形状；细毛纤维简化。CSS 滤镜、毛玻璃与颗粒不会逐像素还原。'];
  if(studioFonts.list().length)warnings.push('本工程导入了自定义字体：'+studioFonts.list().map(f=>f.name).join('、')+'。请在桌面安装原字体，并在 AE 中为对应文字重新指定字体。');
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
