const fs=require('fs'),path=require('path'),assert=require('assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch();try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://compare.local/**',r=>{const f=path.join(process.cwd(),new URL(r.request().url()).pathname);return fs.existsSync(f)&&fs.statSync(f).isFile()?r.fulfill({path:f}):r.fulfill({contentType:'text/html',body:'<main></main>'});});
 await page.goto('http://compare.local/');for(const f of ['styles.css','json-compare.css'])await page.addStyleTag({path:f});for(const f of ['progression-models.js','json-compare.js'])await page.addScriptTag({path:f});
 await page.addStyleTag({content:'body{padding:18px;background:#170e22}'});
 const groups=JSON.parse(fs.readFileSync('../audit/json-compare-real-groups.json')),changed=JSON.parse(fs.readFileSync('../audit/json-compare-character-changed.json'));
 await page.evaluate(({groups,changed})=>{window.BonusSystems={getRowsAsync:async raw=>raw.second?changed:groups};JsonCompare.render(document.querySelector('main'),()=>({}));},{groups,changed});
 await page.locator('textarea').fill('{"second":true}');await page.locator('[data-compare]').click();await page.getByRole('button',{name:'Characters',exact:true}).click();
 assert.deepEqual(await page.locator('[data-category-tabs] button').allTextContents(),['Skills','Equipment','Loadouts','Inventory & Capacity','Progress']);
 for(const name of ['Equipment','Loadouts','Inventory & Capacity','Progress']){
  await page.getByRole('button',{name,exact:true}).click();await page.getByLabel('Comparison character',{exact:true}).selectOption('0');assert(await page.locator('.json-character-entry').count()>0,name);
  const changedCount=await page.locator('.json-character-entry').count();await page.getByLabel('Show unchanged',{exact:true}).check();assert(await page.locator('.json-character-entry').count()>changedCount,name+' unchanged');await page.getByLabel('Show unchanged',{exact:true}).uncheck();
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:900});const entry=page.locator('.json-character-entry').first();await entry.scrollIntoViewIfNeeded();const before=await entry.boundingBox();await entry.click();await page.waitForSelector('.json-character-popup:popover-open');
   const box=await page.locator('.json-character-popup').boundingBox();assert(box.x>=0&&box.y>=0&&box.x+box.width<=width&&box.y+box.height<=900);assert(Math.abs(width-box.x-box.width)<=20);assert.deepEqual(await entry.boundingBox(),before,'Popover does not move the grid');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:'../audit/compare-'+name.split(' ')[0].toLowerCase()+'-'+(width===390?'mobile':'desktop')+'-popup.png'});
   await page.keyboard.press('Escape');assert.equal(await page.locator(':popover-open').count(),0);
   await entry.click();await page.mouse.click(5,5);assert.equal(await page.locator(':popover-open').count(),0);
   await entry.click();await page.getByRole('button',{name:'Close comparison details'}).click();assert.equal(await page.locator(':popover-open').count(),0);
  }
  await page.getByLabel('Search character comparisons').fill('zz-no-match');assert.equal(await page.locator('.json-character-entry').count(),0);await page.getByLabel('Search character comparisons').fill('');
 }
 await page.getByLabel('Character comparison section').selectOption('Portals');assert.match(await page.locator('.json-character-entry-grid').innerText(),/7 kills left/);
 assert.deepEqual(errors,[]);console.log('Four character subtabs, filters, changes, missing values and desktop/mobile popover layout passed');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});


