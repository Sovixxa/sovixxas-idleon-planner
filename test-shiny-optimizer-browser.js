'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/Sofia/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
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
  await page.locator('#shinyTarget').waitFor({timeout:60000});
  assert.equal(await page.locator('.shiny-result').count(),3);
  await page.locator('#shinyTarget').selectOption('Critter11');
  await page.locator('#shinyVisits').selectOption('1');
  await page.locator('#shinyUseFood').check();
  assert.match(await page.locator('#shinyOptimizer').innerText(),/missing or needs changing/);
  assert.match(await page.locator('#shinyOptimizer').innerText(),/Shiny Snitch/);
  assert.equal(await page.locator('#shinyTarget').inputValue(),'Critter11');
  await page.screenshot({path:'../audit/shiny-optimizer-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Mobile layout must fit');
  await page.screenshot({path:'../audit/shiny-optimizer-mobile.png',fullPage:true});
  const collectorBefore=await page.locator('#shinySavedCollector').inputValue();
  await page.locator('[data-shiny-view="account"]').click();
  assert.equal(await page.locator('#shinySavedCollector').inputValue(),collectorBefore);
  assert(await page.locator('.shiny-account-character').count()>1);
  const count=await page.locator('[data-account-trap]').count();assert(count>0);
  await page.locator('#shinyAccountCharacter').selectOption('0');
  assert.equal(await page.locator('.shiny-account-character').count(),1);
  assert(await page.locator('[data-account-trap]').count()<count);
  await page.locator('#shinyAccountCharacter').selectOption('all');
  await page.locator('#shinyAccountStatus').selectOption('ready');
  assert.equal(await page.locator('[data-account-trap]').filter({hasText:'Waiting'}).count(),0);
  await page.locator('#shinyAccountStatus').selectOption('all');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Account overview fits mobile');
  await page.screenshot({path:'../audit/shiny-account-mobile.png',fullPage:true});
  await page.setViewportSize({width:1280,height:900});
  await page.screenshot({path:'../audit/shiny-account-desktop.png',fullPage:true});
  await page.locator('[data-shiny-view="optimizer"]').click();
  await page.locator('#shinyPlacement').click();
  assert.equal(await page.locator('#loadoutBuild').inputValue(),'trapping-efficiency-bm');
  await page.locator('[data-loadout-tab="shinies"]').click();
  await page.locator('#shinyTarget').waitFor();
  assert.equal(await page.locator('#shinyTarget').inputValue(),'Critter11','Selection persists while navigating loadouts');
  await page.evaluate(async()=>{
   const box=document.createElement('div');box.id='emptyShinyTest';document.body.append(box);
   await ShinyOptimizer.render(box,{});
  });
  assert.match(await page.locator('#emptyShinyTest').innerText(),/Import your account/);
  await page.evaluate(()=>document.getElementById('emptyShinyTest').remove());
  assert.deepEqual(errors,[]);
  console.log('Shiny optimizer browser: imported account, target/schedule/food controls, mobile layout, navigation and empty state pass.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
