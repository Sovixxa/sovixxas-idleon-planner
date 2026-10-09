'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
const root=path.join(__dirname,'dist'),base='http://localhost:7341/planner/';
const sdk={
 'app':`export const getApps=()=>[];export const initializeApp=()=>({});`,
 'auth':`export const browserLocalPersistence='local',browserSessionPersistence='session';let persistence='session';const key='test-auth-user';const auth={currentUser:null,async authStateReady(){await new Promise(r=>setTimeout(r,50));this.currentUser=JSON.parse(localStorage.getItem(key)||sessionStorage.getItem(key)||'null');}};export const initializeAuth=()=>auth;export const setPersistence=async(a,p)=>{persistence=p};export const signInWithCustomToken=async(a,t)=>{if(t!=='test-token')throw Error('Unexpected token');a.currentUser={uid:'test-user'};(persistence==='local'?localStorage:sessionStorage).setItem(key,JSON.stringify(a.currentUser));return {user:a.currentUser}};export const signOut=async()=>{localStorage.removeItem(key);sessionStorage.removeItem(key);auth.currentUser=null};`,
 'firestore':`export const getFirestore=()=>({});export const doc=()=>({});export const onSnapshot=()=>()=>{};`,
 'database':`export const getDatabase=()=>({});`
};
(async()=>{const browser=await chromium.launch();try{
 const context=await browser.newContext(),page=await context.newPage();let exchanges=0;const modules=new Set(),violations=[];
 await context.addInitScript(()=>document.addEventListener('securitypolicyviolation',e=>{(window.testCspViolations||=[]).push(e.blockedURI)}));
 await context.route('**/*',route=>{
  const url=new URL(route.request().url()),match=url.pathname.match(/firebase-(app|auth|firestore|database)\.js$/);
  if(url.origin==='https://www.gstatic.com'&&match){modules.add(match[1]);return route.fulfill({contentType:'text/javascript',headers:{'Access-Control-Allow-Origin':'*'},body:sdk[match[1]]});}
  if(url.hostname==='us-central1-idlemmo.cloudfunctions.net'){exchanges++;assert.equal(JSON.parse(route.request().postData()).data.claimedId,'76561198000000000');return route.fulfill({contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify({result:'test-token'})});}
  if(url.origin!==new URL(base).origin)return route.abort();
  const file=path.resolve(root,url.pathname.replace(/^\/planner\//,'')||'index.html');
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
  return route.fulfill({contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto(base);await page.locator('#cloudConnect').click();assert.equal(modules.size,0);
 await page.locator('#cloudRemember').check();
 const u=new URL('https://www.legendsofidleon.com/steamsso/');for(const[k,v]of Object.entries({ns:'http://specs.openid.net/auth/2.0',mode:'id_res',claimed_id:'https://steamcommunity.com/openid/id/76561198000000000',identity:'https://steamcommunity.com/openid/id/76561198000000000',return_to:u.href,response_nonce:'test',assoc_handle:'test',sig:'test',signed:'test'}))u.searchParams.set('openid.'+k,v);
 await page.locator('#cloudSteamUrl').fill(u.href);await page.locator('#cloudSteamForm button').click();
 await page.waitForFunction(()=>!document.getElementById('cloudDialog').open);assert.equal(modules.size,4);assert.equal(exchanges,1);
 assert.equal(await page.locator('#cloudSteamUrl').inputValue(),'');
 await page.reload();await page.waitForFunction(()=>!document.getElementById('cloudDisconnect').hidden&&document.getElementById('cloudConnect').hidden&&document.getElementById('cloudSummary').textContent==='Synced');
 const reopened=await context.newPage();await reopened.goto(base);await reopened.waitForFunction(()=>document.getElementById('cloudSummary').textContent==='Synced');assert.equal(exchanges,1,'Reload and new tabs must restore auth without another Steam exchange');
 for(const p of [page,reopened])violations.push(...await p.evaluate(()=>window.testCspViolations||[]));assert.deepEqual(violations,[]);
 await reopened.close();await page.locator('#cloudDisconnect').click();await page.reload();await page.locator('#cloudConnect').waitFor();assert.equal(await page.evaluate(()=>localStorage.getItem('idleon-planner-cloud-session')),null);
 console.log('Production CSP: Steam SDK loading, token exchange, remembered session reload/new-tab restoration and explicit disconnect pass.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
