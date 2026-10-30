import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
for(const envKey of ['SITE_URL','RENDER_EXTERNAL_URL']){
 const env={...process.env,SITE_URL:'',RENDER_EXTERNAL_URL:'',[envKey]:'https://preview.example.com'};
 execFileSync(process.execPath,['scripts/build.mjs'],{env});
 const html=readFileSync('dist/erp/index.html','utf8');
 assert(!html.includes('__SITE_URL__'));
 assert(html.includes('property="og:image" content="https://preview.example.com/erp/assets/social-preview.jpg"'));
 assert(html.includes('property="og:url" content="https://preview.example.com/erp/"'));
 assert(html.includes('property="og:image:width" content="1200"'));
 assert(!/<script[^>]*\bsrc=/.test(html));
 assert.equal([...html.matchAll(/<script data-erp-script=/g)].length,8);
 const styles=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)];
 assert.equal(styles.length,5);
 for(const [,filename] of styles){
  const hash=createHash('sha256').update(readFileSync('dist/erp/'+filename)).digest('hex').slice(0,12);
  assert(filename.endsWith(`.${hash}.css`));
 }
 const website=readFileSync('dist/index.html','utf8');
 assert(website.includes('data-design="industrial-v3"'));
 assert(website.includes('WITH PURPOSE.'));
 assert(!website.includes('data-erp-startup'));
 assert(website.includes('property="og:url" content="https://preview.example.com/"'));
 assert(website.includes('property="og:image" content="https://preview.example.com/assets/triveni-logo.jpg"'));
 assert(!website.includes('__SITE_URL__'));
 assert.equal(readFileSync('dist/website/index.html','utf8').replace('<base href="/website/">',''),website);
 const jpeg=readFileSync('dist/erp/assets/social-preview.jpg');assert.equal(jpeg.readUInt16BE(0),0xffd8);assert(jpeg.length<300000);
}
assert.throws(()=>execFileSync(process.execPath,['scripts/build.mjs'],{env:{...process.env,SITE_URL:'javascript:alert(1)'},stdio:'pipe'}));
execFileSync(process.execPath,['scripts/build.mjs'],{env:{...process.env,SITE_URL:'',RENDER_EXTERNAL_URL:'',RENDER:''}});
console.log('PASS social metadata in initial HTML; automatic Render URL; custom domain; preview JPEG; invalid URL rejected');
