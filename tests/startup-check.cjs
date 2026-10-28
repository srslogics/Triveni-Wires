// Execute the actual built HTML's classic scripts without launching a browser.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('dist/index.html','utf8');
const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,9);
assert(!/<script[^>]*\bsrc=/.test(html),'No separately fetched application scripts');
function boot({memory={},blocked=false,breakScript,omitScript}={}){
 const elements={},listeners=new Set(),errors=[];
 const el=s=>elements[s]??={value:'',innerHTML:'',textContent:'',hidden:true,attributes:{},showModal(){},close(){},setAttribute(k,v){this.attributes[k]=v},removeAttribute(k){delete this.attributes[k]},remove(){this.removed=true}};
 const body=el('body');body.setAttribute('data-erp-boot','loading');body.classList={toggle(){},contains(){return false}};
 const ctx={console,Blob,URL,setTimeout:()=>0,clearTimeout(){},
  document:{body,getElementById:id=>el('#'+id),querySelector:s=>s==='[aria-label="Demonstration role"]'?(el('#view').innerHTML.includes('aria-label="Demonstration role"')?el('role'):null):el(s),querySelectorAll:()=>[],createElement:()=>({click(){}})},
  localStorage:{getItem(k){if(blocked)throw Error('Denied');return memory[k]??null},setItem(k,v){if(blocked)throw Error('Denied');memory[k]=v}},
  addEventListener(type,fn){if(type==='error')listeners.add(fn)},removeEventListener(type,fn){if(type==='error')listeners.delete(fn)}};
 ctx.window=ctx;vm.createContext(ctx);
 for(const [,attrs,source] of scripts){
  if(omitScript&&attrs.includes(`="${omitScript}"`))continue;
  try{vm.runInContext(breakScript&&attrs.includes(`="${breakScript}"`)?'throw new Error("Simulated startup failure")':source,ctx)}catch(e){errors.push(e);for(const listener of listeners)listener(e)}
 }
 return {el,body,errors,memory,run:s=>vm.runInContext(s,ctx)};
}
for(const options of [{},{blocked:true},{memory:{'triveni-demo-v1':'{'}}]){
 const b=boot(options);assert.equal(b.errors.length,0,b.errors.map(e=>e.stack).join('\n'));
 assert(!('data-erp-boot' in b.body.attributes));assert(b.el('#erp-startup').removed);
 assert.equal(b.run('modules.length'),16);assert.equal(b.run('Object.keys(rolePolicy).length'),11);
 assert.equal(b.run('state.order.qty'),5000);
 const before=b.run('JSON.stringify(state)');
 for(const role of b.run('Object.keys(rolePolicy)')){
  b.run(`roleChange(${JSON.stringify(role)})`);
  for(const page of b.run("['Dashboard',...rolePolicy[actingRole]]")){
   b.run(`go(${JSON.stringify(page)})`);
   assert(b.el('#view').innerHTML.length>100);assert(!/NaN|undefined|Infinity/.test(b.el('#view').innerHTML));
  }
 }
 assert.equal(b.run('JSON.stringify(state)'),before);
}
const existing=boot();existing.run('loadOwner()');const saved=existing.memory['triveni-demo-v1'];
const reopened=boot({memory:{...existing.memory}});assert.equal(reopened.memory['triveni-demo-v1'],saved);assert(reopened.el('#erp-startup').removed);
for(const options of [{breakScript:'suite.js'},{breakScript:'roles.js'},{breakScript:'reliability.js'},{omitScript:'roles.js'}]){
 const b=boot({...options,memory:{...existing.memory}});
 assert.equal(b.body.attributes['data-erp-boot'],'failed');assert(!b.el('#erp-startup').removed);
 assert.equal(b.el('#erp-startup-retry').hidden,false);
 assert(b.el('#erp-startup-message').textContent.includes('could not start'));
 assert.equal(b.memory['triveni-demo-v1'],saved,'Startup failure must not reset existing transactions');
}
console.log('PASS built-page startup: all 16 modules / 11 roles; fresh, saved, blocked and corrupt storage; partial-startup recovery without clearing transactions');
