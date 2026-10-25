const fs=require('fs');
const vm=require('vm');
const assert=require('assert/strict');
const root=__dirname+'/..';
const scope={TextEncoder,document:{getElementById:()=>null,querySelector:()=>null}};
vm.createContext(scope);
vm.runInContext(fs.readFileSync(root+'/runtime/crt-motion.js','utf8')+'\n'+fs.readFileSync(root+'/src/timeline.js','utf8')+'\n'+fs.readFileSync(root+'/runtime/studio-output-host.js','utf8'),scope);
const run=source=>vm.runInContext(source,scope);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
for(const duration of [0,1,4.5,8,30]){
  near(run(`studioTotalDuration(${duration})`),duration+12);
  near(run(`studioNarrativeTime(${duration},${duration})`),4.5);
  near(run(`studioNarrativeTime(${duration}+6,${duration})`),10.5);
  near(run(`studioAdvanceTime(${duration}+11.9,.2,${duration})`),duration+12);
  near(run(`studioAdvanceTime(${duration}+11.9,24.2,${duration})`),duration+12);
  near(run(`studioAdvanceTime(${duration}+11.9,.2,${duration},{showPlayback:'repeat'})`),duration+.1);
  near(run(`studioAdvanceTime(${duration}+11.9,24.2,${duration},{showPlayback:'repeat'})`),duration+.1);
  if(duration>0)near(run(`studioNarrativeTime(${duration}/2,${duration})`),2.25);
}
near(run('studioIntroDuration(-1)'),0);near(run('studioIntroDuration(99)'),99);near(run('studioIntroDuration(99999)'),1800);near(run('studioIntroDuration(NaN)'),4.5);
near(run('studioRetime(2.25,4.5,8)'),4);near(run('studioRetime(7.5,4.5,8)'),11);
near(run('studioRetime(2.25,4.5,0)'),0);near(run('studioRetime(3,0,8)'),11);
// Use the trusted, fully built template rather than a hand-written surrogate.
const decode=value=>value.replace(/&quot;/g,'"').replace(/&gt;/g,'>').replace(/&lt;/g,'<').replace(/&amp;/g,'&');
const document=fs.readFileSync(root+'/index.html','utf8');
const template=decode(document.match(/\bdata-srcdoc="([^"]*)"/)[1]);
const policy=decode(document.match(/http-equiv="Content-Security-Policy" content="([^"]*)"/)[1]);
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const state={version:6,design:'character-explorations',activeDesign:'poster',name:'QA </script><script>injected()</script>',ratio:'portrait',introDuration:8,narrative:{showPlayback:'continuous',outroEnabled:false,showDuration:6}};
const payload={state,config:{width:2160,start:'show',transparent:true,includeCharacters:false},images:{logo:png,qr:png,barcode:png,model:png,portrait:png,introCharacter:png,introAuthor:png}};
const build=value=>scope.buildStudioOutputDocument(template,value,policy);
const globalsOf=result=>JSON.parse(decode(result.html.match(/\bdata-srcdoc="([^"]*)"/)[1]).match(/id="codex-visualization-widget-state">([\s\S]*?)<\/script>/)[1]);
const result=build(payload);
assert.equal(result.config.width,2160);assert.equal(result.config.height,3840);
assert.ok(result.html.includes('sandbox="allow-scripts"'));assert.ok(!result.html.includes('allow-same-origin'));
assert.equal(decode(result.html.match(/http-equiv="Content-Security-Policy" content="([^"]*)"/)[1]),policy);
const frame=decode(result.html.match(/\bdata-srcdoc="([^"]*)"/)[1]);
const bootstrap=JSON.parse(frame.match(/<script type="application\/json" id="codex-visualization-widget-state">([\s\S]*?)<\/script>/)[1]);
assert.equal(bootstrap.widgetState.privateContent.name,state.name);
assert.equal(bootstrap.widgetState.privateContent.introDuration,8);
assert.equal(bootstrap.widgetState.privateContent.narrative.showPlayback,'continuous');
assert.equal(bootstrap.statePersistence,'none');
assert.equal(bootstrap.studioOutput.enabled,true);assert.equal(bootstrap.studioOutput.start,'show');
assert.deepEqual(Object.keys(bootstrap.studioImages).sort(),['barcode','logo','qr']);
assert.equal(bootstrap.studioImages.logo,png);
assert.ok(!frame.includes('<script>injected()'));
let scripts=0;
for(const [name,markup]of [['output',result.html],['frame',frame]])for(const match of markup.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)){
  if(/type="application\/json"/.test(match[1]))continue;
  new vm.Script(match[2],{filename:name+'-'+scripts++});
}
assert.ok(scripts>=9);
payload.config.includeCharacters=true;
const included=build(payload);assert.ok(included.html.includes('data:image/png'));
const includedGlobals=JSON.parse(decode(included.html.match(/\bdata-srcdoc="([^"]*)"/)[1]).match(/id="codex-visualization-widget-state">([\s\S]*?)<\/script>/)[1]);
assert.equal(includedGlobals.studioImages.model,png);assert.equal(includedGlobals.studioImages.portrait,png);
assert.equal(includedGlobals.studioImages.introCharacter,png);assert.equal(includedGlobals.studioImages.introAuthor,png);
assert.deepEqual(Object.keys(includedGlobals.studioImages).sort(),['barcode','introAuthor','introCharacter','logo','model','portrait','qr']);
// The trusted host also enforces shot filtering when sandbox data is stale or
// independently constructed; hiding a picture must not merely hide its DOM.
const packaging=globalsOf(build({...payload,state:{...state,narrative:{...state.narrative,introStyle:'story',storyPackagingOnly:true}}}));
assert.deepEqual(Object.keys(packaging.studioImages).sort(),['barcode','logo','model','portrait','qr']);
assert.throws(()=>build({...payload,images:{introCharacter:'data:image/svg+xml;base64,PHN2Zz4='}}),/素材格式/);
assert.throws(()=>build({...payload,images:{logo:'https://example.com/image.png'}}),/素材格式/);
assert.throws(()=>build({...payload,images:{logo:'data:image/svg+xml;base64,PHN2Zz4='}}),/素材格式/);
assert.throws(()=>build({...payload,state:{design:'other'}}),/无效/);
assert.throws(()=>build({...payload,state:{...state,name:'x'.repeat(17000)}}),/上限/);
const landscape=build({...payload,state:{...state,ratio:'landscape'},config:{width:3840}});
assert.equal(landscape.config.width,3840);assert.equal(landscape.config.height,2160);
// Use the actual editor defaults, output-payload function and restore path. An
// expanded thirteen-scheme document can exceed the host budget even though its
// individual fields are valid, so pure HTML/OBS must use the persistence codec.
const logic=fs.readFileSync(root+'/src/exploration-full-logic.js','utf8');
const prefix=fs.readFileSync(root+'/src/studio-text.js','utf8')+'\n'+logic.slice(logic.indexOf('\n')+1,logic.indexOf('const template='))
  .replace('/* TIMELINE_FUNCTIONS */',fs.readFileSync(root+'/runtime/crt-motion.js','utf8')+'\n'+fs.readFileSync(root+'/src/timeline.js','utf8'))
  .replace('/* MOTION_FUNCTIONS */',fs.readFileSync(root+'/src/motion-clock.js','utf8'))
  .replace('/* VARIANT_CODEC */',fs.readFileSync(root+'/src/variant-codec.js','utf8'));
const outputLogic=fs.readFileSync(root+'/src/studio-output.js','utf8'),payloadStart=outputLogic.indexOf('function htmlPayload('),payloadEnd=outputLogic.indexOf('\n  async function exportDesign',payloadStart);
assert.ok(payloadStart>=0&&payloadEnd>payloadStart,'production output-payload function exists');
function editorFixture(widgetState,globals={},reducedMotion=false){
  const app={...globals,document:{getElementById:()=>({})},matchMedia:()=>({matches:reducedMotion}),window:{openai:{widgetState}}};
  vm.createContext(app);vm.runInContext(prefix,app);return app;
}
const editor=editorFixture();
vm.runInContext(`
for(const [key,max]of Object.entries(maxLengths))state[key]='界'.repeat(max);
state.qrUrl='http://x/'+'界'.repeat(maxLengths.qrUrl-'http://x/'.length);
for(const entry of Object.values(state.seriesData))for(const [key,max]of Object.entries(seriesLengths))entry[key]=key==='serial'?'9'.repeat(max):key==='prefix'?'X'.repeat(max):'界'.repeat(max);
for(const key of ['name','character','author','caption','subtitle'])Object.assign(state.typography[key],{text:'界'.repeat(64),font:'condensed',scale:1.5,tracking:.25,weight:'900',italic:'italic',colorMode:'custom',color:'#abcdef',case:'uppercase'});
for(const role of ['character','author'])state.typography.copy[role]={kicker:'界'.repeat(80),label:'界'.repeat(80),meta:'界'.repeat(120)};
state.activeDesign='arcade';state.time=7.123456789012345;state.introDuration=4.123456789012345;state.narrative.introStyle='model';state.narrative.showDuration=12.123456789012345;
Object.assign(state.borderAppearance,{mode:'custom',style:'double',background:'#123456',text:'#fedcba',accent:'#e65a24',opacity:.35,lineWidth:.2});
for(const v of Object.values(state.variants)){
 Object.assign(v,{typeface:'editorial',badgePalette:'custom',badgeStyle:'outline',accent:'#16acde',badgeColor:'#234567',badgeInk:'#fedcba',ringSpeed:2.95,ringScale:2.39,textMotionAmount:.95,textMotionSpeed:1.95,geometryStrength:1.45,geometryOpacity:.95,gridOpacity:.145,gridMotion:.48,modelScale:1.29,cutStrength:.95,badgeOpacity:.95,palette:'custom',background:'light',pattern:'ripple',grid:false,gridMoving:false,parallax:false,textMotion:false});
 Object.assign(v.effects,{gradeEnabled:false,grade:'original',gradeStrength:.99,gradeModel:false,gradient:'spotlight',gradientStrength:.59,gradientColor:'#765432',gradientMotion:false,titleGradient:false,grain:.29,vignette:.59,shadowEnabled:false,shadowStyle:'soft',shadowStrength:.99,shadowDepth:1.95,shadowColor:'#123456'});
 for(const key of Object.keys(v.shadows))v.shadows[key]=false;
 for(const key of Object.keys(v.geometryBySeries))v.geometryBySeries[key]='signature';
}
function config(){return {width:1920,start:'intro',transparent:false,includeCharacters:false,fit:'contain'}}
${outputLogic.slice(payloadStart,payloadEnd)}
`,editor);
const expanded=JSON.parse(vm.runInContext('JSON.stringify(state)',editor));
const expandedBytes=Buffer.byteLength(JSON.stringify(expanded),'utf8');let compactBytes=0;
assert.ok(expandedBytes>16384,'fixture must exercise a real expanded-state overflow');
assert.throws(()=>build({state:expanded,config:{width:1920}}),/上限/,'the host limit remains enforced');
for(const kind of ['html','obs']){
  const compact=vm.runInContext(`htmlPayload('${kind}')`,editor);
  assert.equal(compact.state.variantEncoding,'tuple-v1',kind+' output uses the shared encoding');
  assert.ok(Array.isArray(compact.state.variants.arcade),kind+' scheme settings are tuples');
  compactBytes=Buffer.byteLength(JSON.stringify(compact.state),'utf8');
  console.log(`${kind} maximum legal Unicode text + all typography + 13 custom schemes: ${compactBytes} / 16384 bytes.`);
  assert.ok(compactBytes<16384,kind+' complete configuration fits the host limit');
  const packed=build(compact),packedFrame=decode(packed.html.match(/\bdata-srcdoc="([^"]*)"/)[1]);
  const packedGlobals=JSON.parse(packedFrame.match(/id="codex-visualization-widget-state">([\s\S]*?)<\/script>/)[1]);
  const restoredApp=editorFixture(packedGlobals.widgetState),restored=JSON.parse(vm.runInContext('JSON.stringify(state)',restoredApp));
  assert.deepEqual(restored,expanded,kind+' restores every scheme, long Unicode field, custom color and decimal time');
}
assert.equal(JSON.parse(vm.runInContext('JSON.stringify(state)',editor)).variantEncoding,undefined,'export does not modify editor state');
// Pack the actual story configuration through HTML and OBS, then boot the real
// restore path with its output globals. All four character pictures share the
// opt-in boundary; packaging-only removes just the two dedicated poster shots.
const storyEditor=editorFixture();
const storySettings={introStyle:'story',characterShotEnabled:true,authorShotEnabled:true,characterShotDuration:3.125,authorShotDuration:2.375,storyTransitionDuration:.625,characterCorner:'br-tl',authorCorner:'bl-tr',characterEffect:'holo',authorEffect:'crt',characterEffectStrength:.45,authorEffectStrength:.65,characterEffectSpeed:1.2,authorEffectSpeed:.8,storyPackagingOnly:false,storyFlash:true,characterScale:1.2,authorScale:1.4,characterX:33,characterY:65,authorX:72,authorY:38};
vm.runInContext(`state.narrative=studioNarrativeSettings(${JSON.stringify(storySettings)});state.introDuration=studioStoryDuration(state.narrative);state.time=1.125;Object.assign(images,${JSON.stringify(payload.images)});function config(){return {width:1920,start:state.output.start,transparent:false,includeCharacters:state.output.includeCharacters,fit:'contain'}}\n${outputLogic.slice(payloadStart,payloadEnd)}`,storyEditor);
for(const kind of ['html','obs'])for(const includeCharacters of [false,true])for(const storyPackagingOnly of [false,true])for(const start of ['intro','show']){
  vm.runInContext(`state.output.includeCharacters=${includeCharacters};state.output.start='${start}';state.narrative.storyPackagingOnly=${storyPackagingOnly}`,storyEditor);
  const compact=vm.runInContext(`htmlPayload('${kind}')`,storyEditor),keys=['barcode','logo','qr',...(includeCharacters?['model','portrait']:[]),...(includeCharacters&&!storyPackagingOnly?['introCharacter','introAuthor']:[])].sort();
  assert.deepEqual(Object.keys(compact.images).sort(),keys,'sandbox filters every character picture before messaging the host');
  assert.equal(compact.state.variantEncoding,'tuple-v1');
  const globals=globalsOf(build(compact));assert.deepEqual(Object.keys(globals.studioImages).sort(),keys,'host preserves the same export boundary');
  const restored=editorFixture(globals.widgetState,{studioOutput:globals.studioOutput,studioImages:globals.studioImages});
  const value=JSON.parse(vm.runInContext('JSON.stringify({state,images,story:studioStoryPose(state.time,state.introDuration,state.narrative)})',restored));
  for(const [key,expected]of Object.entries({...storySettings,storyPackagingOnly}))assert.equal(value.state.narrative[key],expected,key+' survives '+kind+' output');
  near(value.state.introDuration,6.125);near(value.state.time,start==='show'?6.125:0);
  assert.equal(value.story.role,start==='show'?'show':'character');
  assert.deepEqual(Object.keys(value.images).filter(key=>value.images[key]).sort(),keys);
}
// Complete HTML ignores paused snapshots, direct OBS start and reduced UI motion.
const completeGlobals=globalsOf(build({state:{...state,time:7,playing:false,narrative:{...storySettings,outroEnabled:true,outroTrigger:'manual',showDuration:2,outroDuration:1.5}},config:{width:1920,start:'show',playback:'complete'}}));
assert.equal(completeGlobals.studioOutput.start,'intro');
const completeApp=editorFixture(completeGlobals.widgetState,{studioOutput:completeGlobals.studioOutput},true);
assert.equal(vm.runInContext('state.playing',completeApp),true);
near(vm.runInContext('state.time',completeApp),0);
assert.equal(vm.runInContext('state.narrative.outroTrigger',completeApp),'auto');
vm.runInContext('for(let i=0;i<2000;i++)state.time=studioAdvanceTime(state.time,.02,state.introDuration,state.narrative)',completeApp);
assert.equal(vm.runInContext('studioPhase(state.time,state.introDuration,state.narrative)',completeApp),'outro');
// Exercise the actual config producer, rather than the fixture's mock config.
const configSource=outputLogic.slice(outputLogic.indexOf('function config('),outputLogic.indexOf('  function downloadLabel'));
vm.runInContext("function dimensions(){return [1920,1080]}"+configSource,storyEditor);
vm.runInContext("state.output.start='show'",storyEditor);
assert.equal(vm.runInContext("config('html').start",storyEditor),'intro');
assert.equal(vm.runInContext("config('html').playback",storyEditor),'complete');
assert.equal(vm.runInContext("config('obs').start",storyEditor),'show');
// Transparent output must clear the canvas without repainting its paper fill.
for(const file of ['studio-geometry.js','urban-language-scene.js','design-language-scene.js','dual-language-scene.js','exploration-full-scene.js'])vm.runInContext(fs.readFileSync(root+'/src/'+file,'utf8'),scope);
for(const variant of ['couture','brutalist','cloud','plush','play','sticker','orbit','poster','wave','dual','district','tuner','arcade']){
  for(const transparent of [false,true]){
    const fills=[];
    const target={globalAlpha:1,fillRect:(...args)=>fills.push(args),getTransform:()=>({a:1,b:0}),
      createLinearGradient:()=>({addColorStop(){}}),createRadialGradient:()=>({addColorStop(){}}),measureText:()=>({width:50})};
    const ctx=new Proxy(target,{get:(obj,key)=>key in obj?obj[key]:(()=>{}),set:(obj,key,value)=>(obj[key]=value,true)});
    scope.paintExploration(ctx,1920,1080,5,variant,{transparent,ringStyle:'signature',pattern:'none',grid:false});
    const paper=fills.filter(args=>args[0]===0&&args[1]===0&&args[2]===1920&&args[3]===1080);
    assert.equal(paper.length>0,!transparent,variant+' paper fill must respect transparency');
  }
}
console.log(`PASS: variable intro timing, retiming and seamless show loops; trusted standalone export, seven packed assets, story settings and direct-show boundaries, injection checks, portrait/4K and ${scripts} embedded scripts; thirteen-scheme HTML/OBS boundary ${expandedBytes} -> ${compactBytes} bytes with exact restore.`);
