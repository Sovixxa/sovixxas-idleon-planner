'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://localhost:7331/**',async route=>{
   const pathname=decodeURIComponent(new URL(route.request().url()).pathname);
   if(pathname.startsWith('/__'))return route.fulfill({contentType:'application/json',body:'{}'});
   const file=path.resolve(__dirname,'.'+(pathname==='/'?'/index.html':pathname));
   if(!file.startsWith(__dirname+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
   return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  await page.goto('http://localhost:7331/');
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'constellations'})));
  await page.locator('[data-constellation-world]').first().waitFor({state:'attached'});
  assert.equal(await page.locator('[data-constellation-world]').count(),6);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'home'})));
  await page.locator('#jsonInput').fill(JSON.stringify(JSON.parse(fs.readFileSync('../example json.txt','utf8'))));
  await page.locator('#parseBtn').click();
  await page.waitForFunction(()=>/^(Save age|Imported):/.test(document.getElementById('qolFreshness').textContent),{},{timeout:60000});

  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'constellations'})));
  await page.locator('[data-constellation-world]').first().waitFor();
  assert.equal(await page.locator('[data-constellation-world]').count(),6);
  assert.equal(await page.locator('[data-constellation]').count(),10);
  await page.locator('[data-constellation-world="W5"]').click();assert.equal(await page.locator('[data-constellation]').count(),7);
  await page.locator('[data-constellation]').first().click();assert(await page.locator('.constellation-detail').isVisible());
  await page.keyboard.press('Escape');assert(await page.locator('.constellation-detail').isHidden());
  assert(await page.locator('[data-constellation]').first().evaluate(el=>el===document.activeElement));
  assert(await page.locator('[data-skill-tab="starSigns"]').isVisible());
  await page.evaluate(()=>{
   window.savedBonusLoader=window.BonusSystems.getRowsAsync;
   window.BonusSystems.getRowsAsync=()=>new Promise(resolve=>window.finishConstellations=resolve);
   window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'constellations'}));
   window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'credits'}));
  });
  const before=await page.locator('#worldContent').innerHTML();
  await page.evaluate(async()=>{window.finishConstellations({constellations:[]});await Promise.resolve();window.BonusSystems.getRowsAsync=window.savedBonusLoader;});
  assert.equal(await page.locator('#worldContent').innerHTML(),before);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'holeMonuments'})));
  await page.locator('.hole-bonus-tile').first().waitFor();
  assert(!(await page.locator('#worldContent').innerText()).includes('Save data mapping will be added'));
  assert.deepEqual(errors,[]);
  console.log('Constellations: no-save catalogue, async account completion, all world tabs, parent tabs, keyboard dismissal, and stale navigation pass.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
