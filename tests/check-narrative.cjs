const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const scope={};vm.createContext(scope);vm.runInContext(fs.readFileSync(__dirname+'/../runtime/crt-motion.js','utf8')+'\n'+fs.readFileSync(__dirname+'/../src/timeline.js','utf8'),scope);
const config=scope.studioNarrativeSettings(),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const pose=(time,intro=4.5,n=config)=>scope.studioNarrativePose(time,intro,n);
assert.equal(config.introStyle,'model');assert.equal(config.outroEnabled,false);
assert.equal(config.showPlayback,'continuous');
assert.equal(scope.studioNarrativeSettings({showPlayback:'invalid'}).showPlayback,'continuous');
for(const t of [0,.2,1,3,4.499]){const p=pose(t);near(p.model,1);near(p.titleMove,1);near(p.titleAlpha,0);near(p.info,0);near(p.outro,0)}
assert.ok(pose(5).titleAlpha>0&&pose(5).titleAlpha<1);near(pose(5.5).titleAlpha,1);near(pose(5.5).info,1);
const delayed={...config,nameReveal:'delayed',nameDelay:.65};near(pose(2,4.5,delayed).titleAlpha,0);assert.ok(pose(3.5,4.5,delayed).titleAlpha>0);near(pose(3.5,4.5,delayed).info,0);
const legacy={...config,introStyle:'title'};near(pose(0,4.5,legacy).titleMove,0);near(pose(0,4.5,legacy).titleAlpha,1);near(pose(4.5,4.5,legacy).titleMove,1);
for(const intro of [0,1,4.5,30]){
  const n={...config,outroEnabled:true,outroDuration:3.5},end=intro+15.5;
  near(scope.studioTotalDuration(intro,n),end);near(scope.studioAdvanceTime(end-.1,1,intro,n),end);
  near(scope.studioAdvanceTime(intro+11.9,.2,intro,{...config,showPlayback:'repeat'}),intro+.1);
  const left=pose(intro+12-.0001,intro,n),right=pose(intro+12+.0001,intro,n);near(left.outro,right.outro);
  near(pose(end,intro,n).outro,1);near(pose(end,intro,n).brand,1);near(pose(end,intro,n).mark,1);
  assert.equal(scope.studioPhase(intro+12,intro,n),'outro');assert.equal(scope.studioPhase(intro+12,intro,config),'show');
  // Entering showcase never jumps the geometry morph or reveals a large title.
  const a=pose(Math.max(0,intro-.00001),intro,n),b=pose(intro+.00001,intro,n);near(a.geometry,b.geometry);near(b.titleMove,1);
}
const bounded=scope.studioNarrativeSettings({introStyle:'bad',nameReveal:'bad',nameDelay:99,outroDuration:-1,outroEnabled:'yes',outroStyle:'bad',outroContent:'bad'});
assert.equal(bounded.introStyle,'model');assert.equal(bounded.outroEnabled,false);near(bounded.nameDelay,.9);near(bounded.outroDuration,1.5);
const manual={...config,outroEnabled:true,outroTrigger:'manual'};
near(scope.studioAdvanceTime(16.4,.2,4.5,manual),4.6);
near(scope.studioAdvanceTime(16.5,.2,4.5,manual),16.7);
near(scope.studioAdvanceTime(19.9,1,4.5,manual),20);
for(const showDuration of [1,7.5,12,60])for(const intro of [0,4.5,30]){
  const n=scope.studioNarrativeSettings({showDuration,outroEnabled:true,outroDuration:4,shutdownDuration:1});
  const start=intro+showDuration,end=start+4;
  near(scope.studioTotalDuration(intro,n),end);assert.equal(scope.studioPhase(start-.001,intro,n),'show');assert.equal(scope.studioPhase(start,intro,n),'outro');
  near(scope.studioAdvanceTime(start-.1,.2,intro,{...n,outroTrigger:'manual'}),intro+.1);
  near(scope.studioAdvanceTime(end-.1,.5,intro,n),end);
  near(pose(end-1,intro,n).shutdown,0);near(pose(end-.5,intro,n).shutdown,.5);
  const line=pose(end-.3,intro,n);near(line.shutter,1);assert.ok(line.signal>.9&&line.signalWidth>0&&line.signalWidth<1);
  near(pose(end,intro,n).shutter,1);near(pose(end,intro,n).signal,0);near(pose(end,intro,n).signalWidth,0);
  near(pose(end,intro,{...n,shutdownEnabled:false}).shutdown,0);
  // Seeking backward reconstructs exactly the same pose.
  const before=JSON.stringify(pose(end-.5,intro,n));pose(end,intro,n);assert.equal(JSON.stringify(pose(end-.5,intro,n)),before);
}
near(scope.studioRetimeShow(2,4.5,{showDuration:12},{showDuration:24}),2);
near(scope.studioRetimeShow(10.5,4.5,{showDuration:12},{showDuration:24}),16.5);
near(scope.studioRetimeShow(18,4.5,{showDuration:12},{showDuration:24}),30);
near(scope.studioNarrativeSettings({showDuration:Infinity}).showDuration,12);
near(scope.studioNarrativeSettings({showDuration:0}).showDuration,1);near(scope.studioNarrativeSettings({showDuration:999}).showDuration,60);
near(scope.studioNarrativeSettings({outroDuration:1.5,shutdownDuration:99}).shutdownDuration,.675);
// Run the real narrative and independent motion clocks past many former loop
// boundaries. Information stays fully visible while every motion phase advances.
for(const file of ['motion-clock.js','information-motion.js'])vm.runInContext(fs.readFileSync(__dirname+'/../src/'+file,'utf8'),scope);
for(const intro of [0,2,4.5])for(const showDuration of [1,7.5])for(const speed of [.5,1,1.8]){
  const n=scope.studioNarrativeSettings({showDuration}),variants={poster:{ringSpeed:1.7,textMotionSpeed:.8}},clock=scope.createMotionClock(0,variants);
  let time=0,previous=0;
  for(let frame=0;frame<2400;frame++){
    const delta=.04*speed;time=scope.studioAdvanceTime(time,delta,intro,n);scope.advanceMotionClock(clock,delta,variants);
    assert.ok(time>=previous,'continuous narrative never rewinds');previous=time;
    if(clock.elapsed>intro+1){const p=pose(time,intro,n);near(p.info,1);near(p.titleAlpha,1);near(p.outro,0);near(scope.informationMotionPose(scope.studioNarrativeTime(time,intro),clock.texts.poster,1,'refined',.55).entry,1)}
  }
  near(time,intro+showDuration);near(clock.rings.poster,clock.elapsed*1.7);near(clock.texts.poster,clock.elapsed*.8);
  assert.ok(clock.elapsed>time+20,'motion keeps advancing beyond the preview range');
  near(scope.studioAdvanceTime(time,0,intro,n),time);
  near(scope.studioAdvanceTime(time,.1,intro,n),time);
}
// Exercise the production renderer: framing must remain fully visible while
// intro information is hidden and while showcase content fades into the ending.
const renderer=fs.readFileSync(__dirname+'/../src/studio-narrative.js','utf8');
vm.runInContext(renderer.slice(renderer.indexOf('function drawStudioNarrative')),scope);
function node(){return {style:{setProperty(k,v){this[k]=v}},classList:{toggle(){}},setAttribute(){}}}
const edges=[node(),node()],ending=node(),parts={};ending.querySelector=s=>parts[s]||(parts[s]=node());
const shutdown=node(),shutters=[node(),node()],signal=node(),crtParts={'.shutdown-line':signal};shutdown.querySelectorAll=()=>shutters;shutdown.querySelector=s=>crtParts[s]||(crtParts[s]=node());
const view={art:node(),stack:node(),composition:node(),ending,shutdown};view.art.querySelectorAll=()=>edges;
scope.motionClock={elapsed:8};scope.state={introDuration:4.5,narrative:config};
for(const introStyle of ['model','title'])for(const outroStyle of ['signature','orbit','quiet']){
  const n={...config,introStyle,outroStyle,outroEnabled:true};scope.state.narrative=n;
  for(const time of [0,2,4.5,5.4,16.5,17,20]){
    const p=pose(time,4.5,n);scope.drawStudioNarrative(view,p);
    edges.forEach(edge=>assert.equal(+edge.style.opacity,1,'borders remain visible in every narrative phase'));
    near(view.composition.style.opacity,1-p.outro);
    shutters.forEach(s=>assert.equal(s.style.transform,`scaleY(${p.shutter})`));near(signal.style.opacity,p.signal);
  }
}
console.log('PASS: model-first visibility, delayed name fade, original intro option, zero-duration intro, continuous boundaries, optional ending and final hold.');
console.log('PASS: production renderer keeps independent borders fully visible through all intro/ending styles.');
console.log('PASS: 1–60s showcase timing/retiming, manual loops, seekable optional cyber shutdown and bounded duration.');
console.log('PASS: continuous no-ending mode retains fully revealed information across repeated boundaries while geometry, text and border clocks continue; timed repeat remains selectable.');
for(const q of [0,.04,.15,.38,.5,.6,.7,.82,.9,.96,1]){
  const p=scope.studioCRTPose(q);for(const value of Object.values(p))assert.ok(Number.isFinite(value));
  if(q===0||q===1)for(const key of ['signal','dot','scan','flash','jitter'])near(p[key],0);
}
const linePose=scope.studioCRTPose(.6),dotPose=scope.studioCRTPose(.88),black=scope.studioCRTPose(1);
near(linePose.shutter,1);assert.ok(linePose.signal>.95&&linePose.signalWidth>.99);
assert.ok(dotPose.dot>.95&&dotPose.signalWidth<.02);near(black.shutter,1);near(black.dot,0);
console.log('PASS: shared CRT envelope has a distinct full-width beam, phosphor dot, decaying afterglow and final black; deterministic when seeking.');
// Story mode adds two independent poster shots without changing old v6 defaults.
const storyDefaults=scope.studioNarrativeSettings({introStyle:'story'});
assert.equal(storyDefaults.characterShotEnabled,true);assert.equal(storyDefaults.authorShotEnabled,true);
assert.equal(storyDefaults.characterCorner,'tl-br');assert.equal(storyDefaults.authorCorner,'tr-bl');
assert.equal(storyDefaults.characterEffect,'polar');assert.equal(storyDefaults.authorEffect,'polar');
assert.equal(storyDefaults.storyPackagingOnly,false);assert.equal(storyDefaults.storyFlash,false);
near(scope.studioStoryDuration(storyDefaults),5.1);
for(const characterShotEnabled of [false,true])for(const authorShotEnabled of [false,true]){
  const n=scope.studioNarrativeSettings({...storyDefaults,characterShotEnabled,authorShotEnabled}),duration=scope.studioStoryDuration(n),hasShot=characterShotEnabled||authorShotEnabled;
  near(duration,(characterShotEnabled?2.5:0)+(authorShotEnabled?2:0)+(hasShot?.6:0));
  for(const t of [0,.1,1,2.49,2.5,3,4.49,4.5,4.8,5.1,30]){
    const shot=scope.studioStoryPose(t,duration,n),p=pose(t,duration,n);
    for(const key of ['local','duration','alpha','shift','main','transitionStart','transitionDuration','flash'])assert.ok(Number.isFinite(shot[key]),'story '+key+' remains finite');
    assert.ok(shot.alpha>=0&&shot.alpha<=1);assert.ok(shot.main>=0&&shot.main<=1);near(p.titleMove,1);
    near(p.geometry,shot.main);near(p.titleAlpha,shot.main);near(p.info,shot.main);near(p.model,shot.main);
    if(t>=duration){near(shot.main,1);assert.equal(shot.active,false);near(shot.alpha,0)}
    if(hasShot&&t<duration-.6)near(shot.main,0);
    if(!hasShot){near(shot.main,1);assert.equal(shot.role,'show')}
  }
  if(hasShot){const first=scope.studioStoryPose(.4,duration,n);assert.equal(first.role,characterShotEnabled?'character':'author');near(first.alpha,1);const middle=scope.studioStoryPose(duration-.3,duration,n);near(middle.main,.5);near(middle.alpha,.5);near(scope.studioTotalDuration(duration,n),duration+12);}
}
const storyDuration=scope.studioStoryDuration(storyDefaults);
assert.equal(scope.studioStoryPose(2.5,storyDuration,storyDefaults).role,'author');
near(scope.studioStoryPose(storyDuration-.6,storyDuration,storyDefaults).main,0);
near(scope.studioStoryPose(storyDuration,storyDuration,storyDefaults).main,1);
const retimedStory=scope.studioStoryPose((storyDuration-.3)*2,storyDuration*2,storyDefaults);near(retimedStory.main,.5);near(retimedStory.transitionDuration,1.2);
const storyFlash={...storyDefaults,storyFlash:true};assert.ok(scope.studioStoryPose(2.5,storyDuration,storyFlash).flash>.6);near(scope.studioStoryPose(2.5,storyDuration,storyDefaults).flash,0);
const previousStory=JSON.stringify(scope.studioStoryPose(4.8,storyDuration,storyFlash));scope.studioStoryPose(1,storyDuration,storyFlash);assert.equal(JSON.stringify(scope.studioStoryPose(4.8,storyDuration,storyFlash)),previousStory);
const dirtyStory=scope.studioNarrativeSettings({introStyle:'story',characterShotDuration:Infinity,authorShotDuration:-1,storyTransitionDuration:99,characterCorner:'bad',authorEffect:'bad',characterEffectStrength:99,authorEffectSpeed:0,characterScale:99,authorX:-10,authorY:1000});
near(dirtyStory.characterShotDuration,2.5);near(dirtyStory.authorShotDuration,.5);near(dirtyStory.storyTransitionDuration,3);assert.equal(dirtyStory.characterCorner,'tl-br');assert.equal(dirtyStory.authorEffect,'polar');near(dirtyStory.characterEffectStrength,1);near(dirtyStory.authorEffectSpeed,.1);near(dirtyStory.characterScale,2.4);near(dirtyStory.authorX,0);near(dirtyStory.authorY,100);
let storyDraws=0;scope.drawStudioStoryIntro=(v,p)=>{storyDraws++;assert.ok(p.story)};scope.state.narrative=storyDefaults;scope.state.introDuration=storyDuration;
for(const t of [0,2,2.5,4.8,5.1,8]){const p=pose(t,storyDuration,storyDefaults);scope.drawStudioNarrative(view,p);near(view.composition.style.opacity,(1-p.outro)*p.story.main);edges.forEach(edge=>near(edge.style.opacity,1))}
assert.equal(storyDraws,6);new vm.Script(renderer);
console.log('PASS: story poster shots, independent toggles/durations, third-scene dissolve, retimed seeking, bounded media/effect settings, optional exposure and renderer hook; legacy modes retain their defaults.');

// Long independent poster shots retain their real boundaries past the old 30s intro cap.
for(const [character,author]of [[30,45],[60,120],[600,600]]){const n=scope.studioNarrativeSettings({introStyle:'story',characterShotDuration:character,authorShotDuration:author,storyTransitionDuration:.6}),duration=scope.studioStoryDuration(n);near(n.characterShotDuration,character);near(n.authorShotDuration,author);near(duration,character+author+.6);assert.equal(scope.studioStoryPose(character-.3,duration,n).role,'character');assert.equal(scope.studioStoryPose(character+.3,duration,n).role,'author');near(scope.studioStoryPose(duration-.3,duration,n).main,.5);assert.equal(scope.studioPhase(duration-.1,duration,n),'intro');assert.equal(scope.studioPhase(duration+.1,duration,n),'show');near(scope.studioTotalDuration(duration,n),duration+12);}
const shotBounds=scope.studioNarrativeSettings({characterShotDuration:99999,authorShotDuration:99999});near(shotBounds.characterShotDuration,600);near(shotBounds.authorShotDuration,600);
console.log('PASS: 30/45, 60/120 and 600/600 second poster shots retain exact phase boundaries, transition, full duration and limits');
