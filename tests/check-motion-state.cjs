const fs=require('fs');
const vm=require('vm');
const assert=require('assert/strict');

// Exercise the production restore/save/event handler without constructing UI.
const logic=fs.readFileSync(__dirname+'/../src/exploration-full-logic.js','utf8');
const clocks=fs.readFileSync(__dirname+'/../src/motion-clock.js','utf8');
const timeline=fs.readFileSync(__dirname+'/../runtime/crt-motion.js','utf8')+'\n'+fs.readFileSync(__dirname+'/../src/timeline.js','utf8');
const start=logic.indexOf("window.addEventListener('openai:set_globals'");
const end=logic.indexOf(';reduced.addEventListener',start);
const prefix=fs.readFileSync(__dirname+'/../src/studio-text.js','utf8')+'\n'+logic.slice(logic.indexOf('\n')+1,logic.indexOf('const template='))
  .replace('/* VARIANT_CODEC */',fs.readFileSync(__dirname+'/../src/variant-codec.js','utf8')).replace('/* MOTION_FUNCTIONS */',clocks).replace('/* TIMELINE_FUNCTIONS */',timeline);
assert.ok(start>=0&&end>start,'production widget-state callback exists');
assert.ok(prefix.includes('function restore(')&&prefix.includes('function save('));

function harness(widgetState){
  const callbacks={},saved=[];
  const scope={
    document:{getElementById:()=>({})},
    matchMedia:()=>({matches:false}),
    window:{
      openai:{widgetState,setWidgetState:payload=>{saved.push(payload);return Promise.resolve()}},
      addEventListener:(name,callback)=>{callbacks[name]=callback}
    }
  };
  vm.createContext(scope);
  vm.runInContext(prefix+'\nlet last=123,syncCount=0;function sync(){syncCount++}\n'+logic.slice(start,end)+';',scope);
  return {
    run:source=>vm.runInContext(source,scope),
    inspect:()=>JSON.parse(vm.runInContext('JSON.stringify({state,motionClock,last,syncCount})',scope)),
    emit:value=>callbacks['openai:set_globals']({detail:{globals:{widgetState:value}}}),
    saved
  };
}
const reverseKeys=value=>Array.isArray(value)?value.map(reverseKeys):value&&typeof value==='object'
  ?Object.fromEntries(Object.entries(value).reverse().map(([key,item])=>[key,reverseKeys(item)])):value;
const near=(actual,expected)=>assert.ok(Math.abs(actual-expected)<1e-9,`${actual} != ${expected}`);

const app=harness();
const initialTime=app.inspect().state.time;
assert.equal(app.inspect().state.narrative.introStyle,'story','new projects use the two-shot poster intro');
near(app.inspect().state.introDuration,app.run('studioStoryDuration(state.narrative)'));
near(app.inspect().state.introDuration,5.1);near(initialTime,0);
app.run('advanceMotionClock(motionClock,100,state.variants,state.edges);state.time=8.5');
const continuous=app.inspect();
near(continuous.motionClock.elapsed,initialTime+100);
for(const invalid of [null,undefined,{},
  {privateContent:{design:'another-design',version:5,time:2}},
  {privateContent:{design:'character-explorations',version:999,time:2}}]){
  app.emit(invalid);
  assert.deepEqual(app.inspect(),continuous,'unsupported state must leave playback and settings untouched');
}
assert.equal(app.run('restore(null)'),false);
assert.equal(app.run("restore({privateContent:{design:'another-design',version:5}})"),false);

app.run('save()');
const payload=app.saved.at(-1);
assert.ok(payload?.privateContent,'production save returns the private settings');
app.emit(reverseKeys(payload));
assert.deepEqual(app.inspect(),continuous,'reordered own echo must preserve the accumulated phase');
const bytes=Buffer.byteLength(JSON.stringify(payload),'utf8');
assert.ok(bytes<16384,`widget-state payload is ${bytes} bytes, limit is 16384`);

