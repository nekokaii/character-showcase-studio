const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.join(__dirname,'..'),scope={};vm.createContext(scope);
vm.runInContext(fs.readFileSync(path.join(root,'src/export-layout.js'),'utf8'),scope);
const plain=value=>JSON.parse(JSON.stringify(value));
for(const portrait of [false,true]){
  const reference=scope.studioReferenceSize(portrait);
  for(const scale of [.4,1,2]){
    const layout=scope.studioOutputLayout(reference.width*scale,reference.height*scale,portrait);
    assert.equal(layout.width,reference.width);assert.equal(layout.height,reference.height);assert.equal(layout.scale,scale);
  }
  const fit=scope.studioOutputLayout(1000,1000,portrait),cover=scope.studioOutputLayout(1000,1000,portrait,true);
  assert.ok(fit.width*fit.scale<=1000.000001&&fit.height*fit.scale<=1000.000001);
  assert.ok(cover.width*cover.scale>=999.999999&&cover.height*cover.scale>=999.999999);
  const shared={v:[[12,23],[50,60]],i:[[0,0],[-3,-4]],o:[[3,4],[0,0]],closed:false};
  const scene={...reference,frameThickness:66,layers:[{kind:'text',x:220,y:330,w:360,h:90,fontSize:84,tracking:20,rotation:-7,opacity:.8},{kind:'plate',x:30,y:40,w:80,h:20,points:[[0,0],[80,20]]},{kind:'badge',x:200,y:600,w:70,h:80,radius:12,icon:{asset:'mark.png',x:200,y:590,w:35,h:35}}],geometry:[{width:3,paths:[shared],samples:[{time:2,alpha:.6,width:4,paths:[shared]}]}],ending:{duration:3.5,word:{x:960,y:540,w:600,h:100}},motion:{speed:1,amount:.5}};
  const before=plain(scene),scaled=scope.scaleStudioAEScene(scene,reference.width*2,reference.height*2);
  assert.deepEqual(plain(scene),before,'scaling must not mutate shared capture paths');
  const restored=scope.scaleStudioAEScene(scaled,reference.width,reference.height);
  assert.deepEqual(plain(restored),before,'every spatial field scales exactly and all timings/styles remain unchanged');
  assert.equal(scaled.layers[0].fontSize,168);assert.equal(scaled.layers[2].icon.w,70);assert.equal(scaled.geometry[0].paths[0].v[0][0],24);assert.equal(scaled.geometry[0].samples[0].paths[0].v[0][0],24,'shared paths must not be scaled twice');
  assert.equal(scaled.geometry[0].samples[0].width,8,'animated stroke width scales with the canvas');
  scene.borderAppearance={style:'double',background:[.1,.2,.3,1],text:[1,1,1,1],accent:[1,0,0,1],opacity:.35,lineWidth:3.84};
  const borderScaled=scope.scaleStudioAEScene(scene,reference.width*2,reference.height*2);assert.equal(borderScaled.borderAppearance.lineWidth,7.68);assert.deepEqual(plain(scope.scaleStudioAEScene(borderScaled,reference.width,reference.height).borderAppearance),plain(scene.borderAppearance));
  scene.geometry[0].introTransform={from:[100,200],to:[300,400],scale:1.44,rotation:-6};scene.geometry[0].introOpacity=.24;
  const tagged=scope.scaleStudioAEScene(scene,reference.width*2,reference.height*2).geometry[0];
  assert.deepEqual(plain(tagged.introTransform),{from:[200,400],to:[600,800],scale:1.44,rotation:-6});assert.equal(tagged.introOpacity,.24);
  scene.story={enabled:true,transitionStart:4.5,transitionDuration:.6,packagingOnly:false,flash:false,shots:[{role:'character',start:0,duration:2.5,corner:'tl-br',effect:'polar',strength:.3,effectSpeed:.7,layers:[{kind:'text',x:150,y:200,w:600,h:120,fontSize:100,tracking:50,rotation:0},{kind:'image',asset:'assets/asset-001.png',x:900,y:550,w:2100,h:1200,fit:'contain',objectPosition:[.55,.5]}]}]};
  const storyBefore=plain(scene),storyScaled=scope.scaleStudioAEScene(scene,reference.width*2,reference.height*2);
  assert.equal(storyScaled.story.shots[0].layers[0].fontSize,200);assert.equal(storyScaled.story.shots[0].layers[1].w,4200);assert.deepEqual(plain(storyScaled.story.shots[0].layers[1].objectPosition),[.55,.5]);
  assert.equal(storyScaled.story.transitionStart,4.5);assert.equal(storyScaled.story.shots[0].duration,2.5);assert.deepEqual(plain(scope.scaleStudioAEScene(storyScaled,reference.width,reference.height)),storyBefore,'story poster copy and image bounds roundtrip; timings and fractional placement remain unchanged');
  assert.throws(()=>scope.scaleStudioAEScene(scene,100,100),/比例/);
}
// Exercise the real measurement function with transformed (4K) DOM bounds.
const logic=fs.readFileSync(path.join(root,'src/exploration-full-logic.js'),'utf8');
Object.assign(scope,{state:{frame:'horizontal'},devicePixelRatio:1,fitText:()=>{},measureEdgeTracks:()=>{}});
vm.runInContext(logic.slice(logic.indexOf('function measure(view)'),logic.indexOf('function sync()')),scope);
for(const scale of [1,2]){
  let transform;
  const properties={},view={outputScale:scale,section:{hidden:false},art:{offsetWidth:1920,offsetHeight:1080,style:{setProperty:(k,v)=>properties[k]=v},getBoundingClientRect:()=>({width:1920*scale,height:1080*scale})},composition:{clientWidth:1920,clientHeight:948,getBoundingClientRect:()=>({width:1920*scale,height:948*scale})},canvas:{},ctx:{setTransform:(...v)=>transform=v}};
  scope.measure(view);
  assert.equal(view.w,1920);assert.equal(view.h,948);assert.equal(properties['--frame-thickness'],'66px');
  assert.equal(view.canvas.width,1920*scale);assert.equal(view.canvas.height,948*scale);assert.deepEqual(transform,[scale,0,0,scale,0,0]);
}
console.log('PASS: landscape/portrait resolution invariance, fit/cover, full AE spatial roundtrip, shared-path integrity and real 4K canvas measurement.');
