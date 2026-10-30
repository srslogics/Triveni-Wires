// Execute the actual built HTML's classic scripts without launching a browser.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('dist/index.html','utf8');
const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,10);
assert(!/<script[^>]*\bsrc=/.test(html),'No separately fetched application scripts');
function boot({memory={},session={},blocked=false,breakScript,omitScript}={}){
 const elements={},listeners=new Set(),errors=[];
 const el=s=>elements[s]??={value:'',innerHTML:'',textContent:'',hidden:true,attributes:{},focus(){this.focused=true},showModal(){},close(){},setAttribute(k,v){this.attributes[k]=v},removeAttribute(k){delete this.attributes[k]},remove(){this.removed=true}};
 const body=el('body');body.setAttribute('data-erp-boot','loading');body.classList={toggle(){},contains(){return false}};
 const ctx={console,Blob,URL,setTimeout:()=>0,clearTimeout(){},
  document:{body,getElementById:id=>el('#'+id),querySelector:s=>s==='[aria-label="Demonstration role"]'?(el('#view').innerHTML.includes('aria-label="Demonstration role"')?el('role'):null):el(s),querySelectorAll:()=>[],createElement:()=>({click(){}})},
  localStorage:{getItem(k){if(blocked)throw Error('Denied');return memory[k]??null},setItem(k,v){if(blocked)throw Error('Denied');memory[k]=v}},
  sessionStorage:{getItem(k){if(blocked)throw Error('Denied');return session[k]??null},setItem(k,v){if(blocked)throw Error('Denied');session[k]=v},removeItem(k){if(blocked)throw Error('Denied');delete session[k]}},
  addEventListener(type,fn){if(type==='error')listeners.add(fn)},removeEventListener(type,fn){if(type==='error')listeners.delete(fn)}};
 ctx.window=ctx;vm.createContext(ctx);
 for(const [,attrs,source] of scripts){
  if(omitScript&&attrs.includes(`="${omitScript}"`))continue;
  try{vm.runInContext(breakScript&&attrs.includes(`="${breakScript}"`)?'throw new Error("Simulated startup failure")':source,ctx)}catch(e){errors.push(e);for(const listener of listeners)listener(e)}
 }
 return {el,body,errors,memory,session,run:s=>vm.runInContext(s,ctx)};
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
for(const options of [{breakScript:'suite.js'},{breakScript:'roles.js'},{breakScript:'reliability.js'},{breakScript:'login.js'},{omitScript:'roles.js'},{omitScript:'login.js'}]){
 const b=boot({...options,memory:{...existing.memory}});
 assert.equal(b.body.attributes['data-erp-boot'],'failed');assert(!b.el('#erp-startup').removed);
 assert.equal(b.el('#erp-startup-retry').hidden,false);
 assert(b.el('#erp-startup-message').textContent.includes('could not start'));
 assert.equal(b.memory['triveni-demo-v1'],saved,'Startup failure must not reset existing transactions');
}
console.log('PASS built-page startup: all 16 modules / 11 roles; fresh, saved, blocked and corrupt storage; partial-startup recovery without clearing transactions');

const login=boot();
assert.equal(login.body.attributes['data-demo-access'],'signed-out');
assert(!login.el('#login-screen').hidden);
const original=login.run('JSON.stringify(state)');
login.el('#login-email').value='wrong@example.com';login.el('#login-password').value='wrong';
login.run('demoSignIn({preventDefault(){}})');
assert.equal(login.body.attributes['data-demo-access'],'signed-out');assert(!login.el('#login-error').hidden);
login.run('demoFillCredentials()');login.el('#login-role').value='__proto__';
login.run('demoSignIn({preventDefault(){}})');assert.equal(login.body.attributes['data-demo-access'],'signed-out');
for(const role of login.run('Object.keys(rolePolicy)')){
 login.run('demoFillCredentials()');login.el('#login-role').value=role;
 login.run('demoSignIn({preventDefault(){}})');
 assert.equal(login.body.attributes['data-demo-access'],'signed-in');assert(login.el('#login-screen').hidden);
 assert.equal(login.run('actingRole'),role);assert.equal(login.el('#login-password').value,'');
 const restored=boot({memory:{...login.memory},session:{...login.session}});
 assert.equal(restored.body.attributes['data-demo-access'],'signed-in');assert.equal(restored.run('actingRole'),role);
 login.run('demoSignOut()');assert.equal(login.body.attributes['data-demo-access'],'signed-out');
 assert.equal(login.session['triveni-demo-session-v1'],undefined);
 const signedOut=boot({memory:{...login.memory},session:{...login.session}});
 assert.equal(signedOut.body.attributes['data-demo-access'],'signed-out');
 assert.equal(login.run('JSON.stringify(state)'),original);
}
login.run('demoFillCredentials();demoTogglePassword()');assert.equal(login.el('#login-password').type,'text');
login.run('demoTogglePassword()');assert.equal(login.el('#login-password').type,'password');
const noStorage=boot({blocked:true});noStorage.run('demoFillCredentials();demoSignIn({preventDefault(){}})');
assert.equal(noStorage.body.attributes['data-demo-access'],'signed-in');noStorage.run('demoSignOut()');
assert.equal(noStorage.body.attributes['data-demo-access'],'signed-out');
console.log('PASS demo login: invalid inputs, 11 role entries, refresh session, sign-out, password visibility, blocked storage; transactions unchanged');
