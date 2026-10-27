'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://localhost:7332/**',async route=>{const pathname=decodeURIComponent(new URL(route.request().url()).pathname);if(pathname.startsWith('/__'))return route.fulfill({contentType:'application/json',body:'{}'});const file=path.resolve(__dirname,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(__dirname+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({status:404,body:''});return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});});


 await page.goto('http://localhost:7332/');await page.locator('#quickNotesToggle').click();
 const nav=key=>page.evaluate(key=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:key})),key);
 await nav('grimoire');await page.locator('.mc-empty').first().waitFor({timeout:15000,state:'attached'}).catch(async e=>{console.log(await page.locator('#worldContent').innerText(),errors);throw e;});
 const raw=JSON.parse(fs.readFileSync('../example json.txt'));await page.locator('#jsonInput').fill(JSON.stringify(raw));await page.locator('#parseBtn').click();
 await nav('royalArmory');await page.getByRole('tab',{name:'Rank rewards',exact:true}).click();
 assert.equal(await page.locator('.mc-rank-reward').count(),5);
 assert(await page.locator('.mc-rank-rewards').isVisible());
 assert((await page.locator('.mc-rank-rewards').innerText()).includes('Worker: rank 1'));
 assert(!(await page.locator('.mc-grid').isVisible()));
 await page.screenshot({path:'../audit/rg-rank-rewards-desktop.png'});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.screenshot({path:'../audit/rg-rank-rewards-mobile.png'});
 await page.setViewportSize({width:1440,height:1000});
 await page.getByRole('tab',{name:'Verminous',exact:true}).click();
 await page.locator('.mc-parchment-result').waitFor({timeout:60000});
 assert((await page.locator('.mc-parchment-result').innerText()).includes('Estimated parchments / hour'));
 assert(!(await page.locator('.mc-parchment-result').innerText()).includes('unavailable'));
 assert.equal(await page.locator('[name=parchment-kills], [name=parchment-minutes], [name=verminous-companion]').count(),0);
 assert(await page.locator('[name=parchment-character] option').count()>0);
 const options=await page.locator('[name=parchment-character] option').evaluateAll(rows=>rows.map(r=>r.value));
 if(options.length>1){await page.locator('[name=parchment-character]').selectOption(options[1]);assert(!(await page.locator('.mc-parchment-result').innerText()).includes('unavailable'));await page.locator('[name=parchment-character]').selectOption(options[0]);}

 await page.getByLabel('Orb counter',{exact:true}).fill('1000');
 await page.getByLabel('Orb timer (seconds elapsed)',{exact:true}).fill('200');
 assert((await page.locator('.mc-parchment-result').innerText()).includes('Using your Orb sample'));
 assert((await page.locator('.mc-parchment-result').innerText()).includes('18,000'));
 assert((await page.locator('.mc-parchment-result').innerText()).includes('10 active hours'));
 await page.getByLabel('Orb timer (seconds elapsed)',{exact:true}).fill('0');
 assert((await page.locator('.mc-parchment-result').innerText()).includes('greater than zero'));
 await page.getByLabel('Orb timer (seconds elapsed)',{exact:true}).fill('200');
 await page.locator('.mc-parchment-result').scrollIntoViewIfNeeded();
 await page.screenshot({path:'../audit/verminous-desktop.png'});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await page.locator('.mc-parchment-result').scrollIntoViewIfNeeded();
 await page.screenshot({path:'../audit/verminous-mobile.png'});
 await nav('masterclasses');assert.equal(await page.locator('[data-mc-nav]').count(),4);assert.deepEqual(errors,[]);console.log('RG parchment browser checks passed');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
