'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const hash=value=>'sha256-'+crypto.createHash('sha256').update(value).digest('base64');
function protect(file){let html=fs.readFileSync(file,'utf8');const hashes=[];
 html=html.replace(/<script\b([^>]*?)src="([^"]+)"([^>]*)><\/script>/g,(tag,before,src,after)=>{
  if(/^https?:\/\//.test(src)){
   // A hashed bootstrap establishes trust for external services and their descendants.
   const code=`(()=>{const s=document.createElement('script');s.src=${JSON.stringify(src)};s.async=${/\basync\b/.test(before+after)};${/crossorigin="anonymous"/.test(before+after)?"s.crossOrigin='anonymous';":''}document.head.appendChild(s);})();`;
   hashes.push(hash(code));return '<script>'+code+'</script>';
  }
  const digest=hash(fs.readFileSync(path.join(path.dirname(file),src.split('?')[0])));hashes.push(digest);return `<script${before}src="${src}"${after} integrity="${digest}"></script>`;
 });
 if(!hashes.length)return;
 const policy=`object-src 'none'; base-uri 'self'; form-action 'self'; script-src-attr 'none'; script-src ${hashes.map(x=>"'"+x+"'").join(' ')} 'strict-dynamic' 'unsafe-eval'; worker-src 'self' blob:`;
 html=html.replace(/<meta http-equiv="Content-Security-Policy" content="[^"]*">/,`<meta http-equiv="Content-Security-Policy" content="${policy}">`);fs.writeFileSync(file,html);
}
module.exports=out=>{for(const name of fs.readdirSync(out).filter(n=>n.endsWith('.html')))protect(path.join(out,name));};
