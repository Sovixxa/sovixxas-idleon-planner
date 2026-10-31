const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('http://localhost:7332/**',route=>{const n=new URL(route.request().url()).pathname,file=path.resolve(__dirname,'.'+(n==='/'?'/index.html':n));return route.fulfill(file.startsWith(__dirname+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()?{contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)}:{status:404,body:''});});
await page.goto('http://localhost:7332/');await page.evaluate(raw=>{document.querySelector('#jsonInput').value=raw;document.querySelector('#parseBtn').click();},fs.readFileSync('../example json.txt','utf8'));

await page.evaluate(()=>document.querySelector('#navJelly').click());await page.locator('#tabObstructions').click();
assert.equal(await page.locator('[data-obstruction]').count(),72);
assert.equal(await page.locator('#tabObstructions').getAttribute('aria-selected'),'true');
assert((await page.locator('[data-obstruction="0"]').innerText()).includes('+2 Jelly Operator slots'));
await page.locator('#jellyObstructionFilter').selectOption('Current');assert.equal(await page.locator('[data-obstruction]').count(),1);
await page.locator('#jellyObstructionFilter').selectOption('all');
await page.locator('#jellyObstructionSearch').fill('Research');assert(await page.locator('[data-obstruction]').count()>1);assert(await page.locator('[data-obstruction]').count()<72);
await page.locator('#jellyObstructionSearch').fill('');
await page.screenshot({path:'../audit/jelly-obstructions-desktop.png',fullPage:true});
await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.screenshot({path:'../audit/jelly-obstructions-mobile.png',fullPage:true});
await page.locator('#tabBonuses').click();assert(await page.locator('#panelObstructions').evaluate(el=>el.classList.contains('hidden')));
await page.locator('#tabObstructions').click();assert.equal(await page.locator('[data-obstruction]').count(),72);
assert.deepEqual(errors,[]);console.log('Obstructions: 72 rewards, search, status filters, desktop/mobile navigation and browser errors pass.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
