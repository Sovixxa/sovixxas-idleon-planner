'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
let requestHandler;const watched=[];
const fakeFs={...fs,watchFile(file){watched.push(path.basename(file));},watch(){return{};}};
const context={__dirname:__dirname,Buffer,URL,console:{log(){}},process:{env:{JELLY_NO_OPEN:'1'},platform:process.platform},setTimeout,clearTimeout,setInterval,require:name=>name==='http'?{createServer(fn){requestHandler=fn;return{listen(){}};}}:name==='fs'?fakeFs:require(name)};
vm.runInNewContext(fs.readFileSync('server.js','utf8'),context);
function request(url){return new Promise(resolve=>{requestHandler({url,method:'GET'},{writeHead(status){this.status=status;},end(body){resolve({status:this.status,body:String(body)});}});});}
(async()=>{assert.equal((await request('/%')).status,400);assert.equal((await request('/%E0%A4%A')).status,400);assert.equal((await request('/../outside')).status,403);assert.equal((await request('/__status')).status,200);for(const name of ['arcade-pages.js','progression-pages.js','endgame-models.js','quests-v5.js'])assert(watched.includes(name),name);console.log('Server: malformed URLs handled, traversal blocked, later requests work, current modules watched');})().catch(e=>{console.error(e);process.exitCode=1;});
