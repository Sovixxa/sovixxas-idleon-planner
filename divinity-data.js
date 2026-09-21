(function(root){
  'use strict';
  const clean=value=>String(value??'').replaceAll('_',' ').replaceAll('@','\n');
  const rawGods=[
    ['Snehebatu','+30% AFK Gains for all activities!','+{% accuracy and +{% defence',70,10,1.75,'+{% Divinity PTS Gain',2],
    ['Arctis','Whenever you level up a skill over Lv 50, a Divinity Pearl drops that gives +40% EXP to a skill under Lv 50!','+{% skill EXP',150,10,1.15,'+{% Divinity PTS Gain',3],
    ['Nobisect','This character is always active within the Lab Mainframe, but gains no Lab EXP.','+{ Talent LV for all talents above Lv 1',15,10000,2.25,'+{ All Skill Efficiency',50],
    ['Harriep','This character produces 3x more resources at the 3D Printer. This works with the Lab bonus but does not change the displayed printer amount.','+{% coins gained for all characters',100,50000000,1.30,'+{% Divinity PTS Gain',3],
    ['Goharut','Non-candy AFK claims also progress one of: Refinery, 3D Printer, Cooking, Breeding, Sailing, or Gaming.','+{% Class EXP',100,1000000,2.60,'+{% Sailing Speed',4],
    ['Omniphau','Being connected to the Lab also counts as being present at the Divinity Altar, giving both gains.','+{% AFK Gains for all characters',5,5,1.12,'+{% Divinity PTS Gain',4],
    ['Purrmep','All characters produce 2x Divinity and gain 2x Divinity EXP. Only one character can link here.','+{% Boat Sailing speed and +{% Gaming Plant grow speed',50,1000000000,1.35,'+{% Sailing Speed',3],
    ['Flutterbis','All kills count 2x for opening portals and accumulating Death Note kills.','+{% Total Damage',200,10,1.15,'+{% Total Damage',1],
    ['Kattlekruk','Each day played adds levels to selected Alchemy bubbles. Only one character can link here.','+{% chance for 2x Statue Drops for all characters',10,1000000000,3,'+{% Total Damage',1],
    ['Bagur','No link bonus has been implemented for this god yet.','Nothing yet',1,20,1.18,'+{% Sailing Speed',5]
  ];
  const currency=['Gaming bits','Sailing treasure','Gaming bits','Coins','Gaming bits','Atoms','Coins','Atoms','Gaming bits','Atoms'];
  const gods=rawGods.map((g,id)=>({id,name:g[0],major:clean(g[1]),minor:clean(g[2]),minorBase:g[3],costBase:g[4],costScale:g[5],blessing:clean(g[6]),blessingPerLevel:g[7],currency:currency[id],icon:`assets/DivGod${id}.png`}));
  const styles=[
    ['Kinesis',1,1,'Gives 1 Divinity and 1 EXP per hour'],['Chakra',2,2,'Gives 2 Divinity and 2 EXP per hour'],['Focus',4,1,'Gives 4 Divinity and 1 EXP per hour'],['Mantra',0,1,'Gives 1 EXP to every character per hour'],['Vitalic',2,7,'Gives 2 Divinity and 7 EXP per hour'],['TranQi',0,3,'Gives 3 EXP per hour even when not meditating'],['Zen',8,8,'Gives 8 Divinity and 8 EXP per hour'],['Mindful',15,10,'Gives 15 Divinity and 10 EXP per hour']
  ].map((s,id)=>({id,name:s[0],divinity:s[1],exp:s[2],description:s[3],levelRequired:Math.round(5*id+5*Math.floor(id/4)+10*Math.floor(id/5)+Math.max(0,15*(id-5)))}));
  const catalog={gods,styles};
  if(typeof module!=='undefined'&&module.exports)module.exports=catalog;else root.DIVINITY_CATALOG=catalog;
})(typeof window!=='undefined'?window:globalThis);
