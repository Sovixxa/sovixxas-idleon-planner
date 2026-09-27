'use strict';
const esbuild=require('esbuild'),fs=require('node:fs'),path=require('node:path');
const root=__dirname,vendor=path.join(root,'vendor/idleon-toolbox');
const sourcePlugin={name:'local-sources',setup(build){
 build.onResolve({filter:/.*/},args=>{
  let name=args.path;
  if(name.startsWith('@parsers/'))name=path.join(vendor,'parsers',name.slice(9));
  else if(name.startsWith('@utility/'))name=path.join(vendor,'utility',name.slice(9));
  else if(name==='@website-data')name=path.join(vendor,'data/website-data/index.js');
  else name=path.resolve(args.importer?path.dirname(args.importer):root,name);
  const found=[name,name+'.ts',name+'.js',path.join(name,'index.ts'),path.join(name,'index.js')].find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());
  if(!found)throw new Error('Unresolved calculation dependency: '+args.path+' from '+args.importer);
  return {path:found,namespace:'calculation'};
 });
 build.onLoad({filter:/.*/,namespace:'calculation'},args=>({contents:fs.readFileSync(args.path,'utf8'),loader:args.path.endsWith('.json')?'json':args.path.endsWith('.ts')?'ts':'js'}));
}};
esbuild.build({entryPoints:['./prayer-math-entry.ts'],outfile:'prayer-math-engine.js',bundle:true,format:'iife',globalName:'PrayerMath',platform:'browser',target:'es2020',minify:true,define:{'process.env.NODE_ENV':'"production"'},banner:{js:'/* Idleon Toolbox-derived calculation engine, GPL-3.0-only. Sources and modifications: vendor/idleon-toolbox and prayer-math-entry.ts. */'},plugins:[sourcePlugin],logLevel:'silent'}).catch(e=>{console.error(e.errors?.map(x=>x.text).join('\n')||e);process.exitCode=1;});
