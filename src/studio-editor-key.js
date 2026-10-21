// Keying uses the same shader in preview and full-size frame export.
function studioCreatePreviewKey(canvas){
 const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,preserveDrawingBuffer:true,antialias:false,depth:false,stencil:false});
 if(!gl)return null;
 const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
 const vs=compile(gl.VERTEX_SHADER,'attribute vec2 p; varying vec2 uv; void main(){uv=(p+1.0)*0.5;gl_Position=vec4(p,0.0,1.0);}');
 const fs=compile(gl.FRAGMENT_SHADER,`precision highp float;
 varying vec2 uv;uniform sampler2D image;uniform vec3 keyColor;uniform float tolerance;uniform float softness;uniform float spill;
 void main(){vec4 c=texture2D(image,uv);float a=clamp((distance(c.rgb,keyColor)/1.7320508-tolerance)/max(0.001,softness),0.0,1.0);
 if(keyColor.g>keyColor.r&&keyColor.g>keyColor.b)c.g-=max(0.0,c.g-max(c.r,c.b))*spill*(1.0-a);
 gl_FragColor=vec4(c.rgb,c.a*a);}`);
 const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('GPU 抠像初始化失败');
 gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
 const position=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
 const texture=gl.createTexture();gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);
 const uniforms=Object.fromEntries(['keyColor','tolerance','softness','spill'].map(k=>[k,gl.getUniformLocation(program,k)]));gl.uniform1i(gl.getUniformLocation(program,'image'),0);
 return {draw(media,key,w,h){if(gl.isContextLost())return false;if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}gl.viewport(0,0,w,h);gl.useProgram(program);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,media);gl.uniform3f(uniforms.keyColor,...[1,3,5].map(i=>parseInt(key.color.slice(i,i+2),16)/255));gl.uniform1f(uniforms.tolerance,key.tolerance);gl.uniform1f(uniforms.softness,key.softness);gl.uniform1f(uniforms.spill,key.spill);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);return true;},dispose(){gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);gl.getExtension('WEBGL_lose_context')?.loseContext();}};
}
