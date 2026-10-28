// Final presentation safeguards. These do not replace production server controls.
function checkSharedState(){
 const latest=storageGet(KEY);
 if(latest===storedSnapshot||storageWarning.startsWith('Browser storage'))return true;
 if(!latest){state=seed();extra();controls();ownerData();storedSnapshot=null;closeModal();render();toast('Saved sample records changed in another tab. The latest starting scenario is loaded; review it before retrying.');return false}
 try{const next=JSON.parse(latest);if(!validDemo(next))throw Error('Invalid');state=next;storedSnapshot=latest;closeModal();render();toast('Another tab saved changes. The latest records are loaded; review them and retry your action.')}catch{storageWarning='Saved records changed but could not be validated. Reload a sample dataset from Presentation tools to recover.';storageNotice();toast('Action stopped to protect the existing sample records.')}
 return false;
}
function recountForm(){if(actingRole!=='Warehouse')return;let n=ownerData().count;if(!n||n.status==='Posted')return;form('Record a fresh physical count',input('freshCount','New physical count (kg)',state.raw,'number','min="0" step="0.01"')+input('freshReason','Recount explanation','','text','maxlength="300"'),'recountSave')}
function recountSave(e){e.preventDefault();if(actingRole!=='Warehouse')return;let n=ownerData().count;if(!n||n.status==='Posted'||!validNumber(val('freshCount'))||!validText(val('freshReason'),10,300))return toast('Enter a non-negative count and an explanation of at least 10 characters.');const old={...n};n.previousCounts??=[];delete old.previousCounts;n.previousCounts.push(old);Object.assign(n,{book:state.raw,physical:Number(val('freshCount')),reason:val('freshReason').trim(),status:'Draft',countedBy:'Warehouse demo role',time:new Date().toISOString()});delete n.maker;closeModal();save(`CNT-001 recounted: book ${n.book} kg; physical ${n.physical} kg. Prior snapshot retained; submit for independent approval.`,actingRole)}
actionPolicy.recountForm=['Warehouse'];actionPolicy.recountSave=['Warehouse'];
function applyReset(){state=seed();extra();controls();ownerData();tab='Dashboard';closeModal();save();toast('Starting scenario restored. Refresh will preserve this reset.')}
resetDemo=function(){openModal(`<h2>Reset demonstration?</h2><p>Restore opening stock and clear only this browser’s sample transactions. Use Load meeting data to restore the presentation scenario.</p><div class="actions"><button onclick="closeModal()">Cancel</button><button class="primary" onclick="applyReset()">Reset sample data</button></div>`)};
const savedRender=render;render=function(){savedRender();storageNotice()};
// Reject stale submissions from another tab before changing any shared records.
for(const name of [...Object.keys(actionPolicy),'submitApproval','approveControl','applyReset','applyPresentation','loadOwner']){
 const original=window[name];if(typeof original!=='function')continue;
 window[name]=function(...args){
  if(!['applyReset','applyPresentation','loadOwner'].includes(name)&&!checkSharedState()){args[0]?.preventDefault?.();return}
  return original.apply(this,args);
 };
}
// Defensive record references and enum checks also cover stale open dialogs.
const recordRefs={toggleUser:()=>extra().users,productForm:()=>extra().products,receive:()=>extra().purchase,invoice:()=>state.shipments,packing:()=>state.shipments,paymentForm:()=>extra().invoices,ticketNext:()=>extra().tickets,attendance:()=>extra().people};
for(const [name,records] of Object.entries(recordRefs)){const original=window[name];window[name]=function(i,...args){if(!Number.isInteger(i)||!records()[i])return toast('That sample record is no longer available. Reopen the work queue.');return original.call(this,i,...args)}}
for(const name of ['pack','inspect','moveForm']){const original=window[name];window[name]=function(id){if(!state.coils.some(c=>c.id===id&&remaining(c)>0))return toast('Select an available coil.');return original.call(this,id)}}
for(const name of ['submitApproval','approveControl']){const original=window[name];window[name]=function(type){if(!['Sales order','Production'].includes(type))return toast('Unknown approval type.');return original.call(this,type)}}
const safeLead=leadStage;leadStage=function(stage){if(!['Enquiry','Quoted','Negotiation','Won'].includes(stage))return;return safeLead(stage)};
const safeConnection=connection;connection=function(i){if(!Number.isInteger(i)||i<0||i>4)return;return safeConnection(i)};
const safeLoad=loadOwner;loadOwner=function(){const result=safeLoad();storageSet('triveni-acting-role','Owner');return result};
const safeScenario=zincScenario;zincScenario=function(v){let c=ownerCost();if(c&&c.actual-Math.max(0,state.po.zinc-Number(v))*extra().cost.zinc<0)return toast('This scenario would produce a negative cost. Review the cost assumptions.');return safeScenario(v)};
render();
