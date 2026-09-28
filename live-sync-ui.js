(function(){
  'use strict';
  const $=id=>document.getElementById(id),api=window.IdleonLive,bridge=window.PlannerLiveBridge;
  if(!api||!bridge)return;
  document.querySelector('.qol-meta')?.append($('liveConnection'));
  const SESSION='idleon-planner-cloud-session',dialog=$('cloudDialog');
  let paused=false,resume=false;
  try{resume=sessionStorage.getItem(SESSION)==='1';}catch{}
  function session(value){try{if(value)sessionStorage.setItem(SESSION,'1');else sessionStorage.removeItem(SESSION);}catch{}}
  function draw(status){
    $('cloudStatus').textContent=navigator.onLine===false&&status.connected?'Offline · showing the last loaded save':status.message;
    $('cloudLoginStatus').textContent=status.message;
    $('cloudTimes').textContent=[status.lastReceived?'Received '+new Date(status.lastReceived).toLocaleTimeString():'',status.lastApplied?'Applied '+new Date(status.lastApplied).toLocaleTimeString():''].filter(Boolean).join(' · ');
    $('cloudSummary').textContent=status.busy?'Connecting…':status.phase==='error'?'Sync error':status.connected?(navigator.onLine===false?'Offline':status.phase==='reconnecting'?'Reconnecting…':status.pending?'':'Synced'):'';
    $('liveConnection').title=[$('cloudStatus').textContent,$('cloudTimes').textContent].filter(Boolean).join(' · ');
    $('cloudConnect').hidden=status.connected||status.busy;
    $('cloudDisconnect').hidden=!status.connected&&!status.busy&&status.phase!=='error';
    $('cloudApply').hidden=!status.pending;$('cloudPending').hidden=!status.pending;
    $('cloudApply').disabled=!bridge.canApply();
    $('cloudRetry').hidden=!status.connected||!['error','reconnecting'].includes(status.phase);
    $('cloudRetry').disabled=status.busy;
    for(const node of dialog.querySelectorAll('button[type="submit"],input'))node.disabled=status.busy;
    if(status.connected){session(true);if(dialog.open)dialog.close();}
    if(status.phase==='disconnected')session(false);
  }
  const controller=api.createController({loadAdapter:api.createFirebaseAdapter,apply:bridge.apply,
    canApply:()=>!paused&&bridge.canAutoApply(),onStatus:draw});
  window.PlannerLiveConnection={disconnect:()=>{session(false);return controller.disconnect();}};
  $('cloudSteamLink').href=api.STEAM_LOGIN;
  $('cloudConnect').onclick=()=>dialog.showModal();
  $('cloudClose').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{$('cloudPassword').value='';$('cloudSteamUrl').value='';});
  $('cloudDisconnect').onclick=()=>window.PlannerLiveConnection.disconnect();
  $('cloudRetry').onclick=()=>controller.retry();
  $('cloudApply').onclick=()=>{if(bridge.canApply())controller.applyPending();};
  $('cloudSteamForm').onsubmit=event=>{
    event.preventDefault();let payload;const value=$('cloudSteamUrl').value;$('cloudSteamUrl').value='';
    try{payload=api.steamPayload(value);}catch(error){$('cloudLoginStatus').textContent=error.message;return;}
    controller.connect('steam',payload);
  };
  $('cloudEmailForm').onsubmit=event=>{
    event.preventDefault();const credentials={email:$('cloudEmail').value.trim(),password:$('cloudPassword').value};
    $('cloudPassword').value='';controller.connect('email',credentials).finally(()=>{credentials.password='';});
  };
  window.addEventListener('offline',()=>draw(controller.getStatus()));
  window.addEventListener('online',()=>{draw(controller.getStatus());if(controller.getStatus().connected)controller.retry();});
  // Queue only the latest save while editing, navigating or running an optimizer.
  // The pause flag prevents a manual import's pending read from being overwritten.
  $('fileInput').addEventListener('change',()=>{paused=true;},true);
  $('parseBtn').addEventListener('click',()=>{paused=true;},true);
  $('cloudConnect').addEventListener('click',()=>{paused=false;});
  setInterval(()=>{const status=controller.getStatus();if(status.pending){$('cloudApply').disabled=!bridge.canApply();if(!paused&&bridge.canAutoApply())controller.applyPending();}},1500);
  draw(controller.getStatus());
  if(resume)setTimeout(()=>controller.connect('resume'),0);
})();
