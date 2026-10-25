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
