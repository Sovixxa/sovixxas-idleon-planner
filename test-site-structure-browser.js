'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const siteRoot=process.env.AUDIT_DIST==='1'?path.join(__dirname,'dist'):__dirname;
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'C:/Users/Sofia/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({headless:true}),report={errors:[],missing:[],pages:[],empty:[]};let phase='startup',current='home';
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>report.errors.push({phase,page:current,error:e.message,stack:e.stack?.split('\n').slice(0,3)}));
  await page.route('http://localhost:7331/**',async route=>{
   const pathname=decodeURIComponent(new URL(route.request().url()).pathname);
   if(pathname.startsWith('/__'))return route.fulfill({contentType:'application/json',body:'{}'});
   const file=path.resolve(siteRoot,'.'+(pathname==='/'?'/index.html':pathname));
   if(!file.startsWith(siteRoot+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){report.missing.push({phase,page:current,path:pathname});return route.fulfill({status:404,body:''});}
   return route.fulfill({contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.json':'application/json','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
  });
  await page.addInitScript(()=>{window.auditLongTasks=[];new PerformanceObserver(list=>window.auditLongTasks.push(...list.getEntries().map(e=>({start:e.startTime,ms:e.duration})))).observe({type:'longtask',buffered:true});});
  const start=Date.now();await page.goto('http://localhost:7331/');await page.locator('#qolSearchOpen').waitFor();
  report.startup=await page.evaluate(()=>({resources:performance.getEntriesByType('resource').length,bytes:performance.getEntriesByType('resource').reduce((n,r)=>n+r.decodedBodySize,0),dom:document.querySelectorAll('*').length,longTasks:window.auditLongTasks}));report.startup.wallMs=Date.now()-start;
  const source=fs.readFileSync('app.js','utf8'),pages=[...new Set([...source.matchAll(/\b(\w+):\s*\{title:/g)].map(m=>m[1]).concat([...source.matchAll(/SKILL_PAGES\.(\w+)\s*=/g)].map(m=>m[1])))];
  phase='no-save';
  for(const name of pages){current=name;await page.evaluate(name=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:name})),name);await page.waitForTimeout(25);}
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:'home'})));
  phase='import';const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8'));raw.charNames[0]='<img src=x onerror="window.auditInjected=true">';
  await page.locator('#jsonInput').fill(JSON.stringify(raw));await page.locator('#parseBtn').click();await page.waitForFunction(()=>/^(Save age|Imported):/.test(document.getElementById('qolFreshness').textContent),{},{timeout:60000});
  phase='loaded';
  for(const name of ['home',...pages]){
   current=name;await page.evaluate(name=>window.dispatchEvent(new CustomEvent('idleon:navigate',{detail:name})),name);await page.waitForTimeout(350);
   const data=await page.evaluate(()=>{
    const visible=e=>e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
    const named=e=>e.getAttribute('aria-label')?.trim()||e.getAttribute('title')?.trim()||(e.getAttribute('aria-labelledby')||'').split(/\s+/).some(id=>document.getElementById(id)?.textContent.trim());
    const desc=e=>({tag:e.tagName,id:e.id,cls:e.className,type:e.type,html:e.outerHTML.slice(0,260)});
    const ids=new Map();for(const el of document.querySelectorAll('[id]'))ids.set(el.id,(ids.get(el.id)||0)+1);
    const fields=[...document.querySelectorAll('input,select,textarea')].filter(e=>visible(e)&&!['hidden','button','submit','reset'].includes(e.type)&&!named(e)&&!e.labels?.length);
    const buttons=[...document.querySelectorAll('button,a,[role="button"]')].filter(e=>visible(e)&&!named(e)&&!e.textContent.trim()&&![...e.querySelectorAll('img')].some(i=>i.alt));
    return {fields:fields.map(desc),buttons:buttons.map(desc),duplicateIds:[...ids].filter(([id,n])=>n>1),missingAlt:[...document.querySelectorAll('img:not([alt])')].filter(visible).slice(0,5).map(desc),placeholder:/Not yet implemented|Save data mapping will be added|Planning tools will follow/.test(document.querySelector('#worldContent').textContent),blank:!document.querySelector('#worldContent').textContent.trim(),injected:!!window.auditInjected,tabCount:document.querySelectorAll('#worldContent .skill-tabs button').length};
   });
   report.pages.push({name,...data});fs.writeFileSync('audit-full-browser.log',JSON.stringify(report,null,2));console.log(name,data.fields.length,data.buttons.length,data.duplicateIds.length);
  }
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);assert.deepEqual(report.pages.filter(p=>p.fields.length||p.buttons.length||p.duplicateIds.length||p.missingAlt.length||p.injected),[]);console.log('Site structure: no-save navigation, named controls, unique IDs, image alternatives, and escaped imported names pass.');
  report.longTasks=await page.evaluate(()=>window.auditLongTasks.filter(t=>t.ms>100));
 }finally{fs.writeFileSync('audit-full-browser.log',JSON.stringify(report,null,2));await browser.close();}
})().catch(e=>{console.error(e.name,String(e.message).split('Call log:')[0]);process.exitCode=1;});
