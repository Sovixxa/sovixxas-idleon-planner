(function(root){
'use strict';
let linesVisible=true;
function attach(viewport,canvas,{width,height,onZoom=()=>{}}){
 let x=0,y=0,zoom=1,drag=null,suppress=false;
 const events=new AbortController(),signal=events.signal;
 viewport.classList.add('map-pan-viewport');canvas.classList.add('map-pan-canvas');
 const controls=document.createElement('div');controls.className='map-pan-controls';controls.innerHTML='<span title="Drag the map to move">✋ Drag to move</span><button type="button" data-pan-out aria-label="Zoom out">−</button><output aria-label="Zoom level"></output><button type="button" data-pan-in aria-label="Zoom in">+</button><button type="button" data-pan-fit>Fit map</button><button type="button" data-pan-lines aria-pressed="true">Show lines</button>';viewport.append(controls);
 function syncLines(){
  document.querySelectorAll('.map-pan-viewport').forEach(v=>{v.classList.toggle('map-lines-hidden',!linesVisible);v.querySelector('[data-pan-lines]')?.setAttribute('aria-pressed',String(linesVisible));});
 }
 controls.querySelector('[data-pan-lines]').onclick=()=>{linesVisible=!linesVisible;syncLines();};
 syncLines();
 function paint(){canvas.style.transform=`translate(${x}px,${y}px) scale(${zoom})`;controls.querySelector('output').textContent=Math.round(zoom*100)+'%';onZoom(zoom);}
 function zoomTo(next,px=viewport.clientWidth/2,py=viewport.clientHeight/2){next=Math.max(.005,Math.min(2.5,next));x=px-(px-x)*next/zoom;y=py-(py-y)*next/zoom;zoom=next;paint();}
 function fit(){const h=typeof height==='function'?height():height,w=typeof width==='function'?width():width,top=(viewport.querySelector('.map-pan-controls')?.offsetHeight||45)+25,available=Math.max(40,viewport.clientHeight-top-20);zoom=Math.max(.005,Math.min(1,(viewport.clientWidth-40)/w,available/h));x=(viewport.clientWidth-w*zoom)/2;y=top+(available-h*zoom)/2;paint();}
 controls.querySelector('[data-pan-out]').onclick=()=>zoomTo(zoom/1.2);controls.querySelector('[data-pan-in]').onclick=()=>zoomTo(zoom*1.2);controls.querySelector('[data-pan-fit]').onclick=fit;
 viewport.addEventListener('wheel',e=>{e.preventDefault();const r=viewport.getBoundingClientRect();zoomTo(zoom*Math.exp(-e.deltaY*.0015),e.clientX-r.left,e.clientY-r.top);},{passive:false,signal});
 viewport.addEventListener('pointerdown',e=>{if(e.button!==0||e.target.closest('.map-pan-controls'))return;suppress=false;drag={id:e.pointerId,startX:e.clientX,startY:e.clientY,x,y,moved:false};},{signal});
 viewport.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;if(!drag.moved&&Math.hypot(dx,dy)<5)return;if(!drag.moved){drag.moved=true;viewport.setPointerCapture(e.pointerId);viewport.classList.add('is-dragging');}x=drag.x+dx;y=drag.y+dy;paint();e.preventDefault();},{signal});
 const end=e=>{if(!drag||drag.id!==e.pointerId)return;suppress=drag.moved;drag=null;viewport.classList.remove('is-dragging');if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);};
 viewport.addEventListener('pointerup',end,{signal});viewport.addEventListener('pointercancel',end,{signal});
 viewport.addEventListener('click',e=>{if(suppress){suppress=false;e.preventDefault();e.stopImmediatePropagation();}},{capture:true,signal});
 viewport.addEventListener('keydown',e=>{if(e.target!==viewport)return;if(['+','=','-','0','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();if(e.key==='0')fit();else if(e.key==='+'||e.key==='=')zoomTo(zoom*1.2);else if(e.key==='-')zoomTo(zoom/1.2);else{x+=e.key==='ArrowLeft'?60:e.key==='ArrowRight'?-60:0;y+=e.key==='ArrowUp'?60:e.key==='ArrowDown'?-60:0;paint();}}},{signal});
 // Fit once on entry. Detail panels and expanded branches can resize the
 // viewport; those changes must not move the user's camera.
 fit();
 return {zoomTo,fit,refresh:paint,dispose(){events.abort();controls.remove();}};
}
root.MapViewport={attach};
})(window);
