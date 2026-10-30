'use strict';
const PRODUCTS=[
{id:'gi',name:'Galvanised iron wire',category:'wire',tag:'GALVANISED WIRE',description:'Explore coating, diameter and packing requirements.',image:'assets/gi-wire.jpeg',alt:'Yellow-wrapped wire coils from Triveni Wires’ catalogue, labelled fencing grade 70/90 GSM.',details:'The company catalogue includes hot-dipped galvanised wire. Share your required diameter, coating and application so the sales team can confirm a suitable specification.',fields:['Wire diameter','Coating requirement','Quantity and packing'],source:'https://www.triveniwires.com/hot-dipped-galvanized-wire.html'},
{id:'chain',name:'Chain-link fencing',category:'fencing',tag:'FENCING',description:'Define mesh size, wire diameter and roll dimensions.',image:'assets/chain-link.jpg',alt:'Micon Wires fencing product display from the Triveni Wires catalogue.',details:'The published chain-link range includes fencing products under the Micon Wires name. Specify mesh opening, wire diameter, roll height and roll length in your enquiry.',fields:['Mesh opening and wire diameter','Roll height and length','Finish and total quantity'],source:'https://www.triveniwires.com/chain-link-fencings.html'},
{id:'binding',name:'MS binding wire',category:'wire',tag:'BINDING WIRE',description:'Share your preferred gauge and coil requirement.',details:'MS black binding wire is part of the published product range. Confirm the required gauge, application and coil packing with the company before ordering.',fields:['Gauge or diameter','Application','Coil weight and quantity'],source:'https://www.triveniwires.com/ms-black-binding-wire.html'},
{id:'barbed',name:'Barbed wire',category:'fencing',tag:'FENCING',description:'Specify wire gauge, barb spacing and roll quantity.',details:'Barbed wire is part of the Triveni Wires catalogue. Tell the team the intended use, wire gauge, barb spacing and coating requirement for review.',fields:['Wire gauge','Barb spacing and finish','Roll size and quantity'],source:'https://www.triveniwires.com/barbed-wire.html'},
{id:'electro',name:'Electro GI wire',category:'wire',tag:'GALVANISED WIRE',description:'Discuss diameter, finish and intended application.',details:'The company lists electro GI wire in its published range. Required dimensions, finish and packing should be confirmed during the quotation process.',fields:['Diameter','Finish and application','Packing and quantity'],source:'https://www.triveniwires.com/'},
{id:'stay',name:'Stay wire',category:'wire',tag:'STRANDED WIRE',description:'Include strand construction and project requirements.',details:'Stay wire appears in the company catalogue. Include your required strand construction, dimensions and any project-specific documentation in the enquiry.',fields:['Strand construction','Diameter and coating','Documentation and quantity'],source:'https://www.triveniwires.com/'}
];
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function filterProducts(category,query){const q=String(query).trim().toLowerCase();return PRODUCTS.filter(p=>(category==='all'||p.category===category)&&[p.name,p.description,p.tag].join(' ').toLowerCase().includes(q))}
function validateEnquiry(data){
 const required=['product','quantity','unit','location','name','company','email','phone'];
 if(required.some(k=>!String(data[k]??'').trim()))return 'Please complete all required fields.';
 if(!PRODUCTS.some(p=>p.id===data.product))return 'Choose a product from the catalogue.';
 const quantity=Number(data.quantity);if(!Number.isFinite(quantity)||quantity<.01||quantity>10000000||Math.abs(quantity*100-Math.round(quantity*100))>1e-6)return 'Enter a quantity between 0.01 and 10,000,000, with up to two decimal places.';
 if(!['kg','tonnes','rolls'].includes(data.unit))return 'Choose a valid quantity unit.';
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()))return 'Enter a valid email address.';
 if(!/^[+\d ()-]{7,24}$/.test(data.phone.trim())||data.phone.replace(/\D/g,'').length<7)return 'Enter a valid contact phone number.';
 if(!data.consent)return 'Please agree to saving your enquiry on this device.';
 const limits={location:160,name:100,company:160,email:160,phone:24,spec:120,coating:120,notes:2000};
 for(const [k,max] of Object.entries(limits))if(String(data[k]??'').length>max)return 'Please shorten the '+k+' field.';
 if(data.date){const date=new Date(data.date+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(data.date)||!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==data.date)return 'Enter a valid required-by date.';const today=new Date();const local=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');if(data.date<local)return 'Choose today or a future required-by date.';}
 return '';
}
function legacyEnquiryText(r){const product=PRODUCTS.find(p=>p.id===r.product);return ['TRIVENI WIRES — PRODUCT ENQUIRY',r.id,'Status: prepared locally; not submitted to the company','',`Product: ${product?.name||r.product}`,`Quantity: ${r.quantity} ${r.unit}`,`Diameter / mesh: ${r.spec||'To be confirmed'}`,`Coating / finish: ${r.coating||'To be confirmed'}`,`Delivery location: ${r.location}`,`Required by: ${r.date||'To be discussed'}`,`Additional requirements: ${r.notes||'None specified'}`,'',`Contact: ${r.name}`,`Company: ${r.company}`,`Email: ${r.email}`,`Phone: ${r.phone}`,'','Please confirm specifications, availability, pricing and delivery terms.'].join('\n')}

