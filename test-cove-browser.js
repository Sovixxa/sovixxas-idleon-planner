'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/Sofia/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://localhost:7332/**',async route=>{const pathname=decodeURIComponent(new URL(route.request().url()).pathname);if(pathname.startsWith('/__'))return route.fulfill({contentType:'application/json',body:'{}'});const file=path.resolve(__dirname,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(__dirname+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({status:404,body:''});return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});});

 await page.goto('http://localhost:7332/');await page.locator('#quickNotesToggle').click();
 const chooseShape=async(value)=>{const picker=page.locator('[data-currency-picker="shape"]');await picker.locator('summary').click();assert.equal(await picker.locator('[role=option] img').count(),12);assert(await picker.locator('[data-shape-option="11"]').isVisible());await picker.locator('[data-shape-option="'+value+'"]').click();};
 const navigate=()=>page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'holeCove'})));
 await navigate();assert.equal(await page.locator('.hole-tab-stack').count(),1);await page.getByText('Import an IdleOn save with Cove data').waitFor({state:'attached'});
 const raw=JSON.parse(fs.readFileSync('../example json.txt'));await page.locator('#jsonInput').fill(JSON.stringify(raw));await page.locator('#parseBtn').click();await navigate();
 await page.locator('.cove-optimizer').waitFor({timeout:60000});assert.equal(await page.locator('.cove-upgrade-card').count(),12);assert.equal(await page.locator('.fountain-plan tbody tr').count(),100);
 await page.locator('[data-done]').first().click();assert.equal(await page.locator('.fountain-plan tbody tr').count(),99);
 await navigate();assert.equal(await page.locator('.fountain-plan tbody tr').count(),99);
 await page.locator('[data-undo]').click();assert.equal(await page.locator('.fountain-plan tbody tr').count(),100);
 await page.locator('[name=mode]').selectOption('now');assert.equal(await page.locator('.fountain-future').count(),0);
 await page.locator('[name=mode]').selectOption('roadmap');
 await page.locator('[name=goal]').selectOption('research');assert((await page.locator('.fountain-plan').innerText()).includes('Researchy'));
 await page.locator('[data-compress]').check();const rows=await page.locator('.fountain-plan tbody tr').count();assert(rows<100);
 await page.locator('[data-done]').first().click();assert((await page.locator('.fountain-checklist').innerText()).includes('remaining'));
 await page.locator('[data-reset]').click();await page.locator('[data-compress]').uncheck();
 await page.locator('[name=goal]').selectOption('drop');await page.locator('[data-tab="1"]').click();assert.equal(await page.locator('[data-detail="23"]').count(),1);await page.locator('[data-detail="23"]').click();assert(await page.locator('.cove-detail').isVisible());await page.getByRole('button',{name:'Close Cove details'}).click();assert(!await page.locator('.cove-detail').isVisible());
 
 assert.equal(await page.locator('.hole-tab-stack').count(),1,'Hole navigation survives planner redraws');
 await page.locator('[data-skill-tab="holeWell"]').click();await page.getByRole('heading',{name:'The Well',exact:true}).waitFor();
 await page.locator('[data-skill-tab="holeCove"]').click();await page.locator('.cove-optimizer').waitFor();
 await chooseShape('0');assert.equal(await page.locator('.hole-tab-stack').count(),1);
 assert.equal(await page.locator('[data-currency-picker=shape] summary img').getAttribute('src'),'assets/HoleGshape0.png');await chooseShape('11');assert.equal(await page.locator('.cove-upgrade-card').count(),2);assert.equal(await page.locator('[data-detail="23"]').count(),1);await chooseShape('all');assert.equal(await page.locator('.hole-tab-stack').count(),1);
 await page.locator('[data-currency-picker=shape] summary').click();await page.screenshot({path:'../audit/cove-shapes-dropdown.png',fullPage:true});await page.locator('[data-currency-picker=shape] summary').click();
 await page.screenshot({path:'../audit/cove-desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'../audit/cove-mobile.png',fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'No mobile page overflow');
 assert.deepEqual(errors,[]);console.log('Cove browser: navigation, imported save, checklist, filters, goals, detail and mobile layout passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
