const fs=require('node:fs'),esbuild=require('esbuild'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,p),'utf8');
const source=read('vendor/idleon-toolbox/parsers/world-3/constructionOptimizer.ts').replace(/^export /gm,'')+'\n'+read('cog-optimizer-entry.ts').replace(/^import .*;\r?\n/,'').replace(/^export /gm,'')+'\n'+read('cog-god-board.ts').replace(/^export /gm,'')+'\n'+read('cog-rolls.ts').replace(/^export /gm,'')+'\nreturn {optimize,evaluate,idealBoard,perfectRollExp,realisticBoard,cogRollCaps,cogSpecialStats,jewelAllowance,rollCog,cogRandom};';
const output=esbuild.transformSync('(function(){'+source+'})()',{loader:'ts',minify:true}).code;
fs.writeFileSync(path.join(__dirname,'cog-optimizer-engine.js'),'var CogOptimizer='+output+'\nif(typeof module!=="undefined")module.exports=CogOptimizer;\n');
