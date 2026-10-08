'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/Sofia/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://localhost:7332/**',async route=>{const pathname=decodeURIComponent(new URL(route.request().url()).pathname);if(pathname.startsWith('/__'))return route.fulfill({contentType:'application/json',body:'{}'});const file=path.resolve(__dirname,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(__dirname+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({status:404,body:''});return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});});
 await page.goto('http://localhost:7332/');await page.locator('#quickNotesToggle').click();
 const raw=JSON.parse(fs.readFileSync('../example json.txt'));await page.locator('#jsonInput').fill(JSON.stringify(raw));await page.locator('#parseBtn').click();
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'sushi'})));
 await page.locator('.sushi-hero').waitFor({timeout:60000});assert.equal(await page.locator('.sushi-planner [role=alert]').count(),0);
 assert(!(await page.locator('.sushi-panel').innerText()).includes('Unavailable'));
 await page.screenshot({path:'../audit/sushi-overview-desktop.png',fullPage:true});
 const tab=name=>page.locator('nav [data-tab="'+name+'"]');
 await tab('Upgrade priorities').click();assert.equal(await page.locator('.sushi-table-wrap tbody tr').count(),46);
 await page.screenshot({path:'../audit/sushi-priorities-desktop.png'});
 await page.locator('[data-affordable]').check();assert(await page.locator('.sushi-table-wrap tbody tr').count()>0);
 await page.locator('[data-search]').fill('Fastburn');assert((await page.locator('tbody').innerText()).includes('Fastburn'));
 await tab('Board planner').click();assert.equal(await page.locator('[data-cell]').count(),120);
 const before=await page.locator('.sushi-stats').innerText();await page.locator('[data-optimize]').click();assert.notEqual(await page.locator('.sushi-stats').innerText(),before);
 await page.locator('[data-board-reset]').click();assert.equal(await page.locator('.sushi-stats').innerText(),before);
 await page.locator('[data-cell="2"]').click();await page.locator('[data-cell="3"]').click();assert((await page.locator('[data-cell="2"]').innerText()).includes('T56'));
 await page.locator('[data-board-reset]').click();assert((await page.locator('[data-cell="2"]').innerText()).includes('T57'));
 await page.screenshot({path:'../audit/sushi-board-desktop.png',fullPage:true});
 await tab('Knowledge').click();assert.equal(await page.locator('.sushi-knowledge-cards article').count(),64);
 await page.locator('[data-knowledge-filter]').selectOption('perfecto');assert(await page.locator('.sushi-knowledge-cards article').count()<64);
 await page.screenshot({path:'../audit/sushi-targets-desktop.png'});
 await tab('Perfecto chances').click();assert.equal(await page.locator('.sushi-perfecto-card').count(),64);
 const completed=await page.locator('.sushi-perfecto-card[data-perfecto=true]').count();assert(completed>0);
 await page.locator('[data-hide-perfectos]').click();assert.equal(await page.locator('.sushi-perfecto-card[data-perfecto=true]').count(),0);assert.equal(await page.locator('.sushi-perfecto-card').count(),64-completed);
 await page.locator('[data-hide-perfectos]').click();assert.equal(await page.locator('.sushi-perfecto-card').count(),64);
 await page.screenshot({path:'../audit/sushi-perfecto-desktop.png',fullPage:true});
 await page.locator('[data-perfecto-tab="Bonuses & upgrades"]').click();assert.equal(await page.locator('.sushi-perfecto-sources article').count(),2);assert((await page.locator('.sushi-perfecto-sources').innerText()).includes('Caviar Supreme'));assert.equal(await page.locator('.sushi-perfecto-grid article').count(),6);
 await page.locator('[data-perfecto-tab=Chances]').click();
 await tab('Sushi collection').click();assert.equal(await page.locator('[data-discovery]').count(),64);await page.locator('[data-discovery="0"]').click();assert.equal(await page.locator('[data-discovery="0"]').getAttribute('aria-pressed'),'true');
 await tab('Bonus breakdowns').click();assert.equal(await page.locator('.sushi-breakdowns>section').count(),4);
 await page.setViewportSize({width:390,height:844});await tab('Overview').click();await page.screenshot({path:'../audit/sushi-overview-mobile.png',fullPage:true});
 const overflow=()=>page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(await overflow(),false);
 await tab('Perfecto chances').click();assert.equal(await overflow(),false);await page.screenshot({path:'../audit/sushi-perfecto-mobile.png',fullPage:true});await page.locator('[data-perfecto-tab="Bonuses & upgrades"]').click();assert.equal(await overflow(),false);await page.screenshot({path:'../audit/sushi-perfecto-bonuses-mobile.png',fullPage:true});
 await tab('Board planner').click();assert.equal(await overflow(),false);await page.screenshot({path:'../audit/sushi-board-mobile.png',fullPage:true});
 // A new account has a next discovery, locked systems, and zero passive plate income.
 await page.evaluate(async raw=>{
   const d=raw.data,s=[Array(120).fill(-1),Array(120).fill(-1),Array(50).fill(0),Array(15).fill(-1),Array(20).fill(0),Array(100).fill(-1),Array(100).fill(0),Array(100).fill(0)];
   s[0][0]=0;s[1].fill(0,0,10);s[5][0]=0;s[4][3]=20;d.Sushi=JSON.stringify(s);
   const host=document.querySelector('.sushi-planner').parentElement;await window.SushiPage.render(host,raw,[]);
 },structuredClone(raw));
 assert((await page.locator('.sushi-next').innerText()).includes('NEXT DISCOVERY · TIER 2'));
 await tab('Board planner').click();assert.equal(await page.locator('[data-cell]:not([disabled])').count(),10);assert.equal(await page.locator('[data-move] option[value=plates]').getAttribute('disabled'),'');
 await page.locator('[data-optimize]').click();assert.equal(await page.locator('[data-cell]:not([disabled])').count(),10);
 // Worker failure must be explicit and must not display a guessed absolute bucks rate.
 await page.evaluate(async raw=>{const original=window.Worker;window.Worker=class{constructor(){throw Error('Test worker unavailable');}};try{await window.SushiPage.render(document.querySelector('.sushi-planner').parentElement,raw,[]);}finally{window.Worker=original;}},structuredClone(raw));
 assert((await page.locator('.sushi-planner [role=alert]').innerText()).includes('Test worker unavailable'));
 assert((await page.locator('.sushi-panel').innerText()).includes('Unavailable'));
 await page.locator('[data-retry]').click();await page.locator('.sushi-hero').waitFor({timeout:60000});assert.equal(await page.locator('.sushi-planner [role=alert]').count(),0);
 await tab('Bonus breakdowns').click();await page.locator('[data-source=eventShop]').click();await page.waitForFunction(()=>!document.querySelector('.sushi-planner'));
 assert.deepEqual(errors,[]);console.log('Sushi browser: all seven views, filtering, board suggestions/swaps/reset, desktop and mobile passed.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});


