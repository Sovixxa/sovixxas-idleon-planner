'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const siteRoot=process.env.AUDIT_DIST==='1'?path.join(__dirname,'dist'):__dirname;
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/Sofia/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('http://localhost:7331/**',async route=>{
   const pathname=decodeURIComponent(new URL(route.request().url()).pathname);
   if(pathname.startsWith('/__'))return route.fulfill({contentType:'application/json',body:'{}'});
   const file=path.resolve(siteRoot,'.'+(pathname==='/'?'/index.html':pathname));
   if(!file.startsWith(siteRoot+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
   return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  await page.goto('http://localhost:7331/');
  await page.locator('#jsonInput').fill(JSON.stringify(JSON.parse(fs.readFileSync('../example json.txt','utf8'))));
  await page.locator('#parseBtn').click();
  await page.waitForFunction(()=>/^(Save age|Imported):/.test(document.getElementById('qolFreshness').textContent),{},{timeout:60000});

  await page.evaluate(()=>{
   const NativeWorker=window.Worker,failures=new Set(['cooking-worker.js','bubble-optimizer-worker.js','stamp-calculator-worker.js']);
   window.failedCalculators=[];
   window.Worker=function(url,options){const file=new URL(url,location.href).pathname.split('/').pop();if(!failures.delete(file))return new NativeWorker(url,options);window.failedCalculators.push(file);return {postMessage(){queueMicrotask(()=>this.onerror?.({}));},terminate(){}};};
  });
  const navigate=async name=>page.evaluate(name=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:name})),name);
  await navigate('cooking');
  await page.waitForFunction(()=>document.querySelector('#worldContent').textContent.includes('Cooking calculation unavailable.'));
  await navigate('home');await navigate('cooking');await page.locator('#cookCharacter').waitFor({timeout:60000});
  assert((await page.locator('#cookCharacter option').count())>0);
  await navigate('alchemy');
  await page.waitForFunction(()=>document.querySelector('#worldContent').textContent.includes('Account multipliers unavailable.'));
  await navigate('home');await navigate('alchemy');
  await page.waitForFunction(()=>/Prisma multiplier: [\d,.]+×/.test(document.querySelector('#worldContent').textContent),{},{timeout:60000});
  await navigate('stamps');
  await page.waitForFunction(()=>document.querySelector('#worldContent').textContent.includes('Stamp calculation could not load.'));
  await navigate('home');await navigate('stamps');await page.locator('#stampStatus').waitFor({timeout:60000});
  assert((await page.locator('#stampRows tr').count())>0);
  assert.equal((await page.evaluate(()=>window.failedCalculators)).length,3);
  assert.deepEqual(errors,[]);
  console.log('Worker failure browser: Cooking, Bubble Optimizer and Stamps show errors and recover on reopening with the same imported save.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
