'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/Sofia/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
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

 await page.goto('http://localhost:7331/');
 const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8'));
 await page.locator('#jsonInput').fill(JSON.stringify(raw));await page.locator('#parseBtn').click();
 await page.waitForFunction(()=>/^(Save age|Imported):/.test(document.getElementById('qolFreshness').textContent),{},{timeout:60000});

 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'breeding'})));
 await page.locator('[data-breeding-page="arenaTeams"]').click();
 await page.locator('#arenaSize').waitFor({timeout:60000});
 assert.equal(await page.locator('#arenaSize').inputValue(),'6');
 assert.equal(await page.locator('.pet-plan-slot').count(),6);
 assert.equal(await page.locator('[data-skill-tab="arenaTeams"]').count(),1);
 await page.locator('#arenaSize').selectOption('4');assert.equal(await page.locator('.pet-plan-slot').count(),4);
 await page.locator('#arenaSize').selectOption('6');await page.locator('#arenaLineup').selectOption('peapod');assert.equal(await page.locator('.pet-plan-slot').count(),6);
 await page.screenshot({path:'../audit/arena-teams-desktop.png'});
 await page.locator('[data-skill-tab="spiceTeams"]').click();await page.locator('#spiceMode').waitFor();
 assert((await page.locator('.spice-plan-row').count())>20);
 await page.locator('#spiceMode').selectOption('focus');await page.locator('#spiceFocus').selectOption('6');assert.equal(await page.locator('.spice-focus h3').innerText(),'7. Beach Docks');
 await page.locator('#spiceMode').selectOption('power');assert((await page.locator('.spice-focus').innerText()).includes('Borger'));
 await page.locator('#spiceMode').selectOption('balanced');
 await page.screenshot({path:'../audit/spice-teams-desktop.png'});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'../audit/spice-teams-mobile.png'});
 await page.locator('[data-skill-tab="arenaTeams"]').click();await page.locator('#arenaSize').waitFor();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);console.log('Arena/spices browser: navigation, saved slots, lineup selection, focused territory, mobile overflow and console pass.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
