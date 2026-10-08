const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/Sofia/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://localhost:7333/**',route=>{const n=new URL(route.request().url()).pathname,file=path.resolve(__dirname,'.'+(n==='/'?'/index.html':n));return route.fulfill(file.startsWith(__dirname+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()?{contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)}:{status:404,body:''});});
 await page.goto('http://localhost:7333/');await page.evaluate(raw=>{document.querySelector('#jsonInput').value=raw;document.querySelector('#parseBtn').click();},fs.readFileSync('../example json.txt','utf8'));
 await page.evaluate(()=>document.querySelector('#navJelly').click());
 assert.deepEqual(await page.locator('#objectiveMode option').evaluateAll(options=>options.map(x=>x.value)),['chance','dps','bloodcells']);
 await page.locator('#searchQuality').selectOption('quick');await page.locator('#searchFever').uncheck();
 for(const goal of ['chance','dps','bloodcells']){
  await page.locator('#objectiveMode').selectOption(goal);await page.locator('#optimizeBtn').click();
  await page.waitForFunction(()=>document.querySelector('#solverStatus').textContent.startsWith('Best found:'),null,{timeout:120000});
  const status=await page.locator('#solverStatus').innerText();assert(goal==='chance'||status.includes(goal==='dps'?'mean peak DPS':'mean Bloodcells per attempt'),status);
  assert((await page.locator('#bestSummary').textContent()).includes('Bloodcells / attempt'));
 }
 await page.screenshot({path:'../audit/jelly-objectives-desktop.png',fullPage:true}); await page.locator('.optimize-panel').screenshot({path:'../audit/jelly-controls-desktop.png'});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'../audit/jelly-objectives-mobile.png',fullPage:true}); await page.locator('.optimize-panel').screenshot({path:'../audit/jelly-controls-mobile.png'});assert.deepEqual(errors,[]);
 console.log('Both Jelly objectives complete through the browser worker; desktop/mobile layout and runtime errors pass.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
