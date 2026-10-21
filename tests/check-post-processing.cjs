const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.join(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8'),plain=value=>JSON.parse(JSON.stringify(value));
const scope={};vm.createContext(scope);
for(const file of ['runtime/crt-motion.js','src/timeline.js','src/export-layout.js','src/studio-post.js'])vm.runInContext(read(file),scope,{filename:file});
const near=(actual,expected,message='')=>assert.ok(Math.abs(actual-expected)<1e-8,`${message}: ${actual} != ${expected}`);
const options=scope.studioNarrativeSettings({introStyle:'story',outroEnabled:true,postFade:.4}),intro=scope.studioStoryDuration(options);
const weight=(time,n=options,duration=intro)=>scope.studioPostSceneWeight(time,duration,n);

// Every scene checkbox changes only its own interval. Adjacent selected shots
// retain the same effect at the cut instead of dipping/restarting an envelope.
for(let mask=0;mask<16;mask++){
  const n={...options};['Character','Author','Show','Outro'].forEach((key,i)=>n['post'+key]=Boolean(mask&(1<<i)));
  near(weight(1,n),n.postCharacter?1:0,'character selection');
  near(weight(3.5,n),n.postAuthor?1:0,'author selection');
  near(weight(8,n),n.postShow?1:0,'show selection');
  near(weight(intro+n.showDuration+1,n),n.postOutro?1:0,'ending selection');
  for(const time of [0,.04,.2,.4,2.49,2.5,2.7,2.9,4.5,4.7,5.1,17.1,17.3,18]){
    const amount=weight(time,n);assert.ok(amount>=0&&amount<=1,'bounded scene envelope');
  }
  for(const [boundary,before,after]of [[2.5,n.postCharacter,n.postAuthor],[4.5,n.postAuthor,n.postShow],[intro+n.showDuration,n.postShow,n.postOutro]]){
    if(before===after){for(const delta of [-.001,0,.1,.2,.4])near(weight(boundary+delta,n),before?1:0,'adjacent selections remain continuous');}
    else{
      near(weight(boundary,n),before?1:0,'fade begins without a step');
      near(weight(boundary+n.postFade/2,n),.5,'half fade');
      near(weight(boundary+n.postFade,n),after?1:0,'fade completes');
      const steps=Array.from({length:21},(_,i)=>weight(boundary+n.postFade*i/20,n));
      for(let i=1;i<steps.length;i++)assert.ok(after?steps[i]>=steps[i-1]:steps[i]<=steps[i-1],'monotonic soft transition');
    }
  }
}
const enabled={...options,postCharacter:true,postAuthor:true,postShow:true,postOutro:true};
near(weight(0,enabled),0,'initial gentle fade');near(weight(enabled.postFade/2,enabled),.5);near(weight(enabled.postFade,enabled),1);
const onlyAuthor={...options,characterShotEnabled:false,postCharacter:false,postAuthor:true,postShow:false,postOutro:false},authorIntro=scope.studioStoryDuration(onlyAuthor);
near(weight(1,onlyAuthor,authorIntro),1,'disabled character shot consumes no filter interval');
near(weight(authorIntro+1,onlyAuthor,authorIntro),0,'author-only opener fades out');
const scaledIntro=intro*2;
near(weight(5.2,{...options,postCharacter:true,postAuthor:false},scaledIntro),.5,'retimed shot boundary uses scaled narrative duration');
near(weight(1,{...options,introStyle:'model',postCharacter:true},3),1,'legacy model-first opener remains supported');
near(weight(1,{...options,introStyle:'title',postShow:true},0),1,'no-intro export starts with selected showcase');
for(const preset of ['none','polar','crt','holo','bloom','anamorphic','prism','film'])assert.equal(scope.studioNarrativeSettings({postEffect:preset}).postEffect,preset);
const sanitized=scope.studioNarrativeSettings({postStrength:NaN,postGlow:7,postSpeed:0,postFade:Infinity,characterCorner:'center',authorCorner:'center'});
near(scope.studioNarrativeSettings({}).postDispersion,.25);near(scope.studioNarrativeSettings({postDispersion:-1}).postDispersion,0);near(scope.studioNarrativeSettings({postDispersion:4}).postDispersion,1);near(scope.studioNarrativeSettings({postDispersion:NaN}).postDispersion,.25);near(sanitized.postStrength,.6);near(sanitized.postGlow,1);near(sanitized.postSpeed,.1);near(sanitized.postFade,.45);assert.equal(sanitized.characterCorner,'center');assert.equal(sanitized.authorCorner,'center');

// Run the real mount routine against a minimal tree, observing ownership rather
// than string snapshots. Browser source and exported DOM clones share this tree.
class Element{
  constructor(tag='div',className=''){this.tag=tag;this.className=className;this.children=[];this.parentElement=null;this.style={};this.dataset={};this.attributes={};this.clientWidth=1920;this.clientHeight=948;this.classList={add:(name)=>this.className+=' '+name};}
  append(...nodes){for(const node of nodes){if(node.parentElement)node.parentElement.children.splice(node.parentElement.children.indexOf(node),1);this.children.push(node);node.parentElement=this;}}
  set innerHTML(value){this.children=[];for(const match of value.matchAll(/<([A-Za-z][\w-]*)\b[^>]*>/g))this.append(new Element(match[1]));}
  setAttribute(name,value){this.attributes[name]=value;}
  getContext(){return {};}
  querySelectorAll(selectors){const names=selectors.split(',').map(s=>s.trim()),found=[];const matches=node=>names.some(s=>s.startsWith('.')?node.className.split(/\s+/).includes(s.slice(1)):node.tag===s);const walk=node=>{for(const child of node.children){if(matches(child))found.push(child);walk(child);}};walk(this);return found;}
  querySelector(selector){return this.querySelectorAll(selector)[0]||new Element(selector);}
  contains(node){for(let parent=node;parent;parent=parent.parentElement)if(parent===this)return true;return false;}
}
scope.document={createElement:tag=>new Element(tag),createElementNS:(_,tag)=>new Element(tag)};
const art=new Element('div','design-art'),composition=new Element('div','composition'),story=new Element('div','story-intro'),ending=new Element('div','brand-ending'),shutdown=new Element('div','cyber-shutdown');
const mainModel=new Element('div','character-layer'),portrait=new Element('div','portrait-layer'),posterImage=new Element('img','story-image'),posterSubtitle=new Element('div','story-title'),showCopy=new Element('div','hero-name'),top=new Element('div','edge top'),bottom=new Element('div','edge bottom');
composition.append(mainModel,portrait,showCopy);story.append(posterImage,posterSubtitle);art.append(composition,story,ending,shutdown,top,bottom);
const view={key:'qa',art,composition,storyLayer:story,ending,shutdown};scope.mountStudioPostProcessing(view);
const post=view.post;
assert.ok(art.contains(shutdown)&&!post.surface.contains(shutdown),'global shutdown stays above borders and outside optical safe-area');
for(const node of [composition,posterImage,posterSubtitle,showCopy,ending])assert.ok(post.surface.contains(node),'picture/copy belongs to optical surface');
for(const node of [mainModel,portrait]){assert.ok(post.foreground.contains(node),'showcase model is foreground');assert.ok(!post.viewport.contains(node),'showcase model bypasses picture filter');}
for(const edge of [top,bottom]){assert.equal(edge.parentElement,art,'borders remain independent siblings');assert.ok(!post.viewport.contains(edge),'borders bypass optical processing');}
const css=read('src/studio-post.css'),stack=selector=>Number(css.match(new RegExp('\\.'+selector+'\\{([^}]+)\\}'))[1].match(/z-index\s*:\s*(\d+)/)[1]);
assert.ok(stack('studio-show-foreground')>stack('studio-post-viewport'),'showcase models render above the optical stack');

// Intercept the optics renderer, not its time calculation. Crossing a shot or
// seeking the narrative leaves the continuous motion clock authoritative.
const painter=scope.studioPaintPostOptics,paints=[];scope.studioPaintPostOptics=(ctx,w,h,o)=>paints.push(plain(o));
let wall=1000;scope.performance={now:()=>wall};scope.reduced={matches:false};scope.motionClock={elapsed:13};scope.devicePixelRatio=1;
scope.state={time:1,introDuration:intro,narrative:{...enabled,postEffect:'holo',postStrength:1,postGlow:.3,postSpeed:.7},variants:{qa:{accent:'#d077e7'}}};
const draw=(time,elapsed)=>{scope.state.time=time;scope.motionClock.elapsed=elapsed;wall+=100;scope.drawStudioPostProcessing(view,scope.studioNarrativePose(time,intro,scope.state.narrative));return paints.at(-1);};
near(draw(1,13).time,13*.7);near(draw(3,15).time,15*.7,'author cut keeps global filter phase');near(draw(1,17).time,17*.7,'narrative seek does not restart optical motion');
draw(intro+12,50);draw(intro+12,51);near(paints.at(-1).time,51*.7,'held showcase continues optical clock');
scope.reduced.matches=true;near(draw(3,60).time,0,'reduced motion holds optical phase');scope.reduced.matches=false;
draw(intro+12+options.outroDuration,62);near(post.foreground.style.opacity,0,'showcase model hides at ending');assert.equal(post.foreground.style.visibility,'hidden');
draw(3,65);const before=post.amount;scope.state.narrative.postEffect='none';draw(3,65);assert.ok(post.amount>0&&post.amount<before,'disabling effects fades while paused');
for(let i=0;i<90;i++)draw(3,65);assert.equal(post.surface.style.filter,'none');assert.equal(post.canvas.style.opacity,'0');

// Trace all production canvas schemes. The same global time reproduces the
// same pixels' drawing instructions after arbitrary seeks, including film grain.
function trace(effect,time,amount=.7){
  const operations=[],gradient=()=>({addColorStop:(...args)=>operations.push(['stop',...args])});
  const target={createLinearGradient:(...args)=>(operations.push(['linear',...args]),gradient()),createRadialGradient:(...args)=>(operations.push(['radial',...args]),gradient())};
  const ctx=new Proxy(target,{get:(obj,key)=>key in obj?obj[key]:(...args)=>operations.push([String(key),...args]),set:(obj,key,value)=>{operations.push(['set',String(key),typeof value==='object'?'gradient':value]);obj[key]=value;return true;}});
  painter(ctx,1920,1080,{effect,time,amount,accent:'#d077e7'});
  for(const op of operations)for(const value of op)if(typeof value==='number')assert.ok(Number.isFinite(value),'finite optical coordinates');
  return operations;
}
for(const effect of ['polar','crt','holo','bloom','anamorphic','prism','film']){
  const start=trace(effect,1.25);assert.ok(start.some(op=>['fillRect','stroke'].includes(op[0])),effect+' is visible');
  assert.notDeepEqual(trace(effect,3.2),start,effect+' animates on continuous time');assert.deepEqual(trace(effect,1.25),start,effect+' is seekable');
  assert.deepEqual(trace(effect,1.25,0),[['clearRect',0,0,1920,1080]],effect+' is clear at zero amount');
}

// Post settings are temporal/style data: 4K scales text/geometry, never speed,
// selection, strength or fade. Exercise both logical orientations and the real
// trusted export validator/serializer, so the configuration survives downloads.
const exported={TextEncoder,Uint8Array,DataView,Blob,structuredClone,atob};vm.createContext(exported);
vm.runInContext(read('runtime/export-packages.js').replace('__STUDIO_AE_TEMPLATE__',()=>JSON.stringify('__STUDIO_AE_SCENE__')).replace('__STUDIO_ASSET_NOTICES__',()=>JSON.stringify('QA notices')).replace('__STUDIO_OBS_LAYER_SERVER__',()=>JSON.stringify(read('runtime/obs-layer-server.mjs'))).replace('__STUDIO_OBS_LAYER_CONTROL__',()=>JSON.stringify(read('runtime/obs-layer-control.html'))),exported);
const sceneFor=portrait=>({...plain(scope.studioReferenceSize(portrait)),version:1,name:'Post processing QA',design:'qa',fps:30,intro:0,duration:12,showDuration:12,speed:1,offset:intro,background:[.1,.1,.1,1],ink:[1,1,1,1],accent:[1,.2,.3,1],transparent:false,frame:'horizontal',frameThickness:60,layers:[{kind:'text',name:'Name',text:'NOVA',fontFamily:'Arial',fontSize:90,weight:700,tracking:0,x:300,y:300,w:600,h:120}],geometry:[],warnings:[],motion:{enabled:true,style:'refined',amount:.55,speed:1},shadow:{enabled:true,color:[0,0,0,1],strength:.5,depth:1,soft:false},pattern:{kind:'dots',opacity:.05,moving:true,amount:.15},edges:{top:{direction:'negative',duration:32},bottom:{direction:'positive',duration:38}},borderText:{top:'TEST',bottom:'TEST'},narrative:{introStyle:'model',nameReveal:'show',nameDelay:.65},ending:{duration:0,style:'quiet',brand:'STUDIO',logoAsset:'',word:{x:960,y:540,w:600,h:100}},post:{effect:'anamorphic',strength:.72,glow:.3,speed:1.17,fade:.53,scenes:{character:true,author:true,show:false,outro:true}}});
for(const portrait of [false,true]){
  const scene=sceneFor(portrait),before=plain(scene),high=scope.scaleStudioAEScene(scene,scene.width*2,scene.height*2);
  assert.deepEqual(plain(scene),before,'AE scaling does not mutate capture');assert.deepEqual(plain(high.post),before.post,'4K preserves all post settings');assert.equal(high.layers[0].fontSize,180);
  assert.deepEqual(plain(scope.scaleStudioAEScene(high,scene.width,scene.height)),before,'AE output round trip');
  const result=exported.buildStudioAEFiles({scene:high,assets:[]});assert.deepEqual(plain(result.scene.post),before.post);
  const json=JSON.parse(result.files.find(file=>file.name==='scene.json').data);assert.deepEqual(json.post,before.post,'scene.json retains separately editable post parameters');
  const scriptScene=JSON.parse(result.files.find(file=>file.name==='IMPORT_TO_AE.jsx').data);assert.deepEqual(scriptScene.post,before.post,'JSX receives identical post parameters');
  for(const badValue of [NaN,Infinity,'0;alert(1)',-1]){const invalid=plain(high);invalid.post.strength=badValue;assert.throws(()=>exported.buildStudioAEFiles({scene:invalid,assets:[]}),/数值/);}
  const invalid=plain(high);invalid.post.scenes.show='false';assert.throws(()=>exported.buildStudioAEFiles({scene:invalid,assets:[]}),/镜头/);
}
console.log('PASS: 16 post scene selections, soft fades and uninterrupted adjacent shots, independent optical clock, actual intro/showcase/border DOM ownership, 7 seekable optical schemes, 4K invariance and trusted AE post serialization.');
