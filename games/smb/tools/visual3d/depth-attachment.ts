import * as THREE from 'three';
/** Inspect the bound draw attachment, including a multisample renderbuffer rather than only its resolved texture. */
export function depthAttachment(renderer:THREE.WebGLRenderer,target:THREE.WebGLRenderTarget){
 const gl=renderer.getContext() as WebGL2RenderingContext,saved=renderer.getRenderTarget(),rb=gl.getParameter(gl.RENDERBUFFER_BINDING);
 try{renderer.setRenderTarget(target);const status=gl.checkFramebufferStatus(gl.FRAMEBUFFER),type=gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE),bits=gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.FRAMEBUFFER_ATTACHMENT_DEPTH_SIZE),component=gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE);let internalFormat:number|undefined;
  if(type===gl.RENDERBUFFER){gl.bindRenderbuffer(gl.RENDERBUFFER,gl.getFramebufferAttachmentParameter(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.FRAMEBUFFER_ATTACHMENT_OBJECT_NAME));internalFormat=gl.getRenderbufferParameter(gl.RENDERBUFFER,gl.RENDERBUFFER_INTERNAL_FORMAT);}
  const result={complete:status===gl.FRAMEBUFFER_COMPLETE,type:type===gl.TEXTURE?'texture':type===gl.RENDERBUFFER?'renderbuffer':String(type),bits,float:component===gl.FLOAT,internalFormat,samples:gl.getParameter(gl.SAMPLES)};
  if(!result.complete||bits!==32||!result.float||internalFormat!==undefined&&internalFormat!==gl.DEPTH_COMPONENT32F)throw Error('native actor depth requires actual DEPTH_COMPONENT32F: '+JSON.stringify(result));return result;
 }finally{gl.bindRenderbuffer(gl.RENDERBUFFER,rb);renderer.setRenderTarget(saved);}
}
