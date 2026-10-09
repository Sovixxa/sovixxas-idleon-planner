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
 await page.locator('#jsonInput').fill(JSON.stringify(raw));await page.locator('#parseBtn').click();
 await page.waitForFunction(()=>/^(Save age|Imported):/.test(document.getElementById('qolFreshness').textContent),{},{timeout:60000});
 await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'stamps'})));
 await page.locator('#stampStatus').waitFor({timeout:60000});
 assert(await page.locator('#stampRows tr').count()>100);
 const materialRows=await page.evaluate(async raw=>{const report=StampOptimizer.model(await StampCalculator.load(raw));return report.rows.map(r=>({name:r.name,categories:UpgradeMaterials.stamp(r)}));},raw);
 const materialOptions=await page.locator('#stampMaterial option').allTextContents();
 for(const category of materialOptions.filter(s=>s!=='All')){
  await page.locator('#stampMaterial').selectOption(category);
  const expected=materialRows.filter(r=>r.categories.includes(category));
  assert.equal(await page.locator('#stampRows tr').count(),expected.length,category+' row count');
  const text=await page.locator('#stampRows').innerText();
  for(const row of expected)assert(text.includes(row.name),category+': '+row.name);
  for(const name of await page.locator('.stamp-opt-todo h4').allTextContents())assert(expected.some(r=>r.name===name),category+' recommendation: '+name);
 }
 await page.locator('#stampMaterial').selectOption('All');
 await page.locator('#stampGoal').selectOption('0.99');await page.locator('#stampReserve').selectOption('2');
 await page.locator('#stampStatus').selectOption('Clear inventory');assert.match(await page.locator('#stampRows').innerText(),/Clear inventory/);
 await page.locator('#stampStatus').selectOption('Carry blocked');
 assert.match(await page.locator('#stampRows').innerText(),/Carry blocked/);
 await page.locator('#stampStatus').selectOption('Upgradeable now');
 assert.match(await page.locator('#stampRows').innerText(),/Upgradeable now/);
 await page.locator('#stampSearch').fill('zzzzzz');assert.match(await page.locator('#stampRows').innerText(),/No stamps/);
 await page.locator('#stampSearch').fill('');
 await page.screenshot({path:'../audit/stamp-calculator-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile page overflow');
 await page.locator('#stampCollection').click();await page.locator('.stamp-grid').first().waitFor();
 await page.getByRole('button',{name:'← Upgrade calculator'}).click();await page.locator('#stampStatus').waitFor();
 assert.deepEqual(errors,[]);console.log('Stamp calculator: import, status filters, search, collection navigation, mobile layout pass.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

