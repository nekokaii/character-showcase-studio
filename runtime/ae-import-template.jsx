/* Character Showcase Studio. Generated data is a literal, never evaluated code. */
/* CRT_MOTION_FUNCTION */
(function(){
  var d=__STUDIO_AE_SCENE__,root=File($.fileName).parent,failures=[],warnings=d.warnings.slice(0),u=d.width/(d.width<d.height?1080:1920);
  app.beginUndoGroup('Import Character Showcase');
  function build(){
    if(!app.project)app.newProject();
    var folder=app.project.items.addFolder(d.name+' · SHOWCASE');
    function subfolder(name){var f=app.project.items.addFolder(name);f.parentFolder=folder;return f}
    var editFolder=subfolder('01 EDIT · 文字与镜头'),mediaFolder=subfolder('02 REPLACE · 角色与品牌'),designFolder=subfolder('03 DESIGN · 背景与环形'),fxFolder=subfolder('04 FX · 后处理与边框'),assetFolder=subfolder('05 ASSETS · 原始素材');
    function comp(name,w,h){var c=app.project.items.addComp(name,Math.round(w),Math.round(h),1,d.duration,d.fps);c.parentFolder=folder;return c}
    var main=comp('01 MAIN · '+d.name,d.width,d.height),geo=comp('02 GEOMETRY · editable paths',d.width,d.height),pattern=comp('03 PATTERN · editable',d.width,d.height);
    geo.parentFolder=designFolder;pattern.parentFolder=designFolder;
    var controls=main.layers.addNull();controls.name='CONTROLS';controls.guideLayer=true;controls.label=2;
    function effect(layer,match,name,value){var e=layer.property('ADBE Effect Parade').addProperty(match);if(name)e.name=name;e.property(1).setValue(value);return e}
    function colorControl(name,value){effect(controls,'ADBE Color Control',name,value.slice(0,3))}
    function slider(name,value){effect(controls,'ADBE Slider Control',name,value)}
    colorControl('Accent',d.accent);colorControl('Ink',d.ink);colorControl('Background',d.background);
    if(d.ending.colorMode==='custom')colorControl('Ending Brand Color',d.ending.color);
    var firstBadge=null;for(var b=0;b<d.layers.length;b++)if(d.layers[b].kind==='badge'){firstBadge=d.layers[b];break}
    colorControl('Badge Surface',firstBadge?firstBadge.color:[0,0,0,1]);colorControl('Badge Ink',firstBadge?firstBadge.ink:d.ink);
    slider('Badge Opacity',firstBadge?firstBadge.color[3]*100:100);slider('Geometry Speed',1);slider('Text Motion',d.motion.enabled?d.motion.amount*100:0);
    var storyEnabled=!!(d.story&&d.story.enabled&&d.intro>0),storyShots=storyEnabled?d.story.shots:[];
    function storyPrefix(role){return role==='character'?'Character':'Author'}
    for(var ss=0;ss<storyShots.length;ss++){var shot=storyShots[ss],prefix=storyPrefix(shot.role);slider(prefix+' Shot Start',shot.start);slider(prefix+' Shot Duration',shot.duration);if(!d.post){slider(prefix+' Effect Strength',shot.strength*100);slider(prefix+' Effect Speed',shot.effectSpeed);}}
    var transitionStart=d.narrative.transitionStart===undefined?d.intro/6:d.narrative.transitionStart,transitionDuration=d.narrative.transitionDuration===undefined?d.intro*.8:d.narrative.transitionDuration,informationDuration=d.narrative.infoDuration===undefined?.85/d.speed:d.narrative.infoDuration,endingTransitionDuration=d.narrative.endingTransitionDuration===undefined?Math.min(.8/d.speed,d.ending.duration*.28):d.narrative.endingTransitionDuration;
    slider('Show Transition Start',transitionStart);slider('Show Transition Duration',transitionDuration);slider('Information Start',storyEnabled?transitionStart:d.intro);slider('Information Fade Duration',informationDuration);slider('Title Fade Duration',storyEnabled?Math.max(main.frameDuration,transitionDuration):Math.max(.35,Math.min(.9,d.intro*d.speed*.25))/d.speed);slider('Ending Start',d.duration-d.ending.duration);slider('Ending Transition Duration',endingTransitionDuration);
    controls.comment='Timing sliders are in composition seconds. Show Transition controls native ring relocation / title morph; Information Start / Fade and Title Fade control model-first copy; Ending Start / Transition control showcase-to-brand crossfade. Continuous geometry speed is independent. Editing these does not change composition duration. Timeline markers are initial labels, not timing controls.';
    effect(controls,'ADBE Checkbox Control','Cyber Shutdown',d.ending.shutdownEnabled?1:0);slider('Shutdown Duration',d.ending.shutdownDuration);
    var ctl='comp('+quote(main.name)+').layer("CONTROLS")';
    if(storyEnabled&&storyShots.length){var ends=[];for(var ss=0;ss<storyShots.length;ss++){var prefix=storyPrefix(storyShots[ss].role);ends.push('effect("'+prefix+' Shot Start")(1)+Math.max(thisComp.frameDuration,effect("'+prefix+' Shot Duration")(1))');}var follow='value+Math.max(0,'+ends.join(',')+')-'+d.story.transitionStart;controls.effect('Show Transition Start')(1).expression=follow;controls.effect('Information Start')(1).expression=follow;controls.comment+=' Story shot Start / Duration controls are independent; showcase and information starts follow the latest shot end while keeping the manually entered offset. The two STORY precompositions contain editable images, copy and simplified overlay effects.';}
    function quote(t){return '"'+String(t).replace(/\\/g,'\\\\').replace(/"/g,'\\"').replace(/\r/g,'\\r').replace(/\n/g,'\\n').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029')+'"'}
    function colorExpression(c){if(Math.abs(c[0]-d.accent[0])+Math.abs(c[1]-d.accent[1])+Math.abs(c[2]-d.accent[2])<.035)return ctl+'.effect("Accent")(1)';if(Math.abs(c[0]-d.ink[0])+Math.abs(c[1]-d.ink[1])+Math.abs(c[2]-d.ink[2])<.035)return ctl+'.effect("Ink")(1)';return ''}
    function transform(layer,g){var t=layer.property('ADBE Transform Group');t.property('ADBE Position').setValue([g.x||0,g.y||0]);if(g.rotation)t.property('ADBE Rotate Z').setValue(g.rotation);return t}
    function pathValue(p){var s=new Shape();s.vertices=p.v;s.inTangents=p.i;s.outTangents=p.o;s.closed=p.closed;return s}
    function polygon(points){var i=[],o=[];for(var n=0;n<points.length;n++){i.push([0,0]);o.push([0,0])}return {v:points,i:i,o:o,closed:true}}
    function linearKeys(prop){for(var key=1;key<=prop.numKeys;key++)prop.setInterpolationTypeAtKey(key,KeyframeInterpolationType.LINEAR,KeyframeInterpolationType.LINEAR)}
    function shapeLayer(c,name){var l=c.layers.addShape();l.name=name;l.property('ADBE Transform Group').property('ADBE Position').setValue([0,0]);return l}
    function fill(contents,c,expression){var f=contents.addProperty('ADBE Vector Graphic - Fill');f.property('ADBE Vector Fill Color').setValue(c.slice(0,3));f.property('ADBE Vector Fill Opacity').setValue((c.length>3?c[3]:1)*100);if(expression)f.property('ADBE Vector Fill Color').expression=expression;return f}
    function addPath(contents,p){var q=contents.addProperty('ADBE Vector Shape - Group');q.property('ADBE Vector Shape').setValue(pathValue(p));return q.property('ADBE Vector Shape')}
    function rect(c,name,x,y,w,h,color,radius,expression){var l=shapeLayer(c,name),g=l.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group'),contents=g.property('ADBE Vectors Group'),r=contents.addProperty('ADBE Vector Shape - Rect');r.property('ADBE Vector Rect Size').setValue([w,h]);r.property('ADBE Vector Rect Roundness').setValue(radius||0);fill(contents,color,expression);transform(l,{x:x,y:y});return l}
    function shadow(layer){if(!d.shadow.enabled)return;var s=layer.property('ADBE Effect Parade').addProperty('ADBE Drop Shadow');s.property(1).setValue(d.shadow.color.slice(0,3));s.property(2).setValue(d.shadow.strength*45);s.property(3).setValue(135);s.property(4).setValue(d.shadow.depth*12*d.width/1920);s.property(5).setValue(d.shadow.soft?24*d.width/1920:0)}
    var fontCache={};
    function fontFor(item){var bold=item.weight>=600,desired=bold?'Arial-BoldMT':'ArialMT',family=item.fontFamily||'',serif=false,narrow=false,rounded=false;
      var chinese=/[\u2e80-\u9fff]/.test(item.text);
      if(chinese){desired=bold?'MicrosoftYaHei-Bold':'MicrosoftYaHei';if(family.indexOf('ChillRoundF')>=0)desired='ChillRoundF'+(item.weight>=600?'Bold':'Regular');else if(family.indexOf('ZCOOL XiaoWei')>=0)desired='ZCOOLXiaoWei-Regular';else if(family.indexOf('ZCOOL KuaiLe')>=0)desired='ZCOOLKuaiLe-Regular';else if(family.indexOf('Ma Shan Zheng')>=0)desired='MaShanZheng-Regular';}
      else{var weight=item.weight||400,suffix=weight>=800?'ExtraBold':weight>=700?'Bold':weight>=600?'SemiBold':weight>=500?'Medium':'Regular';
        if(family.indexOf('Cormorant')>=0)desired='CormorantGaramond-'+(weight>=700?'Bold':weight>=600?'SemiBold':weight>=500?'Medium':'Regular');
        else if(family.indexOf('Barlow')>=0)desired='BarlowCondensed-'+(weight>=900?'Black':suffix);
        else if(family.indexOf('Space Grotesk')>=0)desired='SpaceGrotesk-'+(weight>=700?'Bold':weight>=600?'SemiBold':weight>=500?'Medium':'Regular');
        else if(family.indexOf('Manrope')>=0)desired='Manrope-'+suffix;
        else if(family.indexOf('Nunito')>=0)desired='Nunito-'+(weight>=900?'Black':suffix);
        serif=family.indexOf('Cormorant')>=0;narrow=family.indexOf('Barlow')>=0;rounded=family.indexOf('Nunito')>=0;if(family.indexOf('Arial Black')>=0)desired='Arial-Black';if(family.indexOf('Courier')>=0)desired=bold?'CourierNewPS-BoldMT':'CourierNewPSMT'}
      if(fontCache[desired])return fontCache[desired];var candidates=[desired,chinese?(bold?'MicrosoftYaHei-Bold':'MicrosoftYaHei'):serif?(bold?'Georgia-Bold':'Georgia'):narrow?(bold?'ArialNarrow-Bold':'ArialNarrow'):rounded?'ArialRoundedMTBold':bold?'Arial-BoldMT':'ArialMT',bold?'Arial-BoldMT':'ArialMT'];
      if(app.fonts&&app.fonts.getFontsByPostScriptName)for(var j=0;j<candidates.length;j++){var matches=app.fonts.getFontsByPostScriptName(candidates[j]);for(var n=0;n<matches.length;n++)if(!matches[n].isSubstitute){fontCache[desired]=candidates[j];if(j)warnings.push('Font '+desired+' → '+candidates[j]);return candidates[j]}}
      warnings.push('Font availability could not be confirmed: '+desired+'. Install the selected desktop font or replace it in AE.');fontCache[desired]=desired;return desired;
    }
    function text(c,item){var l=c.layers.addText(item.text||''),p=l.property('ADBE Text Properties').property('ADBE Text Document'),td=p.value;td.font=fontFor(item);td.fontSize=item.fontSize||24*u;td.applyFill=true;td.fillColor=(item.color||d.ink).slice(0,3);td.applyStroke=false;td.tracking=item.tracking||0;td.justification=ParagraphJustification.CENTER_JUSTIFY;td.fauxItalic=!!item.italic;if(item.weight>=600&&/ZCOOL XiaoWei|ZCOOL KuaiLe|Ma Shan Zheng/.test(item.fontFamily||''))td.fauxBold=true;p.setValue(td);l.name=item.name||item.text;
      var r=l.sourceRectAtTime(0,false),t=l.property('ADBE Transform Group');t.property('ADBE Anchor Point').setValue([r.left+r.width/2,r.top+r.height/2]);transform(l,item);if(item.w&&r.width>0){var sx=Math.min(200,Math.max(20,item.w/r.width*100));t.property('ADBE Scale').setValue([sx,100])}var exp=item.badgeInk?ctl+'.effect("Badge Ink")(1)':colorExpression(item.color||d.ink);if(exp)p.expression='text.sourceText.style.setFillColor('+exp+')';return l}
    var transitionCode='var ts=Math.max(0,'+ctl+'.effect("Show Transition Start")(1)),td=Math.max(thisComp.frameDuration,'+ctl+'.effect("Show Transition Duration")(1));var p='+(!d.intro?'1':'Math.max(0,Math.min(1,(time-ts)/td))')+';p=p*p*(3-2*p);';
    var narrative='var n='+d.offset+'+time*'+d.speed+';'+(d.intro>0?'n=time<'+d.intro+'?time/'+d.intro+'*4.5:4.5+(time-'+d.intro+')*'+d.speed+';':'n=4.5+time*'+d.speed+';');
    var endingStart=d.duration-d.ending.duration;
    var informationTimeCode='var mc=comp('+quote(main.name)+');var is=Math.max(0,Math.min(mc.duration-mc.frameDuration,'+ctl+'.effect("Information Start")(1)));';
    var endingTimeCode='var mc=comp('+quote(main.name)+');var es=Math.max(0,Math.min(mc.duration-mc.frameDuration,'+ctl+'.effect("Ending Start")(1)));var ed=Math.max(mc.frameDuration,Math.min(Math.max(mc.frameDuration,mc.duration-es),'+ctl+'.effect("Ending Transition Duration")(1)));';
    var exitCode=d.ending.duration>0?endingTimeCode+'var ex=Math.max(0,Math.min(1,(time-es)/ed));ex=1-ex*ex*(3-2*ex);':'var ex=1;';
    function fadeContent(l){l.property('ADBE Transform Group').property('ADBE Opacity').expression=exitCode+(storyEnabled?transitionCode+'value*ex*p':'value*ex')}
    function motion(l,item){var t=l.property('ADBE Transform Group'),baseOpacity=(item.opacity===undefined?1:item.opacity)*100,order=item.entry===undefined?0:item.entry;
      var pre=narrative+transitionCode+'var amp='+ctl+'.effect("Text Motion")(1)/100;var a=time*'+(d.motion.speed*d.speed*Math.PI*2/12)+'+'+Math.max(order,0)*.47+';';
      var pos='var dx=1.15*Math.sin(a*.5)*amp,dy=.55*Math.sin(a)*amp;';if(d.motion.style==='soft')pos='var dx=.65*Math.sin(a*.5)*amp,dy=2.35*Math.sin(a)*amp;';if(d.motion.style==='playful')pos='var dx=.65*Math.sin(a*.5)*amp,dy=-1.7*Math.pow(Math.max(0,Math.sin(a)),4)*amp;';
      pos+='dx*='+u+';dy*='+u+';';
      var modelFirst=d.narrative.introStyle==='model'||storyEnabled,isModel=item.name==='角色主图'||item.name==='角色特写';
      if(item.title&&!modelFirst){t.property('ADBE Position').expression=pre+pos+'['+d.width+'/2+(value[0]-'+d.width+'/2)*p+dx,'+d.height+'*.48+(value[1]-'+d.height+'*.48)*p+dy]';t.property('ADBE Scale').expression=pre+'value*(1+.48*(1-p))';}
      else if(item.kind!=='image')t.property('ADBE Position').expression=pre+pos+'value+[dx,dy]';
      var entry='var q=1;';
      if(storyEnabled){entry=informationTimeCode+'var fd=Math.max(thisComp.frameDuration,'+ctl+'.effect("'+(item.title?'Title Fade Duration':'Information Fade Duration')+'")(1));var q=Math.max(0,Math.min(1,(time-is)/fd));q=q*q*(3-2*q);';}
      else if(modelFirst){
        if(item.title){var revealOffset=d.narrative.nameReveal==='show'?0:d.intro*(1-d.narrative.nameDelay);entry=informationTimeCode+'var fd=Math.max(thisComp.frameDuration,'+ctl+'.effect("Title Fade Duration")(1));var rs=Math.max(0,is-'+revealOffset+');var q='+(!d.intro?'is<=0?1:':'')+'Math.max(0,Math.min(1,(time-rs)/fd));q=q*q*(3-2*q);';}
        else if(!isModel&&item.name!=='品牌'&&item.name!=='品牌 Logo')entry=informationTimeCode+'var fd=Math.max(thisComp.frameDuration,'+ctl+'.effect("Information Fade Duration")(1));var q='+(!d.intro?'is<=0?1:':'')+'Math.max(0,Math.min(1,(time-is)/fd));q=q*q*(3-2*q);';
      }else if(!modelFirst&&order>=0)entry=transitionCode+'var fd=Math.max(thisComp.frameDuration,'+ctl+'.effect("Information Fade Duration")(1));var begin=ts+td*'+((.8+Math.min(order,7)*.32-.75)/3.6)+';var q='+(!d.intro?'1':'Math.max(0,Math.min(1,(time-begin)/fd))')+';q=q*q*(3-2*q);';
      t.property('ADBE Opacity').expression=exitCode+entry+baseOpacity+'*q*ex';
      if(item.shadow)shadow(l);
    }
    if(!d.transparent){var bg=rect(main,'09 BACKGROUND · 背景颜色',d.width/2,d.height/2,d.width,d.height,d.background,0,ctl+'.effect("Background")(1)');bg.label=1}
    // One native vector layer; each paint operation is an individually named group.
    var geoLayer=shapeLayer(geo,'Ring and geometry · native paths'),vectors=geoLayer.property('ADBE Root Vectors Group');
    // Sampled paths only carry continuous motion. The native group transform uses
    // unretimed comp time, so changing a transition cannot accelerate a ring.
    var geometryClock='var gt=time*Math.max(0,'+ctl+'.effect("Geometry Speed")(1));var gi='+d.intro+',gl=Math.max(thisComp.frameDuration,thisComp.duration-gi);gt=Math.min(thisComp.duration-thisComp.frameDuration,gt<gi?gt:gi+((gt-gi)%gl+gl)%gl);';
    for(var g=0;g<d.geometry.length;g++){
      var op=d.geometry[g],group=vectors.addProperty('ADBE Vector Group');group.name='Geometry '+(g+1);var content=group.property('ADBE Vectors Group');
      for(var p=0;p<op.paths.length;p++){
        var prop=addPath(content,op.paths[p]),times=[],values=[];
        for(var s=0;s<op.samples.length;s++){var sample=op.samples[s];if(sample.paths[p]&&sample.paths[p].v.length===op.paths[p].v.length){times.push(sample.time);values.push(pathValue(sample.paths[p]))}}
        if(times.length){prop.setValuesAtTimes(times,values);linearKeys(prop)}prop.expression=geometryClock+'valueAtTime(gt)';
      }
      if(op.kind==='stroke'){var st=content.addProperty('ADBE Vector Graphic - Stroke');st.property('ADBE Vector Stroke Color').setValue(op.color.slice(0,3));var width=st.property('ADBE Vector Stroke Width'),wt=[],wv=[];for(var s=0;s<op.samples.length;s++)if(op.samples[s].width!==undefined){wt.push(op.samples[s].time);wv.push(op.samples[s].width)}if(wt.length){width.setValuesAtTimes(wt,wv);linearKeys(width)}else width.setValue(op.width);width.expression=geometryClock+'valueAtTime(gt)';st.property('ADBE Vector Stroke Line Cap').setValue(op.cap||1);var exp=colorExpression(op.color);if(exp)st.property('ADBE Vector Stroke Color').expression=exp;st.property('ADBE Vector Stroke Opacity').setValue(op.color[3]*100)}else fill(content,op.color,colorExpression(op.color));
      group=geoLayer.property('ADBE Root Vectors Group').property(g+1);var groupTransform=group.property('ADBE Vector Transform Group'),opacity=groupTransform.property('ADBE Vector Group Opacity'),ot=[],ov=[];for(var s=0;s<op.samples.length;s++){ot.push(op.samples[s].time);ov.push(op.samples[s].alpha*100)}if(ot.length){opacity.setValuesAtTimes(ot,ov);linearKeys(opacity)}
      opacity.expression=geometryClock+(op.introOpacity===undefined?'valueAtTime(gt)':transitionCode+'valueAtTime(gt)*('+op.introOpacity+'+(1-'+op.introOpacity+')*p)');
      if(op.introTransform){var intro=op.introTransform;groupTransform.property('ADBE Vector Anchor').setValue(intro.to);groupTransform.property('ADBE Vector Position').expression=transitionCode+'['+intro.from[0]+'+('+intro.to[0]+'-'+intro.from[0]+')*p,'+intro.from[1]+'+('+intro.to[1]+'-'+intro.from[1]+')*p]';groupTransform.property('ADBE Vector Scale').expression=transitionCode+'var gs=100*(1+('+intro.scale+'-1)*(1-p));[gs,gs]';if(intro.rotation!==undefined)groupTransform.property('ADBE Vector Rotation').expression=transitionCode+intro.rotation+'*(1-p)';}
    }
    var geometry=main.layers.add(geo);geometry.name='07 GEOMETRY · 圆环与几何';geometry.label=15;geometry.comment='Continuous sampled path motion; native group transforms are driven by Show Transition Start / Duration in CONTROLS. Transition timing does not retime ring rotation.';
    fadeContent(geometry);
    // Native pattern paths, deliberately light and independent of geometry.
    if(d.pattern.kind!=='none'){
      var grid=shapeLayer(pattern,'Background '+d.pattern.kind),vg=grid.property('ADBE Root Vectors Group'),spacing=d.width/28;
      if(d.pattern.kind==='grid'||d.pattern.kind==='mesh'){
        var lines=vg.addProperty('ADBE Vector Group').property('ADBE Vectors Group');
        for(var x=0;x<=d.width;x+=spacing)addPath(lines,{v:[[x,0],[x,d.height]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],closed:false});
        for(var y=0;y<=d.height;y+=spacing)addPath(lines,{v:[[0,y],[d.width,y]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],closed:false});
        var stroke=lines.addProperty('ADBE Vector Graphic - Stroke');stroke.property('ADBE Vector Stroke Width').setValue(u);stroke.property('ADBE Vector Stroke Color').setValue(d.ink.slice(0,3));
      }else if(d.pattern.kind==='ripple'){
        for(var q=0;q<13;q++){var gc=vg.addProperty('ADBE Vector Group').property('ADBE Vectors Group'),ellipse=gc.addProperty('ADBE Vector Shape - Ellipse');ellipse.property('ADBE Vector Ellipse Size').setValue([d.width*(.1+q*.09),d.height*(.06+q*.06)]);ellipse.property('ADBE Vector Ellipse Position').setValue([d.width*.7,d.height*.65]);var st=gc.addProperty('ADBE Vector Graphic - Stroke');st.property('ADBE Vector Stroke Color').setValue(d.ink.slice(0,3));st.property('ADBE Vector Stroke Width').setValue(u)}
      }else{
        var dots=vg.addProperty('ADBE Vector Group').property('ADBE Vectors Group'),dot=dots.addProperty('ADBE Vector Shape - Ellipse');dot.property('ADBE Vector Ellipse Size').setValue([3*u,3*u]);dot.property('ADBE Vector Ellipse Position').setValue([spacing/2,spacing/2]);fill(dots,d.ink);
        var rx=dots.addProperty('ADBE Vector Filter - Repeater');rx.property('ADBE Vector Repeater Copies').setValue(Math.ceil(d.width/spacing)+1);rx.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([spacing,0]);
        var ry=dots.addProperty('ADBE Vector Filter - Repeater');ry.property('ADBE Vector Repeater Copies').setValue(Math.ceil(d.height/spacing)+1);ry.property('ADBE Vector Repeater Transform').property('ADBE Vector Repeater Position').setValue([0,spacing]);
      }
      grid.property('ADBE Transform Group').property('ADBE Opacity').setValue(d.pattern.opacity*100);
      if(d.pattern.moving)grid.property('ADBE Transform Group').property('ADBE Position').expression='value+[Math.sin(time*.35)*'+d.pattern.amount*50*u+',Math.cos(time*.4)*'+d.pattern.amount*30*u+']';
      var pl=main.layers.add(pattern);pl.name='08 PATTERN · 网格与点阵';pl.label=15;pl.moveAfter(geometry);fadeContent(pl);
    }
    var imported={},showModels=[],informationLayers=[];function footage(file){if(imported[file])return imported[file];var f=File(root.fsName+'/'+file);if(!f.exists)throw Error('Missing asset: '+file);var source=app.project.importFile(new ImportOptions(f));source.parentFolder=assetFolder;imported[file]=source;return source}
    function replacementGuide(c,message){var l=text(c,{text:message,name:'GUIDE · 放入素材后隐藏此引导',fontFamily:'Arial',fontSize:Math.min(c.width*.035,36*u),weight:600,color:d.ink,x:c.width/2,y:c.height/2,w:c.width*.8});l.guideLayer=true;l.label=9;l.comment='Guide only; never renders into the parent composition. Import a transparent video / image and place it here. Keep this composition duration equal to MAIN.';return l}
    function picture(item){var isModel=item.modelRole==='show'||item.modelRole==='portrait'||item.name==='角色主图'||item.name==='角色特写',src=footage(item.asset),box=comp((isModel?'REPLACE · ':'')+item.name+' · asset',Math.max(4,item.w),Math.max(4,item.h)),inner=box.layers.add(src),scale=(item.fit==='cover'?Math.max:Math.min)(box.width/src.width,box.height/src.height)*100;box.parentFolder=isModel?mediaFolder:assetFolder;inner.name=isModel?'01 REPLACE THIS · 替换角色素材':item.name;inner.label=isModel?9:8;inner.comment='Replace or add your image / alpha video here. The parent layer preserves layout and animation.';inner.property('ADBE Transform Group').property('ADBE Scale').setValue([scale,scale]);inner.property('ADBE Transform Group').property('ADBE Position').setValue([box.width/2,box.height/2]);var l=main.layers.add(box);l.name=isModel?'03 MODEL · '+item.name+' · ABOVE FX':item.name;transform(l,item);motion(l,item);if(isModel){showModels.push(l);l.label=9;l.comment='SHOWCASE character stays ABOVE the shared post-processing. Double-click to replace the role material. Opening character / creator materials live in their INTRO compositions below FX.';}return l}
    var informationStartCount=main.numLayers;
    for(var i=0;i<d.layers.length;i++)if(d.layers[i].kind==='image')picture(d.layers[i]);
    for(var i=0;i<d.layers.length;i++){
      var item=d.layers[i];if(item.kind==='image')continue;
      if(item.kind==='text'){motion(text(main,item),item);continue}
      if(item.kind==='plate'){var plate=shapeLayer(main,item.name),contents=plate.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group').property('ADBE Vectors Group'),points=[];for(var j=0;j<item.points.length;j++)points.push([item.points[j][0]-item.w/2,item.points[j][1]-item.h/2]);addPath(contents,polygon(points));fill(contents,item.color,colorExpression(item.color));transform(plate,item);motion(plate,item);continue}
      if(item.kind==='badge'){
        if(item.style==='filled'&&item.color[3]>.01){var surface=rect(main,item.name+' · surface',item.x,item.y,item.w,item.h,item.color,item.radius,ctl+'.effect("Badge Surface")(1)');var fills=surface.property('ADBE Root Vectors Group').property(1).property('ADBE Vectors Group');fills.property(fills.numProperties).property('ADBE Vector Fill Opacity').expression=ctl+'.effect("Badge Opacity")(1)';motion(surface,item)}
        if(item.style==='outline'){var line=rect(main,item.name+' · outline',item.x,item.y,item.w,item.h,[0,0,0,0],item.radius),co=line.property('ADBE Root Vectors Group').property(1).property('ADBE Vectors Group'),st=co.addProperty('ADBE Vector Graphic - Stroke');st.property('ADBE Vector Stroke Color').setValue(item.ink.slice(0,3));st.property('ADBE Vector Stroke Width').setValue(Math.max(u,d.width/1920));motion(line,item)}
        if(item.icon)picture({kind:'image',name:item.name+' · icon',asset:item.icon.asset,x:item.icon.x,y:item.icon.y,w:item.icon.w,h:item.icon.h,opacity:item.opacity,entry:4});
        var label=text(main,{text:item.text,name:item.name+' · label',x:item.x,y:item.y+item.h*.19,w:item.w*.88,fontSize:Math.max(10*u,item.w*.18),weight:700,color:item.ink,badgeInk:true});motion(label,item);
        if(item.sub){var sub=text(main,{text:item.sub,name:item.name+' · compatibility',x:item.x,y:item.y+item.h*.36,w:item.w*.88,fontSize:Math.max(7*u,item.w*.095),weight:600,color:item.ink,badgeInk:true});motion(sub,item)}
      }
    }
    for(var ii=1;ii<=main.numLayers-informationStartCount;ii++){var candidate=main.layer(ii),isRole=false;for(var mm=0;mm<showModels.length;mm++)if(showModels[mm].index===candidate.index)isRole=true;if(!isRole)informationLayers.push(candidate);}
    // Every MAIN contains an obvious replaceable showcase slot, including a
    // packaging-only export with no model image supplied in the browser.
    if(!showModels.length){var slot=comp('REPLACE · SHOWCASE CHARACTER · 放角色视频',d.width,d.height);slot.parentFolder=mediaFolder;replacementGuide(slot,'SHOWCASE CHARACTER\n将角色透明视频或图片放在此合成');var placeholder=main.layers.add(slot);placeholder.name='03 MODEL · 展示角色 · ABOVE FX';placeholder.label=9;placeholder.comment='Empty replacement composition. Content here renders ABOVE FX, below persistent borders. Opening footage belongs inside INTRO CHARACTER / CREATOR.';motion(placeholder,{kind:'image',name:'角色主图',modelRole:'show',entry:0});showModels.push(placeholder);}
    // Two standalone poster shots. Every image, type line and overlay remains
    // editable, and timing uses the main controller rather than trimmed layers.
    if(storyEnabled){
      function storyClock(prefix){return 'var st=Math.max(0,'+ctl+'.effect("'+prefix+' Shot Start")(1)),sd=Math.max(thisComp.frameDuration,'+ctl+'.effect("'+prefix+' Shot Duration")(1));var local=Math.max(0,time-st),q=Math.max(0,Math.min(1,local/sd));';}
      function storyLayerMotion(layer,item,prefix){
        var tr=layer.property('ADBE Transform Group'),code=storyClock(prefix),entry='var en=Math.max(0,Math.min(1,local/Math.min(.22,sd*.18)));en=en*en*(3-2*en);';
        tr.property('ADBE Opacity').expression=code+entry+(item.opacity===undefined?100:item.opacity*100)+'*en';
        if(item.kind!=='image')tr.property('ADBE Position').expression=code+entry+'value+[0,'+8*u+'*(1-en)]';
      }
      function storyPicture(c,item,prefix){
        var src=footage(item.asset),box=comp('REPLACE · '+item.name+' · replace image',Math.max(4,item.w),Math.max(4,item.h)),inner=box.layers.add(src),fit=(item.fit==='cover'?Math.max:Math.min)(box.width/src.width,box.height/src.height),pos=item.objectPosition||[.5,.5];box.parentFolder=mediaFolder;inner.name='01 REPLACE THIS · 开场素材';inner.label=9;
        inner.property('ADBE Transform Group').property('ADBE Scale').setValue([fit*100,fit*100]);inner.property('ADBE Transform Group').property('ADBE Position').setValue([box.width*pos[0]+src.width*fit*(.5-pos[0]),box.height*pos[1]+src.height*fit*(.5-pos[1])]);
        var l=c.layers.add(box);l.name='01 REPLACE · '+item.name+' · BELOW FX';l.label=9;l.comment='Opening material is processed together with all subtitles by the independent FX layers in MAIN.';transform(l,item);storyLayerMotion(l,item,prefix);return l;
      }
      function storyOverlay(c,shot,prefix){
        if(shot.effect==='none')return;
        var amount='Math.max(0,Math.min(100,'+ctl+'.effect("'+prefix+' Effect Strength")(1)))/100',clock=storyClock(prefix)+'var a=local*Math.max(0,'+ctl+'.effect("'+prefix+' Effect Speed")(1));';
        if(shot.effect==='crt'){
          var scan=shapeLayer(c,'STORY CRT · editable scanlines'),gc=scan.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group').property('ADBE Vectors Group');
          for(var row=0;row<72;row++){var yy=(row+.5)*d.height/72;addPath(gc,polygon([[0,yy],[d.width,yy]]));}
          var st=gc.addProperty('ADBE Vector Graphic - Stroke');st.property('ADBE Vector Stroke Color').setValue(d.ink.slice(0,3));st.property('ADBE Vector Stroke Width').setValue(Math.max(u,d.height/900));scan.transform.opacity.expression=clock+'(10+4*Math.sin(a*8))*'+amount;
          var beam=rect(c,'STORY CRT · travelling signal',d.width*.5,d.height*.5,d.width,d.height*.015,d.ink,0,ctl+'.effect("Ink")(1)');beam.transform.position.expression=clock+'['+d.width+'*.5,'+d.height+'*(.5+.54*Math.sin(a*.85))]';beam.transform.opacity.expression='12*'+amount;
        }else if(shot.effect==='holo'){
          for(var band=0;band<2;band++){
            var glow=rect(c,'STORY HOLO · light band '+(band+1),d.width*(.22+band*.54),d.height*.5,d.width*(band?.075:.15),d.height*1.5,band?d.ink:d.accent,0,ctl+'.effect("'+(band?'Ink':'Accent')+'")(1)');glow.transform.rotation.setValue(-23);glow.transform.position.expression=clock+'['+d.width+'*(.5+.70*Math.sin(a*.6+'+band*2.1+')),'+d.height+'*.5]';glow.transform.opacity.expression=(band?5:10)+'*'+amount;
          }
        }else{
          // Polarised colour film is approximated by very light native bands.
          for(var band=0;band<3;band++){
            var stripe=rect(c,'STORY POLAR · translucent film '+(band+1),d.width*(.12+band*.42),d.height*.5,d.width*(band===1?.25:.105),d.height*1.8,band===1?d.ink:d.accent,0,ctl+'.effect("'+(band===1?'Ink':'Accent')+'")(1)');stripe.transform.rotation.expression=clock+'-28+7*Math.sin(a*.4+'+band+')';stripe.transform.position.expression=clock+'['+d.width+'*('+( .12+band*.42)+'+.12*Math.sin(a*.55+'+band+')),'+d.height+'*.5]';stripe.transform.opacity.expression=(band===1?4:8)+'*'+amount;
          }
        }
      }
      for(var ss=0;ss<storyShots.length;ss++){
        var shot=storyShots[ss],prefix=storyPrefix(shot.role),label=shot.role==='character'?'CHARACTER':'CREATOR',sc=comp((shot.role==='character'?'07':'08')+' INTRO '+label+' · editable poster',d.width,d.height);sc.parentFolder=editFolder;
        var hasStoryPicture=false;for(var si=0;si<shot.layers.length;si++)if(shot.layers[si].kind==='image'){storyPicture(sc,shot.layers[si],prefix);hasStoryPicture=true;}
        if(!hasStoryPicture){var sourceSlot=comp('REPLACE · INTRO '+label+' · 放开场素材',d.width,d.height);sourceSlot.parentFolder=mediaFolder;replacementGuide(sourceSlot,'INTRO '+label+'\n将开场素材放在此合成，字幕与角色一起受 FX 影响');var sourceLayer=sc.layers.add(sourceSlot);sourceLayer.name='01 REPLACE · 开场素材 · BELOW FX';sourceLayer.label=9;}
        if(!d.post)storyOverlay(sc,shot,prefix);
        for(var si=0;si<shot.layers.length;si++){
          var item=shot.layers[si];if(item.kind==='text'){var subtitle=text(sc,item);subtitle.name='02 TYPE · '+item.name;subtitle.label=8;storyLayerMotion(subtitle,item,prefix);}
          else if(item.kind==='plate'){var plate=shapeLayer(sc,item.name),gc=plate.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group').property('ADBE Vectors Group'),points=[];for(var pi=0;pi<item.points.length;pi++)points.push([item.points[pi][0]-item.w/2,item.points[pi][1]-item.h/2]);addPath(gc,polygon(points));fill(gc,item.color,colorExpression(item.color));transform(plate,item);storyLayerMotion(plate,item,prefix);}
        }
        var sl=main.layers.add(sc);sl.name='06 INTRO · '+label+' · 开场镜头';sl.label=8;sl.comment='Independent poster shot. Edit '+prefix+' Shot Start / Duration in MAIN CONTROLS. Double-click for separately editable type and a green REPLACE material slot. Whole shot is BELOW global FX, so opening footage and subtitles are processed together.';
        var code=storyClock(prefix);sl.transform.opacity.expression=code+(ss===storyShots.length-1?transitionCode+'time<st?0:100*(1-p)':'time>=st&&time<st+sd?100:0');
        main.markerProperty.setValueAtTime(Math.min(main.duration-main.frameDuration,shot.start),new MarkerValue('STORY · '+label));
      }
      if(d.story.flash&&storyShots.length){
        var flash=rect(main,'STORY · optional cut flash',d.width/2,d.height/2,d.width,d.height,[1,1,1,1],0),pulse=transitionCode+'var pulse=Math.max(0,1-Math.abs(time-ts)/.07);';
        if(storyShots.length>1)pulse+='var cut='+ctl+'.effect("'+storyPrefix(storyShots[1].role)+' Shot Start")(1);pulse=Math.max(pulse,Math.max(0,1-Math.abs(time-cut)/.07));';flash.transform.opacity.expression=pulse+'pulse*18';
      }
    }
    var borderLayers=[],borderAppearance=d.borderAppearance||{style:'solid',background:[.035,.043,.063,1],text:[.96,.94,.88,1],accent:d.accent,opacity:1,lineWidth:2*u};
    colorControl('Border Background',borderAppearance.background);colorControl('Border Ink',borderAppearance.text);colorControl('Border Accent',borderAppearance.accent);slider('Border Background Opacity',borderAppearance.opacity*100);
    if(d.frame!=='none')for(var k=0;k<2;k++){
      var vertical=d.frame==='vertical',lane=vertical?d.height:d.width,th=d.frameThickness,key=k?'bottom':'top',side=vertical?(k?'RIGHT':'LEFT'):(k?'BOTTOM':'TOP'),edge=comp('04 BORDER '+side+' · editable text',lane,th);edge.parentFolder=fxFolder;
      // Native backgrounds stay directly editable in MAIN. Only scrolling text
      // is precomposed, so it clips to its own strip and can be edited separately.
      var bx=vertical?(k?d.width-th/2:th/2):d.width/2,by=vertical?d.height/2:(k?d.height-th/2:th/2);
      var surface=rect(main,'BORDER '+side+' · background',bx,by,vertical?th:d.width,vertical?d.height:th,borderAppearance.background,0,ctl+'.effect("Border Background")(1)');surface.transform.opacity.expression=ctl+'.effect("Border Background Opacity")(1)';surface.label=5;surface.comment='Independent editable shape. Visible throughout intro, showcase and ending.';borderLayers.push(surface);
      if(borderAppearance.style!=='solid'){
        var outline=shapeLayer(main,'BORDER '+side+' · '+borderAppearance.style),ow=vertical?th:d.width,oh=vertical?d.height:th,lw=borderAppearance.lineWidth;
        for(var lineIndex=0;lineIndex<(borderAppearance.style==='double'?2:1);lineIndex++){
          var inset=lw*(.5+lineIndex*2),content=outline.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group').property('ADBE Vectors Group'),box=content.addProperty('ADBE Vector Shape - Rect');box.property('ADBE Vector Rect Size').setValue([Math.max(1,ow-inset*2),Math.max(1,oh-inset*2)]);
          var stroke=content.addProperty('ADBE Vector Graphic - Stroke');stroke.property('ADBE Vector Stroke Color').setValue(borderAppearance.accent.slice(0,3));stroke.property('ADBE Vector Stroke Color').expression=ctl+'.effect("Border Accent")(1)';stroke.property('ADBE Vector Stroke Width').setValue(lw);
        }
        transform(outline,{x:bx,y:by});outline.label=5;borderLayers.push(outline);
      }
      var item={text:d.borderText[key],name:'Border copy · EDIT THIS',fontSize:Math.min(24*u,Math.max(16*u,d.width*.012)),weight:700,color:borderAppearance.text,x:lane/2,y:th/2},copy=text(edge,item),rr=copy.sourceRectAtTime(0,false),cycle=Math.max(lane,rr.width+100*u),setting=d.edges[key],rate=(setting.direction==='negative'?-1:setting.direction==='positive'?1:0)/setting.duration*d.speed;
      copy.property('ADBE Text Properties').property('ADBE Text Document').expression='text.sourceText.style.setFillColor('+ctl+'.effect("Border Ink")(1))';
      for(var n=0;n<(rate?3:1);n++){var l=n===0?copy:copy.duplicate();if(n){l.name='Repeating copy '+n;l.property('ADBE Text Properties').property('ADBE Text Document').expression='thisComp.layer("Border copy · EDIT THIS").text.sourceText'}if(rate)l.property('ADBE Transform Group').property('ADBE Position').expression='['+(n-1)*cycle+'+'+cycle+'/2+((time*'+rate+'%1+1)%1)*'+cycle+','+th+'/2]'}
      copy.label=5;copy.moveToBeginning();
      var el=main.layers.add(edge);el.name='BORDER '+side+' · text';el.label=5;el.comment='Double-click and edit Border copy · EDIT THIS. Repeating copies follow automatically.';transform(el,{x:bx,y:by,rotation:vertical?(k?90:-90):0});borderLayers.push(el);
    }
    if(d.ending.duration>0){
      var ending=comp('06 ENDING · brand animation',d.width,d.height),endingLayer=main.layers.add(ending);ending.parentFolder=editFolder;endingLayer.name='06 ENDING · 片尾品牌';endingLayer.label=8;
      function endingMotion(l,delay,length,scale){var t=l.property('ADBE Transform Group'),offset=Math.min(.22,delay/.8),code=endingTimeCode+'var q=Math.max(0,Math.min(1,(time-es-ed*'+offset+')/Math.max(thisComp.frameDuration,ed*(1-'+offset+'))));q=q*q*(3-2*q);';t.property('ADBE Opacity').expression=code+'100*q';if(scale){t.property('ADBE Position').expression=code+'value+[0,'+12*u+'*(1-q)]';t.property('ADBE Scale').expression=code+'value*(.975+.025*q)'}return code}
      if(d.ending.style!=='quiet'){
        var ring=shapeLayer(ending,'Brand echo · editable ellipse'),vg=ring.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group').property('ADBE Vectors Group'),oval=vg.addProperty('ADBE Vector Shape - Ellipse');oval.property('ADBE Vector Ellipse Size').setValue([d.width*(d.ending.style==='orbit'?.82:.66),d.width*(d.ending.style==='orbit'?.82/1.6:.66/1.75)]);var line=vg.addProperty('ADBE Vector Graphic - Stroke');line.property('ADBE Vector Stroke Color').setValue(d.accent.slice(0,3));line.property('ADBE Vector Stroke Color').expression=ctl+'.effect("Accent")(1)';line.property('ADBE Vector Stroke Width').setValue(d.ending.style==='orbit'?d.width*.002:u);transform(ring,{x:d.width*.5,y:d.height*.49,rotation:-24});var code=endingMotion(ring,.08,Math.min(1.1/d.speed,d.ending.duration*.4),false);ring.property('ADBE Transform Group').property('ADBE Opacity').expression=code+(d.ending.style==='orbit'?65:16)+'*q';ring.property('ADBE Transform Group').property('ADBE Rotate Z').expression='-24+(time*'+d.speed+'+'+d.offset+')*3';
        var stroke=rect(ending,'Signature stroke',d.width*.5,d.height*.59,d.width*.137,d.width*.0032,d.accent,0,ctl+'.effect("Accent")(1)');var sc=endingMotion(stroke,.08,Math.min(1.1/d.speed,d.ending.duration*.4),false);stroke.property('ADBE Transform Group').property('ADBE Scale').expression=sc+'[100*q,100]';
        var spark=rect(ending,'Brand accent',d.width*.835,d.height*.26,d.width*.01,d.width*.01,d.accent,0,ctl+'.effect("Accent")(1)');var sp=endingMotion(spark,.08,Math.min(1.1/d.speed,d.ending.duration*.4),false);spark.property('ADBE Transform Group').property('ADBE Rotate Z').expression=sp+'45+90*q';spark.property('ADBE Transform Group').property('ADBE Scale').expression=sp+'[100*q,100*q]';
      }
      var brand;
      if(d.ending.logoAsset){var src=footage(d.ending.logoAsset);brand=ending.layers.add(src);brand.name='Brand logo · replace footage';var fit=Math.min(d.width*.38/src.width,d.height*.24/src.height)*100;brand.property('ADBE Transform Group').property('ADBE Scale').setValue([fit,fit]);transform(brand,{x:d.width/2,y:d.height/2});}
      else{brand=text(ending,{text:d.ending.brand,name:'Brand wordmark · editable',fontFamily:'Manrope',fontSize:d.width*(d.width<d.height?.09:.058),weight:700,color:d.ending.colorMode==='custom'?d.ending.color:d.ink,x:d.width/2,y:d.height/2,w:d.ending.word.w||d.width*.6});if(d.ending.colorMode==='custom')brand.property('ADBE Text Properties').property('ADBE Text Document').expression='text.sourceText.style.setFillColor('+ctl+'.effect("Ending Brand Color")(1))';}
      endingMotion(brand,.12,Math.min(1/d.speed,d.ending.duration*.35),true);
      // Deterministic CRT collapse: raster flicker, vertical squeeze, horizontal
      // electron beam, central phosphor dot, then a short fading afterglow.
      // The exact same trusted envelope is used by the browser renderer.
      var shutdownCode='var dur=Math.max('+(.3/d.speed)+',Math.min('+ctl+'.effect("Shutdown Duration")(1),'+d.ending.duration+'*.45));var end=comp('+quote(main.name)+').duration;var q='+ctl+'.effect("Cyber Shutdown")(1)>0?Math.max(0,Math.min(1,(time-(end-dur))/dur)):0;var crt=('+studioCRTPose.toString()+')(q);';
      endingLayer.property('ADBE Transform Group').property('ADBE Scale').expression=shutdownCode+'[100,100*(1-crt.shutter)]';
      endingLayer.property('ADBE Transform Group').property('ADBE Position').expression=shutdownCode+'value+[crt.jitter*'+d.width+',0]';
      endingLayer.property('ADBE Transform Group').property('ADBE Opacity').expression=shutdownCode+'100*crt.flicker';
      var safeX=0,safeY=0,stageW=d.width,stageH=d.height;
      for(var j=0;j<2;j++){
        var shutter=rect(main,j?'SHUTDOWN · bottom shutter':'SHUTDOWN · top shutter',d.width/2,j?d.height-safeY:safeY,stageW,stageH*.501,[0,0,0,1],0),tr=shutter.property('ADBE Transform Group');
        tr.property('ADBE Anchor Point').setValue([0,(j?1:-1)*stageH*.2505]);tr.property('ADBE Scale').expression=shutdownCode+'[100,100*crt.shutter]';shutter.label=13;shutter.comment='Native CRT black shutter. Edit fill/path; toggle and timing in CONTROLS. Full-frame shutdown covers the independent editable border layers.';
      }
      function crtGlow(l,color,softness){var glow=l.property('ADBE Effect Parade').addProperty('ADBE Drop Shadow');glow.property(1).setValue(color);glow.property(2).setValue(100);glow.property(4).setValue(0);glow.property(5).setValue(softness);l.label=13;l.comment='Editable native CRT element. Cyber Shutdown and Shutdown Duration in CONTROLS drive the shared seekable envelope.';}
      var flash=rect(main,'SHUTDOWN · raster flash',d.width/2,d.height/2,stageW,stageH,[1,.985,.94,1],0);flash.property('ADBE Transform Group').property('ADBE Opacity').expression=shutdownCode+'100*crt.flash';flash.label=13;
      var raster=shapeLayer(main,'SHUTDOWN · scanlines'),rasterContents=raster.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group').property('ADBE Vectors Group');
      for(var sy=safeY+4*u;sy<d.height-safeY;sy+=8*u){var scan=rasterContents.addProperty('ADBE Vector Shape - Rect');scan.property('ADBE Vector Rect Size').setValue([stageW,.8*u]);scan.property('ADBE Vector Rect Position').setValue([d.width/2,sy]);}
      fill(rasterContents,[1,.99,.95,1]);raster.property('ADBE Transform Group').property('ADBE Opacity').expression=shutdownCode+'100*crt.scan';raster.label=13;
      var halo=rect(main,'SHUTDOWN · beam halo',d.width/2,d.height/2,stageW*.88,9*u,[.62,.81,1,1],4.5*u),ht=halo.property('ADBE Transform Group');
      ht.property('ADBE Scale').expression=shutdownCode+'[100*crt.signalWidth,100]';ht.property('ADBE Opacity').expression=shutdownCode+'42*crt.signal';crtGlow(halo,[.56,.75,1],20*u);
      var signal=rect(main,'SHUTDOWN · signal line',d.width/2,d.height/2,stageW*.88,Math.max(1.3*u,stageW*.0012),[1,.995,.94,1],2*u),st=signal.property('ADBE Transform Group');
      st.property('ADBE Scale').expression=shutdownCode+'[100*crt.signalWidth,100]';st.property('ADBE Opacity').expression=shutdownCode+'100*crt.signal';crtGlow(signal,[.84,.92,1],7*u);
      var dotHalo=rect(main,'SHUTDOWN · phosphor afterglow',d.width/2,d.height/2,18*u,13*u,[.67,.84,1,1],9*u),dt=dotHalo.property('ADBE Transform Group');dt.property('ADBE Scale').expression=shutdownCode+'[100*crt.dotScale,100*crt.dotScale]';dt.property('ADBE Opacity').expression=shutdownCode+'42*crt.dot';crtGlow(dotHalo,[.60,.78,1],18*u);
      var phosphor=rect(main,'SHUTDOWN · phosphor dot',d.width/2,d.height/2,8*u,6*u,[1,.99,.91,1],4*u),pt=phosphor.property('ADBE Transform Group');pt.property('ADBE Scale').expression=shutdownCode+'[100*crt.dotScale,100*crt.dotScale]';pt.property('ADBE Opacity').expression=shutdownCode+'100*crt.dot';crtGlow(phosphor,[1,.98,.90],4*u);
      main.markerProperty.setValueAtTime(endingStart,new MarkerValue('ENDING · BRAND'));
      if(d.ending.shutdownEnabled)main.markerProperty.setValueAtTime(d.duration-d.ending.shutdownDuration,new MarkerValue('CYBER SHUTDOWN'));
    }
    // Consolidate showcase copy without baking any text or paths. All sources
    // keep the MAIN timeline, so editing transition controls still works inside.
    if(informationLayers.length){var copyIndices=[];for(var ci=0;ci<informationLayers.length;ci++)copyIndices.push(informationLayers[ci].index);copyIndices.sort(function(a,b){return a-b});var copyComp=main.layers.precompose(copyIndices,'04 SHOWCASE TYPE · 文字 / 标识 / 交付信息',true);copyComp.parentFolder=editFolder;for(var ci=1;ci<=main.numLayers;ci++)if(main.layer(ci).source===copyComp){main.layer(ci).name='06 TYPE · 展示页文字与标识';main.layer(ci).label=8;main.layer(ci).comment='Editable text, title plates, badges and format copy. Double-click to edit. All typography is BELOW FX; the showcase character is ABOVE FX.';break}}
    // Native editable post-processing, deliberately separate from role footage.
    // Every expression runs on absolute comp time: crossing a shot boundary
    // changes only its envelope and never restarts a beam / grain / ring clock.
    if(d.post){
      var post=d.post,postActive=post.effect!=='none',optics=comp('05 POST OPTICS · '+post.effect+' · 原生光效',d.width,d.height);optics.parentFolder=fxFolder;
      slider('Post FX Strength',post.strength*100);slider('Post FX Glow',post.glow*100);slider('Post FX Speed',post.speed);slider('Post FX Fade',post.fade);
      effect(controls,'ADBE Checkbox Control','Post FX Character',post.scenes.character?1:0);effect(controls,'ADBE Checkbox Control','Post FX Author',post.scenes.author?1:0);effect(controls,'ADBE Checkbox Control','Post FX Showcase',post.scenes.show?1:0);effect(controls,'ADBE Checkbox Control','Post FX Ending',post.scenes.outro?1:0);
      var postEnvelope='var C='+ctl+';function on(k){return C.effect("Post FX "+k)(1)>0?1:0}function sm(x){x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)}var fd=Math.max(thisComp.frameDuration,C.effect("Post FX Fade")(1));var ev=[];';
      if(storyEnabled){for(var ss=0;ss<storyShots.length;ss++){var pp=storyPrefix(storyShots[ss].role);postEnvelope+='ev.push([Math.max(0,C.effect("'+pp+' Shot Start")(1)),on("'+pp+'")]);'}postEnvelope+='ev.push([Math.max(0,C.effect("Show Transition Start")(1)),on("Showcase")]);';}
      else{postEnvelope+='ev.push([0,on("'+(d.intro>0?'Character':'Showcase')+'")]);';if(d.intro>0)postEnvelope+='ev.push(['+d.intro+',on("Showcase")]);';}
      if(d.ending.duration>0)postEnvelope+='ev.push([Math.max(0,C.effect("Ending Start")(1)),on("Ending")]);';
      postEnvelope+='ev.sort(function(a,b){return a[0]-b[0]});var w=0,last=0;for(var i=0;i<ev.length;i++){w+=(ev[i][1]-last)*sm((time-ev[i][0])/fd);last=ev[i][1]}w=Math.max(0,Math.min(1,w));';
      if(d.ending.duration>0)postEnvelope+='var shut=C.effect("Cyber Shutdown")(1)>0?sm((time-('+d.duration+'-Math.max(thisComp.frameDuration,C.effect("Shutdown Duration")(1))))/Math.max(thisComp.frameDuration,C.effect("Shutdown Duration")(1))):0;w*=1-Math.min(1,shut*2);';
      var postOpacity=postEnvelope+'100*w*Math.max(0,Math.min(1,C.effect("Post FX Strength")(1)/100))*'+(postActive?1:0)+';',postClock='var t=time*Math.max(.01,'+ctl+'.effect("Post FX Speed")(1));';
      var fxSafeX=d.frame==='vertical'?d.frameThickness:0,fxSafeY=d.frame==='horizontal'?d.frameThickness:0;
      function postStageMask(layer){if(!fxSafeX&&!fxSafeY)return;var mask=layer.property('ADBE Mask Parade').addProperty('ADBE Mask Atom');mask.name='Picture area only · excludes persistent borders';mask.property('ADBE Mask Shape').setValue(pathValue(polygon([[fxSafeX,fxSafeY],[d.width-fxSafeX,fxSafeY],[d.width-fxSafeX,d.height-fxSafeY],[fxSafeX,d.height-fxSafeY]])));}
      function postBlur(layer,amount){var fx=layer.property('ADBE Effect Parade').addProperty('ADBE Gaussian Blur 2');fx.name='EDIT · soft light';fx.property('ADBE Gaussian Blur 2-0001').setValue(amount);fx.property('ADBE Gaussian Blur 2-0003').setValue(1);return fx}
      function light(name,x,y,w,h,color,opacity,blur){var l=rect(optics,name,x,y,w,h,color,Math.min(w,h)/2);l.transform.opacity.setValue(opacity);l.label=10;if(blur)postBlur(l,blur);return l}
      function opticalRing(name,x,y,w,h,color,width,opacity){var l=shapeLayer(optics,name),co=l.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group').property('ADBE Vectors Group'),oval=co.addProperty('ADBE Vector Shape - Ellipse');oval.property('ADBE Vector Ellipse Size').setValue([w,h]);var stroke=co.addProperty('ADBE Vector Graphic - Stroke');stroke.property('ADBE Vector Stroke Color').setValue(color.slice(0,3));stroke.property('ADBE Vector Stroke Width').setValue(width);transform(l,{x:x,y:y});l.transform.opacity.setValue(opacity);l.label=10;return l}
      var cool=[.50,.86,1,1],warm=[1,.75,.53,1];
      if(post.effect==='crt'){
        var scans=shapeLayer(optics,'01 CRT · editable scanlines'),co=scans.property('ADBE Root Vectors Group').addProperty('ADBE Vector Group').property('ADBE Vectors Group');
        for(var sy=0;sy<d.height;sy+=5*u)addPath(co,{v:[[0,sy],[d.width,sy]],i:[[0,0],[0,0]],o:[[0,0],[0,0]],closed:false});
        var stroke=co.addProperty('ADBE Vector Graphic - Stroke');stroke.property('ADBE Vector Stroke Width').setValue(.9*u);stroke.property('ADBE Vector Stroke Color').setValue([0,0,0]);scans.transform.opacity.expression=postClock+'13+2*Math.sin(t*8)';
        var signal=light('02 CRT · continuous phosphor beam',d.width/2,0,d.width,d.height*.085,cool,9,25*u);signal.transform.position.expression=postClock+'['+d.width+'/2,((t*.14)%1.3-.15)*'+d.height+']';
      }else if(post.effect==='holo'){
        for(var r=0;r<3;r++){var holo=opticalRing('0'+(r+1)+' HOLO · continuous ripple',d.width*.63,d.height*.53,d.width*(.38+r*.3),d.height*(.20+r*.14),r===1?d.accent:cool,(r===1?2:1)*u,12-r*2);holo.transform.rotation.expression=postClock+'-20+8*Math.sin(t*.33+'+r+')';holo.transform.position.expression=postClock+'value+['+12*u+'*Math.sin(t*.5+'+r+'),'+8*u+'*Math.cos(t*.4+'+r+')]';}
        var band=light('04 HOLO · broad diffuse light',d.width*.5,d.height*.5,d.width*.16,d.height*1.8,d.accent,8,38*u);band.transform.rotation.setValue(-25);band.transform.position.expression=postClock+'['+d.width+'*(.5+.65*Math.sin(t*.42)),'+d.height+'*.5]';
      }else if(post.effect==='polar'){
        for(var n=0;n<3;n++){var film=light('0'+(n+1)+' POLAR · translucent light film',d.width*.5,d.height*.5,d.width*(n===1?.20:.10),d.height*1.8,n===1?cool:d.accent,n===1?8:11,38*u);film.transform.rotation.expression=postClock+'-25+8*Math.sin(t*.24+'+n+')';film.transform.position.expression=postClock+'['+d.width+'*(.5+.70*Math.sin(t*.36+'+n*1.7+')),'+d.height+'*.5]';}
      }else if(post.effect==='bloom'){
        for(var n=0;n<2;n++){var halo=light('0'+(n+1)+' BLOOM · diffuse light source',d.width*(n?.82:.20),d.height*(n?.78:.22),d.width*.23,d.width*.23,n?d.accent:warm,n?8:12,95*u);halo.transform.position.expression=postClock+'value+['+40*u+'*Math.sin(t*.31+'+n+'),'+25*u+'*Math.cos(t*.27+'+n+')]';}
      }else if(post.effect==='anamorphic'){
        var flare=light('01 LENS FLARE · horizontal light',d.width*.55,d.height*.42,d.width*.8,2*u,cool,65,2*u),aura=light('02 LENS FLARE · horizontal aura',d.width*.55,d.height*.42,d.width*.72,26*u,cool,15,24*u);
        var flareMove=postClock+'['+d.width+'*(.50+.28*Math.sin(t*.34)),'+d.height+'*(.43+.08*Math.sin(t*.23))]';flare.transform.position.expression=flareMove;aura.transform.position.expression=flareMove;
        for(var n=0;n<4;n++){var ghost=opticalRing('0'+(n+3)+' LENS FLARE · editable lens ghost',d.width*(.18+n*.19),d.height*(.70-n*.10),d.width*(.022+n*.012),d.width*(.022+n*.012),n%2?d.accent:cool,u,5+n);postBlur(ghost,3*u);ghost.transform.position.expression=postClock+'value+['+20*u+'*Math.sin(t*.34),'+10*u+'*Math.sin(t*.23)]';}
      }else if(post.effect==='prism'){
        var prismColors=[[1,.28,.4,1],[.4,1,.75,1],[.38,.55,1,1]];
        for(var n=0;n<3;n++){var prism=light('0'+(n+1)+' PRISM · native colour separation',d.width*(.2+n*.3),d.height*.5,d.width*.075,d.height*1.7,prismColors[n],7,22*u);prism.transform.rotation.setValue(-32);prism.transform.position.expression=postClock+'value+['+d.width*.07+'*Math.sin(t*.4+'+n*.5+'),0]';}
      }else if(post.effect==='film'){
        var leak=light('01 FILM · warm edge light leak',d.width*.04,d.height*.5,d.width*.12,d.height*1.7,[1,.42,.16,1],12,80*u);leak.transform.opacity.expression=postClock+'8+5*(.5+.5*Math.sin(t*.62))';var second=light('02 FILM · cool edge halation',d.width*.96,d.height*.5,d.width*.08,d.height*1.7,cool,7,60*u);second.transform.opacity.expression=postClock+'5+3*(.5+.5*Math.sin(t*.41+1.7))';
      }
      var adjustment=main.layers.addSolid([1,1,1],'05 FX ADJUSTMENT · 原生画面处理',d.width,d.height,1,d.duration);adjustment.adjustmentLayer=true;adjustment.label=10;postStageMask(adjustment);adjustment.transform.opacity.expression=postOpacity;
      // Match names and parameter IDs verified from installed AE 2026, not
      // display names, so this remains valid in Chinese / English AE versions.
      var glow=adjustment.property('ADBE Effect Parade').addProperty('ADBE Glo2');glow.name='EDIT · highlight bloom';glow.property('ADBE Glo2-0002').setValue(185);glow.property('ADBE Glo2-0003').setValue((post.effect==='bloom'?55:28)*u);glow.property('ADBE Glo2-0004').expression='Math.max(0,'+ctl+'.effect("Post FX Glow")(1))/100*'+(post.effect==='bloom'?1.6:.65)+';';
      if(post.effect==='film'){var grain=adjustment.property('ADBE Effect Parade').addProperty('ADBE Noise');grain.name='EDIT · native monochrome grain';grain.property('ADBE Noise-0001').setValue(3.2);grain.property('ADBE Noise-0002').setValue(0);}
      adjustment.comment='Independent native adjustment layer. Processes every layer BELOW it, including both INTRO images and subtitles. Showcase MODEL stays ABOVE. Opacity follows selected scenes with a smooth fade; CONTROLS → Post FX. Native approximations of browser optics; fully editable, not baked footage.';
      var opticsLayer=main.layers.add(optics);opticsLayer.name='04 FX OPTICS · 独立光效 · '+post.effect;opticsLayer.label=10;opticsLayer.blendingMode=post.effect==='crt'?BlendingMode.NORMAL:BlendingMode.SCREEN;opticsLayer.transform.opacity.expression=postOpacity;postStageMask(opticsLayer);opticsLayer.comment='Double-click to edit native light bands / rings / scanlines. Continuous clock is comp time × Post FX Speed. Place opening material BELOW both FX layers; showcase model ABOVE both. Borders stay ABOVE everything.';
      // The stack, top to bottom: MODEL → optical overlays → adjustment →
      // INTRO / ENDING / TYPE / GEOMETRY / PATTERN / BACKGROUND.
      opticsLayer.moveToBeginning();adjustment.moveAfter(opticsLayer);
      for(var mm=showModels.length-1;mm>=0;mm--)showModels[mm].moveBefore(opticsLayer);
      controls.comment+=' Post FX Strength / Glow / Speed / Fade and scene checkboxes control the independent native post-processing stack. Fade and Speed are already composition-time values. Place opening footage inside INTRO below FX; place showcase footage in MODEL above FX. Border layers are always outside the effect stack.';
    }else for(var mm=showModels.length-1;mm>=0;mm--)showModels[mm].moveToBeginning();
    // Keep persistent borders above all narrative layers, including the ending.
    for(var b=0;b<borderLayers.length;b++)borderLayers[b].moveToBeginning();
    // Global CRT shutters and phosphor sit above the independent border layers.
    var powerOffLayers=[];
    for(var si=1;si<=main.numLayers;si++)if(main.layer(si).name.indexOf('SHUTDOWN · ')===0)powerOffLayers.push(main.layer(si));
    for(var si=powerOffLayers.length-1;si>=0;si--)powerOffLayers[si].moveToBeginning();
    controls.moveToBeginning();controls.comment='START HERE · Timing / colors / motion / post-processing. '+controls.comment;main.time=Math.min(d.duration-.1,d.intro+.5);main.openInViewer();
    main.markerProperty.setValueAtTime(0,new MarkerValue(d.intro?'INTRO · editable':'SHOWCASE · editable'));
    if(d.intro)main.markerProperty.setValueAtTime(d.intro,new MarkerValue('SHOWCASE'));
    main.comment='START HERE. Top to bottom: CONTROLS → SHUTDOWN → BORDERS → MODEL (showcase, above FX) → FX OPTICS → FX ADJUSTMENT → INTRO / ENDING → SHOWCASE TYPE → GEOMETRY → PATTERN → BACKGROUND. Double-click numbered source compositions to edit. Green = replace footage; purple = FX; blue = text; violet = borders. Native editable text / paths / controls. '+warnings.join(' | ');
    $.global.STUDIO_AE_RESULT={main:main,geometry:geo,folder:folder,warnings:warnings};
    if(!$.global.STUDIO_AE_QA)alert('已创建可编辑合成：'+main.name+'\n文字、圆环路径、颜色控制与边框均可继续修改。\n请另存为 .aep。\n\n注意：复杂渐变与细毛质感为近似重建；缺少字体时请安装对应字体。');
  }
  try{build()}catch(err){failures.push(String(err)+' at line '+err.line);$.global.STUDIO_AE_ERROR=failures.join('\n');if(!$.global.STUDIO_AE_QA)alert('导入未完成：\n'+failures.join('\n'))}
  finally{app.endUndoGroup()}
})();
