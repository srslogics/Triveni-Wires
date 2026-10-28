const fs=require('fs'),vm=require('vm'),assert=require('assert');let elements={},selected=[],memory={};const el=s=>elements[s]||(elements[s]={value:'',innerHTML:'',textContent:'',showModal(){},close(){}});const ctx={document:{querySelector:el,querySelectorAll:()=>selected},localStorage:{getItem:k=>memory[k],setItem:(k,v)=>memory[k]=v},setTimeout:()=>0,clearTimeout(){},window:{},console};ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync('public/app.js','utf8'),ctx);function run(s){return vm.runInContext(s,ctx)}

ctx.document.body={classList:{toggle(){},contains(){return true}}};
for(const f of ['suite.js','owner.js','brand.js','roles.js'])vm.runInContext(fs.readFileSync('public/'+f,'utf8'),ctx);
run('state=ownerSeed();render()');
const before=run('JSON.stringify(state)');
for(const role of run('Object.keys(rolePolicy)')){
 run('roleChange('+JSON.stringify(role)+')');assert.equal(run('tab'),'Dashboard');
 for(const mod of run('rolePolicy[actingRole]')){run('go('+JSON.stringify(mod)+')');assert(el('#view').innerHTML.length>100,role+':'+mod)}
}
assert.equal(run('JSON.stringify(state)'),before,'Switching roles must not mutate transactions');
for(const role of ['Operator','Quality','Warehouse','Dispatch','Planner','Maintenance','Administrator']){
 run('roleChange('+JSON.stringify(role)+')');
 for(const mod of run("['Dashboard',...rolePolicy[actingRole]]")){
  run('go('+JSON.stringify(mod)+')');assert(!el('#view').innerHTML.includes('₹'),role+': monetary values leaked in '+mod);
 }
 run("go('HR & payroll')");assert.equal(run('tab'),'Dashboard');assert(!el('#view').innerHTML.includes('Daily estimate'));
}
run("roleChange('Quality');go('Finance')");assert.equal(run('tab'),'Dashboard');assert(!el('#nav').innerHTML.includes("go('Finance')"));
run("roleChange('Dispatch');go('Dispatch')");assert(el('#view').innerHTML.includes('ship-FG-003'));assert(!el('#view').innerHTML.includes('ship-FG-004'));assert(!el('#view').innerHTML.includes('ship-FG-005'));
elements['#diameter']={value:3};elements['#coating']={value:110};elements['#reason']={value:'Sample accepted'};
run("roleChange('Quality');quality({preventDefault(){}},'FG-004')");assert.equal(run('state.coils[3].status'),'Released');
run("roleChange('Warehouse');go('Warehouse');pack('FG-004')");assert(run("extra().packed.includes('FG-004')"));
run("roleChange('Dispatch');go('Dispatch')");assert(el('#view').innerHTML.includes('ship-FG-004'));
selected=[{value:'FG-004'}];elements['#ship-FG-004']={value:1000};elements['#tare']={value:5000};elements['#vehicle']={value:'TEST'};
run('dispatch({preventDefault(){}})');assert.equal(run('shipped()'),3500);
run("roleChange('Finance');invoice(2)");assert.equal(run('extra().invoices[1].amount'),85000);
run("roleChange('Owner');go('Dashboard')");assert(el('#view').innerHTML.includes('1,500'));assert.equal(run('ownerMetrics().outstanding'),1500);
run("roleChange('Warehouse');invoice(1);attendance(0);costForm()");assert.equal(run('extra().invoices.length'),2);assert.equal(run('extra().people[0].present'),true);
run("roleChange('Operator');userForm()");assert(!el('#modal').innerHTML?.includes('Add demo team member'));
console.log('PASS: 11 role dashboards; navigation guards; monetary/payroll visibility; read-only render without state changes; quality → warehouse → dispatch → finance → owner; direct action denials');

vm.runInContext(fs.readFileSync('public/presentation.js','utf8'),ctx);
run("state=ownerSeed();actingRole='Owner';tab='Dashboard';render()");
assert(el('#view').innerHTML.includes('Operating')||el('#view').innerHTML.includes('Today’s priorities'));
assert(el('#view').innerHTML.includes('50% dispatched'));
assert(el('#view').innerHTML.includes('2,12,500'));
assert(el('#view').innerHTML.includes('stack-track'));
run("go('Cost variance')");assert(el('#view').innerHTML.includes('12,620'));assert(el('#view').innerHTML.includes('variance-visual'));assert(el('#view').innerHTML.includes('id="zincTarget"'));
run("go('Delivery desk')");assert(el('#view').innerHTML.includes('milestones'));assert(el('#view').innerHTML.includes('2026-10-27'));
run("go('Stock reconciliation')");assert(el('#view').innerHTML.includes('1,980 kg'));assert(el('#view').innerHTML.includes('2,060 kg'));
const stable=run('JSON.stringify(state)');
for(const role of run('Object.keys(rolePolicy)')){run('roleChange('+JSON.stringify(role)+')');for(const mod of run("['Dashboard',...rolePolicy[actingRole]]")){run('go('+JSON.stringify(mod)+')');assert(el('#view').innerHTML.length>100);if(['Operator','Planner','Quality','Warehouse','Dispatch','Maintenance','Administrator'].includes(role))assert(!el('#view').innerHTML.includes('₹'),role+': value visibility in '+mod)}}
assert.equal(run('JSON.stringify(state)'),stable);
console.log('PASS: owner hierarchy, fulfilment segments, delivery dates, stock comparison, variance visual, retained what-if slider, all role views, no data mutations or financial leakage');
