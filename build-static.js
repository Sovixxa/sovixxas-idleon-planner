'use strict';
// Dailies uses its checked-in catalog; regeneration is a local maintenance step.
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=__dirname,out=path.join(root,'dist');
// The checked-in catalog is the deployable data source. Its generator is a
// local maintenance tool and is intentionally not required by GitHub Pages.
if(path.dirname(out)!==root||path.basename(out)!=='dist')throw new Error('Refusing to clean an unexpected build directory.');
fs.rmSync(out,{recursive:true,force:true});fs.mkdirSync(out,{recursive:true});
const allowed=new Set(['.html','.css','.js','.png','.jpg','.jpeg','.svg','.ico','.webp','.woff','.woff2']);
const excluded=/^(test-|extract-|build-|server\.js$|account-extras|inspect-)/i;
for(const entry of fs.readdirSync(root,{withFileTypes:true})){
 if(entry.name==='assets'||entry.name==='vendor'){fs.cpSync(path.join(root,entry.name),path.join(out,entry.name),{recursive:true});continue;}
 if(!entry.isFile()||excluded.test(entry.name)||!allowed.has(path.extname(entry.name).toLowerCase()))continue;
 fs.copyFileSync(path.join(root,entry.name),path.join(out,entry.name));
}
for(const name of ['PRAYER-MATH-AUDIT.md','prayer-math-entry.ts','build-prayer-math.js','package.json','_headers','_redirects','manifest.webmanifest'])if(fs.existsSync(path.join(root,name)))fs.copyFileSync(path.join(root,name),path.join(out,name));
const html=fs.readFileSync(path.join(out,'index.html'),'utf8'),refs=[...html.matchAll(/(?:src|href)="([^"#?]+)(?:[?#][^"]*)?"/g)].map(x=>x[1]).filter(x=>!x.includes('://')),missing=refs.filter(x=>!fs.existsSync(path.join(out,x)));
if(missing.length)throw new Error(`Static build is missing: ${missing.join(', ')}`);
// Version the whole script graph together, including worker imports. GitHub
// Pages can cache unversioned files across releases, mixing incompatible modules.
const scripts=fs.readdirSync(out).filter(name=>/\.(js|css)$/.test(name)).sort();
const hash=crypto.createHash('sha256');
for(const name of scripts)hash.update(name).update(fs.readFileSync(path.join(out,name)));
const version=hash.digest('hex').slice(0,12);
const versionRefs=text=>text.replace(/(["'])([\w./-]+\.(?:js|css))(?:\?[^"']*)?\1/g,(match,quote,file)=>
 fs.existsSync(path.join(out,file))?`${quote}${file}?v=${version}${quote}`:match);
fs.writeFileSync(path.join(out,'index.html'),versionRefs(html));
for(const name of scripts.filter(name=>name.endsWith('.js'))){
 const file=path.join(out,name),source=fs.readFileSync(file,'utf8');
 const revised=source.replace(/\b(?:new\s+Worker|importScripts|fetch)\s*\([^)]*\)/g,versionRefs);
 if(revised!==source)fs.writeFileSync(file,revised);
}
console.log(`Static site built at ${out} (release ${version})`);
