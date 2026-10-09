(function(root){
  'use strict';
  // Public desktop device client bundled in Idleon's own sign-in UI.
  const GOOGLE_DEVICE_CLIENT={id:'267901585099-u6fjd75v6k9gefq7bcokcndv99riir5j',secret:'HzoZF-UKUNfFwBuz4vafwsaR'};
  const googleError=code=>Object.assign(Error('Google sign-in failed'),{code:'google/'+code});
  function waitForPoll(ms,signal){return new Promise((resolve,reject)=>{
    if(signal?.aborted)return reject(googleError('cancelled'));
    const abort=()=>{clearTimeout(timer);reject(googleError('cancelled'));};
    const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},ms);
    signal?.addEventListener('abort',abort,{once:true});
  });}
  async function googleDeviceToken({signal,onCode=()=>{},fetcher=fetch,wait=waitForPoll,now=Date.now}={}){
    const check=()=>{if(signal?.aborted)throw googleError('cancelled');};
    const post=async(path,body)=>{
      check();
      const timeout=AbortSignal.timeout(30000);
      const response=await fetcher('https://oauth2.googleapis.com/'+path,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body).toString(),credentials:'omit',referrerPolicy:'no-referrer',signal:signal?AbortSignal.any([signal,timeout]):timeout});
      const data=await response.json();check();
      if(!response.ok&&!data.error)throw googleError('unavailable');
      return data;
    };
    const code=await post('device/code',{client_id:GOOGLE_DEVICE_CLIENT.id,scope:'email profile'});
    if(code.error)throw googleError(code.error);
    if(typeof code.device_code!=='string'||!code.device_code||typeof code.user_code!=='string'||!code.user_code||!Number.isFinite(code.expires_in)||code.expires_in<=0)throw googleError('unavailable');
    const expiresAt=now()+code.expires_in*1000;
    let interval=Math.max(5,Number(code.interval)||5)*1000;
    onCode({userCode:code.user_code,expiresAt});
    while(now()<expiresAt){
      await wait(Math.min(interval,expiresAt-now()),signal);check();
      if(now()>=expiresAt)break;
      const result=await post('token',{client_id:GOOGLE_DEVICE_CLIENT.id,client_secret:GOOGLE_DEVICE_CLIENT.secret,device_code:code.device_code,grant_type:'urn:ietf:params:oauth:grant-type:device_code'});
      if(now()>=expiresAt)break;
      if(result.error==='authorization_pending')continue;
      if(result.error==='slow_down'){interval+=5000;continue;}
      if(result.error)throw googleError(result.error);
      if(typeof result.id_token!=='string'||!result.id_token)throw googleError('unavailable');
      return result.id_token;
    }
    throw googleError('expired_token');
  }
  const STEAM_RETURN='https://www.legendsofidleon.com/steamsso/';
  const STEAM_LOGIN='https://steamcommunity.com/openid/login?'+new URLSearchParams({
    'openid.ns':'http://specs.openid.net/auth/2.0',
    'openid.claimed_id':'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.identity':'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.return_to':STEAM_RETURN,'openid.realm':STEAM_RETURN,'openid.mode':'checkid_setup'
  });
  function steamPayload(value){
    let url;try{url=new URL(value.trim());}catch{throw Error('Paste the complete Idleon redirect URL from the Steam sign-in tab.');}
    if(url.origin!=='https://www.legendsofidleon.com'||url.pathname!=='/steamsso/'||url.username||url.password||url.hash)
      throw Error('Use the redirect URL at https://www.legendsofidleon.com/steamsso/.');
    const p=url.searchParams;
    for(const key of p.keys())if(p.getAll(key).length!==1)throw Error('The redirect URL contains duplicate fields. Sign in again.');
    const claimed=p.get('openid.claimed_id')||'',id=claimed.match(/^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/)?.[1];
    if(!id||p.get('openid.identity')!==claimed||p.get('openid.mode')!=='id_res'||p.get('openid.ns')!=='http://specs.openid.net/auth/2.0'||p.get('openid.return_to')!==STEAM_RETURN)
      throw Error('This is not a completed Steam sign-in. Sign in again and copy the resulting URL.');
    const data={claimedId:id,nonce:p.get('openid.response_nonce'),assocHandle:p.get('openid.assoc_handle'),sig:p.get('openid.sig'),signed:p.get('openid.signed')};
    if(Object.values(data).some(v=>!v||v.length>4096))throw Error('The Steam redirect URL is incomplete. Copy the entire address.');
    return {data};
  }
  function safeError(error){
    const code=String(error?.code||'');
    if(code==='google/access_denied'||code==='google/cancelled')return 'Google sign-in cancelled. You can start again when ready.';
    if(code==='google/expired_token')return 'Your Google sign-in code expired. Start Google sign-in again for a new code.';
    if(code.startsWith('google/'))return 'Google sign-in could not finish. Start again, or import a JSON save.';
    if(/invalid-email/.test(code))return 'Enter a valid email address for your Idleon account.';
    if(/invalid-credential|wrong-password|invalid-password|user-not-found|account-exists-with-different-credential/.test(code))return 'Sign-in failed. Use the same method you use in Idleon: Google, Steam, or an Idleon email/password login. Your Google password does not belong in the email form. JSON import is also available.';
    if(/too-many-requests/.test(code))return 'Too many sign-in attempts. Please wait before trying again.';
    if(/network|unavailable|timeout/.test(code))return 'Cannot reach Idleon. Check your connection and retry.';
    if(/permission-denied|unauthenticated|token-expired|user-disabled/.test(code))return 'Idleon denied access or your session expired. Retry the connection; sign in again if it keeps failing.';
    if(/invalid-custom-token|custom-token-mismatch/.test(code))return 'The Steam sign-in expired or was rejected. Start Steam sign-in again.';
    // Never render SDK/server error text: it may contain credentials or URLs.
    return 'Could not connect or read this account. Retry, or disconnect and sign in again. Manual JSON import is still available.';
  }
  function createController({loadAdapter,apply,canApply=()=>true,onStatus=()=>{},onReceive=()=>{},schedule=setTimeout,cancel=clearTimeout}){
    let adapterPromise,adapter,unsubscribe,epoch=0,busy=false,pending=null,lastSignature='',connected=false,logoutTask=Promise.resolve(),loginAbort,retryTimer=null,retryCount=0;
    let status={phase:'disconnected',pending:false,lastReceived:null,lastApplied:null,message:'Not connected'};
    const publish=patch=>{status={...status,...patch,pending:!!pending,connected,busy};onStatus({...status});};
    const stop=()=>{if(retryTimer!==null)cancel(retryTimer);retryTimer=null;if(unsubscribe)unsubscribe();unsubscribe=null;pending=null;lastSignature='';};
    function recover(error,token){
      if(token!==epoch)return;
      const code=String(error?.code||'');
      const retryable=/network|unavailable|timeout|deadline-exceeded|resource-exhausted|aborted|internal|permission-denied|unauthenticated|token-expired/.test(code);
      if(retryable&&retryCount<5){
        if(retryTimer!==null)return;
        const delay=Math.min(30000,1000*2**retryCount++);
        publish({phase:'reconnecting',message:safeError(error)+' Retrying automatically…'});
        retryTimer=schedule(()=>{retryTimer=null;if(token===epoch)connect('resume',undefined,true);},delay);
      }else publish({phase:'error',message:safeError(error)});
    }
    async function getAdapter(){
      if(!adapterPromise)adapterPromise=Promise.resolve().then(loadAdapter).catch(e=>{adapterPromise=null;throw e;});
      adapter=await adapterPromise;return adapter;
    }
    function applyPending(){
      if(!pending)return false;
      const item=pending;
      try{
        if(apply(item.raw)===false)throw Error('Invalid save');
        lastSignature=item.signature;pending=null;
        publish({lastApplied:Date.now(),message:item.warning||'Cloud save applied',phase:'connected'});return true;
      }catch{publish({phase:'error',message:'Could not load the new cloud save. Your previous save is still available; retry or use a JSON export.'});return false;}
    }
    function listen(user,token){
      stop();connected=true;publish({phase:'connecting',message:'Waiting for the account’s cloud save…'});
      unsubscribe=adapter.subscribe(user,packet=>{
        if(token!==epoch)return;
        if(packet.waiting){publish({phase:'reconnecting',message:'Waiting for the server. The displayed save may be out of date.'});return;}
        retryCount=0;if(retryTimer!==null)cancel(retryTimer);retryTimer=null;
        const signature=JSON.stringify(packet.raw);
        // Read-only sampling can continue while the UI defers applying a save.
        try{onReceive(packet.raw);}catch{/* Optional observers must not interrupt sync. */}
        if(signature===lastSignature){pending=null;publish({phase:'connected',message:packet.warning||'Connected · save unchanged'});return;}
        pending={raw:packet.raw,signature,warning:packet.warning};
        publish({phase:'connected',lastReceived:Date.now(),message:packet.warning||'New cloud save received'});
        if(canApply())applyPending();
      },error=>recover(error,token));
    }
    async function connect(method,credentials,recovery=false,options={}){
      if(busy)return;
      if(!recovery)retryCount=0;
      const token=++epoch;stop();if(!recovery)connected=false;busy=true;
      loginAbort=new AbortController();const signal=loginAbort.signal;
      publish({phase:'connecting',method,googleCode:null,lastReceived:null,lastApplied:null,message:'Connecting to Idleon…'});
      try{
        await logoutTask;if(token!==epoch)return;
        const service=await getAdapter();if(token!==epoch)return;
        const user=method==='resume'?await service.currentUser({refresh:recovery}):await service.login(method,credentials,{...options,signal,onCode:googleCode=>{if(token===epoch)publish({googleCode,message:'Enter the code on Google, approve access, then return here. Waiting for approval…'});}});
        if(token!==epoch){await service.logout();return;}
        if(!user){connected=false;publish({phase:'disconnected',message:'Sign in to connect your account.'});return;}
        publish({googleCode:null});listen(user,token);
      }catch(error){if(method==='resume')recover(error,token);else if(token===epoch)publish({phase:'error',message:safeError(error)});}
      finally{busy=false;publish({googleCode:null});}
    }
    async function disconnect(){
      const token=++epoch;loginAbort?.abort();stop();connected=false;publish({phase:'disconnected',googleCode:null,lastReceived:null,lastApplied:null,message:'Disconnected · displayed save kept locally'});
      logoutTask=logoutTask.then(()=>adapter?.logout()).catch(()=>{if(token===epoch)publish({phase:'error',message:'Updates stopped, but sign-out failed. Close this tab to end the session.'});});
      await logoutTask;
    }
    return {connect:(method,credentials,options)=>connect(method,credentials,false,options),disconnect,applyPending,getStatus:()=>({...status}),retry:()=>{retryCount=0;return connect('resume',undefined,true);}};
  }
  const moduleSource=typeof document==='undefined'?null:document.currentScript?.src;
  let modulesPromise;
  function loadFirebaseModules(){
    if(root.IdleonFirebaseModules)return Promise.resolve(root.IdleonFirebaseModules);
    if(!modulesPromise)modulesPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      const url=new URL('firebase-modules.js',moduleSource||document.baseURI);
      if(moduleSource)url.search=new URL(moduleSource).search;
      script.type='module';script.src=url.href;
      script.onload=()=>{if(root.IdleonFirebaseModules)resolve(root.IdleonFirebaseModules);else{script.remove();reject({code:'auth/network-request-failed'});}};
      script.onerror=()=>{script.remove();reject({code:'auth/network-request-failed'});};
      document.head.appendChild(script);
    }).catch(error=>{modulesPromise=null;throw error;});
    return modulesPromise;
  }
  async function createFirebaseAdapter(modules){
    // Loading through a module script preserves strict CSP trust for SDK imports.
    const [appSdk,authSdk,fsSdk,dbSdk]=modules||await loadFirebaseModules();
    const app=appSdk.getApps().find(app=>app.name==='planner-live')||appSdk.initializeApp({apiKey:'AIzaSyAU62kOE6xhSrFqoXQPv6_WHxYilmoUxDk',authDomain:'idlemmo.firebaseapp.com',databaseURL:'https://idlemmo.firebaseio.com',projectId:'idlemmo'},'planner-live');
    const auth=authSdk.initializeAuth(app,{persistence:[authSdk.browserLocalPersistence,authSdk.browserSessionPersistence]});
    const firestore=fsSdk.getFirestore(app),database=dbSdk.getDatabase(app);
    const read=async path=>(await dbSdk.get(dbSdk.ref(database,path))).val();
    const readDoc=async (collection,id)=>{const snap=await fsSdk.getDoc(fsSdk.doc(firestore,collection,id));return snap.exists()?snap.data():null;};
    return {
      async currentUser({refresh=false}={}){await auth.authStateReady();const user=auth.currentUser;if(refresh&&user)await user.getIdToken(true);return user;},
      async login(method,credentials,options={}){
        await authSdk.setPersistence(auth,options.remember?authSdk.browserLocalPersistence:authSdk.browserSessionPersistence);
        if(method==='google'){
          const token=await googleDeviceToken(options);
          if(options?.signal?.aborted)throw googleError('cancelled');
          return (await authSdk.signInWithCredential(auth,authSdk.GoogleAuthProvider.credential(token))).user;
        }
        if(method==='email')return (await authSdk.signInWithEmailAndPassword(auth,credentials.email,credentials.password)).user;
        if(method!=='steam')throw Error('Unsupported sign-in');
        const response=await fetch('https://us-central1-idlemmo.cloudfunctions.net/asil',{
          method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(credentials),
          credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(30000)
        });
        if(!response.ok)throw Error('Steam exchange failed');
        const result=await response.json();
        if(typeof result.result!=='string'||!result.result)throw Error('Steam exchange rejected');
        return (await authSdk.signInWithCustomToken(auth,result.result)).user;
      },
      logout:()=>authSdk.signOut(auth),
      subscribe(user,next,error){
        let stopped=false,sequence=0;
        const unsubscribe=fsSdk.onSnapshot(fsSdk.doc(firestore,'_data',user.uid),{includeMetadataChanges:true},snapshot=>{
          const current=++sequence;
          if(snapshot.metadata.fromCache){next({waiting:true});return;}
          if(!snapshot.exists()){error({code:'missing-save'});return;}
          (async()=>{
            const data=snapshot.data();
            const results=await Promise.allSettled([
              read('_uid/'+user.uid),read('_comp/'+user.uid),readDoc('_vars','_vars'),
              (async()=>{const id=await read('_usgu/'+user.uid+'/g');if(!id)return null;const guild=await read('_guild/'+id);let stats=data.Guild;try{if(typeof stats==='string')stats=JSON.parse(stats);}catch{stats=null;}return {id,stats,members:Object.values(guild?.m||{}),points:guild?.p};})()
            ]);
            if(stopped||current!==sequence)return;
            if(results[0].status==='rejected')throw results[0].reason;
            const names=results[0].value;
            if(!names||typeof names!=='object'||!Object.keys(names).length)throw Error('No characters');
            const raw={data,charNames:Array.isArray(names)?names:Object.keys(names).sort((a,b)=>Number(a)-Number(b)).map(key=>names[key])};
            const fields=['charNames','companion','serverVars','guildData'],missing=[];
            for(let i=1;i<results.length;i++){if(results[i].status==='fulfilled')raw[fields[i]]=results[i].value;else missing.push(fields[i]);}
            next({raw,warning:missing.length?'Cloud save received; some companion, guild, or server details are unavailable. Retry to refresh them.':''});
          })().catch(e=>{if(!stopped&&current===sequence)error(e);});
        },error);
        return ()=>{stopped=true;++sequence;unsubscribe();};
      }
    };
  }
  const api={STEAM_LOGIN,steamPayload,safeError,createController,createFirebaseAdapter,googleDeviceToken};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.IdleonLive=api;
})(typeof window!=='undefined'?window:globalThis);
