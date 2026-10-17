const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('http://localhost:7332/**',route=>{const n=new URL(route.request().url()).pathname,file=path.resolve(__dirname,'.'+(n==='/'?'/index.html':n));return route.fulfill(file.startsWith(__dirname+path.sep)&&fs.existsSync(file)&&fs.statSync(file).isFile()?{contentType:({'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png'})[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)}:{status:404,body:''});});
await page.goto('http://localhost:7332/');await page.evaluate(raw=>{document.querySelector('#jsonInput').value=raw;document.querySelector('#parseBtn').click();},fs.readFileSync('../example json.txt','utf8'));


await page.evaluate(()=>document.querySelector('#navGaming').click());await page.locator('[data-skill-tab=gamingPalette]').click();
await page.locator('#paletteDoublersTab').click();await page.locator('[data-palette-colour]').first().waitFor();
assert.equal(await page.locator('[data-palette-colour]').count(),37);
assert.equal(await page.locator('#paletteDoublersTab').getAttribute('aria-selected'),'true');
assert((await page.locator('[data-palette-colour="5"]').innerText()).includes('Artifact Find chance'));
await page.getByRole('searchbox',{name:'Search Palette colours'}).fill('cyan');assert.equal(await page.locator('[data-palette-colour]:visible').count(),2);
await page.getByRole('searchbox',{name:'Search Palette colours'}).fill('');
await page.screenshot({path:'../audit/palette-doublers-desktop.png',fullPage:true});
await page.setViewportSize({width:390,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await page.screenshot({path:'../audit/palette-doublers-mobile.png',fullPage:true});
await page.locator('#paletteColoursTab').click();assert.equal(await page.locator('[data-palette-colour] dl').count(),0);
await page.locator('#paletteDoublersTab').click();assert.equal(await page.locator('[data-palette-colour] dl').count(),37);
assert.deepEqual(errors,[]);console.log('Palette doubler desktop/mobile, search, navigation and browser errors pass.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
