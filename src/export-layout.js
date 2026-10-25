// Resolution changes sampling density, never the design's logical layout.
function studioReferenceSize(portrait){return portrait?{width:1080,height:1920}:{width:1920,height:1080}}
function studioOutputLayout(width,height,portrait,cover=false){
  const reference=studioReferenceSize(portrait);
  return {...reference,scale:(cover?Math.max:Math.min)(width/reference.width,height/reference.height)};
}
function scaleStudioAEScene(scene,width,height){
  const scale=width/scene.width;
  if(Math.abs(height/scene.height-scale)>.00001)throw Error('输出尺寸必须与画幅比例一致');
  const box=value=>{const result={...value};for(const key of ['x','y','w','h','fontSize','radius'])if(typeof result[key]==='number')result[key]*=scale;return result};
  const points=value=>value.map(pair=>pair.map(n=>n*scale));
  const paths=value=>value.map(p=>({...p,v:points(p.v),i:points(p.i),o:points(p.o)}));
  const layer=value=>({...box(value),...(value.points?{points:points(value.points)}:{}),...(value.icon?{icon:box(value.icon)}:{})});
  return {...scene,width,height,frameThickness:scene.frameThickness*scale,
    ...(scene.borderAppearance?{borderAppearance:{...scene.borderAppearance,lineWidth:scene.borderAppearance.lineWidth*scale}}:{}),
    layers:scene.layers.map(layer),
    ...(scene.story?{story:{...scene.story,shots:scene.story.shots.map(shot=>({...shot,layers:shot.layers.map(layer)}))}}:{}),
    geometry:scene.geometry.map(op=>({...op,...(op.introTransform?{introTransform:{...op.introTransform,from:op.introTransform.from.map(n=>n*scale),to:op.introTransform.to.map(n=>n*scale)}}:{}),width:op.width*scale,paths:paths(op.paths),samples:op.samples.map(sample=>({...sample,...(typeof sample.width==='number'?{width:sample.width*scale}:{}),paths:paths(sample.paths)}))})),
    ending:{...scene.ending,word:box(scene.ending.word)}
  };
}
