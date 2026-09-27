'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/Sofia/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://localhost:7332/**',async route=>{const pathname=decodeURIComponent(new URL(route.request().url()).pathname);if(pathname.startsWith('/__'))return route.fulfill({contentType:'application/json',body:'{}'});const file=path.resolve(__dirname,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(__dirname+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({status:404,body:''});return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});});

 await page.goto('http://localhost:7332/');await page.locator('#quickNotesToggle').click();
 const raw=JSON.parse(fs.readFileSync('../example json.txt'));
 await page.locator('#jsonInput').fill(JSON.stringify(raw));await page.locator('#parseBtn').click();
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'killroy'})));
 await page.locator('.kr-week').first().waitFor({timeout:90000});
 assert.equal(await page.locator('.kr-week').count(),6);
 assert(await page.locator('.kr-fight img').evaluateAll(xs=>xs.every(x=>x.complete&&x.naturalWidth>0)));
 await page.locator('.kr-page').screenshot({path:'../audit/killroy-schedule-desktop.png'});
 await page.locator('[data-kr-tab="points"]').click();
 assert.equal(await page.locator('[data-kr-goal]').inputValue(),'balanced');
 await page.locator('[data-kr-points]').fill('3');await page.locator('[data-kr-points]').press('Tab');
 assert.equal(await page.locator('[data-kr-point-plan] li').count(),3);
 await page.locator('[data-kr-tab="shop"]').click();
 await page.locator('[data-kr-skulls]').fill('200');await page.locator('[data-kr-skulls]').press('Tab');
 assert(await page.locator('.kr-purchase').count()>0);
 await page.locator('.kr-page').screenshot({path:'../audit/killroy-shop-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'mobile overflow');
 await page.locator('.kr-page').screenshot({path:'../audit/killroy-shop-mobile.png'});
 await page.locator('[data-kr-tab="bonuses"]').click();assert.equal(await page.locator('.kr-bonuses article').count(),8);
 assert.deepEqual(errors,[]);console.log('Killroy browser: real save, rotations, icons, point plan, skull purchases, bonus view and mobile layout pass.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
