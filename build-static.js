'use strict';
const fs=require('fs'),path=require('path');
const root=__dirname,out=path.join(root,'dist');
if(path.dirname(out)!==root||path.basename(out)!=='dist')throw new Error('Refusing to clean an unexpected build directory.');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
const allowed=new Set(['.html','.css','.js','.png','.jpg','.jpeg','.svg','.ico','.webp','.woff','.woff2']);
const excluded=/^(test-|extract-|build-static\.js$|server\.js$|account-extras|inspect-)/i;
for(const entry of fs.readdirSync(root,{withFileTypes:true})){
 if(entry.name==='assets'){fs.cpSync(path.join(root,entry.name),path.join(out,entry.name),{recursive:true});continue;}
 if(!entry.isFile()||excluded.test(entry.name)||!allowed.has(path.extname(entry.name).toLowerCase()))continue;
 fs.copyFileSync(path.join(root,entry.name),path.join(out,entry.name));
}
for(const name of ['_headers','_redirects','manifest.webmanifest'])if(fs.existsSync(path.join(root,name)))fs.copyFileSync(path.join(root,name),path.join(out,name));
const html=fs.readFileSync(path.join(out,'index.html'),'utf8'),refs=[...html.matchAll(/(?:src|href)="([^"#?]+)(?:[?#][^"]*)?"/g)].map(x=>x[1]).filter(x=>!x.includes('://')),missing=refs.filter(x=>!fs.existsSync(path.join(out,x)));
if(missing.length)throw new Error(`Static build is missing: ${missing.join(', ')}`);
console.log(`Static site built at ${out}`);
