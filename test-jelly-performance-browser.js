const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://localhost:7333/**',route=>{const n=new URL(route.request().url()).pathname,file=path.resolve(__dirname,'.'+(n==='/'?'/index.html':n));return route.fulfill(file.startsWith(__dirname+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()?{contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)}:{status:404,body:''});});
 await page.goto('http://localhost:7333/');await page.evaluate(raw=>{document.querySelector('#jsonInput').value=raw;document.querySelector('#parseBtn').click();},fs.readFileSync('../example json.txt','utf8'));
 await page.evaluate(()=>window.PlannerFeatures.loadTools());
 await page.evaluate(()=>{
  // These calculations must run in solver-worker, never block browser input.
  for(const name of ['simulateMany','simulateOne','planUpgradePurchases','autoDamageScale','calibrateToObservedClearTime'])window.JellyEngine[name]=()=>{throw new Error(name+' ran on the UI thread');};
  document.querySelector('#navJelly').click();
 });
 await page.waitForFunction(()=>document.querySelector('#solverStatus').textContent.startsWith('Loaded.'),null,{timeout:60000});
 await page.evaluate(()=>{
  const NativeWorker=window.Worker;window.__liveJellyWorkers=new Set();
  window.Worker=class extends NativeWorker{
   constructor(...args){super(...args);if(String(args[0]).includes('solver-worker'))window.__liveJellyWorkers.add(this);}
   terminate(){window.__liveJellyWorkers.delete(this);super.terminate();}
  };
 });
 await page.locator('#tabPractice').click();
 await page.waitForFunction(()=>document.querySelector('#practiceStatus').textContent.startsWith('Practice only'));
 await page.evaluate(()=>window.__practiceSlot=document.querySelector('#practiceBoard .board-slot'));
 await page.locator('#practiceFrame').evaluate(el=>{el.value='1';el.dispatchEvent(new Event('input'));});
 assert(await page.evaluate(()=>window.__practiceSlot===document.querySelector('#practiceBoard .board-slot')),'scrubbing must reuse board elements');
 await page.locator('#tabUpgrades').click();
 await page.locator('#jellyUpgradeMode').selectOption('future');
 await page.locator('#jellyUpgradeCount').selectOption('1000');
 // Supersede expensive work immediately; only the last selection may render.
 await page.locator('#jellyUpgradeCount').selectOption('25');
 await page.waitForFunction(()=>document.querySelectorAll('#jellyUpgradePlan tbody tr').length===25,null,{timeout:60000});
 assert.equal(await page.evaluate(()=>window.__liveJellyWorkers.size),0);
 await page.locator('#tabOptimizer').click();
 await page.locator('#observedTime').fill('20');
 await page.locator('#optimizeBtn').click();
 await page.locator('#cancelBtn').click();
 await page.waitForFunction(()=>document.querySelector('#solverStatus').textContent==='Search cancelled.');
 assert(await page.locator('#optimizeBtn').isEnabled());
 await page.locator('#optimizeBtn').click();
 await page.locator('#navHome').click();
 await page.waitForFunction(()=>window.__liveJellyWorkers.size===0);
 assert.deepEqual(errors,[]);
 console.log('Jelly calculations stay off the UI thread; board DOM is reused, superseded jobs terminate, and navigation cancels search.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
