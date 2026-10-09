'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://localhost:7331/**',async route=>{
   const pathname=decodeURIComponent(new URL(route.request().url()).pathname);
   if(pathname.startsWith('/__'))return route.fulfill({contentType:'application/json',body:'{}'});
   const file=path.resolve(__dirname,'.'+(pathname==='/'?'/index.html':pathname));
   if(!file.startsWith(__dirname+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
   return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  await page.goto('http://localhost:7331/');
  await page.locator('#jsonInput').fill(JSON.stringify(JSON.parse(fs.readFileSync('../example json.txt','utf8'))));
  await page.locator('#parseBtn').click();
  await page.waitForFunction(()=>/^(Save age|Imported):/.test(document.getElementById('qolFreshness').textContent),{},{timeout:60000});

  await page.evaluate(()=>{
   window.pendingBonusLoads=[];
   const original=window.BonusSystems.getRowsAsync;
   window.BonusSystems.getRowsAsync=raw=>document.getElementById('worldContent').dataset.page==='buffs'?new Promise((resolve,reject)=>window.pendingBonusLoads.push({raw,resolve,reject})):original(raw);
   window.MiscBuffs.render=(host,data,raw)=>{host.textContent=raw.charNames[0];};
   window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'buffs'}));
  });
  const fresh=JSON.parse(fs.readFileSync('../example json.txt','utf8'));fresh.charNames[0]='Fresh account snapshot';
  await page.locator('#changeJsonBtn').click();await page.locator('#jsonInput').fill(JSON.stringify(fresh));await page.locator('#parseBtn').click();
  await page.waitForFunction(()=>window.pendingBonusLoads.length>=2);
  await page.evaluate(async()=>{window.pendingBonusLoads.at(-1).resolve({});await Promise.resolve();});
  assert.equal(await page.locator('#worldContent').innerText(),'Fresh account snapshot');
  await page.evaluate(async()=>{window.pendingBonusLoads[0].resolve({});await Promise.resolve();});
  assert.equal(await page.locator('#worldContent').innerText(),'Fresh account snapshot','Older save results must not overwrite a newly imported save on the same page');

  await page.evaluate(async()=>{
   window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'buffs'}));
   const old=window.pendingBonusLoads.at(-1);
   window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'buffs'}));
   window.pendingBonusLoads.at(-1).resolve({});await Promise.resolve();
   old.reject(new Error('Old calculation failed'));await Promise.resolve();await Promise.resolve();
  });
  assert.equal(await page.locator('#worldContent').innerText(),'Fresh account snapshot','Stale errors must not replace a newer successful render');
  await page.evaluate(()=>{
   window.dashboardDisposals=0;const dispose=window.Dashboard.dispose;
   window.Dashboard.dispose=()=>{window.dashboardDisposals++;dispose();};
   window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'dailies'}));
  });
  const beforeClear=await page.evaluate(()=>window.dashboardDisposals);
  await page.locator('#changeJsonBtn').click();await page.locator('#clearBtn').click();
  assert((await page.evaluate(()=>window.dashboardDisposals))>beforeClear,'Clearing a save must stop the hidden dashboard worker and timer');
  assert.equal(await page.locator('#worldContent').innerHTML(),'');
  assert.equal(await page.locator('#qolFreshness').innerText(),'No save loaded');
  assert.deepEqual(errors,[]);
  console.log('Save navigation: stale bonus results/errors ignored; clearing stops dashboard work and removes pending page content.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
