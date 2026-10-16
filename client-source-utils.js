'use strict';
function expressionEnd(source,start){
 let depth=0,quote='',escape=false;
 for(let i=start;i<source.length;i++){
  const ch=source[i];if(quote){if(escape)escape=false;else if(ch==='\\')escape=true;else if(ch===quote)quote='';continue;}
  if(ch==='"'||ch==="'")quote=ch;
  else if('[({'.includes(ch))depth++;
  else if('])}'.includes(ch)&&--depth===0)return i+1;
 }
 throw Error('Unclosed expression at '+start);
}
function handler(source,name){
 const match=new RegExp('(?:\\.|\\b)'+name+'\\s*[:=]\\s*(function\\s*\\()').exec(source);
 if(!match)throw Error('Missing handler '+name);
 const start=match.index+match[0].length-match[1].length;
 return source.slice(start,expressionEnd(source,source.indexOf('{',start)));
}
module.exports={expressionEnd,handler};
if(require.main===module){
 const fs=require('node:fs'),esbuild=require('esbuild'),source=fs.readFileSync('../audit/N.js','utf8');
 for(const name of process.argv.slice(2))fs.writeFileSync('../audit/'+name+'-current.js',esbuild.transformSync('const handler='+handler(source,name),{minify:false}).code);
}
