'use strict';
const fs=require('fs'),path=require('path'),esbuild=require('esbuild');
module.exports=function bundle(out,version){
 const file=path.join(out,'index.html');let html=fs.readFileSync(file,'utf8');const regular=[],deferred=[],css=[];
 html=html.replace(/<script\b([^>]*?)src="([^"\s]+)"([^>]*)><\/script>/g,(tag,before,url,after)=>{
  if(/^(?:https?:)?\/\//.test(url))return tag;const file=url.split('?')[0];if(!file.endsWith('.js'))return tag;
  (/\bdefer\b/.test(before+after)?deferred:regular).push(file);return '';
 });
 const scripts=[...regular,...deferred];
 const shell=new Set(['image-fallbacks.js','engine.js','feature-loader.js','planner-qol.js','live-reload.js','analytics-config.js','analytics.js','app.js','back-to-top.js','live-sync.js','live-sync-ui.js']);
 const features=scripts.filter(f=>!shell.has(f));
 const pack=files=>esbuild.transformSync(files.map(f=>'\n;/* '+f+' */\n'+fs.readFileSync(path.join(out,f),'utf8')).join('\n'),{loader:'js',minify:true,target:'es2022',legalComments:'none'}).code;
 fs.writeFileSync(path.join(out,'planner.features.js'),pack(features));
 const code='window.PlannerFeatureBundle=true;\n'+scripts.filter(f=>shell.has(f)).map(f=>'\n;/* '+f+' */\n'+fs.readFileSync(path.join(out,f),'utf8')).join('\n');
 fs.writeFileSync(path.join(out,'planner.bundle.js'),esbuild.transformSync(code,{loader:'js',minify:true,target:'es2022',legalComments:'none'}).code);
 html=html.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g,tag=>{const url=tag.match(/href="([^"\s]+)"/)?.[1];if(!url||/^(?:https?:)?\/\//.test(url))return tag;css.push(url.split('?')[0]);return '';});
 const shellStyles=new Set(['styles.css','credits.css','live-sync.css','planner-qol.css','ambient-background.css','back-to-top.css']);
 const featureStyles=css.filter(f=>!shellStyles.has(f));
 fs.writeFileSync(path.join(out,'planner.features.css'),esbuild.transformSync(featureStyles.map(f=>fs.readFileSync(path.join(out,f),'utf8')).join('\n'),{loader:'css',minify:true,target:'es2022',legalComments:'none'}).code);
 const styles=css.filter(f=>shellStyles.has(f)).map(f=>fs.readFileSync(path.join(out,f),'utf8')).join('\n');
 fs.writeFileSync(path.join(out,'planner.bundle.css'),esbuild.transformSync(styles,{loader:'css',minify:true,target:'es2022',legalComments:'none'}).code);
 html=html.replace('</head>','<link rel="stylesheet" href="planner.bundle.css?v='+version+'">\n</head>').replace('</body>','<script src="planner.bundle.js?v='+version+'"></script>\n</body>');fs.writeFileSync(file,html);
 fs.writeFileSync(path.join(out,'release-manifest.json'),JSON.stringify({version,scripts,styles:css,shell:scripts.filter(f=>shell.has(f)),features,lazy:['beanstalk-engine.js','decoder-cache.js','planner.features.js','planner.features.css']}));
 console.log('Built shell ('+scripts.filter(f=>shell.has(f)).length+' scripts), on-demand tools ('+features.length+' scripts), and separate styles; account engine loads on import.');
};
