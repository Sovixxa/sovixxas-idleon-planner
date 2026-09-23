(function(root){
// Prices are in copper. Expand scientific notation without losing integer-string
// precision; fractional copper is floored, as with the in-game coin display.
function coins(value){
 if(!['number','string','bigint'].includes(typeof value))return null;
 const match=String(value).trim().match(/^(\d+)(?:\.(\d*))?(?:e\+?(-?\d+))?$/i);if(!match)return null;
 const exponent=Number(match[3]||0);if(!Number.isSafeInteger(exponent)||Math.abs(exponent)>1000)return null;
 const digits=match[1]+(match[2]||''),point=match[1].length+exponent;
 let remaining=BigInt(point<=0?'0':point>=digits.length?digits+'0'.repeat(point-digits.length):digits.slice(0,point));
 const out=[];let tier=1;while(remaining>0n&&tier<=25){const amount=tier===25?remaining:remaining%100n;if(amount>0n)out.push({tier,amount:String(amount)});remaining=tier===25?0n:remaining/100n;tier++;}
 return out.length?out.reverse():[{tier:1,amount:'0'}];
}
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const name=tier=>['Copper','Silver','Gold','Platinum','Dementia'][tier-1]||'Coin tier '+tier;
function html(value){
 const parts=coins(value);if(!parts)return '<span class="coin-price">Unknown coin cost</span>';
 const shown=parts.slice(0,3),approx=parts.length>shown.length||shown.some(c=>c.amount.length>9);
 const compact=amount=>amount.length<=9?Number(amount).toLocaleString('en-US'):amount[0]+'.'+amount.slice(1,3)+'e+'+(amount.length-1);
 return `<span class="coin-price">${approx?'<span title="Rounded down to the leading coin denominations">≈</span>':''}${shown.map(c=>`<span class="coin-amount"><strong>${compact(c.amount)}</strong><img src="assets/Coins${c.tier}.png" alt="${name(c.tier)}" title="${name(c.tier)}"></span>`).join('')}</span>`;
}
// Only explicit money placeholders are interpreted. All surrounding text is escaped.
function richText(text,money={}){return String(text??'').split(/(\[\[nextCoinCost\]\])/).map(part=>part==='[[nextCoinCost]]'?html(money.nextCoinCost):esc(part)).join('');}
if(typeof module!=='undefined')module.exports={coins,html,richText};else root.GameCurrency={coins,html,richText};
})(typeof window!=='undefined'?window:globalThis);
