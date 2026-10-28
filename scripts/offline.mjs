import {readFile,writeFile,mkdir} from 'node:fs/promises';
let html=await readFile('public/index.html','utf8');
// Remote social cards belong to hosted pages; offline copies need no canonical URL.
html=html.replace(/<meta (?:property="og:[^"]+"|name="twitter:[^"]+")[^>]*>\n?/g,'').replace(/<link rel="canonical"[^>]*>\n?/g,'');
for(const match of [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)])html=html.replace(match[0],'<style>'+await readFile('public/'+match[1],'utf8')+'</style>');
for(const match of [...html.matchAll(/<script src="([^"]+)"><\/script>/g)])html=html.replace(match[0],'<script>'+await readFile('public/'+match[1],'utf8')+'</script>');
for(const f of ['triveni-logo.jpg','gi-wire.jpeg','chain-link.jpg'])html=html.replaceAll('assets/'+f,'data:image/jpeg;base64,'+(await readFile('public/assets/'+f)).toString('base64'));
await mkdir('deliverables',{recursive:true});await writeFile('deliverables/Triveni_Wires_Working_Demo.html',html);
console.log('Self-contained demo rebuilt.');
