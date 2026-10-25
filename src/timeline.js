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