// A genuine external state must still be accepted, applied and explicitly sought.
const external=JSON.parse(JSON.stringify(payload));external.privateContent.variants=app.inspect().state.variants;delete external.privateContent.variantEncoding;
external.privateContent.name='EXTERNAL';
external.privateContent.activeDesign='sticker';
external.privateContent.version=6;
external.privateContent.time=2;
external.privateContent.variants.couture.ringSpeed=1.7;
external.privateContent.edges={top:{direction:'positive',duration:19},bottom:{direction:'still',duration:83}};
Object.assign(external.privateContent.variants.couture,{textMotion:false,textMotionStyle:'playful',textMotionAmount:.82,textMotionSpeed:1.6});
app.emit(reverseKeys(external));
const restored=app.inspect();
assert.equal(restored.state.name,'EXTERNAL');
assert.equal(restored.state.activeDesign,'sticker','the selected editor design restores with its settings');
near(restored.motionClock.elapsed,2);
near(restored.motionClock.rings.couture,3.4);
assert.deepEqual(restored.state.edges,{top:{direction:'positive',duration:19},bottom:{direction:'still',duration:83}});
assert.equal(restored.state.variants.couture.textMotion,false);
assert.equal(restored.state.variants.couture.textMotionStyle,'playful');
near(restored.state.variants.couture.textMotionAmount,.82);
near(restored.state.variants.couture.textMotionSpeed,1.6);
near(restored.motionClock.texts.couture,3.2);
near(restored.motionClock.edges.top,2/19);
near(restored.motionClock.edges.bottom,0);
assert.equal(restored.last,0);
assert.equal(restored.syncCount,1);
assert.equal(app.run("restore({privateContent:{design:'character-explorations',version:5}})"),true);
app.run('save()');
const externalPayload=app.saved.at(-1);
assert.equal(externalPayload.modelContent.borderMotion.top.direction,'positive');
assert.deepEqual(Object.keys(externalPayload.modelContent.variants),['sticker'],'public retrieval summarizes only the active design');
const externalRestored=harness(externalPayload).inspect();
assert.equal(externalRestored.state.variants.couture.textMotion,false,'private snapshot retains edits in inactive designs');
near(externalRestored.state.variants.couture.textMotionSpeed,1.6);

// A v4 document predates ringSpeed: keep user styling and supply the new default.
const legacy=harness({privateContent:{
  design:'character-explorations',version:4,name:'KGG',frame:'horizontal',
  variants:{couture:{background:'dark',accent:'#bceb45',palette:'acid',ringScale:1.96}}
}}).inspect();
assert.equal(legacy.state.name,'KGG');
assert.equal(legacy.state.frame,'horizontal');
near(legacy.state.introDuration,4.5);
assert.deepEqual(legacy.state.output,{resolution:'1080',obsLayers:'combined',transparent:false,includeCharacters:false,start:'intro',fit:'contain',fps:30,aeIntro:true});
assert.equal(legacy.state.variants.couture.background,'dark');
assert.equal(legacy.state.variants.couture.palette,'acid');
assert.equal(legacy.state.variants.couture.accent,'#bceb45');
near(legacy.state.variants.couture.ringScale,1.96);
near(legacy.state.variants.couture.ringSpeed,.65);

// v5 preserves existing art settings while supplying all new information defaults.
const v5=harness({privateContent:{
  design:'character-explorations',version:5,name:'KGG',frame:'horizontal',time:7,
  variants:{couture:{background:'dark',accent:'#bceb45',ringScale:1.96,ringSpeed:1.7}}
}}).inspect();
assert.equal(v5.state.version,6);
assert.equal(v5.state.name,'KGG');
assert.equal(v5.state.frame,'horizontal');
assert.equal(v5.state.variants.couture.background,'dark');
assert.equal(v5.state.variants.couture.palette,'acid');
near(v5.state.variants.couture.ringScale,1.96);
near(v5.state.variants.couture.ringSpeed,1.7);
assert.deepEqual(v5.state.edges,{top:{direction:'negative',duration:32},bottom:{direction:'positive',duration:38}});
for(const [key,variant]of Object.entries(v5.state.variants)){
  assert.equal(variant.textMotion,true);
  assert.equal(variant.textMotionStyle,['cloud','plush','wave'].includes(key)?'soft':['play','sticker','arcade'].includes(key)?'playful':'refined');
  near(variant.textMotionAmount,.55);near(variant.textMotionSpeed,1);
  near(v5.motionClock.texts[key],7);
}
near(v5.motionClock.edges.top,-7/32);near(v5.motionClock.edges.bottom,7/38);