const APPLICATIONS=[
 {id:'boundary',name:'Boundary & perimeter',description:'Explore chain-link, barbed wire and galvanised wire for a fencing requirement.',products:['chain','barbed','gi'],symbol:'01'},
 {id:'construction',name:'Construction & tying',description:'Start with binding wire and describe the gauge, packing and site requirement.',products:['binding'],symbol:'02'},
 {id:'fabrication',name:'Wire fabrication',description:'Compare galvanised wire options and define the finish your process requires.',products:['gi','electro'],symbol:'03'},
 {id:'support',name:'Stranded wire requirements',description:'Specify the strand construction and documentation for a stay wire enquiry.',products:['stay'],symbol:'04'}
];
function filterByApplication(category,query,application='all'){
 const selected=APPLICATIONS.find(a=>a.id===application);
 return filterProducts(category,query).filter(p=>!selected||selected.products.includes(p.id));
}
function validateLine(line){
 return validateEnquiry({...line,location:'Sample',name:'Sample',company:'Sample',email:'sample@example.com',phone:'1234567890',consent:true});
}
function normalizeRecord(r){
 if(!r||typeof r!=='object'||Array.isArray(r))return null;
 const items=Array.isArray(r.items)?r.items:(r.product?[{product:r.product,quantity:r.quantity,unit:r.unit,spec:r.spec||'',coating:r.coating||''}]:[]);
 if(!items.length||items.length>20||items.some(i=>!i||validateLine(i)))return null;
 if(typeof r.id!=='string'||!/^TW-[A-Z0-9-]{1,70}$/.test(r.id)||typeof r.created!=='string'||!Number.isFinite(Date.parse(r.created)))return null;
 if(validateEnquiry({...r,...items[0],date:''}))return null;
 return {...r,items,status:['Draft','Downloaded','Copied for sharing'].includes(r.status)?r.status:'Draft'};
}
function validateRequest(r){
 if(!Array.isArray(r.items)||!r.items.length)return 'Add at least one product to your quotation basket.';
 if(r.items.length>20)return 'A single enquiry can contain up to 20 product lines.';
 for(let i=0;i<r.items.length;i++){if(!r.items[i])return 'Invalid product line.';const error=validateLine(r.items[i]);if(error)return `Product ${i+1}: ${error}`;}
 return validateEnquiry({...r,...r.items[0],date:r.date});
}
function enquiryText(r){
 if(!Array.isArray(r.items))return legacyEnquiryText(r);
 return ['TRIVENI WIRES — QUOTATION REQUEST',r.id,'Status: prepared locally; not submitted to the company','',...r.items.flatMap((line,i)=>[
 `${i+1}. ${PRODUCTS.find(p=>p.id===line.product)?.name||line.product}`,`Quantity: ${line.quantity} ${line.unit}`,`Diameter / mesh: ${line.spec||'To be confirmed'}`,`Coating / finish: ${line.coating||'To be confirmed'}`,''
 ]),`Delivery location: ${r.location}`,`Required by: ${r.date||'To be discussed'}`,`Additional requirements: ${r.notes||'None specified'}`,'',`Contact: ${r.name}`,`Company: ${r.company}`,`Email: ${r.email}`,`Phone: ${r.phone}`,'','Please confirm specifications, availability, pricing, packing and delivery terms.'].join('\n');
}
const DATA={PRODUCTS,APPLICATIONS,esc,filterProducts,filterByApplication,validateEnquiry,validateLine,normalizeRecord,validateRequest,enquiryText};
if(typeof module!=='undefined')module.exports=DATA;
