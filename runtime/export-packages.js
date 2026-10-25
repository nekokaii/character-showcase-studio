// Trusted export builders. Sandbox messages supply data, never script bodies.
const studioAETemplate=__STUDIO_AE_TEMPLATE__;
const studioAssetNotices=__STUDIO_ASSET_NOTICES__;
const studioOBSLayerServer=__STUDIO_OBS_LAYER_SERVER__;
const studioOBSLayerControl=__STUDIO_OBS_LAYER_CONTROL__;
function studioExportName(name){return String(name||'showcase').replace(/[^\p{L}\p{N}_-]/gu,'').slice(0,30)||'showcase'}
function studioOBSFiles(result){
  const {width,height}=result.config,separate=result.config.obsLayers==='separate',sceneId='aebc1234-1111-4444-8888-000000000001';
  const specs=separate?[
    {key:'picture',name:'01 PICTURE · 画面',file:'01-picture.html'},
    {key:'effects',name:'02 FX · 透明光效',file:'02-effects.html'},
    {key:'borders',name:'03 BORDERS · 边框',file:'03-borders.html'}
  ]:[{key:'all',name:'SHOWCASE · 纯画面',file:'output.html'}];
  if(separate&&(!result.syncManifest?.key||specs.some(s=>typeof result.layerDocuments?.[s.key]!=='string')))throw Error('OBS 三层输出文件不完整，请重新构建工作台。');
  const sources=specs.map((spec,index)=>({name:spec.name,uuid:'aebc1234-1111-4444-8888-'+String(index+2).padStart(12,'0'),id:'browser_source',versioned_id:'browser_source',settings:{is_local_file:!separate,...(separate?{url:'__STUDIO_BASE_URL__/'+spec.file}:{local_file:spec.file}),width,height,fps:60,fps_custom:true,css:'html,body{margin:0;background:transparent;overflow:hidden}',shutdown:false,restart_when_active:!separate},mixers:0,sync:0,flags:0,volume:1,balance:.5,enabled:true,muted:true,hotkeys:{},deinterlace_mode:0,deinterlace_field_order:0,monitoring_type:0,private_settings:{}}));
  // OBS stores scene items from the bottom of the stack to the top.
  const items=sources.map((source,index)=>({name:source.name,source_uuid:source.uuid,visible:true,locked:false,rot:0,scale_ref:{x:width,y:height},align:5,bounds_type:0,bounds_align:0,bounds_crop:false,crop_left:0,crop_top:0,crop_right:0,crop_bottom:0,id:index+1,pos:{x:0,y:0},scale:{x:1,y:1},bounds:{x:0,y:0},scale_filter:'disable',blend_method:'default',blend_type:'normal',private_settings:{}}));
  const scene={name:separate?'SHOWCASE · THREE LAYERS':'SHOWCASE OUTPUT',uuid:sceneId,id:'scene',versioned_id:'scene',settings:{id_counter:items.length,custom_size:false,items},mixers:0,sync:0,flags:0,volume:1,balance:.5,enabled:true,muted:false,hotkeys:{},private_settings:{}};
  const collection={name:'Showcase '+width+'x'+height+(separate?' · 3 Layers':''),sources:[...sources,scene],groups:[],scene_order:[{name:scene.name}],current_scene:scene.name,current_program_scene:scene.name,canvases:[],current_transition:'Fade',transition_duration:300,transitions:[],quick_transitions:[],saved_projectors:[],preview_locked:false,scaling_enabled:false,scaling_level:0,scaling_off_x:0,scaling_off_y:0,'virtual-camera':{type:2},modules:{},resolution:{x:width,y:height},migration_resolution:{x:width,y:height},version:2};
  const start='@echo off\r\ncd /d "%~dp0"\r\npowershell.exe -NoProfile -Command "$rootPath=(Get-Location).Path; $nodePath=Join-Path $rootPath \'node.exe\'; if(-not (Test-Path -LiteralPath $nodePath -PathType Leaf)){$nodeCommand=Get-Command node.exe -ErrorAction SilentlyContinue; if($nodeCommand){$nodePath=$nodeCommand.Source}else{Write-Host \'Please install Node.js 18 or later from https://nodejs.org then reopen this file.\'; exit 1}}; $serverPath=Join-Path $rootPath \'OBS-LAYERS-SERVER.mjs\'; Start-Process -FilePath $nodePath -ArgumentList @(([char]34+$serverPath+[char]34),\'--open\') -WorkingDirectory $rootPath -WindowStyle Hidden"\r\nif errorlevel 1 (pause & exit /b 1)\r\necho The local controller will open in your browser.\r\n';
  const prepare=separate?start:'@echo off\r\ncd /d "%~dp0"\r\npowershell.exe -NoProfile -Command "$rootPath=(Get-Location).Path; $sceneData=Get-Content -LiteralPath (Join-Path $rootPath \'scene-template.json\') -Raw -Encoding UTF8 | ConvertFrom-Json; foreach($sourceItem in $sceneData.sources){if($sourceItem.id -eq \'browser_source\'){$fileName=[IO.Path]::GetFileName([string]$sourceItem.settings.local_file); if($fileName -eq \'__OUTPUT_HTML__\'){$fileName=\'output.html\'}; $sourceItem.settings.local_file=Join-Path $rootPath $fileName}}; $jsonText=$sceneData | ConvertTo-Json -Depth 50; [IO.File]::WriteAllText((Join-Path $rootPath \'IMPORT-IN-OBS.json\'),$jsonText,(New-Object Text.UTF8Encoding($false)))"\r\nif errorlevel 1 (echo Could not prepare OBS scene. & pause & exit /b 1)\r\necho Ready: IMPORT-IN-OBS.json\r\necho Import this file using OBS Scene Collection - Import.\r\npause\r\n';
  const guide='OBS 纯画面输出包\n\n1. 先将整个 ZIP 解压到固定文件夹。\n2. 双击 PREPARE-OBS.cmd，生成 IMPORT-IN-OBS.json。它只写入此文件夹，不修改你的 OBS。\n3. 在 OBS「场景集合 → 导入」选择 IMPORT-IN-OBS.json，再切换到新集合。\n4. OBS「设置 → 视频」将基础画布设为 '+width+' × '+height+'，输出分辨率按需要设置。导入场景不保证修改全局画布设置。\n5. 现在直接录制：浏览器地址栏、网页编辑面板都不会进入信号。无需浏览器全屏、窗口捕获或显示器捕获。\n\n也可以手动添加「浏览器」源 → 本地文件 → output.html，宽 '+width+'、高 '+height+'，60 FPS。若已有变换，右键源 → 变换 → 重置变换，再适配屏幕。\n\n画布宽高比与网页不一致时，「完整显示」会留边；「铺满裁切」会裁掉超出部分。最好在网页中直接选择与 OBS 一致的横屏 / 竖屏。\n\n透明底由导出时选项决定。修改设计后重新导出并刷新 OBS 浏览器源。需要 Spout2 时，在 OBS 安装官方来源的 obs-spout2-plugin，为此源添加 Spout Filter；网页本身不直接发送 Spout。\n\n快捷键（OBS 浏览器源右键 → 交互后使用）：空格暂停，R 重播片头，S 跳到展示，E 进入已启用的品牌片尾。片尾按设置停在品牌画面或收束为关机黑场；关闭片尾时按所选模式持续展示或按时长循环；持续展示不会重播入场，暂停后继续也不会回到起点。\n\n尺寸：'+width+' × '+height+'\n适配：'+(result.config.fit==='cover'?'铺满裁切':'完整显示')+'\n';
  const layeredGuide='OBS 三层输出包\n\n1. 将 ZIP 完整解压。首次使用需安装 Node.js 18 或更新版本。\n2. 双击 START-OBS-LAYERS.cmd（PREPARE-OBS.cmd 也可），保持同步服务窗口开启。服务只监听本机，会生成 IMPORT-IN-OBS.json 并打开控制页。\n3. OBS「场景集合 → 导入」选择 IMPORT-IN-OBS.json。设置基础画布为 '+width+' × '+height+'。\n4. 等三个源加载完成，在控制页统一点击播放 / 重播；从控制页控制暂停、展示与片尾，避免各源单独重播。\n5. 每次重启本地服务后重新导入生成的场景文件，以更新本机地址。\n\n从下到上：01 PICTURE（画面） → 02 FX（透明光效） → 03 BORDERS（边框）。可在 OBS 中将自己的角色素材插入任意两层之间。FX 与边框始终透明；画面底色按导出选项。即使当前未启用边框，边框文件仍保留空透明输出。\n\n02 FX 是独立的透明叠加层，包含扫描线、全息波纹、光漏与炫光等可叠加效果。它无法读取其他 OBS 源像素，不能真正给外部角色素材做辉光、扭曲或 RGB 色散；这些需要读取像素的处理仍作用于 01 PICTURE 内的网页素材。若想处理外部模型，请在 OBS 中给对应源添加滤镜，或在 AE 中使用后处理合成。\n\noutput.html 保留完整一体版，无需同步服务，可直接作为 OBS 本地浏览器源使用。三层文件应通过同步服务加载，不要逐个双击本地 HTML。\n\n修改设计后重新导出；Spout2 可在 OBS 中对需要的源或场景添加 Spout Filter。网页不直接发送 Spout2。\n\n尺寸：'+width+' × '+height+'\n适配：'+(result.config.fit==='cover'?'铺满裁切':'完整显示')+'\n';
  return [{name:'output.html',data:result.html},...(separate?specs.map(spec=>({name:spec.file,data:result.layerDocuments[spec.key]})):[]),...(separate?[{name:'control.html',data:studioOBSLayerControl},{name:'OBS-LAYERS-SERVER.mjs',data:studioOBSLayerServer},{name:'studio-sync.json',data:JSON.stringify(result.syncManifest,null,2)},{name:'START-LAYERS.cmd',data:start}]:[]),{name:'scene-template.json',data:JSON.stringify(collection,null,2)},{name:'PREPARE-OBS.cmd',data:prepare},{name:'README.txt',data:separate?layeredGuide.replace('START-OBS-LAYERS.cmd','START-LAYERS.cmd').replace('保持同步服务窗口开启','保持本机同步服务运行'):guide}];
}
function validateStudioAEScene(payload){
  if(!payload||!payload.scene||!Array.isArray(payload.assets))throw Error('AE 数据不完整。');
  const raw=JSON.stringify(payload.scene);if(raw.length>48*1024*1024)throw Error('AE 场景过大，请简化几何后重试。');
  const d=JSON.parse(raw),number=(n,a=-100000,b=100000)=>{if(typeof n!=='number'||!Number.isFinite(n)||n<a||n>b)throw Error('AE 数值参数无效。');return n},str=(s,n=400)=>{if(typeof s!=='string'||s.length>n)throw Error('AE 文字参数无效。');return s},list=(a,n)=>{if(!Array.isArray(a)||a.length>n)throw Error('AE 图层数量超出范围。');return a},color=c=>{if(!Array.isArray(c)||c.length!==4)throw Error('AE 颜色无效。');c.forEach(n=>number(n,0,1))},path=p=>{list(p.v,2048);if(p.v.length<1)throw Error('AE 路径为空。');for(const key of ['v','i','o']){if(!Array.isArray(p[key])||p[key].length!==p.v.length)throw Error('AE 路径格式无效。');for(const v of p[key]){if(!Array.isArray(v)||v.length!==2)throw Error('AE 路径坐标无效。');v.forEach(n=>number(n))}}};
  number(d.width,1080,3840);number(d.height,1080,3840);if(![[1920,1080],[1080,1920],[3840,2160],[2160,3840]].some(x=>x[0]===d.width&&x[1]===d.height))throw Error('不支持此 AE 画布尺寸。');
  if(![30,60].includes(d.fps)||d.version!==1)throw Error('AE 版本或帧率无效。');str(d.name,80);str(d.design,30);number(d.duration,.1,3744);number(d.intro,0,3600);number(d.speed,.5,1.8);number(d.offset,0,1800);color(d.background);color(d.accent);color(d.ink);number(d.frameThickness,0,500);if(!['none','horizontal','vertical'].includes(d.frame))throw Error('AE 边框无效。');
  for(const [obj,keys]of [[d.motion,['amount','speed']],[d.shadow,['strength','depth']],[d.pattern,['opacity','amount']]]){if(!obj)throw Error('AE 效果参数缺失。');keys.forEach(k=>number(obj[k],0,5))}color(d.shadow.color);if(!['refined','soft','playful'].includes(d.motion.style))throw Error('AE 文字动效无效。');if(!['none','mesh','dots','ripple','grid'].includes(d.pattern.kind))throw Error('AE 背景类型无效。');
  for(const key of ['top','bottom']){str(d.borderText[key],400);number(d.edges[key].duration,12,90);if(!['negative','positive','still'].includes(d.edges[key].direction))throw Error('AE 边框方向无效。')}
  if(d.borderAppearance!==undefined){const b=d.borderAppearance;if(!b||!['solid','outline','double'].includes(b.style))throw Error('AE 边框外观无效。');for(const key of ['background','text','accent'])color(b[key]);number(b.opacity,0,1);number(b.lineWidth,.1,30);}
  const files=new Set();let bytes=0;for(const a of list(payload.assets,50)){if(!/^assets\/asset-\d{3}\.(png|jpg)$/.test(a.name)||files.has(a.name))throw Error('AE 素材文件名无效。');if(typeof a.data!=='string'||!/^data:image\/(png|jpeg);base64,[a-z0-9+/]*={0,2}$/i.test(a.data)||a.data.length>24*1024*1024)throw Error('AE 素材格式无效。');bytes+=a.data.length;if(bytes>100*1024*1024)throw Error('AE 素材包过大。');files.add(a.name)}
  const asset=s=>{if(!files.has(s))throw Error('AE 素材引用缺失。')};
  if(!d.narrative)d.narrative={introStyle:'title',nameReveal:'show',nameDelay:.65};
  if(!['model','title','story'].includes(d.narrative.introStyle)||!['show','delayed'].includes(d.narrative.nameReveal))throw Error('AE 片头类型无效。');number(d.narrative.nameDelay,.2,.9);
  const timingDefaults={transitionStart:d.story?.enabled?d.story.transitionStart:d.intro/6,transitionDuration:d.story?.enabled?d.story.transitionDuration:d.intro*.8,infoDuration:.85/d.speed,endingTransitionDuration:Math.min(.8/d.speed,(d.ending?.duration||3.5)*.28)};
  for(const [key,fallback]of Object.entries(timingDefaults)){if(d.narrative[key]===undefined)d.narrative[key]=fallback;number(d.narrative[key],0,3600)}
  if(!d.ending)d.ending={duration:0,style:'quiet',brand:'YOUR STUDIO',logoAsset:'',word:{x:d.width/2,y:d.height/2,w:d.width*.6,h:d.height*.1}};
  number(d.ending.duration,0,24);str(d.ending.brand,24);str(d.ending.logoAsset,80);if(!['signature','orbit','quiet'].includes(d.ending.style))throw Error('AE 片尾类型无效。');
  if(d.ending.colorMode===undefined)d.ending.colorMode='theme';if(!['theme','custom'].includes(d.ending.colorMode))throw Error('AE 片尾文字配色无效。');if(d.ending.color===undefined)d.ending.color=d.ink.slice();color(d.ending.color);
  if(d.ending.logoAsset)asset(d.ending.logoAsset);for(const key of ['x','y','w','h'])number(d.ending.word[key]);
  if(d.showDuration===undefined)d.showDuration=d.duration-d.intro-d.ending.duration;
  number(d.showDuration,1/1.8,120);if(Math.abs(d.intro+d.showDuration+d.ending.duration-d.duration)>.01)throw Error('AE 展示时长无效。');
  // Old exports keep their original per-shot effects. New exports carry one
  // continuous post-processing stack shared by all selected narrative scenes.
  if(d.post!==undefined){
    if(!d.post||!['none','polar','crt','holo','bloom','anamorphic','prism','film'].includes(d.post.effect))throw Error('AE 后处理类型无效。');
    number(d.post.strength,0,1);number(d.post.glow,0,1);number(d.post.speed,.1,3.6);number(d.post.fade,.08,3);
    if(!d.post.scenes||typeof d.post.scenes!=='object'||Array.isArray(d.post.scenes))throw Error('AE 后处理镜头选择无效。');
    for(const key of ['character','author','show','outro'])if(typeof d.post.scenes[key]!=='boolean')throw Error('AE 后处理镜头选择无效。');
  }
  if(d.ending.shutdownEnabled===undefined)d.ending.shutdownEnabled=false;
  if(typeof d.ending.shutdownEnabled!=='boolean')throw Error('AE 关机开关无效。');
  if(d.ending.shutdownDuration===undefined)d.ending.shutdownDuration=.8/d.speed;
  number(d.ending.shutdownDuration,.3/1.8,3);
  if(d.ending.duration&&d.ending.shutdownEnabled&&d.ending.shutdownDuration>d.ending.duration*.45+.001)throw Error('AE 关机时长无效。');
  if(d.intro+d.ending.duration>=d.duration)throw Error('AE 片段时长无效。');

  function layer(l){str(l.name,150);if(!['text','plate','image','badge'].includes(l.kind))throw Error('AE 图层类型无效。');for(const key of ['x','y','w','h','rotation','opacity','entry'])if(l[key]!==undefined)number(l[key]);
    if(l.color)color(l.color);if(l.ink)color(l.ink);if(l.kind==='text'){str(l.text,600);str(l.fontFamily,400);number(l.fontSize,1,2000);number(l.weight,1,1000);number(l.tracking,-2000,5000)}
    if(l.kind==='plate')for(const p of list(l.points,50)){if(!Array.isArray(p)||p.length!==2)throw Error('AE 色块无效。');p.forEach(n=>number(n))}
    if(l.kind==='image'){asset(l.asset);if(l.modelRole!==undefined&&!['show','portrait'].includes(l.modelRole))throw Error('AE 角色素材类型无效。');if(!['contain','cover'].includes(l.fit))throw Error('AE 图片适配无效。');if(l.objectPosition!==undefined){if(!Array.isArray(l.objectPosition)||l.objectPosition.length!==2)throw Error('AE 图片位置无效。');l.objectPosition.forEach(n=>number(n,0,1))}}
    if(l.kind==='badge'){number(l.radius,0,1000);str(l.text,80);str(l.sub,80);if(!['bare','filled','outline'].includes(l.style))throw Error('AE 标识样式无效。');if(l.icon){asset(l.icon.asset);['x','y','w','h'].forEach(k=>number(l.icon[k]))}}
  }
  list(d.layers,150).forEach(layer);
  if(d.story!==undefined){
    if(!d.story||typeof d.story.enabled!=='boolean'||typeof d.story.packagingOnly!=='boolean'||typeof d.story.flash!=='boolean')throw Error('AE 双镜头片头开关无效。');
    number(d.story.transitionStart,0,3600);number(d.story.transitionDuration,0,12);
    const roles=new Set();for(const shot of list(d.story.shots,2)){
      if(!['character','author'].includes(shot.role)||roles.has(shot.role))throw Error('AE 双镜头角色无效。');roles.add(shot.role);number(shot.start,0,3600);number(shot.duration,.05,1200);
      if(!['tl-br','tr-bl','bl-tr','br-tl','center'].includes(shot.corner)||!['none','crt','holo','polar'].includes(shot.effect))throw Error('AE 双镜头设计参数无效。');number(shot.strength,0,1);number(shot.effectSpeed,0,3);
      if(shot.start+shot.duration>d.intro+.01)throw Error('AE 双镜头时长超出片头。');for(const l of list(shot.layers,20)){if(!['text','plate','image'].includes(l.kind))throw Error('AE 双镜头图层无效。');layer(l);if(d.story.packagingOnly&&l.kind==='image')throw Error('AE 包装模式不能包含片头素材。');}
    }
    if(d.story.enabled&&(d.narrative.introStyle!=='story'||d.intro<=0||Math.abs(d.story.transitionStart+d.story.transitionDuration-d.intro)>.02))throw Error('AE 双镜头片头时间无效。');
  }
  if(d.narrative.introStyle==='story'&&d.intro>0&&!d.story?.enabled)throw Error('AE 双镜头片头数据缺失。');
  for(const g of list(d.geometry,100)){if(!['fill','stroke'].includes(g.kind))throw Error('AE 几何类型无效。');color(g.color);number(g.width,0,1000);number(g.alpha,0,1);number(g.cap,1,3);
    if(g.introTransform){for(const key of ['from','to']){const point=g.introTransform[key];if(!Array.isArray(point)||point.length!==2)throw Error('AE 过渡坐标无效。');point.forEach(n=>number(n))}number(g.introTransform.scale,.1,5);if(g.introTransform.rotation!==undefined)number(g.introTransform.rotation,-360,360)}
    if(g.introOpacity!==undefined)number(g.introOpacity,0,1);
    for(const p of list(g.paths,80))path(p);let prev=-1;for(const s of list(g.samples,16384)){number(s.time,0,d.duration+.01);if(s.time<=prev)throw Error('AE 关键帧顺序无效。');prev=s.time;number(s.alpha,0,1);if(s.width!==undefined)number(s.width,0,1000);for(const p of list(s.paths,80))path(p)}}
  list(d.warnings,20).forEach(s=>str(s,800));return d;
}
function buildStudioAEFiles(payload){
  const d=validateStudioAEScene(payload),literal=JSON.stringify(d).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
  // Dense path keys must not be inflated by indentation into an oversized ZIP entry.
  const jsx=studioAETemplate.replace('__STUDIO_AE_SCENE__',()=>literal),files=[{name:'IMPORT_TO_AE.jsx',data:jsx},{name:'scene.json',data:JSON.stringify(d)}];
  for(const a of payload.assets){const binary=atob(a.data.split(',')[1]),data=Uint8Array.from(binary,c=>c.charCodeAt(0));files.push({name:a.name,data})}
  const storyGuide=d.story?.enabled?'双镜头海报片头：07 INTRO CHARACTER / 08 INTRO CREATOR 内的字幕与绿色 REPLACE 素材槽可独立编辑；没有上传图片也会生成空素材槽。CONTROLS 中的 Character / Author Shot Start / Duration 控制两幕开始与时长。修改时长后若需连续衔接，请同步下一幕开始。Show Transition Start 与 Information Start 跟随最晚镜头结束，并保留手动偏移；Show Transition Duration 控制海报转入展示，持续旋转独立。'+(d.post?'两幕整段处于 MAIN 中的 FX 下方，角色与字幕一起经过后处理。':'旧版 Effect Strength / Speed 控制各镜头轻叠加。')+'\n\n':'';
  const structureGuide='工程导航：01 MAIN 是唯一最终输出。项目文件夹按 EDIT（字幕与镜头）、REPLACE（角色素材槽）、DESIGN（环形与背景）、FX（光效与边框）、ASSETS（原始文件）分组。绿色图层替换素材，蓝色图层编辑文字，紫色图层编辑 FX。展示页 TYPE 内的标题、说明和标识仍是原生文字 / 形状。\n\n叠放顺序（MAIN 从上到下）：CONTROLS → BORDER 独立边框 → 03 MODEL 展示角色 → 04 FX OPTICS 独立光效 → 05 FX ADJUSTMENT 调整层 → INTRO / ENDING / TYPE → GEOMETRY / PATTERN / BACKGROUND。开场素材放入 INTRO 内的绿色 REPLACE 合成，会与字幕一起受滤镜影响；展示页角色放入 03 MODEL，位于滤镜上方。即使导出时没有上传角色，也保留可直接放入视频的空素材槽。边框始终在最上方，不受滤镜影响。\n\n';
  const postGuide=d.post?'连续后处理：MAIN 内保留独立 FX ADJUSTMENT 原生调整层与 FX OPTICS 原生光效预合成。CONTROLS → Post FX Strength / Glow / Speed / Fade 分别控制强度、泛光、连续速度和渐变时长；Post FX Character / Author / Showcase / Ending 勾选镜头。滤镜动态使用合成绝对时间，不在镜头切换时重启；相邻启用镜头保持连续。淡入淡出跟随可编辑镜头时间与片尾开始。片头字幕处于滤镜下，展示角色处于滤镜上。扫描线、光带、环形、炫光、光漏与发光可直接改色、改形和关掉。此包按所选滤镜生成原生近似，网页棱镜色散与全息扭曲不保证逐像素一致；更换方案请在网页重选导出，或自行修改原生层。\n\n':'';
  const guide='可编辑 AE 模板 · Character Showcase Studio\n\n1. 将整个包解压，保持 assets 文件夹与 IMPORT_TO_AE.jsx 相邻。\n2. 打开 After Effects，选择「文件 → 脚本 → 运行脚本文件」，选中 IMPORT_TO_AE.jsx。\n3. 脚本会添加独立项目文件夹，不关闭已有项目。打开 01 MAIN，在 CONTROLS 调整颜色和动效。\n4. 另存为 .aep，即得到可继续编辑的 AE 工程。网页下载的是生成包，不是假装改后缀的 .aep。\n\n可编辑内容：文字、标题色块、主几何与圆环路径关键帧、背景图案、标识底板与文字、滚动边框。Logo / 图标 / 二维码 / 条码及角色图片为独立素材。\n\n'+storyGuide+'转场时间（合成秒数）：在 01 MAIN → CONTROLS 调整 Show Transition Start / Duration（圆环与大字移动）、Information Start / Fade Duration（信息开始与淡入）、Title Fade Duration（角色名淡入）、Ending Start / Transition Duration（展示转入片尾）。转场与圆环持续旋转相互独立。改变滑杆不会自动延长合成或图层；段落标记仅供参考。\n\n老电视关机：Cyber Shutdown 开关；Shutdown Duration 控制最后收束时长（秒，包含在片尾内）。画面短促闪动后压成亮线，再向中心缩成光点，余辉熄灭。SHUTDOWN 下的遮罩、扫描线、亮线、光晕和光点为独立原生图层；边框仍为独立图层，关机遮罩位于其上方，关机时一同熄灭。\n\n边框编辑：边框从片头开始显示，片尾关机时与整幅画面一起熄灭。在 01 MAIN 中，每一侧有独立的 BORDER TOP/BOTTOM/LEFT/RIGHT · background 原生形状底板，以及 · text 文字图层。底板可直接调颜色、尺寸和位置；双击文字图层进入预合成，修改 Border copy · EDIT THIS，全部滚动副本自动同步。可单独隐藏、替换或移动边框图层。\n\n字体：网页附带的 WOFF2 网页字体不等于已安装桌面字体。AE 缺字库时会替代，请安装对应字体或手动选择字体。中文默认使用微软雅黑；圆润中文使用寒蝉全圆体，需要安装 v3.200 桌面字体 ChillRoundFRegular / ChillRoundFBold。\n\n效果范围：复杂金属 / 渐变 / 云雾 / 细毛、CSS 滤镜与毛玻璃以原生图层近似重建或简化，并非网页逐像素复制。网页单独 HTML 输出保留原效果。圆环按运动变化自适应采样，控制路径中间帧偏差；AE 内保留可编辑路径关键帧。\n\n尺寸：'+d.width+' × '+d.height+' / '+d.fps+' fps\n片头：'+d.intro.toFixed(2)+' 秒；展示：'+d.showDuration.toFixed(2)+' 秒；片尾：'+d.ending.duration.toFixed(2)+' 秒；合成：'+d.duration.toFixed(2)+' 秒\n\n本次提示：\n'+d.warnings.map(w=>'- '+w).join('\n')+'\n';
  files.push({name:'README.txt',data:guide.replace('可编辑内容：',structureGuide+postGuide+'可编辑内容：')},{name:'ASSET-NOTICES.txt',data:studioAssetNotices});return {files,filename:studioExportName(d.name)+'-AE-editable.zip',scene:d};
}
