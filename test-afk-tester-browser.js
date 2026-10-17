'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());if(url.hostname!=='localhost')return route.abort();
  if(url.pathname.startsWith('/__'))return route.fulfill({contentType:'application/json',body:'{}'});
  const file=path.resolve(__dirname,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
  if(!file.startsWith(__dirname+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({status:404,body:''});
  return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
 });
 await page.goto('http://localhost:7331/');
 const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8'));
 const keys=Object.keys(raw.data).filter(k=>/^Lv0_\d+$/.test(k)),count=keys.length;
 for(const key of keys){const id=Number(key.slice(4));for(const k of [key,'Exp0_'+id,'ExpReq0_'+id])if(typeof raw.data[k]==='string')raw.data[k]=JSON.parse(raw.data[k]);raw.data[key][0]=id===0?499:500;raw.data['Exp0_'+id][0]=0;raw.data['ExpReq0_'+id][0]=require('./afk-tester').requirement(raw.data[key][0]);}
 await page.locator('#jsonInput').fill(JSON.stringify(raw));await page.locator('#parseBtn').click();
 await page.waitForFunction(()=>/^(Save age|Imported):/.test(document.getElementById('qolFreshness').textContent),{},{timeout:60000});
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'accountReview'})));
 await page.locator('[data-review-tab="afkTester"]').click();
 assert.equal(await page.locator('.afk-character').count(),count);
 await page.waitForFunction(()=>document.querySelector('[data-afk-source="0"]')?.textContent.startsWith('Calculated for'),{},{timeout:60000});
 assert(Number(await page.locator('[data-afk-row="0"][data-afk-field="rate"]').inputValue())>0);
 assert(!/Spumpkin|ready for Lab|Map \/ activity label/.test(await page.locator('.afk-tester').innerText()));
 assert((await page.locator('[data-afk-summary]').innerText()).includes(`${count-1} / ${count} at target level`));
 const maps=page.locator('[data-afk-node="0"]');
 const savedMap=await maps.inputValue(),savedRate=await page.locator('[data-afk-row="0"][data-afk-field="rate"]').inputValue();
 const remaining=(await page.locator('[data-afk-result="0"]').innerText()).match(/EXP remaining: [^\n]+/)[0];
 const options=await maps.locator('option').evaluateAll(els=>els.map(e=>e.value));
 assert(options.length>20,'Combat map choices should be available');
 assert.match(await page.locator('[data-afk-audit="0"]').textContent(),/class EXP multiplier/);
 assert.match(await page.locator('[data-afk-audit="1"]').textContent(),/FIRMLY GRASP IT/);
 await maps.selectOption(options.find(v=>v!==savedMap));
 assert.notEqual(await page.locator('[data-afk-row="0"][data-afk-field="rate"]').inputValue(),savedRate);
 assert.equal((await page.locator('[data-afk-result="0"]').innerText()).match(/EXP remaining: [^\n]+/)[0],remaining,'Map changes do not change EXP needed');
 await page.locator('[data-afk-row="0"][data-afk-field="rate"]').fill('123');
 await maps.selectOption(savedMap);
 assert.equal(await page.locator('[data-afk-row="0"][data-afk-field="rate"]').inputValue(),savedRate,'Changing map clears the old manual rate');
 await page.setViewportSize({width:390,height:844});
 assert(await page.locator('.afk-tester').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Combat dropdown fits mobile');
 await page.screenshot({path:'../audit/afk-combat-maps-mobile.png',fullPage:true});
 await page.setViewportSize({width:1440,height:1000});
 await page.screenshot({path:'../audit/afk-combat-maps-desktop.png',fullPage:true});
 const rate=await page.evaluate(()=>String(window.AfkTester.requirement(499)/2));
 await page.locator('[data-afk-row="0"][data-afk-field="rate"]').fill(rate);
 assert.match(await page.locator('[data-afk-result="0"]').innerText(),/0d 2h 0m/);
 assert.match(await page.locator('[data-afk-summary]').innerText(),/Everyone reaches the target in/);
 await page.locator('[data-review-tab="review"]').click();await page.locator('[data-review-tab="afkTester"]').click();
 assert.equal(await page.locator('[data-afk-row="0"][data-afk-field="rate"]').inputValue(),rate);
 // Changing skills imports that skill, preserves independent plans, and blocks invalid consumables.
 await page.locator('[data-afk-skill]').selectOption('17');
 assert.equal(await page.locator('[data-afk-row="0"][data-afk-field="level"]').inputValue(),String(raw.data.Lv0_0[17]));
 assert.equal(await page.locator('[data-afk-mode] option[value="balloons"]').evaluate(el=>el.disabled),true);
 assert.match(await page.locator('.afk-tester').innerText(),/balloons cannot be used for Sneaking/);
 const sneakLevel=raw.data.Lv0_0[17];
 await page.locator('[data-afk-target]').fill(String(sneakLevel+1));
 await page.locator('[data-afk-row="0"][data-afk-field="rate"]').fill(String((raw.data.ExpReq0_0[17]-raw.data.Exp0_0[17])/2));
 assert.match(await page.locator('[data-afk-result="0"]').innerText(),/0d 2h 0m/);
 await page.locator('[data-afk-skill]').selectOption('19');
 assert.equal(await page.locator('[data-afk-row="0"][data-afk-field="level"]').inputValue(),String(raw.data.Lv0_0[19]));
 assert.equal(await page.locator('[data-afk-mode] option[value="balloons"]').evaluate(el=>el.disabled),true);
 await page.locator('[data-afk-skill]').selectOption('8');
 assert.equal(await page.locator('[data-afk-mode] option[value="balloons"]').evaluate(el=>el.disabled),true);
 await page.locator('[data-afk-skill]').selectOption('1');

 await page.locator('[data-afk-node="0"] option').first().waitFor({state:'attached'});
 assert(Number(await page.locator('[data-afk-row="0"][data-afk-field="rate"]').inputValue())>0);
 await page.locator('[data-afk-mode]').selectOption('candy');
 for(const item of require('./afk-tester').candyTypes){
  await page.locator('[data-afk-candy]').selectOption(item.id);
  assert.match(await page.locator('[data-afk-result="0"]').innerText(),/Candy needed|candies/i);
 }
 const nodeOptions=await page.locator('[data-afk-node="0"] option').evaluateAll(els=>els.map(e=>e.value));
 await page.locator('[data-afk-node="0"]').selectOption(nodeOptions[1]);
 assert.match(await page.locator('[data-afk-source="0"]').innerText(),/Calculated for/);
 await page.locator('[data-afk-mode]').selectOption('balloons');
 assert(Number(await page.locator('[data-afk-row="0"][data-afk-field="multiplier"]').inputValue())>1);

 for(const size of ['small','medium','large']){
  await page.locator('[data-afk-balloon]').selectOption(size);
  assert.match(await page.locator('[data-afk-result="0"]').innerText(),/balloons:/);
 }
 await page.locator('[data-afk-balloon]').selectOption('small');
 await page.locator('[data-afk-target]').fill('11');
 await page.locator('[data-afk-row="0"][data-afk-field="level"]').fill('10');
 await page.locator('[data-afk-row="0"][data-afk-field="progress"]').fill('0');
 await page.locator('[data-afk-row="0"][data-afk-field="multiplier"]').fill('1');
 assert.match(await page.locator('[data-afk-result="0"]').innerText(),/Small balloons:.*3/s);
 await page.locator('[data-afk-balloon]').selectOption('large');
 assert.match(await page.locator('[data-afk-result="0"]').innerText(),/Large balloons:.*1/s);
 await page.locator('[data-afk-skill]').selectOption('17');
 assert.equal(await page.locator('[data-afk-mode]').inputValue(),'afk');
 assert.equal(await page.locator('[data-afk-target]').inputValue(),String(sneakLevel+1));
 await page.locator('[data-afk-skill]').selectOption('20');
 assert(Number(await page.locator('[data-afk-row="0"][data-afk-field="rate"]').inputValue())>0);
 assert.match(await page.locator('[data-afk-source="0"]').innerText(),/Research observations/);
 await page.locator('[data-afk-skill]').selectOption('11');
 assert.equal(await page.locator('.afk-character').count(),1);
 await page.locator('[data-afk-skill]').selectOption('0');
 assert.equal(await page.locator('[data-afk-row="0"][data-afk-field="rate"]').inputValue(),rate);
 await page.locator('[data-afk-skill]').selectOption('3');
 await page.locator('[data-afk-mode]').selectOption('candy');
 await page.screenshot({path:'../audit/afk-tester-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert(await page.locator('.afk-tester').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'Tester must fit mobile width');
 await page.screenshot({path:'../audit/afk-tester-mobile.png',fullPage:true});
 await page.locator('[data-afk-skill]').selectOption('0');
 await page.locator('[data-afk-target]').fill('');assert((await page.locator('[data-afk-summary]').innerText()).includes(`${count} need`));
 await page.locator('[data-afk-reset]').click();assert.equal(await page.locator('[data-afk-target]').inputValue(),'500');
 assert(Number(await page.locator('[data-afk-row="0"][data-afk-field="rate"]').inputValue())>0);
 assert.equal(await page.locator('[data-review-tab]').count(),2);
 assert.equal(await page.getByRole('tab',{name:'EXP Planning',exact:true}).count(),0);
 assert.equal(await page.locator('[data-exp-tab]').count(),0);
 assert(!fs.readFileSync('app.js','utf8').includes("classExp:{title:'Class EXP Optimizer'"));
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'classExp'})));
 assert.match(page.url(),/#\/accountReview$/);
 await page.goto('http://localhost:7331/#/classExp');
 await page.waitForURL('**/#/accountReview');
 await page.locator('[data-review-tab="afkTester"]').waitFor();
 // Exercise the candy controls with a manual planning row independently of saved map restrictions.
 await page.evaluate(()=>{const host=document.createElement('div');host.id='candy-test';document.body.append(host);AfkTester.render(host,null);});
 const candyHost=page.locator('#candy-test');
 await candyHost.locator('[data-afk-mode]').selectOption('candy');
 await candyHost.locator('[data-afk-target]').fill('11');
 await candyHost.locator('[data-afk-field="level"]').fill('10');
 await candyHost.locator('[data-afk-field="rate"]').fill(String(Math.ceil(require('./afk-tester').requirement(10)/2.5)));
 assert.match(await candyHost.locator('[data-afk-result="0"]').innerText(),/Candy needed: 3/);
 await candyHost.locator('[data-afk-candy]').selectOption('Timecandy3');
 assert.match(await candyHost.locator('[data-afk-result="0"]').innerText(),/Candy needed: 1/);
 await candyHost.locator('[data-afk-candy]').selectOption('Timecandy9');
 assert.match(await candyHost.innerText(),/best\/worst duration bounds/);
 await candyHost.locator('[data-afk-skill]').selectOption('17');
 assert(await candyHost.locator('option[value="candy"]').evaluate(el=>el.disabled));
 assert.deepEqual(errors,[]);console.log('AFK tester browser: navigation, import, estimates, tab persistence, reset, mobile layout, skill dropdown, balloon restrictions and calculations, removed redundant EXP sections and legacy redirects passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
