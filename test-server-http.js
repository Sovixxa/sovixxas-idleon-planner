'use strict';
const assert=require('node:assert/strict'),http=require('node:http'),net=require('node:net'),{spawn}=require('node:child_process');
(async()=>{
 const probe=net.createServer();await new Promise(r=>probe.listen(0,'127.0.0.1',r));const port=probe.address().port;await new Promise(r=>probe.close(r));
 const child=spawn(process.execPath,['server.js'],{cwd:__dirname,env:{...process.env,JELLY_PORT:String(port),JELLY_NO_OPEN:'1',JELLY_AUTO_PULL:'0'},windowsHide:true,stdio:['ignore','pipe','pipe']});
 function request(path,method='GET',headers={}){return new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port,path,method,headers},res=>{let body='';res.on('data',c=>body+=c);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));});req.on('error',reject);req.setTimeout(5000,()=>req.destroy(Error('Server response timed out')));req.end();});}
 try{
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server startup timed out')),10000);child.stdout.on('data',data=>{if(String(data).includes('running at')){clearTimeout(timer);resolve();}});child.once('error',reject);child.once('exit',code=>{clearTimeout(timer);reject(Error('Server exited: '+code));});});
  const home=await request('/');assert.equal(home.status,200);assert.match(home.body,/Idleon Planner/);assert.equal(home.headers['x-content-type-options'],'nosniff');assert.equal(home.headers['referrer-policy'],'no-referrer');
  const head=await request('/index.html','HEAD');assert.equal(head.status,200);assert.equal(head.body,'');
  for(const path of ['/%','/%00','/%0A'])assert.equal((await request(path)).status,400,path);
  for(const path of ['/../outside','/.git/config','/%2eenv'])assert.equal((await request(path)).status,403,path);
  assert.equal((await request('/__pull','POST',{Origin:'https://untrusted.example'})).status,403);
  assert.equal((await request('/__pull','POST',{'Sec-Fetch-Site':'cross-site'})).status,403);
  assert.equal((await request('/__status','GET',{Host:'untrusted.example:'+port})).status,403);
  assert.equal((await request('/index.html','POST')).status,405);
  assert.equal((await request('/__status')).status,200);
  assert.equal((await request('/index.html','GET',{Host:'localhost:'+port})).status,200);
  console.log('Real HTTP server: normal/HEAD requests, security headers, malformed paths, hidden files, host/origin checks and post-error availability pass.');
 }finally{child.kill();await new Promise(resolve=>{if(child.exitCode!==null)return resolve();child.once('exit',resolve);});}
})().catch(e=>{console.error(e);process.exitCode=1;});
