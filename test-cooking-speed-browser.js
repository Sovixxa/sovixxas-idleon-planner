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

 await page.goto('http://localhost:7331/');
 await page.locator('#changeJsonBtn').click();
 const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8'));
 await page.locator('#jsonInput').fill(JSON.stringify(raw));await page.locator('#parseBtn').click();
 await page.waitForFunction(()=>/^(Save age|Imported):/.test(document.getElementById('qolFreshness').textContent),{},{timeout:60000});



 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'cooking'})));

 await page.locator('.cook-breakdown').waitFor({timeout:60000});
 async function check(){
 await page.locator('.cook-breakdown > summary').click();
 const shares=await page.locator('.cook-source-value small:last-child').allTextContents();
 const values=shares.map(s=>parseFloat(s));
 assert(shares.every(s=>s.endsWith('% log share')));
 assert.equal(values.reduce((a,b)=>a+Math.round(b*10),0),1000);
 assert(values.every((v,i)=>!i||v<=values[i-1]));
 assert.equal(await page.locator('.cook-source-list > div').filter({hasText:'Clam Work'}).count(),1);
 const arcadeRow=page.locator('.cook-source-list > div').filter({has:page.getByText('Arcade (direct cooking)',{exact:true})});
 assert((await arcadeRow.innerText()).includes('+80.4%'));
 assert((await arcadeRow.innerText()).includes('1.8×'));
 assert((await arcadeRow.innerText()).includes('0.2% log share'));
 }
 await check();
 await page.locator('#cookPreset').selectOption('current');await check();
 await page.locator('#cookCharacter').selectOption('0');await check();
 await page.locator('#cookPreset').selectOption('secondary');await check();
 for(const width of [1440,390]){
 await page.setViewportSize({width,height:1000});
 await page.locator('.cook-breakdown').scrollIntoViewIfNeeded();
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'../audit/meal-speed-audit-'+width+'.png'});
 }
 assert.deepEqual(errors,[]);console.log('Meal speed browser audit: presets, character changes, ranked 100% shares, Clam Work, desktop and mobile pass.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
