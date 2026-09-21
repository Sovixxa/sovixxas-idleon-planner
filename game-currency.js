(function(root){
function coins(value){const text=String(value).trim();if(!/^\d+(?:\.0+)?$/.test(text))return null;let remaining=BigInt(text.split('.')[0]);const out=[];let tier=1;while(remaining>0n&&tier<=25){const amount=tier===25?remaining:remaining%100n;if(amount>0n)out.push({tier,amount:String(amount)});remaining=tier===25?0n:remaining/100n;tier++;}return out.length?out.reverse():[{tier:1,amount:'0'}];}
if(typeof module!=='undefined')module.exports={coins};else root.GameCurrency={coins};
})(typeof window!=='undefined'?window:globalThis);
