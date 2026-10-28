// Keep a partial ERP out of view until every application layer initializes.
(() => {
 let failed=false;
 const message=document.getElementById('erp-startup-message');
 const retry=document.getElementById('erp-startup-retry');
 const panel=document.getElementById('erp-startup');
 function fail(){
  failed=true;
  document.body.setAttribute('data-erp-boot','failed');
  panel.setAttribute('role','alert');
  message.textContent='The complete workspace could not start. Retry loading the page. Your saved demo records have not been cleared.';
  retry.hidden=false;
 }
 window.addEventListener('error',fail);
 window.triveniStartup={finish(ready){
  if(failed||!ready){fail();return}
  window.removeEventListener('error',fail);
  document.body.removeAttribute('data-erp-boot');
  panel.remove();
 }};
})();
