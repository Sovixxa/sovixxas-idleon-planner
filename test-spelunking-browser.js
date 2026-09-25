'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/Sofia/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://localhost:7332/**',async route=>{const pathname=decodeURIComponent(new URL(route.request().url()).pathname);if(pathname.startsWith('/__'))return route.fulfill({contentType:'application/json',body:'{}'});const file=path.resolve(__dirname,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(__dirname+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({status:404,body:''});return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});});

 await page.goto('http://localhost:7332/');
 const raw=JSON.parse(fs.readFileSync('../example json.txt'));
 await page.locator('#jsonInput').fill(JSON.stringify(raw));await page.locator('#parseBtn').click();
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'spelunking'})));
 await page.locator('[data-category="Upgrades"]').click({timeout:60000});
 await page.getByText('Spelunking upgrade optimizer',{exact:true}).waitFor();
 assert.equal(await page.locator('.fountain-plan tbody tr').count(),100);
 await page.locator('[data-done]').first().click();assert.equal(await page.locator('.fountain-plan tbody tr').count(),99);
 await page.locator('[data-undo]').click();assert.equal(await page.locator('.fountain-plan tbody tr').count(),100);
 await page.locator('select[name="goal"]').selectOption('amber');assert((await page.locator('.fountain-plan-summary').innerText()).includes('Amber amount'));
 await page.locator('select[name="steps"]').selectOption('20');assert.equal(await page.locator('.fountain-plan tbody tr').count(),20);
 await page.locator('[data-compress]').check();assert(await page.locator('.fountain-plan tbody tr').count()<=20);
 await page.getByText('Match your in-game upgrade costs',{exact:true}).click();
 const price=await page.evaluate(raw=>{const s=SpelunkingOptimizer.decode(raw,WORLD7_CATALOG.SpelunkUpg);return SpelunkingOptimizer.cost(s,Number(document.querySelector('[data-calibrate] select').value),.5);},raw);
 await page.locator('input[name="price"]').fill(String(price));await page.getByRole('button',{name:'Apply price',exact:true}).click();
 assert((await page.locator('.fountain-note').first().innerText()).includes('Calibrated'));
 await page.screenshot({path:'../audit/spelunking-optimizer-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'../audit/spelunking-optimizer-mobile.png',fullPage:true});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'no mobile page overflow');
 assert.deepEqual(errors,[]);console.log('Spelunking browser: navigation, goals, checklist, compression and mobile layout pass.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
