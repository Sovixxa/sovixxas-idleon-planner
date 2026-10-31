'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://localhost:7332/**',async route=>{const p=decodeURIComponent(new URL(route.request().url()).pathname);if(p.startsWith('/__'))return route.fulfill({contentType:'application/json',body:'{}'});const file=path.resolve(__dirname,'.'+(p==='/'?'/index.html':p));if(!file.startsWith(__dirname+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({status:404,body:''});return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});});
 await page.goto('http://localhost:7332/');await page.locator('#quickNotesToggle').click();
 const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8')),d=raw.data||raw;d.Menagerie=Array.from({length:7},()=>Array(40).fill(0));d.Menagerie[0]=[10000,3,30,1,2,0,10,100,25,3,4,1,1,1,1];d.Menagerie[2][2]=1;d.Menagerie[2][4]=1;d.Menagerie[2][13]=1;d.Menagerie[3][23]=3;
 await page.evaluate(value=>{document.querySelector('#jsonInput').value=value;document.querySelector('#parseBtn').click();},JSON.stringify(raw));
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'menagerie'})));
 await page.locator('.menagerie-page').waitFor({timeout:60000});
 assert.equal(await page.locator('.mena-tile').count(),33);
 for(const [tab,count] of [['Unlocks',25],['Boosts',25],['Jellyfish',6],['Singularity',6],['Scurge',9],['Nightmariners',2],['Lumi sources',18]]){await page.locator('[data-mena-tab="'+tab+'"]').click();assert.equal(await page.locator('.mena-tile').count(),count);for(const src of await page.locator('.mena-tile img').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('src'))))assert(fs.existsSync(src),src);}
 await page.locator('.mena-analysis').waitFor({timeout:60000});
 assert(!/Unknown Lumi \/ hour/.test(await page.locator('.mena-analysis').innerText()));
 await page.locator('[data-mena-tab="Crucible"]').click();assert.equal(await page.locator('.mena-tile').count(),16);
 await page.locator('[data-mena-tab="Boosts"]').click();
 for(const id of [2,5,8,10,12,17,23]){
  if(await page.locator('[data-mena-close]').count())await page.locator('[data-mena-close]').click();
  await page.locator(`[data-mena-boost="${id}"]`).click();
  assert.equal(await page.locator('.mena-costs tbody tr').count(),10);
  const level=d.Menagerie[3][id],cost=require('./menagerie').boostCost(id,level);
  assert.equal(await page.locator('.mena-costs tbody tr').first().locator('td').nth(1).innerText(),cost>=1e15?cost.toExponential(3):cost.toLocaleString('en',{notation:'compact',maximumFractionDigits:2}));
  assert.equal(await page.locator('.mena-costs tbody tr').last().locator('td').first().innerText(),`${level+9} → ${level+10}`);
 }
 await page.screenshot({path:'../audit/menagerie-boost-costs-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 const popup=await page.locator('.mena-costs').boundingBox();assert(popup.x>=0&&Math.abs(popup.x+popup.width-372)<2&&Math.abs(popup.y+popup.height-826)<2);
 await page.screenshot({path:'../audit/menagerie-boost-costs-mobile.png',fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.keyboard.press('Escape');assert.equal(await page.locator('.mena-costs').count(),0);
 await page.locator('[data-mena-tab="Lumi sources"]').click();await page.screenshot({path:'../audit/menagerie-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'../audit/menagerie-mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 assert.deepEqual(errors,[]);console.log('Menagerie browser: routing, missing save, nine tabs, saved data, desktop/mobile and no page errors pass.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
