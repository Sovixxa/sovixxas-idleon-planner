(function(root){
  'use strict';
  function start({badge,beforeReload}){
    const doc=root.document;
    let stream=null,loaded=doc.readyState==='complete',disposed=false;
    const local=['localhost','127.0.0.1','[::1]'].includes(root.location.hostname);
    function offline(){badge.textContent='STATIC MODE';badge.classList.add('offline');}
    function close(){if(stream){stream.close();stream=null;}}
    function sync(){
      if(disposed||!local||!loaded||doc.visibilityState!=='visible'){close();return;}
      if(stream)return;
      try{
        const current=new root.EventSource('/__events');stream=current;
        current.addEventListener('reload',()=>{if(stream!==current)return;beforeReload();close();root.location.reload();});
        current.addEventListener('open',()=>{if(stream!==current)return;badge.textContent='LOCAL LIVE';badge.classList.remove('offline');});
        current.onerror=()=>{if(stream===current)offline();};
      }catch(_){offline();}
    }
    function onLoad(){loaded=true;sync();}
    function onHide(){close();}
    function onShow(){loaded=doc.readyState==='complete';sync();}
    if(!local){offline();return()=>{};}
    root.addEventListener('load',onLoad,{once:true});
    root.addEventListener('pagehide',onHide);
    root.addEventListener('pageshow',onShow);
    doc.addEventListener('visibilitychange',sync);
    sync();
    return()=>{disposed=true;close();root.removeEventListener('load',onLoad);root.removeEventListener('pagehide',onHide);root.removeEventListener('pageshow',onShow);doc.removeEventListener('visibilitychange',sync);};
  }
  root.PlannerLiveReload={start};
})(typeof window!=='undefined'?window:globalThis);
