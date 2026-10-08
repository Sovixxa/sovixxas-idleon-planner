'use strict';
const assert=require('node:assert/strict');
const {googleDeviceToken,createController,createFirebaseAdapter,safeError}=require('./live-sync');
const tick=()=>new Promise(r=>setImmediate(r));
function harness(responses,expires=100){
  let time=0;const calls=[],delays=[],codes=[];
  return {calls,delays,codes,options:{now:()=>time,onCode:c=>codes.push(c),wait:async ms=>{delays.push(ms);time+=ms;},fetcher:async(url,options)=>{
    calls.push({url,body:new URLSearchParams(options.body)});
    assert.equal(options.credentials,'omit');assert.equal(options.referrerPolicy,'no-referrer');
    const data=calls.length===1?{device_code:'private-code',user_code:'ABCD-EFGH',expires_in:expires,interval:5}:responses.shift();
    assert(data,'unexpected polling request');return{ok:!data.error,json:async()=>data};
  }}};
}
(async()=>{
  const h=harness([{error:'authorization_pending'},{error:'slow_down'},{id_token:'id-token',refresh_token:'unused'}]);
  assert.equal(await googleDeviceToken(h.options),'id-token');
  assert.deepEqual(h.delays,[5000,5000,10000]);
  assert.deepEqual(h.codes,[{userCode:'ABCD-EFGH',expiresAt:100000}]);
  assert.equal(h.calls[0].body.get('scope'),'email profile');
  assert.equal(h.calls[1].body.get('device_code'),'private-code');
  assert.equal(h.calls[1].body.get('grant_type'),'urn:ietf:params:oauth:grant-type:device_code');
  for(const code of ['access_denied','expired_token','invalid_client'])await assert.rejects(googleDeviceToken(harness([{error:code}]).options),{code:'google/'+code});
  const expired=harness([],3);await assert.rejects(googleDeviceToken(expired.options),{code:'google/expired_token'});assert.equal(expired.calls.length,1);
  const abort=new AbortController(),cancel=harness([]);cancel.options.signal=abort.signal;cancel.options.onCode=()=>abort.abort();
  await assert.rejects(googleDeviceToken(cancel.options),{code:'google/cancelled'});assert.equal(cancel.calls.length,1);
  await assert.rejects(googleDeviceToken(harness([{}]).options),{code:'google/unavailable'});
  for(const code of ['google/access_denied','google/expired_token','google/invalid_client'])assert(!safeError({code,message:'private-code'}).includes('private-code'));
  // Exercise actual adapter Google credential exchange with simulated Google responses.
  const oldFetch=global.fetch;let credentialToken,subscriptions=0;
  global.fetch=async url=>({ok:true,json:async()=>url.endsWith('/device/code')?{device_code:'private',user_code:'ABCD',expires_in:600,interval:5}:{id_token:'google-id-token'}});
  try{
    const auth={};const service=await createFirebaseAdapter([{getApps:()=>[],initializeApp:()=>({})},{setPersistence:async()=>{},initializeAuth:()=>auth,GoogleAuthProvider:{credential:token=>{credentialToken=token;return{token};}},signInWithCredential:async(a,c)=>{assert.equal(a,auth);return{user:{uid:'google-user'}};}},{getFirestore:()=>({})},{getDatabase:()=>({})}]);
    assert.equal((await service.login('google',undefined,{wait:async()=>{}})).uid,'google-user');assert.equal(credentialToken,'google-id-token');
  }finally{global.fetch=oldFetch;}
  // Closing/disconnecting during approval aborts polling and cannot subscribe later.
  let signal;const controller=createController({loadAdapter:async()=>({login:(method,credentials,options)=>{signal=options.signal;options.onCode({userCode:'CODE'});return new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject({code:'google/cancelled'}),{once:true}));},logout:async()=>{},subscribe:()=>{subscriptions++;}}),apply:()=>{}});
  const pending=controller.connect('google');await tick();assert(controller.getStatus().googleCode);await controller.disconnect();await pending;
  assert(signal.aborted);assert.equal(subscriptions,0);assert.equal(controller.getStatus().googleCode,null);assert.equal(controller.getStatus().busy,false);
  console.log('Google device auth: token exchange, polling/backoff, expiry, denial, cancellation, safe errors and disconnect passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
