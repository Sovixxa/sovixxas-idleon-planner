'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.join(__dirname,'dist'),base='http://localhost:7339/planner/';
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],requests=[];let failEngine=false,failTools=false;
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
 await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.hostname!=='localhost')return route.abort();if(url.pathname.startsWith('/__'))return route.fulfill({contentType:'application/json',body:'{}'});const relative=url.pathname.replace(/^\/planner\//,'');if(failEngine&&relative==='beanstalk-engine.js'){failEngine=false;return route.abort();}if(failTools&&relative==='planner.features.js'){failTools=false;return route.abort();}const file=path.resolve(root,relative||'index.html');if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});return route.fulfill({contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream',body:path.extname(file)==='.html'?fs.readFileSync(file,'utf8').replace('</body>','<script>window.unsafeInlineScript=true</script></body>'):fs.readFileSync(file)});});
 await page.goto(base+'#/credits');await page.locator('#qolSearchOpen').waitFor();
 assert.match(await page.title(),/^Credits/);assert.equal(await page.locator('#navCredits').getAttribute('aria-current'),'page');
 assert(await page.locator('#quickNotes').evaluate(e=>e.classList.contains('collapsed')),'Mobile notes default to collapsed');
 assert(!requests.some(url=>url.includes('beanstalk-engine.js')),'No large account engine on the empty shell');
 assert(!requests.some(url=>url.includes('planner.features.')),'Home and Credits must not eagerly download tool scripts or styles');
 assert(fs.statSync(path.join(root,'planner.bundle.js')).size<300000,'Keep the startup JS below 300 KB');assert(fs.statSync(path.join(root,'planner.bundle.css')).size<120000,'Keep startup CSS below 120 KB');
 failTools=true;await page.locator('#navDailies').click();await page.getByRole('button',{name:'Retry loading',exact:true}).waitFor();await page.locator('#navHome').click();assert.match(await page.title(),/^Home/);await page.locator('#navDailies').click();await page.waitForFunction(()=>window.PlannerFeatures.toolsReady());
 await page.locator('#navHome').click();await page.locator('#navDailies').click();assert.match(page.url(),/#\/dailies$/);assert.equal(await page.locator('#pageHeading').evaluate(e=>e===document.activeElement),true);
 await page.goBack();assert.match(await page.title(),/^Home/);await page.goForward();assert.match(await page.title(),/^Activity dashboard/);
 await page.reload();assert.equal(await page.locator('#navDailies').getAttribute('aria-current'),'page');
 await page.keyboard.press('Tab');await page.locator('.skip-link').focus();const beforeSkip=page.url();await page.keyboard.press('Enter');assert.equal(page.url(),beforeSkip);assert.equal(await page.locator('#pageHeading').evaluate(e=>e===document.activeElement),true);
 await page.locator('#navHome').click();await page.locator('#jsonInput').fill('{invalid');await page.locator('#parseBtn').click();assert(await page.locator('#error').isVisible());assert(!requests.some(url=>url.includes('beanstalk-engine.js')),'Invalid imports do not download the account engine');
 // Synthetic fixture: no personal save, authentication or private client is required in CI.
 const fixture={Research:Array.from({length:19},()=>[])};failEngine=true;await page.locator('#jsonInput').fill(JSON.stringify(fixture));await page.locator('#parseBtn').click();await page.waitForFunction(()=>!document.getElementById('parseBtn').disabled);assert.match(await page.locator('#error').innerText(),/could not load/);assert.equal(await page.locator('#jsonInput').inputValue(),JSON.stringify(fixture));
 await page.locator('#parseBtn').click();await page.waitForFunction(()=>!document.getElementById('parseBtn').disabled&&document.getElementById('jsonInput').value==='');assert(await page.locator('#changeJsonBtn').isVisible());
 const beforeImportRoute=page.url();await page.locator('#changeJsonBtn').click();await page.locator('#jsonInput').fill(JSON.stringify(fixture));await page.locator('#parseBtn').click();assert.equal(page.url(),beforeImportRoute,'Save refresh does not add an intermediate route');
 assert(requests.filter(u=>u.includes('beanstalk-engine.js')).every(u=>new URL(u).searchParams.has('v')),'Lazy resources share the release cache version');
 await page.locator('#quickNotesToggle').click();await page.evaluate(()=>{window.testStorageSet=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='idleon-planner-quick-notes-v1')throw new DOMException('Quota','QuotaExceededError');return window.testStorageSet.call(this,key,value);};});
 await page.locator('#quickNotesInput').fill('Keep this unsaved draft');assert.match(await page.locator('.quick-notes-status').innerText(),/Not saved/);assert(await page.locator('#quickNotesRecovery').isVisible());assert.equal(await page.evaluate(()=>localStorage.getItem('idleon-planner-quick-notes-v1')),null);
 const download=page.waitForEvent('download');await page.locator('#quickNotesDownload').click();assert.equal((await download).suggestedFilename(),'idleon-notes.txt');
 await page.evaluate(()=>{Storage.prototype.setItem=window.testStorageSet;});await page.locator('#quickNotesRetry').click();assert.equal(await page.evaluate(()=>localStorage.getItem('idleon-planner-quick-notes-v1')),'Keep this unsaved draft');assert.equal(await page.locator('.quick-notes-status').innerText(),'Saved locally');
 // Deliberate user preference wins over the responsive default after reload.
 await page.reload();assert(!await page.locator('#quickNotes').evaluate(e=>e.classList.contains('collapsed')));
 await page.locator('#quickNotesToggle').click();await page.setViewportSize({width:320,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 const csp=await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');assert.match(csp,/script-src-attr 'none'/);assert.match(csp,/'strict-dynamic'/);assert.match(csp,/'sha256-/);
 assert.equal(await page.evaluate(()=>!!window.unsafeInlineScript),false,'Unexpected inline script blocks must be rejected');
 assert.equal(await page.evaluate(()=>{const b=document.createElement('button');b.setAttribute('onclick','window.unsafeInlineExecuted=true');document.body.append(b);b.click();b.remove();return !!window.unsafeInlineExecuted;}),false,'Inline event injection is blocked');
 assert.deepEqual(errors,[]);assert.equal(await page.locator('script[src^="planner.bundle.js"]').count(),1);assert.equal(await page.locator('link[href^="planner.bundle.css"]').count(),1);
 console.log('Built release: deep links, Back/Forward, reload, skip/focus, lazy import and retry, note quota recovery/download, mobile preference, CSP and subpath assets pass.');
 }finally{await browser.close();}})().catch(error=>{console.error(error.name,String(error.message).split('Call log:')[0]);process.exitCode=1;});
