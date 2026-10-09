const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('http://localhost:7332/**',route=>{const n=new URL(route.request().url()).pathname,file=path.resolve(__dirname,'.'+(n==='/'?'/index.html':n));return route.fulfill(file.startsWith(__dirname+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()?{contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)}:{status:404,body:''});});
await page.goto('http://localhost:7332/');await page.evaluate(raw=>{document.querySelector('#jsonInput').value=raw;document.querySelector('#parseBtn').click();},fs.readFileSync('../example json.txt','utf8'));
await page.evaluate(()=>document.querySelector('#navJelly').click());await page.locator('#tabUpgrades').click();await page.locator('#jellyUpgradeMode').selectOption('future');await page.locator('#jellyUpgradePlan tbody tr').first().waitFor();
await page.locator('#jellyUpgradeMode').selectOption('future');await page.locator('#jellyUpgradeCount').selectOption('1000');assert.equal(await page.locator('#jellyUpgradePlan tbody tr').count(),1000);
await page.locator('#jellyUpgradeCompress').check();assert((await page.locator('#jellyUpgradePlan tbody tr').count())<=1000);
await page.locator('#jellyUpgradeGoal').selectOption('bloodcells');await page.locator('#jellyUpgradeReserve').selectOption('50');assert((await page.locator('#jellyUpgradeWallet').innerText()).includes('Additional Bloodcells'));
await page.screenshot({path:'../audit/jelly-upgrades-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'../audit/jelly-upgrades-mobile.png',fullPage:true});assert.deepEqual(errors,[]);console.log('Jelly upgrade desktop/mobile, controls, 1000 purchases, compression, and browser errors pass.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});



