'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://localhost:7332/**',route=>{const pathname=decodeURIComponent(new URL(route.request().url()).pathname);const file=path.resolve(__dirname,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(__dirname+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({status:404,body:''});return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});});
 await page.goto('http://localhost:7332/',{waitUntil:'domcontentloaded'});
 for(const name of ['beanstalk-engine.js','bonus-systems.js'])await page.addScriptTag({url:'/'+name});await page.addStyleTag({url:'/bonus-systems.css'});
 const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8'));
 await page.evaluate(raw=>{document.body.innerHTML='<main style="padding:16px"><h1>Event Shop</h1><div id="preview"></div></main>';const groups=BonusSystems.getRows(raw);BonusSystems.render(document.querySelector('#preview'),'eventShop',raw,groups);},raw);
 assert.equal(await page.locator('.event-shop-item').count(),68);
 await page.locator('.event-shop-item img').evaluateAll(ns=>Promise.all(ns.map(n=>n.decode())));
 await page.locator('input[type=search]').fill('Full Kitchen Simmer');assert.equal(await page.locator('.event-shop-item:visible').count(),1);assert.match(await page.locator('.event-shop-item:visible').innerText(),/10x Max Fuel/);
 await page.locator('input[type=search]').fill('');await page.screenshot({path:'../audit/v124-event-shop-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'../audit/v124-event-shop-mobile.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('v1.24 Event Shop: 68 entries, all artwork, new-item search, desktop/mobile layout and no page errors pass.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
