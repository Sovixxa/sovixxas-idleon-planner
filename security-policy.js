'use strict';
// Direct GitHub Pages has no configurable HTTP response headers.
// This deliberately limited policy preserves dynamic AdSense/Firebase/Umami.
const metaPolicy="object-src 'none'; base-uri 'self'; form-action 'self'; script-src-attr 'none'";
module.exports={metaPolicy,headers:{'Content-Security-Policy':metaPolicy+"; frame-ancestors 'none'",'X-Frame-Options':'DENY','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=()'}};