// The persisted v6 parameters use the same validation bounds as their controls.
const bounded=harness({privateContent:{
  design:'character-explorations',version:6,
  edges:{top:{direction:'negative',duration:2},bottom:{direction:'positive',duration:120}},
  variants:{couture:{textMotionAmount:3,textMotionSpeed:.1},cloud:{textMotionAmount:-1,textMotionSpeed:7}}
}}).inspect();
near(bounded.state.edges.top.duration,12);near(bounded.state.edges.bottom.duration,90);
near(bounded.state.variants.couture.textMotionAmount,1);near(bounded.state.variants.couture.textMotionSpeed,.25);
near(bounded.state.variants.cloud.textMotionAmount,0);near(bounded.state.variants.cloud.textMotionSpeed,2);
const externalBytes=Buffer.byteLength(JSON.stringify(externalPayload),'utf8');
assert.ok(externalBytes<16384,`v6 restored payload is ${externalBytes} bytes, limit is 16384`);

// Intro/output options round-trip through the same persistent state as designs.
const outputApp=harness({privateContent:{design:'character-explorations',version:6,introDuration:8,time:19,
  output:{resolution:'2160',transparent:true,includeCharacters:true,start:'show',fit:'cover',fps:60,aeIntro:false}}});
near(outputApp.inspect().state.introDuration,8);near(outputApp.inspect().state.time,19);
outputApp.run('save()');
assert.deepEqual(JSON.parse(JSON.stringify(outputApp.saved.at(-1).privateContent.output)),{resolution:'2160',obsLayers:'combined',transparent:true,includeCharacters:true,start:'show',fit:'cover',fps:60,aeIntro:false});
assert.equal(outputApp.saved.at(-1).privateContent.introDuration,8);
for(const showPlayback of ['continuous','repeat']){
  const playback=harness({privateContent:{design:'character-explorations',version:6,narrative:{showPlayback,outroEnabled:false}}});
  assert.equal(playback.inspect().state.narrative.showPlayback,showPlayback);playback.run('save()');
  assert.equal(playback.saved.at(-1).privateContent.narrative.showPlayback,showPlayback);
}
const outputBounds=harness({privateContent:{design:'character-explorations',version:6,introDuration:99,time:99,
  output:{resolution:'invalid',start:'invalid',transparent:'yes'}}}).inspect();
near(outputBounds.state.introDuration,99);near(outputBounds.state.time,99);
assert.deepEqual(outputBounds.state.output,{resolution:'1080',obsLayers:'combined',transparent:false,includeCharacters:false,start:'intro',fit:'contain',fps:30,aeIntro:true});
const threeSources=harness({privateContent:{design:'character-explorations',version:6,output:{obsLayers:'separate'}}});
threeSources.run('save()');assert.equal(harness(threeSources.saved.at(-1)).inspect().state.output.obsLayers,'separate');
const noIntro=harness({privateContent:{design:'character-explorations',version:6,introDuration:0,time:16.5}}).inspect();
near(noIntro.state.time,12);
const sequence=harness({privateContent:{design:'character-explorations',version:6,introDuration:8,time:99,narrative:{introStyle:'model',nameReveal:'delayed',nameDelay:.75,outroEnabled:true,outroDuration:5,outroStyle:'orbit',outroContent:'logo'}}});
near(sequence.inspect().state.time,25);near(sequence.inspect().state.narrative.outroDuration,5);
sequence.run('save()');assert.equal(sequence.saved.at(-1).privateContent.narrative.outroContent,'logo');assert.equal(sequence.saved.at(-1).modelContent.sequence.outroStyle,'orbit');
const shutdown=harness({privateContent:{design:'character-explorations',version:6,introDuration:3,time:99,narrative:{showDuration:27.5,outroEnabled:true,outroDuration:4,shutdownEnabled:true,shutdownDuration:1.2}}});
near(shutdown.inspect().state.time,34.5);shutdown.run('save()');const savedSequence=shutdown.saved.at(-1).privateContent.narrative;
near(savedSequence.showDuration,27.5);near(savedSequence.shutdownDuration,1.2);assert.equal(savedSequence.shutdownEnabled,true);
const disabled=harness({privateContent:{design:'character-explorations',version:6,narrative:{showDuration:999,shutdownEnabled:false}}}).inspect();near(disabled.state.narrative.showDuration,60);assert.equal(disabled.state.narrative.shutdownEnabled,false);

