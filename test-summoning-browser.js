'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/Sofia/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://localhost:7332/**',async route=>{const pathname=decodeURIComponent(new URL(route.request().url()).pathname);if(pathname.startsWith('/__'))return route.fulfill({contentType:'application/json',body:'{}'});const file=path.resolve(__dirname,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(__dirname+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({status:404,body:''});return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});});



 await page.goto('http://localhost:7332/');await page.locator('#quickNotesToggle').click();
 const nav=()=>page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'summoning'})));
 await page.evaluate(()=>{const host=document.createElement('div');host.id='sum-empty-test';document.body.append(host);SummoningPage.render(host,{});});assert(await page.locator('#sum-empty-test .mc-empty').isVisible());await page.locator('#sum-empty-test').evaluate(el=>el.remove());
 const raw=JSON.parse(fs.readFileSync('../example json.txt'));await page.locator('#jsonInput').fill(JSON.stringify(raw));await page.locator('#parseBtn').click();await nav();await page.locator('[data-w6-tab=optimizer]').click();await page.locator('.sum-plan').waitFor({timeout:60000});
 assert.equal(await page.locator('.summoning-planner .mc-wallet>div').count(),8);
 await page.locator('[name=sum-percent]').fill('0');assert.equal(await page.locator('.sum-plan li').count(),0);
 await page.locator('[name=sum-mode]').selectOption('future');assert(await page.locator('.sum-plan li').count()>0);
 await page.locator('[name=sum-count]').selectOption('1000');assert.equal(await page.locator('.sum-plan li').count(),1000);
 await page.locator('[name=sum-collapse]').check();assert(await page.locator('.sum-plan li').count()<1000);
 await page.locator('[name=sum-goal]').selectOption('damage');assert(await page.locator('.sum-plan li').count()>0);
 await page.locator('[name=sum-color]').selectOption('5');assert((await page.locator('.sum-plan').innerText()).includes('Red essence'));
 await page.locator('[name=sum-color]').selectOption('all');await page.locator('[name=sum-goal]').selectOption('all');
 await page.screenshot({path:'../audit/summoning-desktop.png'});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.locator('.summoning-planner').screenshot({path:'../audit/summoning-mobile.png'});
 await page.locator('[data-w6-tab=essence]').click();assert((await page.locator('.essence-grid').innerText()).includes('Teal'));
 await page.locator('[data-w6-tab=optimizer]').click();assert.equal(await page.locator('[name=sum-mode]').inputValue(),'future');
 assert.deepEqual(errors,[]);console.log('Summoning browser checks passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
