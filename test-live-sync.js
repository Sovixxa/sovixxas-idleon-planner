'use strict';
const assert=require('node:assert/strict');
const {steamPayload,safeError,createController,createFirebaseAdapter,STEAM_LOGIN}=require('./live-sync');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function redirect(){const url=new URL('https://www.legendsofidleon.com/steamsso/');for(const [key,value] of Object.entries({ns:'http://specs.openid.net/auth/2.0',mode:'id_res',claimed_id:'https://steamcommunity.com/openid/id/76561198000000000',identity:'https://steamcommunity.com/openid/id/76561198000000000',return_to:'https://www.legendsofidleon.com/steamsso/',response_nonce:'2026-09-28T00:00:00Ztest',assoc_handle:'test-handle',sig:'test-signature',signed:'signed,claimed_id,identity,return_to,response_nonce,assoc_handle'}))url.searchParams.set('openid.'+key,value);return url;}
(async()=>{
  const valid=redirect();assert.equal(steamPayload(valid.href).data.claimedId,'76561198000000000');
  assert.equal(new URL(STEAM_LOGIN).hostname,'steamcommunity.com');
  for(const value of ['javascript:alert(1)',valid.href.replace('www.legendsofidleon.com','www.legendsofidleon.com.evil.test'),valid.href.replace('/steamsso/','/steamsso/other'),valid.href+'&openid.sig=duplicate',valid.href.replace('test-signature',''),valid.href.replace('id_res','cancel')])assert.throws(()=>steamPayload(value));
  assert(!safeError({message:'password=secret-token'}).includes('secret-token'));
  let receive,fail,unsubscribed=0,signedOut=0,allow=false;
  const applied=[],adapter={login:async()=>({uid:'account'}),currentUser:async()=>({uid:'account'}),logout:async()=>{signedOut++;},subscribe(user,next,error){receive=next;fail=error;return()=>{unsubscribed++;};}};
  const c=createController({loadAdapter:async()=>adapter,canApply:()=>allow,apply:raw=>{applied.push(raw);return raw.valid!==false;}});
  await c.connect('email',{});
  receive({raw:{data:{version:1}}});receive({raw:{data:{version:2}}});assert.equal(applied.length,0);assert(c.getStatus().pending);
  c.applyPending();assert.equal(applied[0].data.version,2);assert(!c.getStatus().pending);
  receive({raw:{data:{version:2}}});assert.equal(applied.length,1);
  allow=true;receive({raw:{data:{version:3}}});assert.equal(applied.length,2);
  receive({raw:{valid:false}});assert(c.getStatus().pending);assert.equal(c.getStatus().phase,'error');
  fail({code:'permission-denied'});assert.match(c.getStatus().message,/denied/);
  const stale=receive;await c.disconnect();stale({raw:{data:{version:4}}});assert.equal(applied.length,3);assert.equal(unsubscribed,1);assert.equal(signedOut,1);assert(!c.getStatus().pending);
  await c.retry();assert(c.getStatus().connected);receive({waiting:true});assert.equal(c.getStatus().phase,'reconnecting');await c.disconnect();
  const login=deferred();let subscriptions=0,lateLogout=0;
  const race=createController({loadAdapter:async()=>({...adapter,login:()=>login.promise,logout:async()=>{lateLogout++;},subscribe(){subscriptions++;return()=>{};}}),apply(){throw Error('must not apply');}});
  const connecting=race.connect('steam',{});await tick();await race.disconnect();login.resolve({uid:'late'});await connecting;
  assert.equal(subscriptions,0);assert(lateLogout>=1);assert(!race.getStatus().connected);
  let loads=0;const retry=createController({loadAdapter:async()=>{if(++loads===1)throw Error('offline');return adapter;},apply(){}});
  await retry.connect('resume');assert.equal(retry.getStatus().phase,'error');await retry.connect('resume');assert(retry.getStatus().connected);await retry.disconnect();

  // Adapter integration: preserve the full cloud-save wrapper and ignore out-of-order or cancelled reads.
  let snapshotCallback,reads=[],queue=[],unsubscribeCount=0,emailArgs,token;
  const names=deferred();let first=true;
  const auth={currentUser:{uid:'account'},authStateReady:async()=>{}};
  const appSdk={getApps:()=>[],initializeApp:()=>({})};
  const authSdk={browserSessionPersistence:'session',initializeAuth:(app,options)=>{assert.equal(options.persistence,'session');return auth;},signInWithEmailAndPassword:async(...args)=>{emailArgs=args;return{user:auth.currentUser};},signInWithCustomToken:async(a,t)=>{token=t;return{user:auth.currentUser};},signOut:async()=>{}};
  const fsSdk={getFirestore:()=>({}),doc:(db,...p)=>p.join('/'),getDoc:async()=>({exists:()=>true,data:()=>({server:1})}),onSnapshot:(ref,options,next)=>{assert.equal(ref,'_data/account');snapshotCallback=next;return()=>{unsubscribeCount++;};}};
  const dbSdk={getDatabase:()=>({}),ref:(db,p)=>p,get:async p=>{reads.push(p);if(p==='_uid/account'&&first){first=false;await names.promise;}return{val:()=>p.startsWith('_uid/')?['Hero']:p.startsWith('_comp/')?{pets:[1]}:null};}};
  const service=await createFirebaseAdapter([appSdk,authSdk,fsSdk,dbSdk]);
  await service.login('email',{email:'example@test.invalid',password:'test-only'});assert.deepEqual(emailArgs.slice(1),['example@test.invalid','test-only']);
  const originalFetch=global.fetch;global.fetch=async(url,options)=>{assert.equal(url,'https://us-central1-idlemmo.cloudfunctions.net/asil');assert.equal(JSON.parse(options.body).data.claimedId,'76561198000000000');return{ok:true,json:async()=>({result:'test-custom-token'})};};
  try{await service.login('steam',steamPayload(valid.href));assert.equal(token,'test-custom-token');}finally{global.fetch=originalFetch;}
  const cancel=service.subscribe(auth.currentUser,packet=>queue.push(packet),error=>{throw error;});
  const snap=(version,cached=false)=>({exists:()=>true,metadata:{fromCache:cached},data:()=>({version})});
  snapshotCallback(snap(0,true));assert.equal(queue.pop().waiting,true);assert.equal(reads.length,0);
  snapshotCallback(snap(1));snapshotCallback(snap(2));await tick();names.resolve();await tick();
  assert.equal(queue.length,1);assert.equal(queue[0].raw.data.version,2);assert.deepEqual(queue[0].raw.charNames,['Hero']);assert.deepEqual(queue[0].raw.companion,{pets:[1]});assert.equal(queue[0].raw.serverVars.server,1);
  snapshotCallback(snap(3));cancel();await tick();assert.equal(queue.length,1);assert.equal(unsubscribeCount,1);
  console.log('Cloud sync: Steam validation, auth exchange, save mapping, queuing, deduplication, retry, stale callbacks and disconnect races passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
