'use strict';
const http=require('http');
const fs=require('fs');
const path=require('path');
const {execFile}=require('child_process');
const {spawn}=require('child_process');

const ROOT=__dirname;
const HOST='127.0.0.1';
const PORT=Number(process.env.JELLY_PORT||3000);
const AUTO_PULL=process.env.JELLY_AUTO_PULL==='1';
const PULL_MS=Math.max(1500,Number(process.env.JELLY_PULL_MS||3000));
const clients=new Set();
const MIME={
  '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8','.txt':'text/plain; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
  '.svg':'image/svg+xml','.ico':'image/x-icon'
};
function sendJson(res,status,obj){const b=Buffer.from(JSON.stringify(obj));res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':b.length,'Cache-Control':'no-store'});res.end(b);}
function broadcast(type='reload',data='changed'){for(const res of clients){try{res.write(`event: ${type}\ndata: ${data}\n\n`);}catch(_){clients.delete(res);}}}
function safePath(urlPath){
  const clean=decodeURIComponent((urlPath.split('?')[0]||'/')).replace(/\\/g,'/');
  const rel=clean==='/'?'index.html':clean.replace(/^\/+/, '');
  const full=path.resolve(ROOT,rel);
  return full.startsWith(path.resolve(ROOT)+path.sep)||full===path.resolve(ROOT)?full:null;
}
let pulling=false;
function gitPull(done){
  if(pulling)return done&&done(new Error('A Git update is already running.'));
  if(!fs.existsSync(path.join(ROOT,'.git')))return done&&done(new Error('This folder is not a Git checkout yet.'));
  pulling=true;
  execFile('git',['status','--porcelain'],{cwd:ROOT,timeout:10000},(statusErr,statusOut)=>{
    if(statusErr){pulling=false;return done&&done(statusErr);}
    if((statusOut||'').trim()){pulling=false;return done&&done(new Error('Local source files have edits; auto-pull skipped instead of overwriting them.'));}
    execFile('git',['pull','--ff-only'],{cwd:ROOT,timeout:30000},(err,stdout,stderr)=>{
      pulling=false;
      const output=(stdout||stderr||'').trim();
      if(!err&&!/already up[ -]to[ -]date/i.test(output)&&!/already up to date/i.test(output))setTimeout(()=>broadcast('reload','git-pull'),120);
      done&&done(err?new Error((stderr||err.message).trim()):null,output||'Already up to date.');
    });
  });
}
const server=http.createServer((req,res)=>{
  if(req.url==='/__events'){
    res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache, no-store','Connection':'keep-alive','Access-Control-Allow-Origin':'http://127.0.0.1:'+PORT});
    res.write('retry: 1000\n\nevent: hello\ndata: live\n\n');clients.add(res);req.on('close',()=>clients.delete(res));return;
  }
  if(req.url==='/__status')return sendJson(res,200,{ok:true,gitRepo:fs.existsSync(path.join(ROOT,'.git')),autoPull:AUTO_PULL,port:PORT});
  if(req.url==='/__pull'&&req.method==='POST'){
    gitPull((err,output)=>{if(err)return sendJson(res,500,{ok:false,error:err.message});sendJson(res,200,{ok:true,output});});return;
  }
  const full=safePath(req.url||'/');if(!full)return sendJson(res,403,{error:'Forbidden'});
  fs.stat(full,(err,st)=>{
    if(err||!st.isFile())return sendJson(res,404,{error:'Not found'});
    const ext=path.extname(full).toLowerCase(),headers={'Content-Type':MIME[ext]||'application/octet-stream','Cache-Control':'no-store'};
    res.writeHead(200,headers);fs.createReadStream(full).pipe(res);
  });
});

// Portable hot reload: watch core source files plus direct asset changes.
const watchFiles=['index.html','styles.css','app.js','engine.js','solver-worker.js','beanstalk-engine.js','beanstalk.js','beanstalk.css','pets.js','pets.css','remaining-worlds.js','remaining-worlds.css','bonus-systems.js','bonus-systems.css','README.txt'];
let reloadTimer=null;
function changed(file){clearTimeout(reloadTimer);reloadTimer=setTimeout(()=>broadcast('reload',path.basename(file)),120);}
for(const f of watchFiles){const p=path.join(ROOT,f);if(fs.existsSync(p))fs.watchFile(p,{interval:450},(cur,prev)=>{if(cur.mtimeMs!==prev.mtimeMs||cur.size!==prev.size)changed(p);});}
try{fs.watch(path.join(ROOT,'assets'),{persistent:false},(_evt,name)=>{if(name)changed(name);});}catch(_){/* assets are static; core watchers still work */}

if(AUTO_PULL&&fs.existsSync(path.join(ROOT,'.git'))){
  setInterval(()=>gitPull(()=>{}),PULL_MS).unref();
}

server.listen(PORT,HOST,()=>{
  const url=`http://${HOST}:${PORT}`;
  console.log(`\nSovixxa’s Idleon Planner running at ${url}`);
  console.log('Keep this window open. Source-file edits hot-reload the browser.');
  if(AUTO_PULL)console.log(`Git auto-pull: ON (every ${Math.round(PULL_MS/1000)}s; clean working tree only).`);
  console.log('');
  if(process.env.JELLY_NO_OPEN!=='1'){
    if(process.platform==='win32')spawn('cmd',['/c','start','',url],{detached:true,stdio:'ignore'}).unref();
    else if(process.platform==='darwin')spawn('open',[url],{detached:true,stdio:'ignore'}).unref();
    else spawn('xdg-open',[url],{detached:true,stdio:'ignore'}).unref();
  }
});
