'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const quality=process.env.JELLY_SEARCH_QUALITY||'deep',objective=quality==='extended'?'chance':'dps';
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://localhost:7333/**',route=>{
   const pathname=new URL(route.request().url()).pathname,file=path.resolve(__dirname,'.'+(pathname==='/'?'/index.html':pathname));
   return route.fulfill(file.startsWith(__dirname+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()?{contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)}:{status:404,body:''});
  });
  await page.goto('http://localhost:7333/');
  await page.evaluate(raw=>{document.querySelector('#jsonInput').value=raw;document.querySelector('#parseBtn').click();},fs.readFileSync('../example json.txt','utf8'));
  await page.evaluate(()=>window.PlannerFeatures.loadTools());
  await page.evaluate(()=>{
   const NativeWorker=window.Worker;
   window.Worker=class extends NativeWorker{
    constructor(...args){super(...args);this.addEventListener('message',({data})=>{if(data.type==='result'&&data.value?.arrangement)window.__deepResult=data.value;});}
    postMessage(data,...args){if(data.job==='optimize')window.__deepOptions=data.options;return super.postMessage(data,...args);}
   };
   document.querySelector('#navJelly').click();
  });
  await page.waitForFunction(()=>document.querySelector('#solverStatus').textContent.startsWith('Loaded.'));
  await page.locator('#searchQuality').selectOption(quality);await page.locator('#objectiveMode').selectOption(objective);await page.locator('#searchFever').uncheck();
  await page.locator('#optimizeBtn').click();
  await page.waitForFunction(()=>document.querySelector('#solverStatus').textContent.startsWith('Best found:'),null,{timeout:180000});
  const result=await page.evaluate(()=>({options:window.__deepOptions,stats:window.__deepResult.stats,current:window.__deepResult.currentStats,lookahead:window.__deepResult.lookahead}));
  assert.equal(result.options.lookaheadDepth,quality==='extended'?5:3);assert.equal(result.options.beamWidth,quality==='extended'?8:6);assert.equal(result.stats.runs,quality==='extended'?500:384);
  assert(result.lookahead.depth>0&&result.lookahead.evaluated>0);
  if(objective==='chance')assert(result.stats.clearRate>=result.current.clearRate);else assert(result.stats.avgPeakDps>=result.current.avgPeakDps);
  assert((await page.locator('#layoutChanges').innerText()).includes('Lookahead reached'));
  assert(await page.locator('#optimizeBtn').isEnabled());assert.deepEqual(errors,[]);
  console.log('Actual '+quality+' browser search passed:',JSON.stringify({runs:result.stats.runs,lookahead:result.lookahead,savedClearRate:result.current.clearRate,selectedClearRate:result.stats.clearRate,savedDps:result.current.avgPeakDps,selectedDps:result.stats.avgPeakDps}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
