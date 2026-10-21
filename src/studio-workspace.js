// Editor chrome only. Existing inputs and listeners are retained, never cloned.
function mountStudioWorkspace(root,views){
  root.classList.add('studio-editor');root.dataset.panel='preview';
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
    const edge=group('边框文字与滚动 · 全局');edge.dataset.studioGroup='edges';
    // Borders are shared settings; the single source panel follows the active inspector.
    inspector.append(edge);edge.append(note('边框文字与滚动由所有方案共用，片头至片尾持续显示。AE 导出后，每侧边框的底板与文字可分别编辑。'));
    for(const el of original)if(el.parentElement===section)el.remove();
    section.append(preview,inspector);view.preview=preview;view.inspector=inspector;view.playback=playback;view.edgePanel=edge;
  }
  for(const view of views)reorganizeInspector(view);
  const edgeControls=make('div','studio-shared-edges');const edgeSource=findGroup('边框滚动');edgeControls.append(fields([field('direction-top-text'),field('direction-bottom-text')]));for(const el of [...edgeSource.children].slice(1))edgeControls.append(el);
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
