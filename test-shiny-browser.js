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
 const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8'));
 const breeding=typeof raw.data.Breeding==='string'?JSON.parse(raw.data.Breeding):raw.data.Breeding;breeding[22][0]=1;raw.data.Breeding=JSON.stringify(breeding);
 await page.locator('#changeJsonBtn').click();
 await page.locator('#jsonInput').fill(JSON.stringify(raw));await page.locator('#parseBtn').click();
 await page.waitForFunction(()=>/^(Save age|Imported):/.test(document.getElementById('qolFreshness').textContent),{},{timeout:60000});
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'shinyPets'})));
 await page.locator('.shiny-pet').first().waitFor({timeout:60000});
 assert.equal(await page.locator('.shiny-pet').count(),68);
 await page.waitForFunction(()=>Number(document.querySelector('[aria-label="Shiny speed multiplier"]').value)>0,null,{timeout:60000});
 assert(await page.locator('[aria-label="Shiny timing character"] option').count()>0);
 await page.locator('[aria-label="Timing pet"]').selectOption({label:'Green Mushroom · Lv 1'});
 await page.locator('[aria-label="Shiny copies"]').fill('2');
 await page.locator('.shiny-time-settings summary').click();
 await page.locator('[aria-label="Shiny speed multiplier"]').fill('100');
 await page.locator('[aria-label="Clear-time calculation"]').selectOption('manual');
 await page.locator('[aria-label="Full-map clear time"]').fill('2');
 await page.locator('[aria-label="Shiny farming map"]').selectOption({index:1});
 await page.waitForFunction(()=>document.querySelector('.shiny-time').innerText.includes('Full-clear scenario:'),null,{timeout:60000});
 const mapRates=await page.locator('[aria-label="Shiny farming map"] option').allTextContents();
 const rates=mapRates.map(text=>{const match=text.match(/ - ([\d,]+) kills\/hr$/);return match?Number(match[1].replaceAll(',','')):-1;});
 assert(rates.length>1);
 assert(rates.every((rate,i)=>i===0||rates[i-1]>=rate),'Maps must be sorted by estimated kills, highest first');
 await page.locator('[data-time="enhanced"]').check();
 assert.match(await page.locator('.shiny-time-results').innerText(),/Active .* speed/);
 await page.locator('[aria-label="Shiny copies"]').fill('0');
 assert.match(await page.locator('.shiny-time-results').innerText(),/No progress/);
 await page.locator('[aria-label="Shiny copies"]').fill('2');
 assert(!(await page.locator('.shiny-planner').innerText()).includes('NaN'));
 await page.locator('[aria-label="Search shiny pets"]').fill('Green Mushroom');assert.equal(await page.locator('.shiny-pet').count(),1);
 await page.locator('[aria-label="Search shiny pets"]').fill('');
 if(await page.locator('#quickNotes').evaluate(el=>!el.classList.contains('collapsed')))await page.locator('.quick-notes-toggle').click();
 await page.locator('[aria-label="Timing pet"]').focus();
 await page.locator('.shiny-time').screenshot({path:'../audit/shiny-time-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 await page.locator('.shiny-time').screenshot({path:'../audit/shiny-time-mobile.png'});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.evaluate(()=>{const host=document.querySelector('.shiny-planner').parentElement;window.ShinyPlanner.render(host,[{bonusId:16,effect:'Shiny speed',level:'20 combined levels',pets:[{id:'mushG',level:20,maxLevel:30,unlocked:true,world:1,order:0,icon:'assets/pets-static/mushG.png',perLevel:'1%',bonus:'20%'}]}]);});
 assert.equal(await page.locator('.shiny-next').count(),0);
 assert(!(await page.locator('.shiny-target').innerText()).includes('Complete'));
 await page.evaluate(()=>{const host=document.querySelector('.shiny-planner').parentElement;window.ShinyPlanner.render(host,[{bonusId:16,effect:'Shiny speed',level:'30 combined levels',pets:[{id:'mushG',level:30,maxLevel:30,unlocked:true,world:1,order:0,icon:'assets/pets-static/mushG.png'}]}]);});
 assert.equal(await page.locator('.shiny-next').count(),0);
 assert.match(await page.locator('.shiny-planner').innerText(),/10 total levels above 20 give 2×/);
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);console.log('Shiny planner browser: 68 pets, navigation, search, mobile overflow and console pass.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

