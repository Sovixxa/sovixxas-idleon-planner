'use strict';
const fs=require('fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true});try{const page=await browser.newPage();const script=fs.readFileSync('afk-tester.js','utf8');
await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:`<div id="host"></div><script>${script}</script><script>
window.Worker=class {postMessage(message){window.lastScenario=message.options;setTimeout(()=>this.onmessage({data:{result:{0:{0:{rate:100},1:{foodSlots:2,foodChoices:[{id:'FoodMining1',label:'Icing Ironbite',effect:'MiningSpeedBoosts',bonus:15}],defaultNode:'a',nodes:[{id:'a',label:'Copper',rate:100,harvestChance:1},{id:'b',label:'Iron',rate:200,harvestChance:1}]}}}}}),0)}terminate(){}};
AfkTester.render(document.getElementById('host'),{rawRoot:{charNames:['Persistence fixture']},rawData:{Lv0_0:[10,10],Exp0_0:[0,0],ExpReq0_0:[1000,1000]}});
</script>`}));
await page.goto('http://localhost/persist');await page.locator('[data-afk-skill]').selectOption('1');await page.locator('[data-afk-node="0"]').selectOption('b');await page.locator('[data-afk-mode]').selectOption('candy');await page.locator('[data-afk-candy]').selectOption('Timecandy3');await page.locator('[data-afk-target]').fill('123');await page.locator('[data-afk-option="statueWeek"]').check();
await page.locator('[data-afk-option="boostFoods"]').check();await page.locator('[data-afk-food-id="FoodMining1"]').check();
await page.reload();assert.equal(await page.locator('[data-afk-skill]').inputValue(),'1');assert.equal(await page.locator('[data-afk-mode]').inputValue(),'candy');assert.equal(await page.locator('[data-afk-candy]').inputValue(),'Timecandy3');assert.equal(await page.locator('[data-afk-target]').inputValue(),'123');assert(await page.locator('[data-afk-option="statueWeek"]').isChecked());await page.waitForFunction(()=>!document.querySelector('[data-afk-node="0"]').disabled);assert.equal(await page.locator('[data-afk-node="0"]').inputValue(),'b');
assert(await page.locator('[data-afk-food-id="FoodMining1"]').isChecked());assert.deepEqual(await page.evaluate(()=>window.lastScenario.sharedFoods),['FoodMining1']);
await page.locator('[data-afk-reset]').click();await page.reload();assert.equal(await page.locator('[data-afk-target]').inputValue(),'11');assert.equal(await page.locator('[data-afk-mode]').inputValue(),'afk');
console.log('AFK reload: skill, mode, candy, target, node, Statue Week and reset persist correctly.');
}finally{await browser.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