// Story settings survive both compact snapshots and older object snapshots.
// Its intro length is derived, so a stale saved introDuration never wins.
const storyValues={introStyle:'story',characterShotEnabled:true,authorShotEnabled:true,characterShotDuration:3.25,authorShotDuration:2.75,storyTransitionDuration:.4,characterCorner:'tr-bl',authorCorner:'tl-br',characterEffect:'holo',authorEffect:'crt',characterEffectStrength:.45,authorEffectStrength:.65,characterEffectSpeed:1.2,authorEffectSpeed:.8,storyPackagingOnly:true,storyFlash:true,characterScale:1.2,authorScale:1.4,characterX:33,characterY:65,authorX:72,authorY:38};
const story=harness({privateContent:{design:'character-explorations',version:6,introDuration:29,time:1,narrative:storyValues}});
const storyState=story.inspect().state;
near(storyState.introDuration,story.run('studioStoryDuration(state.narrative)'));
assert.notEqual(storyState.introDuration,29,'story time comes from its shots and transition');
for(const [key,value]of Object.entries(storyValues))assert.equal(storyState.narrative[key],value,'story option restores: '+key);
story.run("images.introCharacter='data:image/png;base64,AAAA';images.introAuthor='data:image/png;base64,BBBB';save()");
const storySaved=story.saved.at(-1);
assert.equal(storySaved.privateContent.variantEncoding,'tuple-v1');
assert.ok(!JSON.stringify(storySaved).includes('data:image/'),'session-only story images stay out of persistent state');
const storyReload=harness(storySaved).inspect().state;
assert.deepEqual(storyReload.narrative,storyState.narrative,'all story options survive a compact round trip');
near(storyReload.introDuration,storyState.introDuration);
for(const introStyle of ['model','title']){
 const prior=harness({privateContent:{design:'character-explorations',version:6,introDuration:7,narrative:{introStyle}}}).inspect().state;
 assert.equal(prior.narrative.introStyle,introStyle,'existing v6 intro choice is preserved');near(prior.introDuration,7);
}
for(const characterShotEnabled of [false,true])for(const authorShotEnabled of [false,true]){
 const boundary=harness({privateContent:{design:'character-explorations',version:6,introDuration:29,narrative:{introStyle:'story',characterShotEnabled,authorShotEnabled}}});
 near(boundary.inspect().state.introDuration,boundary.run('studioStoryDuration(state.narrative)'));
 if(!characterShotEnabled&&!authorShotEnabled)near(boundary.inspect().state.introDuration,0);
}

// Thirteen layouts and maximum-length labels still fit the host snapshot budget.
const normalText=harness();
normalText.run("for(const key of ['name','character','author','caption','subtitle'])Object.assign(state.typography[key],{text:key==='author'?'Studio K / 原创角色设计':'NOVA / 原创角色',font:'grotesk',scale:1.15,tracking:.025,weight:'700',italic:'normal',colorMode:'custom',color:'#aabbcc',case:'uppercase'});state.typography.copy.character={kicker:'ORIGINAL CHARACTER',label:'EDITION / AT-001',meta:'Soft heart. Bold energy.'};state.typography.copy.author={kicker:'CREATOR / CREDITS',label:'MODEL / STUDIO K',meta:'DESIGN / STUDIO K'};save()");
const normalTextPayload=normalText.saved.at(-1),normalTextBytes=Buffer.byteLength(JSON.stringify(normalTextPayload),'utf8');
assert.deepEqual(harness(normalTextPayload).inspect().state.typography,normalText.inspect().state.typography,'custom text and typographic styles survive a full persistence round trip');
assert.ok(normalTextBytes<16384,`normal custom-text payload is ${normalTextBytes} bytes, limit is 16384`);
app.run("for(const [key,max]of Object.entries(maxLengths))state[key]='界'.repeat(max);for(const entry of Object.values(state.seriesData))for(const [key,max]of Object.entries(seriesLengths))entry[key]=key==='serial'?'9'.repeat(max):key==='prefix'?'X'.repeat(max):'界'.repeat(max);save()");
const denseBytes=Buffer.byteLength(JSON.stringify(app.saved.at(-1)),'utf8');
console.log(`Widget-state bytes: default ${bytes}; normal custom typography ${normalTextBytes}; existing maximum labels ${denseBytes} / 16384.`);
assert.ok(denseBytes<16384,`maximum-input payload is ${denseBytes} bytes, limit is 16384`);
app.run("for(const key of ['name','character','author','caption','subtitle'])Object.assign(state.typography[key],{text:'界'.repeat(64),font:'condensed',scale:1.5,tracking:.25,weight:'900',italic:'italic',colorMode:'custom',color:'#abcdef',case:'uppercase'});for(const role of ['character','author'])state.typography.copy[role]={kicker:'界'.repeat(80),label:'界'.repeat(80),meta:'界'.repeat(120)};save()");
const maxTypographyPayload=app.saved.at(-1),maxTypographyBytes=Buffer.byteLength(JSON.stringify(maxTypographyPayload),'utf8');
console.log(`Maximum legal Unicode labels + all typography overrides: ${maxTypographyBytes} / 16384 bytes.`);
assert.deepEqual(harness(maxTypographyPayload).inspect().state.typography,app.inspect().state.typography,'maximum-length typography is restored without truncating valid overrides');
assert.ok(maxTypographyBytes<16384,`maximum labels plus typography payload is ${maxTypographyBytes} bytes, limit is 16384`);
app.run(`for(const v of Object.values(state.variants)){
 Object.assign(v,{typeface:'editorial',badgePalette:'custom',badgeStyle:'outline',accent:'#16acde',badgeColor:'#234567',badgeInk:'#fedcba',ringSpeed:2.95,ringScale:2.39,textMotionAmount:.95,textMotionSpeed:1.95,geometryStrength:1.45,geometryOpacity:.95,gridOpacity:.145,gridMotion:.48,modelScale:1.29,cutStrength:.95,badgeOpacity:.95,palette:'custom',background:'light',pattern:'ripple',grid:false,gridMoving:false,parallax:false,textMotion:false});
 Object.assign(v.effects,{gradeEnabled:false,grade:'original',gradeStrength:.99,gradeModel:false,gradient:'spotlight',gradientStrength:.59,gradientColor:'#765432',gradientMotion:false,titleGradient:false,grain:.29,vignette:.59,shadowEnabled:false,shadowStyle:'soft',shadowStrength:.99,shadowDepth:1.95,shadowColor:'#123456'});
 for(const key of Object.keys(v.shadows))v.shadows[key]=false;
 for(const key of Object.keys(v.geometryBySeries))v.geometryBySeries[key]='signature';
}save()`);
const maxCustomizedBytes=Buffer.byteLength(JSON.stringify(app.saved.at(-1)),'utf8');
console.log(`Maximum legal Unicode labels + typography + 13 custom schemes: ${maxCustomizedBytes} / 16384 bytes.`);
assert.ok(maxCustomizedBytes<16384,`maximum text and customized schemes payload is ${maxCustomizedBytes} bytes, limit is 16384`);
assert.ok(app.inspect().state.variants.dual,'the dual-pane design keeps independent settings');

