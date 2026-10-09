'use strict';
const {spawnSync}=require('node:child_process');
for(const file of ['test-engine.js','test-google-device.js','test-live-sync.js','test-analytics.js','test-server.js','test-server-http.js','test-save-lifecycle.js','test-page-loading.js','test-deployment.js']){
 const r=spawnSync(process.execPath,[file],{cwd:__dirname,stdio:'inherit',windowsHide:true});if(r.status!==0)process.exit(r.status||1);
}
