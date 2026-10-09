'use strict';
// Build-time instrumentation only. Browser calculations use the same expressions
// as the normal engine; hooks observe their values without replacing formulas.
const fs=require('fs'),path=require('path'),esbuild=require('esbuild');
const playwright=process.env.PLAYWRIGHT_PATH||'playwright';
const {babelParse,traverse}=require(path.join(playwright,'lib/transform/babelBundle.js'));
const root=__dirname,vendor=path.join(root,'vendor/idleon-toolbox');
const wanted=new Set(('parseGaming parseSailing parseFarming parseFlags parseEquinox scorePlacement getMaxHp getMaxMp getAccuracy getCritChance getCritDamage getMastery getHitChance getSurvivability getMiningEff getAllEff getAllBaseSkillEff getCookingEff getLabEfficiency getSpelunkingEfficiency getAllSkillsExp getAllSkillExpMultiplier getPrinterSampleRate getPlayerFoodBonus getPlayerSpeedBonus getMaxCharge getChargeRate getPlayerConstructionSpeed getArmyHealth getArmyDamage getFarming getResearch getResearchEXPmulti getResearchEXPrateObj getEquinox getSailing getUnlockedSailing getNewMutationChance getConstruction evaluateBoard getSkillExpMulti getAfkGain getItemCapacity').split(' '));
const pretty=s=>s.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/_/g,' ').replace(/^get /,'').replace(/^./,x=>x.toUpperCase());
function instrument(source,file){
 if(!file.includes(path.sep+'parsers'+path.sep))return source;
 const ast=babelParse(source,file,true),inserts=[],seen=new Set();let serial=0;
 const add=(pos,text,rank)=>inserts.push({pos,text,rank});
 traverse(ast,{Function(fn){
  const name=fn.node.id?.name||(fn.parent.type==='VariableDeclarator'?fn.parent.id.name:null);
  if(!wanted.has(name)||fn.node.body.type!=='BlockStatement')return;
  const body=fn.node.body,token='__connectedFrame'+serial++,wrappers=new Map();seen.add(name);
  const owner=node=>node.getFunctionParent()===fn&&!node.findParent(p=>p.node.type.startsWith("TS"));
  const key=node=>source.slice(node.start,node.end);
  function label(n){if(n.type==='Identifier')return pretty(n.name);if(n.type.includes('MemberExpression'))return pretty(key(n).replace(/\?\./g,'.').replace(/^(character|playerInfo|account)\./,''));if(n.type==='CallExpression'||n.type==='OptionalCallExpression'){const base=pretty(n.callee.name||key(n.callee));const args=n.arguments.filter(a=>a.type==='StringLiteral').map(a=>pretty(a.value));return base+(args.length?' · '+args.join(' · '):'');}return pretty(key(n));}
  function expr(n){if(!n)return '';if(n.type==='Identifier')return pretty(n.name);if(n.type==='NumericLiteral')return String(n.value);if(n.type==='StringLiteral')return pretty(n.value);if(n.type==='BooleanLiteral')return String(n.value);if(n.type==='BinaryExpression'||n.type==='LogicalExpression')return `(${expr(n.left)} ${({'*':'×','/':'÷','**':'^','??':'or if missing'})[n.operator]||n.operator} ${expr(n.right)})`;if(n.type==='ConditionalExpression')return `if ${expr(n.test)} then ${expr(n.consequent)} else ${expr(n.alternate)}`;if(n.type==='UnaryExpression')return n.operator+expr(n.argument);if(n.type==='CallExpression'&&n.callee.object?.name==='Math')return `${n.callee.property.name}(${n.arguments.map(expr).join(', ')})`;return label(n);}
  function dependencies(n,out=new Set()){
   if(!n||typeof n!=='object')return out;
   if(n.type==='Identifier')out.add(n.name);
   if(n.type==='CallExpression'||n.type==='OptionalCallExpression'||n.type==='MemberExpression'||n.type==='OptionalMemberExpression')out.add('@'+n.start);
   for(const [k,v]of Object.entries(n)){if(['loc','start','end','extra','typeAnnotation','comments'].includes(k))continue;if(Array.isArray(v))v.forEach(x=>dependencies(x,out));else if(v&&typeof v==='object')dependencies(v,out);}return out;
  }
  function wrap(n,id,title,formula=expr(n),deps=dependencies(n)){
   if(!n||n.start===undefined)return;const k=n.start+':'+n.end;
   // Multiple observers on the same expression are nested intentionally.
   const order=wrappers.get(k)||0;wrappers.set(k,order+1);
   add(n.start,`globalThis.ConnectedTrace.value(${JSON.stringify(id)},${JSON.stringify(title)},(`,-n.end+order/1000);
   add(n.end,`),${JSON.stringify(formula)},${JSON.stringify([...deps])})`,-n.start-order/1000);
  }
  fn.traverse({
   Function(p){p.skip();},
   VariableDeclarator(p){if(!owner(p)||!p.node.init||p.node.id.type!=='Identifier')return;wrap(p.node.init,p.node.id.name,pretty(p.node.id.name));},
   IfStatement(p){if(owner(p))wrap(p.node.test,'?'+p.node.start,'Condition',expr(p.node.test));},
   ReturnStatement(p){if(!owner(p)||!p.node.argument)return;const n=p.node.argument;if(n.type==='ObjectExpression'){for(const prop of n.properties){if(prop.type!=='ObjectProperty'||prop.computed)continue;const field=prop.key.name||prop.key.value;if(prop.shorthand){add(prop.start,`${field}: `,-Infinity);prop.shorthand=false;}wrap(prop.value,'result.'+field,pretty(field));}}else wrap(n,'result','Result');},
   AssignmentExpression(p){if(!owner(p)||p.node.left.type!=='Identifier')return;const id=p.node.left.name;wrap(p.node,id,pretty(id),`${pretty(id)} ${p.node.operator} ${expr(p.node.right)}`,dependencies(p.node.right).add(id));},
   CallExpression(p){if(!owner(p)||p.node.callee.type==='Super'||p.node.arguments.some(a=>a.type==='SpreadElement'))return;wrap(p.node,'@'+p.node.start,label(p.node));},
   'MemberExpression|OptionalMemberExpression'(p){if(!owner(p))return;const parent=p.parent;if((parent.type==='CallExpression'||parent.type==='OptionalCallExpression')&&parent.callee===p.node)return;if((parent.type==='AssignmentExpression'&&parent.left===p.node)||parent.type==='UpdateExpression')return;wrap(p.node,'@'+p.node.start,label(p.node));},
   ReferencedIdentifier(p){if(!owner(p)||['undefined','Math','Number','Object','Array','String','Infinity','NaN','console'].includes(p.node.name))return;const par=p.parent;if((par.type==='NewExpression'||par.type==='CallExpression'||par.type==='OptionalCallExpression')&&par.callee===p.node)return;if(par.type==='ObjectProperty'&&par.shorthand)return;if(par.type==='UpdateExpression'||par.type==='AssignmentExpression'&&par.left===p.node)return;wrap(p.node,p.node.name,pretty(p.node.name),'Input value',new Set());}
  });
  add(body.start+1,`\nif(globalThis.ConnectedTrace.disabled)return (()=>{${source.slice(body.start+1,body.end-1)}})();\nconst ${token}=globalThis.ConnectedTrace.enter(${JSON.stringify(name)});try{\n`,-Infinity);
  add(body.end-1,`\n}finally{globalThis.ConnectedTrace.leave(${token});}\n`,Infinity);
 }});
 inserts.sort((a,b)=>b.pos-a.pos||b.rank-a.rank);for(const x of inserts)source=source.slice(0,x.pos)+x.text+source.slice(x.pos);return source;
}
const plugin={name:'trace-source',setup(build){
 build.onResolve({filter:/.*/},args=>{let n=args.path;if(n.startsWith('@parsers/'))n=path.join(vendor,'parsers',n.slice(9));else if(n.startsWith('@utility/'))n=path.join(vendor,'utility',n.slice(9));else if(n==='@website-data')n=path.join(vendor,'data/website-data/index.js');else n=path.resolve(args.importer?path.dirname(args.importer):root,n);const found=[n,n+'.ts',n+'.js',path.join(n,'index.ts'),path.join(n,'index.js')].find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());if(!found)throw Error('Unresolved '+args.path);return {path:found,namespace:'trace'};});
 build.onLoad({filter:/.*/,namespace:'trace'},args=>({contents:instrument(fs.readFileSync(args.path,'utf8'),args.path),loader:args.path.endsWith('.json')?'json':args.path.endsWith('.ts')?'ts':'js'}));
}};
esbuild.build({entryPoints:['connected-trace-entry.ts'],outfile:'connected-trace-engine.js',bundle:true,format:'iife',globalName:'PrayerMath',platform:'browser',target:'es2020',minify:true,define:{'process.env.NODE_ENV':'"production"'},plugins:[plugin],logLevel:'silent',banner:{js:'/* Instrumented Idleon Toolbox formulas, GPL-3.0-only. Generated by build-connected-trace.js. */'}}).catch(e=>{console.error(e.errors?.map(x=>x.text+' '+JSON.stringify(x.location)).join('\n')||e);process.exitCode=1;});



