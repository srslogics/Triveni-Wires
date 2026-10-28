import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const configured=process.env.SITE_URL||process.env.RENDER_EXTERNAL_URL;
if(process.env.RENDER&&!configured)throw new Error('Set SITE_URL to the full public HTTPS URL before deploying.');
const url=new URL(configured||'http://localhost:8765');
if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname!=='/')throw new Error('SITE_URL must be a plain HTTP(S) origin, without credentials, path, query or fragment.');
if(configured&&url.protocol!=='https:')throw new Error('Use HTTPS for the public share URL.');
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});await cp('public','dist',{recursive:true});
let html=(await readFile('public/index.html','utf8')).replaceAll('__SITE_URL__',url.origin);
// Deliver every layer together, retaining separate classic-script scopes and
// execution order. Concatenation changes the hoisting of overridden functions.
const scripts=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)];
if(scripts.map(m=>m[1]).join(',')!=='app.js,suite.js,owner.js,brand.js,roles.js,presentation.js,reliability.js,login.js')throw new Error('Review ERP startup order before building.');
for(const match of scripts){
 const source=await readFile('public/'+match[1],'utf8');
 if(/<\/script/i.test(source))throw new Error('Unsafe inline script delimiter in '+match[1]);
 html=html.replace(match[0],()=>`<script data-erp-script="${match[1]}">\n${source}\n</script>`);
}
// Content-addressed styles cannot be confused with a previous CDN release.
for(const match of [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)]){
 const source=await readFile('public/'+match[1]);
 const hash=createHash('sha256').update(source).digest('hex').slice(0,12);
 const filename=match[1].replace(/\.css$/,`.${hash}.css`);
 await writeFile('dist/'+filename,source);
 html=html.replace(match[0],`<link rel="stylesheet" href="${filename}">`);
}
const guard=await readFile('scripts/startup.js','utf8');
html=html.replace('</head>',`<style>
body[data-erp-boot] > :not(#erp-startup):not(script):not(noscript){display:none!important}
#erp-startup{max-width:560px;margin:15vh auto;padding:32px;background:white;border:1px solid #dce6e1;border-top:4px solid #1d5b86;border-radius:10px;font:16px system-ui,sans-serif;color:#173b40}
#erp-startup h1{font:600 26px system-ui,sans-serif}#erp-startup p{line-height:1.6}
</style></head>`);
html=html.replace(/<body([^>]*)>/,(_,attrs)=>`<body${attrs} data-erp-boot="loading"><section id="erp-startup" role="status" aria-live="polite"><h1>Triveni Wires</h1><p id="erp-startup-message">Opening your manufacturing workspace…</p><button id="erp-startup-retry" hidden onclick="window.location.reload()">Retry loading</button></section><noscript><style>#erp-startup{display:none}</style><p>Please enable JavaScript to open the ERP demo.</p></noscript><script data-erp-startup>\n${guard}\n</script>`);
html=html.replace('</body>',`<script data-erp-ready>
window.triveniStartup.finish(typeof modules!=='undefined' && modules.length===16 && typeof rolePolicy!=='undefined' && Object.keys(rolePolicy).length===11 && typeof checkSharedState==='function' && typeof demoSignIn==='function' && typeof demoSessionOpen!=='undefined' && !!document.querySelector('[aria-label="Demonstration role"]'));
</script></body>`);
await writeFile('dist/index.html',html);
console.log(`Built dist. Link preview: ${url.origin}/assets/social-preview.jpg`);
