const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://localhost:7333/**',route=>{const n=new URL(route.request().url()).pathname,file=path.resolve(__dirname,'.'+(n==='/'?'/index.html':n));return route.fulfill(file.startsWith(__dirname+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()?{contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)}:{status:404,body:''});});
 await page.goto('http://localhost:7333/');await page.evaluate(raw=>{document.querySelector('#jsonInput').value=raw;document.querySelector('#parseBtn').click();},fs.readFileSync('../example json.txt','utf8'));
 await page.evaluate(()=>window.PlannerFeatures.loadTools());
 await page.evaluate(()=>{
  // These calculations must run in solver-worker, never block browser input.
  for(const name of ['simulateMany','autoDamageScale','calibrateToObservedClearTime'])window.JellyEngine[name]=()=>{throw new Error(name+' ran on the UI thread');};
  document.querySelector('#navJelly').click();
 });
 await page.waitForFunction(()=>document.querySelector('#solverStatus').textContent.startsWith('Loaded.'),null,{timeout:60000});
 await page.evaluate(()=>{
  const NativeWorker=window.Worker;window.__jellyTrials=[];
  window.Worker=class extends NativeWorker{constructor(...args){super(...args);this.addEventListener('message',({data})=>{
   if(data.type==='progress'&&data.progress?.arrangement)window.__jellyTrials.push(data.progress);
   if(data.type==='result'&&data.value?.arrangement&&data.value?.stats)window.__jellyResult=data.value;
   if(data.type==='result'&&data.value?.best)window.__jellyResult=data.value.best;
  });} postMessage(data,...args){
   // Bound search breadth for UI coverage; retain the real solver and all result checks.
   if(data.job==='optimize')data={...data,options:{...data.options,timeMs:500,runs:8,mixLimit:12,shortlist:4,screenRuns:1,refineRuns:1,finalists:4,searchSeed:12345}};
   if(data.job==='train')data={...data,options:{...data.options,generations:2,timeMs:900,runs:8,mixLimit:12,shortlist:4,screenRuns:1,refineRuns:1,finalists:2,searchSeed:12345}};
   return super.postMessage(data,...args);
  }};
 });
 assert.deepEqual(await page.locator('#objectiveMode option').evaluateAll(options=>options.map(x=>x.value)),['chance','dps','bloodcells','cellExp']);
 await page.locator('#searchQuality').selectOption('quick');await page.locator('#searchFever').uncheck();
 for(const goal of ['chance','dps','bloodcells','cellExp']){
  await page.locator('#objectiveMode').selectOption(goal);await page.locator('#optimizeBtn').click();
  await page.waitForFunction(()=>document.querySelector('#solverStatus').textContent.startsWith('Best found:'),null,{timeout:300000}).catch(async error=>{console.error('Jelly status:',await page.locator('#solverStatus').textContent(),'Page errors:',errors);throw error;});
  const status=await page.locator('#solverStatus').innerText();assert(goal==='chance'||status.includes(goal==='cellExp'?'mean cell levels gained':goal==='dps'?'mean peak DPS':'mean Bloodcells per attempt'),status);
  assert((await page.locator('#bestSummary').textContent()).includes('Bloodcells / attempt'));
  assert((await page.locator('#bestSummary').textContent()).includes('Stronkroid'));
  assert((await page.locator('#bestSummary').textContent()).includes('activated in'));
  const comparison=await page.evaluate(()=>({result:window.__jellyResult,current:document.querySelector('#currentCombatSettings').textContent,best:document.querySelector('#bestCombatSettings').textContent}));
  assert(comparison.current.includes('Fever:'));
  assert(comparison.best.includes('Fever:'));
  assert(comparison.best.includes('Stronkroid'));
  assert(comparison.best.includes(require('./engine').arrangementKey(comparison.result.arrangement)===require('./engine').arrangementKey(comparison.result.current)?'Same cell placements.':'Cell placements changed.'));
  assert((await page.locator('#bonusAudit').textContent()).includes('3 → 4, 6 → 8, 9 → 12'));
  if(goal==='chance'){
   const check=await page.evaluate(raw=>{
    const E=window.JellyEngine,s=E.parseInput(raw),r=window.__jellyResult;
    return {legal:E.isLegalLayout(s,r.arrangement),filled:E.layoutScore(s,r.arrangement).filledSlots,slots:E.unlockedSlots(s).size,
     trialsFull:window.__jellyTrials.every(p=>E.layoutScore(s,p.arrangement).filledSlots===E.unlockedSlots(s).size),
     feverTagged:window.__jellyTrials.every(p=>Number.isInteger(p.feverIndex)),
     sprites:document.querySelectorAll('#bestBoard .unit-sprite').length,cells:r.arrangement.length};
   },fs.readFileSync('../example json.txt','utf8'));
   assert(check.legal);assert.equal(check.filled,check.slots);assert(check.trialsFull);assert(check.feverTagged);assert.equal(check.sprites,check.cells);
   assert((await page.locator('#bonusAudit').textContent()).includes(check.filled+'/'+check.slots));
  }
 }
 await page.locator('#trainBtn').click();
 await page.waitForFunction(()=>document.querySelector('#solverStatus').textContent.startsWith('Self-play saved:'),null,{timeout:120000});
 assert(await page.locator('#replayPanel').isVisible(),'training supplies its own replay');
 assert(await page.locator('#alternativesPanel').isHidden(),'old optimizer alternatives are not retained after training');
 const trained=await page.evaluate(()=>({result:window.__jellyResult,baseline:document.querySelector('#currentCombatSettings').textContent}));
 assert(trained.baseline.includes(require('./engine').FEVER_NAMES[trained.result.currentFever]));
 const comparisonSnapshot=()=>page.evaluate(()=>JSON.stringify(['currentBoard','currentSummary','currentCombatSettings','bestBoard','bestSummary','bestCombatSettings','bestTimeline','replayStatus'].map(id=>document.getElementById(id).innerHTML)));
 const completed=await comparisonSnapshot();
 // Cancel after a preliminary training preview has actually replaced the UI.
 await page.evaluate(()=>{
  window.Worker=class {
   postMessage(data){if(data.job==='calibrate')queueMicrotask(()=>this.onmessage({data:{type:'result',value:{scale:1,source:'custom'}}}));else if(data.job==='train'){
    const result=window.__jellyResult;
    queueMicrotask(()=>this.onmessage({data:{type:'progress',progress:{stage:'testing layouts',arrangement:result.arrangement.slice(1),feverIndex:result.fever,stats:{...result.stats,avgPeakDps:999999999}}}}));
   }}
   terminate(){}
  };
 });
 await page.locator('#trainBtn').click();
 await page.waitForFunction(()=>document.querySelector('#bestVerdict').textContent.includes('preliminary'));
 assert(await page.locator('#optimizeBtn').isDisabled());assert(await page.locator('#trainBtn').isDisabled());
 assert(await page.locator('#objectiveMode').isDisabled());assert(await page.locator('#searchFever').isDisabled());
 await page.locator('#cancelBtn').click();
 await page.waitForFunction(()=>document.querySelector('#solverStatus').textContent==='Search cancelled.');
 assert.equal(await comparisonSnapshot(),completed,'cancel restores board, metrics, settings, timeline and replay together');
 assert(await page.locator('#objectiveMode').isEnabled());assert(await page.locator('#searchFever').isEnabled());
 await page.screenshot({path:'../audit/jelly-objectives-desktop.png',fullPage:true}); await page.locator('.optimize-panel').screenshot({path:'../audit/jelly-controls-desktop.png'});
 await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'../audit/jelly-objectives-mobile.png',fullPage:true}); await page.locator('.optimize-panel').screenshot({path:'../audit/jelly-controls-mobile.png'});assert.deepEqual(errors,[]);
 console.log('All four Jelly objectives complete through the browser worker; full clear boards, Fever tags, breakpoint display and desktop/mobile layout pass.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
