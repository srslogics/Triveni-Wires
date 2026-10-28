// Presentation entry only. These public credentials are NOT authentication.
// Production accounts require a server-backed identity provider and authorization.
const demoSessionKey='triveni-demo-session-v1';
function demoAccess(open){
 document.body.setAttribute?.('data-demo-access',open?'signed-in':'signed-out');
 $('#login-screen').hidden=open;
}
function demoTogglePassword(){
 const field=$('#login-password'),button=$('#login-password-toggle');
 const visible=field.type==='password';field.type=visible?'text':'password';
 button.textContent=visible?'Hide':'Show';
 button.setAttribute?.('aria-label',visible?'Hide demo password':'Show demo password');
 button.setAttribute?.('aria-pressed',String(visible));
}
function demoClearPassword(){
 $('#login-password').value='';$('#login-password').type='password';
 $('#login-password-toggle').textContent='Show';
 $('#login-password-toggle').setAttribute?.('aria-label','Show demo password');
 $('#login-password-toggle').setAttribute?.('aria-pressed','false');
}
function demoFillCredentials(){
 $('#login-email').value='demo@triveniwires.example';
 $('#login-password').value='TriveniDemo';
 $('#login-error').hidden=true;
 $('#login-role').focus?.();
}
function demoSignIn(event){
 event.preventDefault();
 const email=$('#login-email'),password=$('#login-password'),role=$('#login-role').value;
 if(email.value.trim().toLowerCase()!=='demo@triveniwires.example'||password.value!=='TriveniDemo'||!Object.hasOwn(rolePolicy,role)){
  $('#login-error').textContent='Use the demo credentials below and select a workspace to continue.';
  $('#login-error').hidden=false;password.focus?.();return;
 }
 $('#login-error').hidden=true;
 roleChange(role);
 try{window.sessionStorage?.setItem(demoSessionKey,'open')}catch{/* In-memory demo access still works. */}
 demoClearPassword();demoAccess(true);
 const heading=$('#view h1');heading?.setAttribute?.('tabindex','-1');heading?.focus?.();
}
function demoSignOut(){
 closeModal();
 try{window.sessionStorage?.removeItem(demoSessionKey)}catch{/* No saved ERP transactions are removed. */}
 demoClearPassword();$('#login-error').hidden=true;$('#toast').hidden=true;
 $('#login-role').value=actingRole;demoAccess(false);$('#login-email').focus?.();
}
$('#login-role').innerHTML=Object.keys(rolePolicy).map(role=>`<option value="${role}">${role} · ${roleNames[role]}</option>`).join('');
$('#login-role').value=actingRole;
let demoSessionOpen=false;
try{demoSessionOpen=window.sessionStorage?.getItem(demoSessionKey)==='open'}catch{/* Show the entry screen if storage is blocked. */}
demoAccess(demoSessionOpen);
