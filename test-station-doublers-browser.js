'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://localhost:7332/**',async route=>{const pathname=decodeURIComponent(new URL(route.request().url()).pathname);if(pathname.startsWith('/__'))return route.fulfill({contentType:'application/json',body:'{}'});const file=path.resolve(__dirname,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(__dirname+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({status:404,body:''});return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});});
 await page.goto('http://localhost:7332/');await page.locator('#quickNotesToggle').click();
 const raw=JSON.parse(fs.readFileSync('../example json.txt'));await page.locator('#jsonInput').fill(JSON.stringify(raw));await page.locator('#parseBtn').click();
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'sushi'})));
 await page.locator('.sushi-hero').waitFor({timeout:60000});assert.equal(await page.locator('.sushi-planner [role=alert]').count(),0);
 assert(!(await page.locator('.sushi-panel').innerText()).includes('Unavailable'));

 for(const kind of ['sushi','minehead']){
  if(kind==='minehead')await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'minehead'})));
  await page.locator(kind==='sushi'?'nav [data-tab="Doublers"]':'[data-w7-tab="doublers"]').click();
  assert.equal(await page.locator('[data-station-perk]').count(),kind==='sushi'?25:20);
  await page.locator('[data-doubler-search]').fill(kind==='sushi'?'searing':'golden');assert.equal(await page.locator('[data-station-perk]:visible').count(),kind==='sushi'?2:1);
  await page.locator('[data-doubler-search]').fill('');
  await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'../audit/'+kind+'-doublers-desktop.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'../audit/'+kind+'-doublers-mobile.png',fullPage:true});
  await page.locator(kind==='sushi'?'nav [data-tab="Overview"]':'[data-w7-tab="bosses"]').click();assert.equal(await page.locator('[data-station-perk]').count(),0);
 }
 assert.deepEqual(errors,[]);console.log('Sushi and Minehead doubler navigation, search, desktop/mobile and browser errors pass.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
