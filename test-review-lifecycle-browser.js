const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({headless:true});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<main><section><div id="box"></div></section></main>');
 await page.evaluate(()=>{
  window.jobs=[];window.workers=[];
  window.Worker=class{constructor(){workers.push(this)}postMessage(q){jobs.push({worker:this,q})}terminate(){this.terminated=true}};
  window.ReviewTargetMetrics={metrics:[{id:'damage',label:'Damage',goals:['damage'],unit:'',note:''},{id:'strength',label:'Strength',goals:['damage'],unit:'',note:''}]};
  window.respond=(job,result,error)=>job.worker.onmessage({data:{id:job.q.id,result,error}});
  window.desc=()=>({value:100,rows:[],families:[],notes:[],note:'',unit:''});
 });
 await page.addScriptTag({path:'review-target-ui.js'});
 await page.evaluate(()=>{ReviewTargetUI.mount(document.querySelector('#box'),{},'damage');respond(jobs[0],{characters:[{id:0,name:'One'}]});});
 await page.waitForFunction(()=>jobs.length===2);
 // Resolve a description and change its metric before the promise continuation runs.
 await page.evaluate(()=>{respond(jobs[1],desc());const el=document.querySelector('[name=metric]');el.value='strength';el.dispatchEvent(new Event('change'));});
 assert.equal(await page.locator('[name=yield]').isDisabled(),true,'Unused measured yield must not block form validation');
 assert.equal(await page.locator('[type=submit]').first().isDisabled(),true,'Stale baseline must not enable submission during debounce');
 assert.equal(await page.locator('[data-target-result]').innerText(),'','Stale baseline must not paint old values');
 await page.waitForFunction(()=>jobs.length===3);await page.evaluate(()=>respond(jobs[2],desc()));
 await page.waitForFunction(()=>!document.querySelector('[type=submit]').disabled);
 await page.evaluate(()=>document.querySelector('[name=yield]').value='-1');
 assert.equal(await page.locator('form').evaluate(form=>form.checkValidity()),true,'Hidden invalid sample input cannot block another metric');
 // A late rejected plan cannot overwrite cancellation status.
 await page.locator('[type=submit]').first().click();await page.waitForFunction(()=>jobs.length===4);
 await page.evaluate(()=>{respond(jobs[3],null,'Old failure');document.querySelector('[data-cancel]').click();});
 assert.match(await page.locator('[data-target-status]').innerText(),/cancelled/);
 // Removing a parent, rather than the calculator itself, must stop active work.
 await page.locator('[type=submit]').first().click();await page.waitForFunction(()=>jobs.length===5);
 await page.evaluate(()=>document.querySelector('main').replaceChildren());
 await page.waitForFunction(()=>workers.every(w=>w.terminated));
 // Worker construction failures are displayed rather than escaping mount.
 await page.evaluate(()=>{document.querySelector('main').innerHTML='<div id="box"></div>';window.Worker=class{constructor(){throw Error('Worker unavailable')}};ReviewTargetUI.mount(document.querySelector('#box'),{},'damage');});
 await page.waitForFunction(()=>document.querySelector('[data-target-status]').textContent==='Worker unavailable');
 assert.deepEqual(errors,[]);console.log('Baseline race, stale errors, ancestor removal, and worker startup recovery passed.');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
