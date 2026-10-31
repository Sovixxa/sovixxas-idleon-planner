'use strict';
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://localhost:7332/**',async route=>{const pathname=decodeURIComponent(new URL(route.request().url()).pathname);if(pathname.startsWith('/__'))return route.fulfill({contentType:'application/json',body:'{}'});const file=path.resolve(__dirname,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(__dirname+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({status:404,body:''});return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});});
 await page.goto('http://localhost:7332/');await page.locator('#quickNotesToggle').click();
 const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8'));await page.evaluate(raw=>{document.querySelector('#jsonInput').value=JSON.stringify(raw);document.querySelector('#parseBtn').click();},raw);await page.waitForTimeout(1500);
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'sneaking'})));

 await page.locator('[data-w6-tab=gemstones]').click();await page.locator('.gemstone-calculator').waitFor();
 assert.equal(await page.locator('.gemstone-calculator .lore-progress-card').count(),8);
 await page.locator('[name=gem-target]').selectOption('9000');await page.locator('[name=gem-filter]').selectOption('needs');
 await page.locator('[name=gem-filter]').selectOption('all');await page.locator('[name=gem-talent]').fill('3');
 assert((await page.locator('[data-gem-results]').innerText()).includes('0 unknown'));
 await page.locator('.gemstone-calculator').screenshot({path:'../audit/sneaking-gemstones-desktop.png'});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.locator('.gemstone-calculator').screenshot({path:'../audit/sneaking-gemstones-mobile.png'});

 // A Firefrost with 30K levels is already at +31 without multipliers, before the 99K target.
 await page.evaluate(()=>{const o=Array(241).fill(0);o[240]=30000;SneakingGemstones.render(document.querySelector('#sneakingGemstones'),{OptLacc:o});});
 const fire=page.locator('.lore-progress-card').filter({hasText:'Firefrost'});
 assert((await fire.innerText()).includes('Effective max reached'));
 assert((await fire.innerText()).includes('29,001'));
 await fire.screenshot({path:'../audit/gemstone-firefrost-audit-mobile.png'});
 await page.locator('[name=gem-filter]').selectOption('needs');assert.equal(await fire.count(),0);
 await page.locator('[name=gem-talent]').fill('2');assert.equal(await fire.count(),1);
 assert((await fire.innerText()).includes('Next Charm increase: +1'));
 await page.locator('[name=gem-talent]').fill('1e100');assert((await page.locator('[data-gem-results]').innerText()).includes('Enter a talent multiplier'));
 await page.evaluate(()=>SneakingGemstones.render(document.querySelector('#sneakingGemstones'),{}));assert((await page.locator('[data-gem-results]').innerText()).includes('8 unknown'));
 await page.locator('[name=gem-filter]').selectOption('needs');assert((await page.locator('[data-gem-results]').innerText()).includes('No gemstones match'));
 assert.deepEqual(errors,[]);console.log('Gemstone browser import, navigation, filters, controls, missing data and mobile layout pass.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
