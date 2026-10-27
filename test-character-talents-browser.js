const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1500,height:1000}});
  await page.goto('http://127.0.0.1:3000');
  const raw=JSON.parse(fs.readFileSync('../example json.txt','utf8'));
  await page.evaluate(raw=>{
   document.body.innerHTML='<main id="talentTest"></main>';
   CharacterTalents.render(document.getElementById('talentTest'),raw.data,raw);
  },raw);
  await page.waitForFunction(()=>document.querySelector('[data-talent-id]'));
  const starPages=await page.locator('[data-talent-page][title^="Special Talent"]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.talentPage)));
  assert.equal(starPages.length,5);
  for(let preset=0;preset<2;preset++){
   await page.locator(`[data-talent-loadout="${preset}"]`).click();
   for(let i=0;i<5;i++){
    await page.locator(`[data-talent-page="${starPages[i]}"]`).click();
    const actual=await page.locator('[data-talent-id]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.talentId)));
    const expected=await page.evaluate(i=>TALENT_CATALOG.TalentPages['Special Talent '+(i+1)].filter(id=>{const name=TALENT_CATALOG.TalentIconNames[id];return name&&name!=='_'&&name!=='FILLER';}),i);
    assert.deepEqual(actual,expected);
    assert.equal(await page.locator('.super-badge').count(),0);
    assert.equal(await page.locator('.talent-grid > *').count(),13);

   }
  }
  await page.locator('[data-talent-id]').first().click();
  await page.waitForFunction(()=>!document.querySelector('.talent-detail-dialog [role="status"]')?.textContent.includes('Calculating'),null,{timeout:60000});
  assert(!/[{}]|NaN|Infinity/.test(await page.locator('.talent-detail-dialog p').innerText()));
  console.log('Localhost: all five star pages, both presets, exact talent order, 13-slot grids, no SUPER badges, and numerical tooltip passed.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
