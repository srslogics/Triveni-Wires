import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
for(const envKey of ['SITE_URL','RENDER_EXTERNAL_URL']){
 const env={...process.env,SITE_URL:'',RENDER_EXTERNAL_URL:'',[envKey]:'https://preview.example.com'};
 execFileSync(process.execPath,['scripts/build.mjs'],{env});
 const html=readFileSync('dist/index.html','utf8');
 assert(!html.includes('__SITE_URL__'));
 assert(html.includes('property="og:image" content="https://preview.example.com/assets/social-preview.jpg"'));
 assert(html.includes('property="og:url" content="https://preview.example.com/"'));
 assert(html.includes('property="og:image:width" content="1200"'));
 const jpeg=readFileSync('dist/assets/social-preview.jpg');assert.equal(jpeg.readUInt16BE(0),0xffd8);assert(jpeg.length<300000);
}
assert.throws(()=>execFileSync(process.execPath,['scripts/build.mjs'],{env:{...process.env,SITE_URL:'javascript:alert(1)'},stdio:'pipe'}));
execFileSync(process.execPath,['scripts/build.mjs'],{env:{...process.env,SITE_URL:'',RENDER_EXTERNAL_URL:'',RENDER:''}});
console.log('PASS social metadata in initial HTML; automatic Render URL; custom domain; preview JPEG; invalid URL rejected');
