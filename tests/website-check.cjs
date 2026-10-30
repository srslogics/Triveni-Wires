const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {PRODUCTS,filterByApplication,validateRequest,enquiryText}=require('../website/data.js');
assert.equal(PRODUCTS.length,6);assert.equal(filterByApplication('all','','boundary').length,3);
const request={name:'Buyer',company:'Company',phone:'9999999999',email:'buyer@example.com',location:'Nagpur',consent:true,items:[{product:'gi',quantity:5000,unit:'kg'},{product:'chain',quantity:5,unit:'rolls'}]};
assert.equal(validateRequest(request),'');assert(validateRequest({...request,items:[]}));assert(enquiryText(request).includes('5 rolls'));
const root=path.resolve('dist');
function check(directory){for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())check(file);else if(file.endsWith('.html')){const html=fs.readFileSync(file,'utf8');assert(!html.includes('__SITE_URL__'),file);assert(!html.includes('triveni-wires-corporate.srslogics.chatgpt.site'),file);for(const [,raw] of html.matchAll(/(?:href|src)="([^"<>]+)"/g)){if(/^(https?:|data:|blob:|#)/.test(raw))continue;let name=raw.split('#')[0].split('?')[0];let target=name.startsWith('/')?path.join(root,name):path.resolve(path.dirname(file),name);if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');assert(fs.existsSync(target),file+' missing '+raw);const hash=path.basename(target).match(/\.([a-f0-9]{12})\.(?:css|js)$/)?.[1];if(hash)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex').slice(0,12),hash)}}}}
check(root);
assert(fs.readFileSync('dist/erp/index.html','utf8').includes('id="login-screen"'));
for(const p of PRODUCTS){assert(fs.existsSync(`dist/products/${p.id}.html`));assert(fs.existsSync(`dist/website/products/${p.id}.html`));}
console.log('PASS corporate root + /website/, ERP /erp/, every local asset/link, version hashes, social origins and multi-product enquiries');
