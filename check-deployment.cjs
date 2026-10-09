'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const digest=body=>crypto.createHash('sha256').update(body).digest('hex');
async function verifyDeployment(url,{fetcher=fetch,root=path.join(__dirname,'dist')}={}){
 const base=new URL(url);assert.equal(base.protocol,'https:');if(!base.pathname.endsWith('/'))base.pathname+='/';
 const expected=JSON.parse(fs.readFileSync(path.join(root,'release-manifest.json'),'utf8'));
 const get=async file=>{const u=new URL(file,base);u.searchParams.set('verify',expected.version);const r=await fetcher(u,{cache:'no-store',signal:AbortSignal.timeout(20000)});assert(r.ok,`Deployment resource failed: ${file||'index.html'}`);return r;};
 const response=await get(''),html=await response.text();assert(/http-equiv="Content-Security-Policy"/.test(html),'Missing Pages-compatible CSP');assert(html.includes("object-src 'none'"));
 const manifest=await(await get('release-manifest.json')).json();assert.equal(manifest.version,expected.version,'Deployment serves a stale release');
 for(const file of ['planner.bundle.js','planner.bundle.css','planner.features.js','planner.features.css']){if(file.startsWith('planner.bundle.'))assert(html.includes(`${file}?v=${expected.version}`),`HTML uses stale or missing ${file}`);const bytes=Buffer.from(await(await get(file)).arrayBuffer());assert.equal(digest(bytes),digest(fs.readFileSync(path.join(root,file))),`Deployment bytes differ: ${file}`);}
 return {version:expected.version,frameAncestors:response.headers.get('content-security-policy')?.includes('frame-ancestors')||false};
}
module.exports={verifyDeployment};
if(require.main===module)verifyDeployment(process.argv[2]||'https://sovixxa.github.io/sovixxas-idleon-planner/').then(result=>{console.log(`Deployed release ${result.version}, bundle bytes and meta CSP verified.`);if(!result.frameAncestors)console.log('GitHub Pages limitation: HTTP frame-ancestors/X-Frame-Options require a header-capable proxy or host.');}).catch(e=>{console.error(e);process.exitCode=1;});
