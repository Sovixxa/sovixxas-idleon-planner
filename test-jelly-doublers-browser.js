const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('http://localhost:7332/**',route=>{const n=new URL(route.request().url()).pathname,file=path.resolve(__dirname,'.'+(n==='/'?'/index.html':n));return route.fulfill(file.startsWith(__dirname+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()?{contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)}:{status:404,body:''});});
await page.goto('http://localhost:7332/');await page.evaluate(raw=>{document.querySelector('#jsonInput').value=raw;document.querySelector('#parseBtn').click();},fs.readFileSync('../example json.txt','utf8'));

await page.evaluate(()=>document.querySelector('#navJelly').click());await page.locator('#tabDoublers').click();
await page.locator('.jelly-doubler-card').first().waitFor();
assert.equal(await page.locator('.jelly-doubler-card').count(),20);
assert.equal(await page.locator('#tabDoublers').getAttribute('aria-selected'),'true');
assert(await page.locator('#panelOptimizer').evaluate(el=>el.classList.contains('hidden')));
assert((await page.locator('[data-perk="15"]').innerText()).includes('Virus slots'));
await page.screenshot({path:'../audit/jelly-doublers-desktop.png',fullPage:true});
await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.screenshot({path:'../audit/jelly-doublers-mobile.png',fullPage:true});
await page.locator('#tabBonuses').click();assert(await page.locator('#panelDoublers').evaluate(el=>el.classList.contains('hidden')));
await page.locator('#tabDoublers').click();assert.equal(await page.locator('.jelly-doubler-card').count(),20);
assert.deepEqual(errors,[]);console.log('Jelly doubler desktop/mobile, navigation, 20 perks and browser errors pass.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