// Compact snapshots contain every setting and reset old local edits on restore.
const compact=harness(payload);assert.deepEqual(compact.inspect().state.variants,continuous.state.variants);
compact.run("state.variants.district.ringSpeed=2.7;state.variants.tuner.effects.shadowColor='#123456';state.variants.arcade.geometryBySeries.mini='rays'");
compact.emit(payload);assert.deepEqual(compact.inspect().state.variants,continuous.state.variants);
compact.run("for(const v of Object.values(state.variants)){v.accent='#123456';v.palette='custom';v.background='dark';v.ringSpeed=2.75;v.textMotionAmount=.95;v.geometryBySeries.fur='cut';v.effects.shadowColor='#543210';v.effects.grade='chrome'};save()");
const compactPayload=compact.saved.at(-1),fullCustom=compact.inspect().state.variants;
assert.equal(compactPayload.privateContent.variantEncoding,'tuple-v1');assert.ok(Buffer.byteLength(JSON.stringify(compactPayload))<16384);
assert.deepEqual(harness(compactPayload).inspect().state.variants,fullCustom);
for(const key of ['district','tuner','arcade']){const selected=harness({privateContent:{design:'character-explorations',version:6,activeDesign:key}});assert.equal(selected.inspect().state.activeDesign,key)}
console.log(`PASS: null/incompatible states and recursively reordered own echoes preserve elapsed ${initialTime+100}; v4/v5 settings migrate; v6 intro choices and story settings/images boundaries preserve compact round trips.`);
console.log(`Widget-state payload: default ${bytes}, restored v6 ${externalBytes} bytes / 16384.`);
console.log(`Maximum-length text payload: ${denseBytes} / 16384 bytes.`);

const longStory=harness({privateContent:{design:'character-explorations',version:6,introDuration:5.1,time:75,narrative:{introStyle:'story',characterShotDuration:30,authorShotDuration:120,storyTransitionDuration:.6}}});longStory.run('save()');const longReload=harness(longStory.saved.at(-1)).inspect().state;near(longReload.narrative.characterShotDuration,30);near(longReload.narrative.authorShotDuration,120);near(longReload.introDuration,150.6);near(longReload.time,75);
console.log('PASS: long independent poster durations and elapsed position survive the compact saved-state round trip');
