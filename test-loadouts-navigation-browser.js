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
   window.BeanValueEngine.systems=()=>{throw Error('Unnecessary main-thread account decode');};
   window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'loadouts'}));
  });
  await page.locator('#loadoutBuild').waitFor();
  await page.locator('[data-loadout-tab="shinies"]').click();
  await page.locator('#shinyEstimate').waitFor();
  assert.match(await page.locator('#shinyEstimate').innerText(),/15 expected shinies/);
  await page.locator('[data-shiny-field="chance"]').fill('200');
  assert.match(await page.locator('#shinyEstimate').innerText(),/30 expected shinies/);
  await page.locator('[data-shiny-field="minutes"]').fill('1440');
  assert.match(await page.locator('#shinyEstimate').innerText(),/10 expected shinies/);
  await page.locator('[data-shiny-field="minutes"]').fill('0');
  assert.match(await page.locator('#shinyEstimate').innerText(),/Enter valid/);
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Mobile layout must fit');
  await page.locator('#shinyPlacement').click();
  assert.equal(await page.locator('#loadoutBuild').inputValue(),'trapping-efficiency-bm');

  await page.evaluate(()=>{window.CarryCapacity.load=()=>new Promise(resolve=>window.finishCarry=resolve);});
  await page.locator('[data-loadout-tab="carry"]').click();
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'credits'})));
  const before=await page.locator('#worldContent').innerHTML();
  await page.evaluate(async()=>{window.finishCarry({players:[]});await Promise.resolve();});
  assert.equal(await page.locator('#worldContent').innerHTML(),before,'A late carry result must not overwrite another page');
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'loadouts'})));
  await page.evaluate(async()=>{window.finishCarry({players:[]});await Promise.resolve();});
  await page.locator('.carry-empty').waitFor();
  assert.deepEqual(errors,[]);
  console.log('Loadouts: no synchronous full-account decode; late carry results preserve navigation; active results render.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
