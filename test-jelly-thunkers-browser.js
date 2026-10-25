'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://localhost:7333/**',route=>{
   const pathname=new URL(route.request().url()).pathname,file=path.resolve(__dirname,'.'+(pathname==='/'?'/index.html':pathname));
   return route.fulfill(file.startsWith(__dirname+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()?{contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)}:{status:404,body:''});
  });
  await page.goto('http://localhost:7333/');
  await page.evaluate(raw=>{document.querySelector('#jsonInput').value=raw;document.querySelector('#parseBtn').click();},fs.readFileSync('../example json.txt','utf8'));
  await page.evaluate(()=>window.PlannerFeatures.loadTools());
  await page.evaluate(()=>document.querySelector('#navJelly').click());
  await page.waitForFunction(()=>document.querySelector('#solverStatus').textContent.startsWith('Loaded.'));
  const snapshot=()=>page.evaluate(()=>JSON.stringify({saved:document.querySelector('#currentBoard').innerHTML,best:document.querySelector('#bestBoard').innerHTML,status:document.querySelector('#solverStatus').textContent,memory:localStorage.getItem('idleon-jelly-training-playbook-v1'),save:sessionStorage.getItem('idleon-jelly-json-session-v3')}));
  const before=await snapshot();
  await page.evaluate(()=>{window.__jokeWorkers=0;const NativeWorker=window.Worker;window.Worker=class extends NativeWorker{constructor(...args){super(...args);window.__jokeWorkers++;}};});
  await page.clock.install();
  await page.locator('#jellyThunkers > summary').click();
  assert((await page.locator('#jellyThunkers > summary').innerText()).includes('Extended-ed Thunkers-ing- for Naught'));
  assert.equal(await page.locator('.thunkers-badge').count(),0);
  await page.locator('#thunkersStart').click();await page.clock.runFor(3600);
  assert((await page.locator('#thunkersProgress').evaluate(el=>el.value))>=90);
  await page.clock.runFor(1800);
  assert((await page.locator('#thunkersProgress').evaluate(el=>el.value))<20,'the joke visibly goes backwards');
  await page.clock.runFor(3600);
  assert(await page.locator('#thunkersVerdict').isVisible());
  assert((await page.locator('#thunkersVerdict').innerText()).length>40);
  assert(await page.locator('#thunkersStart').isEnabled());
  const transcripts=[await page.locator('#thunkersLog li').allTextContents()];
  for(let i=1;i<16;i++){
   await page.locator('#thunkersStart').click();await page.clock.runFor(9000);
   transcripts.push(await page.locator('#thunkersLog li').allTextContents());
  }
  assert(transcripts.every(lines=>lines.length===6));
  for(const at of [0,1,2,3,4])assert.equal(new Set(transcripts.map(lines=>lines[at])).size,16,'shuffle bags avoid repeating each opening, method, scenario and disaster');
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('idleon-thunkers-variety-v1')).round),16,'variety history is saved independently of game data');
  assert.equal(await snapshot(),before,'comedy preserves the real board, score, save and playbook');
  assert.equal(await page.evaluate(()=>window.__jokeWorkers),0,'no real solver is launched');
  await page.locator('#jellyThunkers').screenshot({path:'../audit/jelly-thunkers-desktop.png',style:'#quickNotes{visibility:hidden!important}'});
  await page.setViewportSize({width:390,height:844});
  await page.locator('#jellyThunkers').screenshot({path:'../audit/jelly-thunkers-mobile.png',style:'#quickNotes{visibility:hidden!important}'});
  assert(await page.locator('#jellyThunkers').evaluate(el=>el.scrollWidth<=el.clientWidth),'joke card fits mobile');
  await page.locator('#thunkersStart').click();
  const opening=await page.locator('#thunkersStatus').innerText();
  assert.notEqual(opening,transcripts.at(-1)[0],'a new shuffle cycle cannot immediately repeat the last opening');
  await page.locator('#thunkersWorse').click();
  assert.notEqual(await page.locator('#thunkersStatus').innerText(),opening,'sabotage responds immediately');
  await page.clock.runFor(9000);
  assert((await page.locator('#thunkersVerdict').innerText()).includes('Unsolicited interventions: 1'));
  assert(await page.locator('#thunkersWorse').isDisabled());
  await page.locator('#thunkersStart').click();
  await page.locator('#thunkersStop').click();await page.clock.runFor(10000);
  assert((await page.locator('#thunkersStatus').innerText()).startsWith('Thunk cancelled.'));
  assert(!(await page.locator('#thunkersVerdict').isVisible()));
  await page.locator('#thunkersStart').click();
  await page.evaluate(()=>document.querySelector('#navHome').click());await page.clock.runFor(5000);
  assert((await page.locator('#thunkersStatus').innerText()).startsWith('Thunks shelved.'));
  assert(await page.locator('#thunkersStart').isEnabled());
  assert.deepEqual(errors,[]);
  console.log('Thunkers passes: 16 nonrepeating scenarios, independent saved history, sabotage, transcripts, isolated real results, no workers, cancellation and mobile layout.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
