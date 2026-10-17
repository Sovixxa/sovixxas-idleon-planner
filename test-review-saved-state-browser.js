'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://localhost:7331/**',async route=>{
  const pathname=decodeURIComponent(new URL(route.request().url()).pathname);
  if(pathname.startsWith('/__'))return route.fulfill({contentType:'application/json',body:'{}'});
  const file=path.resolve(__dirname,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(__dirname+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({status:404,body:''});
  const type={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.json':'application/json','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream';
  return route.fulfill({contentType:type,body:fs.readFileSync(file)});
 });
 await page.addInitScript(()=>{localStorage.setItem('idleon-planner-quick-notes-collapsed-v1','true');localStorage.setItem('idleon-account-review-goal-v2','stats');localStorage.setItem('idleon-planner-qol-v1',JSON.stringify({pages:{accountReview:{'tab:data-review-page':'alchemy','field:SELECT:Review goal':'damage','field:SELECT:character':'0','field:SELECT:metric':'luck','field:SELECT:data-afk-skill':'17'}}}));});
 await page.goto('http://localhost:7331/');
 const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8'));
 await page.locator('#jsonInput').fill(JSON.stringify(raw));await page.locator('#parseBtn').click();
 await page.waitForFunction(()=>/^(Save age|Imported):/.test(document.getElementById('qolFreshness').textContent),{},{timeout:60000});
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'accountReview'})));
 const ready=()=>page.waitForFunction(()=>document.querySelector('#reviewTargetCalculator [type=submit]')&&!document.querySelector('#reviewTargetCalculator [type=submit]').disabled,null,{timeout:60000});await ready();
 assert.equal(await page.locator('[aria-label="Calculator character"]').inputValue(),'0');
 assert.equal(await page.locator('[aria-label="Target metric"]').inputValue(),'luck');
 assert.equal(await page.locator('[data-review-goal="stats"]').getAttribute('aria-pressed'),'true');
 await page.locator('[data-review-tab=afkTester]').click();
 assert.equal(await page.locator('[data-afk-skill]').inputValue(),'0','Generic preferences must not overwrite AFK session state');
 assert.deepEqual(errors,[]);
 console.log('Saved metric and character restore after worker initialization; legacy mobile goal cannot override current goal.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
