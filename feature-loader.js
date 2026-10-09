(function(root){
  'use strict';
  const source=typeof document==='undefined'?null:document.currentScript?.src;
  let ready=typeof root.BeanValueEngine?.systems==='function',pending=null;
  root.BeanValueEngine ||= {};
  function script(file){return new Promise((resolve,reject)=>{
    if(typeof document==='undefined'){reject(new Error('Account engine must be explicitly loaded in this runtime.'));return;}
    const url=new URL(file,source||document.baseURI);if(source)url.search=new URL(source).search;
    const element=document.createElement('script');element.src=url.href;element.async=false;
    element.onload=()=>resolve();element.onerror=()=>{element.remove();reject(new Error('Account tools could not load. Check your connection and import the save again.'));};document.head.appendChild(element);
  });}
  let toolsReady=!root.PlannerFeatureBundle,toolsPending=null,stylesReady=false;
  function styles(){if(stylesReady)return Promise.resolve();return new Promise((resolve,reject)=>{const url=new URL('planner.features.css',source||document.baseURI);if(source)url.search=new URL(source).search;const el=document.createElement('link');el.rel='stylesheet';el.href=url.href;el.onload=()=>{stylesReady=true;resolve();};el.onerror=()=>{el.remove();reject(new Error('Page styles could not load. Please retry.'));};document.head.appendChild(el);});}
  root.PlannerFeatures={toolsReady:()=>toolsReady,loadTools(){
    if(toolsReady)return Promise.resolve();
    if(!toolsPending)toolsPending=styles().then(()=>script('planner.features.js')).then(()=>{toolsReady=true;}).catch(error=>{toolsPending=null;throw error;});
    return toolsPending;
  },engineReady:()=>ready&&toolsReady,loadEngine(){
    if(ready)return root.PlannerFeatures.loadTools();
    if(!pending)pending=script('beanstalk-engine.js').then(()=>script('decoder-cache.js')).then(()=>{ready=true;return root.PlannerFeatures.loadTools();}).catch(error=>{pending=null;throw error;});
    return pending;
  }};
})(typeof window!=='undefined'?window:globalThis);
