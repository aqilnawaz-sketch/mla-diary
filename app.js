{
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const TODAY=iso(new Date());
const addDays=(s,n)=>{const d=new Date(s+'T00:00');d.setDate(d.getDate()+n);return iso(d)};
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],WD=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const fd=s=>{if(!s)return '—';const d=new Date(s+'T00:00');return isNaN(d)?s:d.getDate()+' '+MON[d.getMonth()]+' '+d.getFullYear()};
const rs=n=>'Rs '+Math.round(+n||0).toLocaleString('en-PK');
const TYPES=['Civil','Criminal','Bail','Family','Khula / Divorce','Guardianship','Rent','Writ (LHC)','Appeal / Revision','Service','FIA','NAB','ATC','Banking','Revenue','Consumer','Other'];
const ST=['Active','Decided','Withdrawn','Closed'];
const COURT_TYPES=['Civil Judge','Senior Civil Judge','Family Judge','Guardian Judge','Rent Controller','Judicial Magistrate','Additional Sessions Judge','Sessions Judge','Special Judge (Central)','Anti-Terrorism Court','Banking Court','Accountability Court','Consumer Court','Labour Court','Service Tribunal','Revenue Court','Lahore High Court','Federal Shariat Court'];
const CITIES=['Bahawalpur','Bahawalnagar','Rahim Yar Khan','Lodhran','Multan','Lahore','Islamabad','Karachi'];
const STAGES=['Notice','Written statement','Reply','Issues','Plaintiff evidence','Defendant evidence','Arguments','Order / Judgment','Bail','Charge','Prosecution evidence','342 statement','Final arguments','Execution','Reconciliation'];
const TASKS=['Written statement','Reply to notice','Reply / Para-wise comments','Rejoinder','Evidence affidavit','Documents to file','Written arguments','Appeal limitation','Revision limitation','Fee deposit','Other'];
const FIRM={name:'Mian Law Associates',adv:'Mian Aqil Nawaz, Advocate High Court',addr:'Chamber No. 39, District Courts, Kachahery Chowk, Bahawalpur',contact:'0333-3621111 · mianlawassociates1@gmail.com · mlabwp.com.pk'};
const LIB={pdf:'vendor/jspdf.umd.min.js',at:'vendor/jspdf.plugin.autotable.min.js',xlsx:'vendor/xlsx.full.min.js'};

let LANG='en';try{LANG=localStorage.getItem('mla_lang')||'en'}catch(e){}
const t=k=>(I18N[LANG]&&I18N[LANG][k])||I18N.en[k]||k;
const stL=s=>t('st_'+s);


/* ---------- encrypted on-device storage ---------- */
const IDB={db:null};
function idbOpen(){return IDB.db?Promise.resolve(IDB.db):new Promise((ok,no)=>{const r=indexedDB.open('mla-diary',1);r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('kv'))d.createObjectStore('kv');if(!d.objectStoreNames.contains('files'))d.createObjectStore('files')};r.onsuccess=()=>{IDB.db=r.result;ok(r.result)};r.onerror=()=>no(r.error)})}
async function idb(store,mode,fn){const d=await idbOpen();return new Promise((ok,no)=>{const tx=d.transaction(store,mode);const st=tx.objectStore(store);const r=fn(st);tx.oncomplete=()=>ok(r&&'result' in r?r.result:undefined);tx.onerror=()=>no(tx.error);tx.onabort=()=>no(tx.error)})}
const idbGet=(st,k)=>idb(st,'readonly',s=>s.get(k)),idbPut=(st,k,v)=>idb(st,'readwrite',s=>s.put(v,k)),idbDel=(st,k)=>idb(st,'readwrite',s=>s.delete(k)),idbKeys=st=>idb(st,'readonly',s=>s.getAllKeys()),idbClear=st=>idb(st,'readwrite',s=>s.clear());
const te=new TextEncoder(),tdec=new TextDecoder();
const S={key:null,meta:null};
async function deriveKey(pass,salt){const base=await crypto.subtle.importKey('raw',te.encode(pass),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function enc(key,bytes){const iv=crypto.getRandomValues(new Uint8Array(12));const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,bytes);return{iv,ct:new Uint8Array(ct)}}
async function dec(key,o){return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:o.iv},key,o.ct))}
const encJ=(k,obj)=>enc(k,te.encode(JSON.stringify(obj))),decJ=async(k,o)=>JSON.parse(tdec.decode(await dec(k,o)));
const b64=u=>{let s='';const c=0x8000;for(let i=0;i<u.length;i+=c)s+=String.fromCharCode.apply(null,u.subarray(i,i+c));return btoa(s)};
const unb64=s=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u};
let saving=Promise.resolve();
function persist(){const snap={clients,cases,fees,settings};saving=saving.then(async()=>{if(!S.key)return;if(CLOUD)await idbPut('kv','settings_'+C.email,settings);else await idbPut('kv','state',await encJ(S.key,snap))}).catch(()=>toast('Could not save on this device — storage may be full'));return saving}
const A={db:true};
const CFG=(window.MLA_CLOUD&&window.MLA_CLOUD.firebase)?window.MLA_CLOUD:null,CLOUD=!!CFG;
const C={fs:null,auth:null,email:'',adv:false,ok:null,fk:null,oraw:'',fraw:'',ring:null,unsub:[],cache:new Map(),q:Promise.resolve()};
const pk=o=>{const u=new Uint8Array(o.iv.length+o.ct.length);u.set(o.iv);u.set(o.ct,o.iv.length);return b64(u)};
const unpk=s=>{const u=unb64(s);return{iv:u.slice(0,12),ct:u.slice(12)}};
const encS=async(k,obj)=>pk(await encJ(k,obj)),decS=(k,s)=>decJ(k,unpk(s));
const rawKey=b=>crypto.subtle.importKey('raw',unb64(b),'AES-GCM',false,['encrypt','decrypt']);
const rnd=n=>b64(crypto.getRandomValues(new Uint8Array(n)));
function cErr(e){const c=e&&e.code||'';return c.includes('permission')?t('noPerm'):c.includes('unavailable')?t('needOnline'):(e&&e.message)||'Error'}

let clients=[],cases=[],fees={},settings={},isAdmin=true,canWrite=true;
let view='diary',curId=null,curClient=null,calM=TODAY.slice(0,7),calDay=TODAY,moneyKind='pay';
const ui={q:'',f:'Active',cq:'',cause:addDays(TODAY,1)};

const F=id=>fees[id]||{};
const paid=id=>(F(id).payments||[]).reduce((a,p)=>a+(+p.amt||0),0);
const expB=id=>(F(id).expenses||[]).filter(e=>e.bill!==false).reduce((a,e)=>a+(+e.amt||0),0);
const owed=id=>(+F(id).fee||0)+expB(id);
const bal=id=>Math.max(0,owed(id)-paid(id));
const cli=id=>clients.find(c=>c.id===id)||{};
const cname=c=>cli(c.clientId).name||'';
const cphone=c=>cli(c.clientId).phone||'';
const ctitle=c=>c.title||(cname(c)?cname(c)+' — '+t('untitled'):t('untitled'));
const byId=id=>cases.find(c=>c.id===id);
const E=fm=>new Proxy(fm,{get:(o,k)=>{const el=typeof k==='string'&&o.elements.namedItem(k);if(el)return el;const v=o[k];return typeof v==='function'?v.bind(o):v}});
const clone=o=>JSON.parse(JSON.stringify(o||{}));
const strip=o=>{const x=clone(o);delete x.id;return x};

function toast(m){const e=$('#toast');e.textContent=m;e.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>e.classList.remove('on'),2600)}
function status(m){const s=$('#status');s.textContent=m||'';s.style.display=m?'':'none'}

/* ---------- writes ---------- */
function applyLocal(coll,id,d){if(coll==='fees')fees[id]=d;else{const arr=coll==='cases'?cases:clients;const i=arr.findIndex(x=>x.id===id);const o={id,...d};if(i<0)arr.push(o);else arr[i]=o}}
function applyDel(coll,id){if(coll==='fees')delete fees[id];else if(coll==='cases')cases=cases.filter(x=>x.id!==id);else clients=clients.filter(x=>x.id!==id)}
async function put(coll,id,data){
  if(!S.key){toast(t('locked'));return false}
  const d={...clone(data),updated:new Date().toISOString()};
  if(CLOUD){if(coll==='fees'&&!C.fk){toast(t('staffNote'));return false}
    try{const p=await encS(coll==='fees'?C.fk:C.ok,d);
      if(coll==='fees')C.fs.collection('fees').doc(id).set({p,u:Date.now()}).catch(e=>toast(cErr(e)));
      else{C.cache.set(id,{k:coll==='cases'?'case':'client',p,o:d});C.fs.collection('records').doc(id).set({k:coll==='cases'?'case':'client',p,u:Date.now(),by:C.email}).catch(e=>toast(cErr(e)))}
    }catch(e){toast('Could not save');return false}
    applyLocal(coll,id,d);render();gQueue();return true}
  applyLocal(coll,id,d);await persist();render();gQueue();return true}
async function del(coll,id){if(!S.key)return false;
  if(CLOUD){C.cache.delete(id);C.fs.collection(coll==='fees'?'fees':'records').doc(id).delete().catch(e=>toast(cErr(e)))}
  applyDel(coll,id);if(!CLOUD)await persist();render();gQueue();return true}
const newId=()=>Date.now().toString(36)+crypto.getRandomValues(new Uint32Array(1))[0].toString(36);

/* ---------- WhatsApp ---------- */
function waNum(p){p=String(p||'').replace(/\D/g,'');if(!p)return '';if(p.startsWith('0'))p='92'+p.slice(1);else if(p.length===10&&p.startsWith('3'))p='92'+p;return p}
function waLink(phone,msg){const n=waNum(phone);return n?'https://wa.me/'+n+'?text='+encodeURIComponent(msg):''}
const waHear=c=>waLink(cphone(c),`Assalam-o-Alaikum ${cname(c)||''}, your case "${ctitle(c)}" is fixed for hearing on ${fd(c.nextDate)}${c.court?' before '+c.court:''}${c.stage?' ('+c.stage+')':''}. Please contact us if needed. — ${FIRM.name}, 0333-3621111`);

/* ---------- libraries & files ---------- */
const loaded={};
function load(src){return loaded[src]||(loaded[src]=new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>{delete loaded[src];no(new Error('load'))};document.head.appendChild(s)}))}
const MIME={ics:'text/calendar',pdf:'application/pdf',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',json:'application/json',mladiary:'application/octet-stream'};
const mobile=()=>matchMedia('(pointer:coarse)').matches;
function download(file){const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=file.name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},5000)}
let READY=null;
async function shareOrSave(name,data,opt={}){
  const ext=name.split('.').pop();const file=new File([data],name,{type:MIME[ext]||'application/octet-stream'});
  if((opt.share||mobile())&&navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],...(opt.text?{text:opt.text}:{})});return}catch(e){if(e&&e.name==='AbortError')return;if(e&&e.name==='NotAllowedError'){READY={file,opt};$('#readyName').textContent=name;$('#readyDlg').showModal();return}}}
  download(file);if(opt.wa)setTimeout(()=>window.open(opt.wa,'_blank'),400)}
const saveFile=(name,data)=>shareOrSave(name,data);
let LOGO=null;
async function logo(){if(LOGO)return LOGO;try{const b=await (await fetch('icons/logo.jpg')).blob();LOGO=await new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b)})}catch(x){LOGO=''}return LOGO}
async function jsPDF(){await load(LIB.pdf);await load(LIB.at);return window.jspdf.jsPDF}
async function XL(){await load(LIB.xlsx);return window.XLSX}
function words(n){n=Math.round(+n||0);if(!n)return 'Zero';const a=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'],b=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  const two=x=>x<20?a[x]:b[Math.floor(x/10)]+(x%10?' '+a[x%10]:''),three=x=>(x>=100?a[Math.floor(x/100)]+' Hundred'+(x%100?' ':''):'')+(x%100?two(x%100):'');
  const p=[];const cr=Math.floor(n/1e7);n%=1e7;const lk=Math.floor(n/1e5);n%=1e5;const th=Math.floor(n/1e3);n%=1e3;
  if(cr)p.push(three(cr)+' Crore');if(lk)p.push(two(lk)+' Lakh');if(th)p.push(two(th)+' Thousand');if(n)p.push(three(n));return p.join(' ')}

async function causeList(kind){
  const d=ui.cause||addDays(TODAY,1);
  const list=cases.filter(c=>c.status==='Active'&&c.nextDate===d).sort((a,b)=>(a.court||'').localeCompare(b.court||''));
  if(!list.length){toast(t('nothingDay'));return}
  const head=['#','Case','Case no. / FIR','Court','Client','Phone','For'];
  const rows=list.map((c,i)=>[i+1,ctitle(c)+(c.opp?' (vs '+c.opp+')':''),[c.caseNo,c.fir?'FIR '+c.fir+(c.ps?' PS '+c.ps:''):''].filter(Boolean).join(' / '),[c.court,c.judge].filter(Boolean).join(' — '),cname(c),cphone(c),c.stage||'']);
  try{
    if(kind==='pdf'||kind==='print'){const J=await jsPDF();const doc=new J({orientation:'landscape',unit:'mm',format:'a4'});
      const lg=await logo();if(lg)doc.addImage(lg,'JPEG',265,6,22,22);doc.setTextColor(150,118,40);doc.setFont('times','bold');doc.setFontSize(17);doc.text(FIRM.name+' — Cause List',14,16);doc.setTextColor(20,20,20);
      doc.setFont('helvetica','normal');doc.setFontSize(11);doc.text(WD[new Date(d+'T00:00').getDay()]+', '+fd(d)+'  ·  '+list.length+' case(s)',14,23);
      doc.autoTable({head:[head],body:rows,startY:28,styles:{fontSize:9,cellPadding:2},headStyles:{fillColor:[12,12,14],textColor:[228,196,110]},columnStyles:{0:{cellWidth:8}}});
      doc.setFontSize(8);doc.text(FIRM.addr+'  ·  '+FIRM.contact,14,200);
      if(kind==='print')openBlob(doc.output('blob'),'Cause-list-'+d+'.pdf');else await saveFile('Cause-list-'+d+'.pdf',doc.output('blob'))}
    else{const X=await XL();const ws=X.utils.aoa_to_sheet([[FIRM.name+' — Cause List '+fd(d)],[],head,...rows]);ws['!cols']=[{wch:4},{wch:36},{wch:22},{wch:28},{wch:20},{wch:14},{wch:18}];const wb=X.utils.book_new();X.utils.book_append_sheet(wb,ws,'Cause list');
      await saveFile('Cause-list-'+d+'.xlsx',new Blob([X.write(wb,{bookType:'xlsx',type:'array'})]))}
  }catch(e){toast('Could not load the file maker — check connection')}
}
async function backup(){
  try{const X=await XL();const wb=X.utils.book_new();const add=(n,rows)=>X.utils.book_append_sheet(wb,X.utils.json_to_sheet(rows.length?rows:[{'':'none'}]),n);
    add('Cases',cases.map(c=>({Client:cname(c),Phone:cphone(c),Case:ctitle(c),'Opposite party':c.opp||'','Case no':c.caseNo||'',FIR:c.fir||'','Police station':c.ps||'',Sections:c.sections||'',Court:c.court||'',Judge:c.judge||'',Type:c.type||'',Status:c.status||'',Filed:c.filed||'','Next date':c.nextDate||'',Stage:c.stage||'',Notes:c.notes||'',...(isAdmin?{'Agreed fee':+F(c.id).fee||0,'Expenses (billable)':expB(c.id),Received:paid(c.id),Balance:bal(c.id)}:{})})));
    add('Clients',clients.map(c=>({Name:c.name||'',Phone:c.phone||'',CNIC:c.cnic||'',Address:c.address||'','Referred by':c.ref||'',Notes:c.notes||'',Cases:cases.filter(x=>x.clientId===c.id).length})));
    add('Hearings',cases.flatMap(c=>(c.hearings||[]).map(h=>({Case:ctitle(c),Client:cname(c),Date:h.d,Proceedings:h.note||'','Next date':h.next||''}))));
    add('Deadlines',cases.flatMap(c=>(c.deadlines||[]).map(x=>({Case:ctitle(c),What:x.label||'',Due:x.d||'',Done:x.done?'Yes':''}))));
    if(isAdmin){add('Payments',cases.flatMap(c=>(F(c.id).payments||[]).map(p=>({Receipt:p.rno||'',Date:p.d,Client:cname(c),Case:ctitle(c),Amount:+p.amt||0,Mode:p.mode||'',Note:p.note||''}))));
      add('Expenses',cases.flatMap(c=>(F(c.id).expenses||[]).map(p=>({Date:p.d,Case:ctitle(c),Amount:+p.amt||0,'Charge to client':p.bill===false?'No':'Yes',Note:p.note||''}))));
      add('Instalments',cases.flatMap(c=>(F(c.id).plan||[]).map(p=>({Case:ctitle(c),Client:cname(c),Due:p.d,Amount:+p.amt||0}))))}
    await saveFile('MLA-backup-'+TODAY+'.xlsx',new Blob([X.write(wb,{bookType:'xlsx',type:'array'})]));
  }catch(e){toast('Could not load the file maker — check connection')}
}
async function makeReceipt(cid,i){
  const c=byId(cid);const p=(F(cid).payments||[])[i];if(!c||!p)return null;
  {const J=await jsPDF();const doc=new J({unit:'mm',format:'a5'});const W=148;
    const lg=await logo();doc.setFillColor(12,12,14);doc.rect(0,0,W,30,'F');doc.setDrawColor(201,164,68);doc.setLineWidth(0.6);doc.line(0,30,W,30);if(lg)doc.addImage(lg,'JPEG',6,3,24,24);
    doc.setTextColor(228,196,110);doc.setFont('times','bold');doc.setFontSize(15);doc.text(FIRM.name.toUpperCase(),W/2+12,12,{align:'center'});
    doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(232,223,200);doc.text(FIRM.adv,W/2+12,18,{align:'center'});doc.text(FIRM.addr,W/2+12,23,{align:'center'});
    doc.setTextColor(150,118,40);doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text('FEE RECEIPT',W/2,39,{align:'center'});
    doc.setTextColor(20,20,20);doc.setFontSize(10);doc.setFont('helvetica','normal');
    doc.text('Receipt no: '+(p.rno||'—'),12,48);doc.text('Date: '+fd(p.d),W-12,48,{align:'right'});
    const L=[['Received from',cname(c)||'—'],['Case',ctitle(c)],['Case no.',c.caseNo||'—'],['Court',c.court||'—'],['Amount',rs(p.amt)],['In words','Rupees '+words(p.amt)+' only'],['Mode',p.mode||'Cash'],['Remarks',p.note||'—'],['Total fee agreed',rs(owed(cid))],['Received to date',rs(paid(cid))],['Balance',rs(bal(cid))]];
    doc.autoTable({body:L,startY:53,theme:'plain',styles:{fontSize:10,cellPadding:1.6},columnStyles:{0:{fontStyle:'bold',cellWidth:38}},margin:{left:12,right:12}});
    const y=doc.lastAutoTable.finalY+22;doc.line(W-62,y,W-12,y);doc.setFontSize(9);doc.text('Signature',W-37,y+5,{align:'center'});
    doc.setFontSize(7.5);doc.setTextColor(90,90,90);doc.text(FIRM.contact,W/2,204,{align:'center'});
    return{name:'Receipt-'+(p.rno||p.d)+'.pdf',blob:doc.output('blob'),c,p};
  }
}
async function receipt(cid,i,how){
  try{const r=await makeReceipt(cid,i);if(!r)return;
    if(how==='print'){openBlob(r.blob,r.name);return}
    const msg=`Assalam-o-Alaikum ${cname(r.c)}, received with thanks ${rs(r.p.amt)} on ${fd(r.p.d)} for "${ctitle(r.c)}". Receipt ${r.p.rno||''} attached. Balance: ${rs(bal(cid))}. — ${FIRM.name}, 0333-3621111`;
    if(how==='wa')await shareOrSave(r.name,r.blob,{share:true,text:msg,wa:waLink(cphone(r.c),msg)});
    else if(how==='email'){const cl=cli(r.c.clientId);await shareOrSave(r.name,r.blob,{share:true,text:msg});if(!mobile()&&cl.email)window.open('mailto:'+encodeURIComponent(cl.email)+'?subject='+encodeURIComponent('Fee receipt '+(r.p.rno||''))+'&body='+encodeURIComponent(msg+'\n\n(PDF receipt attached)'),'_blank')}
    else await shareOrSave(r.name,r.blob)}
  catch(e){toast('Could not make the receipt')}
}

/* ---------- pieces ---------- */
function rowHTML(c,pre){
  const b=isAdmin?bal(c.id):0,w=waHear(c);
  return `<div class="row"><div class="main" data-a="open" data-id="${esc(c.id)}"><h3>${esc(ctitle(c))}</h3>
  <div class="meta">${pre?esc(pre)+' · ':''}${esc(cname(c))}${c.court?' · '+esc(c.court):''}${c.caseNo?' · '+esc(c.caseNo):''}</div>
  <div class="tags">${c.stage?`<span class="tag">${esc(c.stage)}</span>`:''}${c.type?`<span class="tag">${esc(c.type)}</span>`:''}${isAdmin&&owed(c.id)?(b?`<span class="tag due">${esc(t('balance'))} ${rs(b)}</span>`:`<span class="tag paid">${esc(t('balance'))} 0</span>`):''}</div></div>
  <div class="acts"><button class="sm" type="button" data-a="hear" data-id="${esc(c.id)}">${esc(t('update'))}</button>${isAdmin?`<button class="sm" type="button" data-a="pay" data-id="${esc(c.id)}">${esc(t('addFee'))}</button>`:''}${w?`<a class="btn sm ghost" href="${esc(w)}" target="_blank" rel="noopener">${esc(t('whatsapp'))}</a>`:''}</div></div>`;
}
const chip=(v,l,alert)=>`<div class="chip ${alert?'alert':''}"><b>${esc(v)}</b><small>${esc(l)}</small></div>`;
const bars=(list,fmt)=>{const m=Math.max(1,...list.map(x=>x[1]));return list.length?`<div class="bars">${list.map(([l,v])=>`<div class="br"><span title="${esc(l)}">${esc(l)}</span><div class="tr"><div style="width:${(v/m*100).toFixed(1)}%"></div></div><b>${esc(fmt?fmt(v):v)}</b></div>`).join('')}</div>`:`<div class="meta">—</div>`};
const count=(arr,f)=>{const m={};arr.forEach(x=>{const k=f(x)||'—';m[k]=(m[k]||0)+1});return Object.entries(m).sort((a,b)=>b[1]-a[1])};
const clientBal=cid=>cases.filter(x=>x.clientId===cid).reduce((a,x)=>a+bal(x.id),0);
function feeRemLink(cid){const cl=cli(cid);const cs=cases.filter(x=>x.clientId===cid&&bal(x.id)>0);if(!cs.length)return '';const tot=cs.reduce((a,x)=>a+bal(x.id),0);
  return waLink(cl.phone,`Assalam-o-Alaikum ${cl.name||''}, a gentle reminder from ${FIRM.name}: fee balance of ${rs(tot)} is pending for ${cs.map(x=>'"'+ctitle(x)+'" ('+rs(bal(x.id))+')').join(', ')}. Kindly arrange it at your convenience. JazakAllah. — ${FIRM.adv}, 0333-3621111`)}
const dueSoon=()=>cases.filter(c=>c.status==='Active').flatMap(c=>(c.deadlines||[]).map((x,i)=>({c,x,i}))).filter(o=>!o.x.done&&o.x.d&&addDays(o.x.d,-(o.x.rem===0?0:(+o.x.rem||2)))<=TODAY).sort((a,b)=>a.x.d<b.x.d?-1:1);
const daysLeft=d=>Math.round((new Date(d+'T00:00')-new Date(TODAY+'T00:00'))/864e5);
const upcomingDl=()=>cases.filter(c=>c.status==='Active').flatMap(c=>(c.deadlines||[]).map((x,i)=>({c,x,i}))).filter(o=>!o.x.done&&o.x.d&&o.x.d<=addDays(TODAY,15)).sort((a,b)=>a.x.d<b.x.d?-1:1);

/* ---------- views ---------- */
function vDiary(){
  const act=cases.filter(c=>c.status==='Active'),tom=addDays(TODAY,1),wk=addDays(TODAY,7);
  const past=act.filter(c=>c.nextDate&&c.nextDate<TODAY),dls=upcomingDl();
  let h='';
  const tomL=act.filter(c=>c.nextDate===tom),ds=dueSoon();
  const fd2=isAdmin?cases.filter(c=>c.status==='Active').map(c=>({c,ni:nextInst(c.id)})).filter(o=>o.ni&&addDays(o.ni.d,-(+o.ni.rem||0))<=TODAY):[];
  if(tomL.length||ds.length||fd2.length)h+=`<div class="panel"><h3>${esc(t('reminders'))}</h3><div class="hist">${fd2.map(o=>`<div class="${daysLeft(o.ni.d)<=0?'x':''}"><b>${esc(t('feeDueOn'))}</b> ${rs(o.ni.due)} — ${esc(cname(o.c))} · ${esc(ctitle(o.c))} · ${dl(o.ni.d)}<span class="sp"></span>${o.c.clientId&&cphone(o.c)?`<button class="sm" type="button" data-a="feeRem" data-id="${esc(o.c.clientId)}">${esc(t('feeReminder'))}</button>`:''}</div>`).join('')}${tomL.length?`<div><b>${esc(t('tomorrow'))}:</b> ${tomL.length} ${esc(t('cases_n'))} — ${tomL.slice(0,4).map(c=>esc(ctitle(c))).join(', ')}${tomL.length>4?'…':''}</div>`:''}${ds.map(o=>{const n=daysLeft(o.x.d);return `<div class="${n<=0?'x':''}"><b>${esc(o.x.label||t('deadline'))}</b> — ${esc(ctitle(o.c))} · ${n<0?esc(t('overdue')):n===0?esc(t('today')):n+' '+esc(t('daysLeft'))} (${fd(o.x.d)})<span class="sp"></span><button class="sm ghost" type="button" data-a="dlDone" data-id="${esc(o.c.id)}" data-i="${o.i}">${esc(t('done'))}</button></div>`}).join('')}</div></div>`;
  h+=`<div class="chips">${chip(act.filter(c=>c.nextDate===TODAY).length,t('today'))}${chip(act.filter(c=>c.nextDate===tom).length,t('tomorrow'))}${chip(act.filter(c=>c.nextDate>=TODAY&&c.nextDate<=wk).length,t('next7'))}${chip(past.length,t('passed'),past.length)}${chip(dls.length,t('deadlines'),dls.some(o=>o.x.d<=TODAY))}${chip(act.filter(c=>!c.nextDate).length,t('noDate'))}</div>`;
  h+=`<div class="bar"><b>${esc(t('causeList'))}</b><input type="date" id="causeD" value="${esc(ui.cause)}" aria-label="${esc(t('causeList'))}"><button class="sm" type="button" data-a="causePdf">${esc(t('pdf'))}</button><button class="sm" type="button" data-a="causeXls">${esc(t('excel'))}</button><button class="sm" type="button" data-a="causePrint">${esc(t('print'))}</button></div>`;
  if(!cases.length)return h+`<div class="empty"><h3>${esc(t('emptyDiary'))}</h3><p>${esc(t('emptyDiary2'))}</p></div>`;
  if(dls.length)h+=`<div class="day"><div class="dt past"><b>${esc(t('deadline'))}</b><span>${dls.length}</span></div><div class="rows">${dls.map(o=>`<div class="row"><div class="main" data-a="open" data-id="${esc(o.c.id)}"><h3>${esc(o.x.label||t('deadline'))} — ${fd(o.x.d)}</h3><div class="meta">${esc(ctitle(o.c))} · ${esc(cname(o.c))}</div></div><div class="acts"><button class="sm" type="button" data-a="dlDone" data-id="${esc(o.c.id)}" data-i="${o.i}">${esc(t('done'))}</button></div></div>`).join('')}</div></div>`;
  if(past.length)h+=`<div class="day"><div class="dt past"><b>${esc(t('update'))}</b><span>${esc(t('passed'))}</span></div><div class="rows">${past.sort((a,b)=>a.nextDate<b.nextDate?-1:1).map(c=>rowHTML(c,t('wasFixed')+' '+fd(c.nextDate))).join('')}</div></div>`;
  const up=act.filter(c=>c.nextDate>=TODAY).sort((a,b)=>a.nextDate<b.nextDate?-1:a.nextDate>b.nextDate?1:(a.court||'').localeCompare(b.court||''));
  const days=[...new Set(up.map(c=>c.nextDate))].slice(0,30);
  for(const d of days){const dd=new Date(d+'T00:00'),list=up.filter(c=>c.nextDate===d);
    h+=`<div class="day"><div class="dt"><b>${dd.getDate()} ${MON[dd.getMonth()]}</b><span>${esc(d===TODAY?t('today'):d===tom?t('tomorrow'):WD[dd.getDay()])} · ${list.length} ${esc(t('cases_n'))}</span></div><div class="rows">${list.map(c=>rowHTML(c)).join('')}</div></div>`}
  if(!days.length&&!past.length)h+=`<div class="empty">${esc(t('noUpcoming'))}</div>`;
  return h;
}
function vCal(){
  const [y,m]=calM.split('-').map(Number),first=new Date(y,m-1,1),start=new Date(y,m-1,1-first.getDay());
  const act=cases.filter(c=>c.status==='Active');
  const cnt={};act.forEach(c=>{if(c.nextDate)cnt[c.nextDate]=(cnt[c.nextDate]||0)+1});
  const dlc={};act.forEach(c=>(c.deadlines||[]).forEach(x=>{if(!x.done&&x.d)dlc[x.d]=(dlc[x.d]||0)+1}));
  let h=`<div class="calh"><button class="sm" type="button" data-a="calPrev" aria-label="${esc(t('prev'))}">‹</button><h2>${MON[m-1]} ${y}</h2><button class="sm" type="button" data-a="calNext" aria-label="${esc(t('next'))}">›</button></div><div class="cal">${WD.map(w=>`<div class="wd">${w}</div>`).join('')}`;
  for(let i=0;i<42;i++){const d=new Date(start);d.setDate(start.getDate()+i);const s=iso(d);
    h+=`<button type="button" data-a="calDay" data-d="${s}" class="${d.getMonth()!==m-1?'out':''} ${s===TODAY?'td':''} ${s===calDay?'sel':''}">${d.getDate()}${cnt[s]?`<i>${cnt[s]}</i>`:''}${dlc[s]?`<u>● ${dlc[s]}</u>`:''}</button>`}
  h+=`</div><h2 class="sec">${WD[new Date(calDay+'T00:00').getDay()]}, ${fd(calDay)}</h2>`;
  const list=act.filter(c=>c.nextDate===calDay),dl=act.flatMap(c=>(c.deadlines||[]).filter(x=>!x.done&&x.d===calDay).map(x=>({c,x})));
  h+=dl.map(o=>`<div class="note">${esc(t('deadline'))}: ${esc(o.x.label||'')} — ${esc(ctitle(o.c))}</div>`).join('');
  return h+(list.length?`<div class="rows">${list.map(c=>rowHTML(c)).join('')}</div>`:`<div class="empty">${esc(t('nothingDay'))}</div>`);
}
function vCases(){
  const q=ui.q.toLowerCase(),f=ui.f;
  const list=cases.filter(c=>(f==='All'||c.status===f||(f==='Fee due'&&bal(c.id)>0))&&(!q||[ctitle(c),cname(c),cphone(c),c.opp,c.court,c.judge,c.caseNo,c.fir,c.ps,c.sections,c.type].join(' ').toLowerCase().includes(q))).sort((a,b)=>(a.nextDate||'9')<(b.nextDate||'9')?-1:1);
  const opts=[...ST,...(isAdmin?['Fee due']:[]),'All'];
  let h=`<div class="bar"><input id="q" type="search" placeholder="${esc(t('search'))}" value="${esc(ui.q)}"><select id="f">${opts.map(o=>`<option value="${o}" ${o===f?'selected':''}>${esc(o==='All'?t('all'):o==='Fee due'?t('feeDue'):stL(o))}</option>`).join('')}</select><button type="button" class="sm" data-a="backup">${esc(t('backup'))}</button></div>`;
  if(!list.length)return h+`<div class="empty">${esc(t('noMatch'))}</div>`;
  return h+`<table class="stack"><thead><tr><th>${esc(t('title'))}</th><th>${esc(t('client'))}</th><th>${esc(t('court'))}</th><th>${esc(t('nextDate'))}</th><th>${esc(t('status'))}</th>${isAdmin?`<th class="n">${esc(t('balance'))}</th>`:''}</tr></thead><tbody>${list.map(c=>`<tr data-a="open" data-id="${esc(c.id)}"><td><b>${esc(ctitle(c))}</b>${c.caseNo||c.fir?`<div class="meta">${esc([c.caseNo,c.fir?'FIR '+c.fir:''].filter(Boolean).join(' · '))}</div>`:''}</td><td>${esc(cname(c))}</td><td>${esc(c.court)}</td><td style="white-space:nowrap">${fd(c.nextDate)}</td><td>${esc(stL(c.status))}</td>${isAdmin?`<td class="n">${owed(c.id)?rs(bal(c.id)):''}</td>`:''}</tr>`).join('')}</tbody></table>`;
}
function vClients(){
  const q=ui.cq.toLowerCase();
  const list=clients.filter(c=>!q||[c.name,c.phone,c.cnic,c.address,c.ref].join(' ').toLowerCase().includes(q)).sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  let h=`<div class="bar"><input id="cq" type="search" placeholder="${esc(t('search'))}" value="${esc(ui.cq)}"><button type="button" class="sm pri" data-a="newClient">${esc(t('newClient'))}</button></div>`;
  if(!list.length)return h+`<div class="empty">${esc(clients.length?t('noMatch'):t('noClients'))}<p class="meta">${esc(t('clientsHow'))}</p></div>`;
  return h+`<div class="rows">${list.map(c=>{const cs=cases.filter(x=>x.clientId===c.id),act=cs.filter(x=>x.status==='Active'),nx=act.map(x=>x.nextDate).filter(d=>d&&d>=TODAY).sort()[0],b=isAdmin?cs.reduce((a,x)=>a+bal(x.id),0):0,types=[...new Set(cs.map(x=>x.type||'Other'))];
    return `<div class="row"><div class="main" data-a="openClient" data-id="${esc(c.id)}"><h3>${esc(c.name||t('untitledClient'))}</h3><div class="meta">${esc(c.phone||'')}${c.phone&&cs.length?' · ':''}${cs.length?cs.length+' '+esc(t('cases_n')):''}</div>
    <div class="tags">${types.map(ty=>`<span class="tag">${esc(ty)}</span>`).join('')}${nx?`<span class="tag">${esc(t('nextHearing'))}: ${fd(nx)}</span>`:''}${isAdmin&&b?`<span class="tag due">${esc(t('remaining'))} ${rs(b)}</span>`:''}</div></div></div>`}).join('')}</div>`;
}
function allPays(){return cases.flatMap(c=>(F(c.id).payments||[]).map((p,i)=>({...p,c,i})))}
function vFee(){
  if(!isAdmin)return `<div class="empty">${esc(t('staffNote'))}</div>`;
  const m=TODAY.slice(0,7),pays=allPays();
  const recM=pays.filter(p=>(p.d||'').startsWith(m)).reduce((a,p)=>a+(+p.amt||0),0),recA=pays.reduce((a,p)=>a+(+p.amt||0),0);
  const expM=cases.flatMap(c=>F(c.id).expenses||[]).filter(e=>(e.d||'').startsWith(m)).reduce((a,e)=>a+(+e.amt||0),0);
  const due=cases.reduce((a,c)=>a+bal(c.id),0);
  const od=cases.filter(c=>bal(c.id)>0).flatMap(c=>{let cum=0;const pd=paid(c.id);return (F(c.id).plan||[]).slice().sort((a,b)=>a.d<b.d?-1:1).filter(p=>{cum+=+p.amt||0;return p.d<=TODAY&&cum>pd}).map(p=>({c,p}))});
  const agreedAll=cases.reduce((a,c)=>a+owed(c.id),0);
  let h=`<div class="chips">${chip(rs(agreedAll),t('totalFee'))}${chip(rs(recA),t('recAll'))}${chip(rs(due),t('remaining'),due)}${chip(rs(recM),t('recMonth'))}${chip(rs(expM),t('expMonth'))}</div>`;
  const ups=cases.map(c=>({c,ni:nextInst(c.id)})).filter(o=>o.ni&&daysLeft(o.ni.d)<=30).sort((a,b)=>a.ni.d<b.ni.d?-1:1);
  const noPlan=cases.filter(c=>c.status==='Active'&&bal(c.id)>0&&!nextInst(c.id));
  h+=`<div class="panel"><h3>${esc(t('feeReminders'))}</h3>${ups.length?`<div class="hist">${ups.map(o=>{const n=daysLeft(o.ni.d),due=addDays(o.ni.d,-(+o.ni.rem||0))<=TODAY;return `<div class="${n<0?'x':due?'p':''}"><b>${rs(o.ni.due)}</b> · ${fd(o.ni.d)} (${dl(o.ni.d)}) · <a href="#" data-a="openClient" data-id="${esc(o.c.clientId||'')}">${esc(cname(o.c)||t('untitledClient'))}</a> · ${esc(ctitle(o.c))}${due?` · <span class="tag due">${esc(t('remindNow'))}</span>`:''}<span class="sp"></span>${cphone(o.c)?`<button class="sm" type="button" data-a="feeRem" data-id="${esc(o.c.clientId)}">${esc(t('whatsapp'))}</button>`:''}<button class="sm ghost" type="button" data-a="pay" data-id="${esc(o.c.id)}">${esc(t('addFee'))}</button></div>`}).join('')}</div>`:`<p class="meta">${esc(t('noFeeRem'))}</p>`}
  ${noPlan.length?`<p class="meta" style="margin-top:10px">${esc(t('noDueSet'))}</p><div class="hist">${noPlan.map(c=>`<div>${esc(cname(c)||t('untitledClient'))} · ${esc(ctitle(c))} · ${esc(t('remaining'))} <b>${rs(bal(c.id))}</b><span class="sp"></span><button class="sm" type="button" data-a="inst" data-id="${esc(c.id)}">${esc(t('feeDueDate'))}</button></div>`).join('')}</div>`:''}</div>`;
  if(!cases.some(c=>owed(c.id)))h+=`<div class="empty">${esc(t('feeHowTo'))}</div>`;
  const dcl=[...new Set(cases.filter(c=>bal(c.id)>0).map(c=>c.clientId||''))].map(cid=>({cid,cs:cases.filter(c=>(c.clientId||'')===cid&&bal(c.id)>0)})).sort((a,b)=>clientBal(b.cid)-clientBal(a.cid));
  h+=`<h2 class="sec">${esc(t('feeDue'))}</h2>`+(dcl.length?`<table class="stack"><thead><tr><th>${esc(t('client'))}</th><th>${esc(t('cases'))}</th><th class="n">${esc(t('agreed'))}</th><th class="n">${esc(t('received'))}</th><th class="n">${esc(t('balance'))}</th><th>${esc(t('feeReminder'))}</th></tr></thead><tbody>${dcl.map(g=>{const cl=cli(g.cid),all=cases.filter(c=>(c.clientId||'')===g.cid);return `<tr><td><a href="#" data-a="openClient" data-id="${esc(g.cid)}"><b>${esc(cl.name||t('untitledClient'))}</b></a></td><td>${g.cs.map(c=>`<a href="#" data-a="open" data-id="${esc(c.id)}">${esc(ctitle(c))}</a>`).join('<br>')}</td><td class="n">${rs(all.reduce((a,c)=>a+owed(c.id),0))}</td><td class="n">${rs(all.reduce((a,c)=>a+paid(c.id),0))}</td><td class="n"><b>${rs(g.cs.reduce((a,c)=>a+bal(c.id),0))}</b></td><td>${cl.phone?`<button class="sm" type="button" data-a="feeRem" data-id="${esc(g.cid)}">${esc(t('whatsapp'))}</button>`:'<span class="meta">—</span>'}</td></tr>`}).join('')}</tbody></table>`:`<div class="empty">—</div>`);
  const rec=pays.sort((a,b)=>(b.d||'').localeCompare(a.d||'')).slice(0,20);
  h+=`<h2 class="sec">${esc(t('recentPay'))}</h2>`+(rec.length?`<table class="stack"><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('client'))}</th><th>${esc(t('title'))}</th><th>${esc(t('mode'))}</th><th class="n">${esc(t('amount'))}</th><th>${esc(t('receipt'))}</th></tr></thead><tbody>${rec.map(p=>`<tr><td style="white-space:nowrap">${fd(p.d)}</td><td>${esc(cname(p.c))}</td><td>${esc(ctitle(p.c))}</td><td>${esc(p.mode)}</td><td class="n">${rs(p.amt)}</td><td><button class="sm" type="button" data-a="receipt" data-how="wa" data-id="${esc(p.c.id)}" data-i="${p.i}">${esc(t('waPdf'))}</button> <button class="sm ghost" type="button" data-a="receipt" data-how="print" data-id="${esc(p.c.id)}" data-i="${p.i}">${esc(t('print'))}</button></td></tr>`).join('')}</tbody></table>`:`<div class="empty">${esc(t('noPay'))}</div>`);
  return h;
}
function vReports(){
  const m=TODAY.slice(0,7),act=cases.filter(c=>c.status==='Active');
  const hm=cases.reduce((a,c)=>a+(c.hearings||[]).filter(h=>(h.d||'').startsWith(m)).length,0);
  let h=`<div class="chips">${chip(act.length,t('pending'))}${chip(cases.filter(c=>c.status==='Decided').length,t('decided'))}${chip(clients.length,t('clients'))}${chip(hm,t('hearMonth'))}</div>`;
  if(isAdmin){const months=[];for(let i=11;i>=0;i--){const d=new Date(+m.slice(0,4),+m.slice(5)-1-i,1);months.push(iso(d).slice(0,7))}
    const pays=allPays();h+=`<div class="panel"><h3>${esc(t('income12'))}</h3>${bars(months.map(k=>[MON[+k.slice(5)-1]+' '+k.slice(2,4),pays.filter(p=>(p.d||'').startsWith(k)).reduce((a,p)=>a+(+p.amt||0),0)]),rs)}</div>`;
    const top=clients.map(c=>[c.name||t('untitledClient'),cases.filter(x=>x.clientId===c.id).reduce((a,x)=>a+bal(x.id),0)]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,10);
    h+=`<div class="panel"><h3>${esc(t('feeDue'))}</h3>${bars(top,rs)}</div>`}
  h+=`<div class="panel"><h3>${esc(t('byCourt'))}</h3>${bars(count(act,c=>c.court).slice(0,12))}</div>`;
  h+=`<div class="panel"><h3>${esc(t('byType'))}</h3>${bars(count(act,c=>c.type))}</div>`;
  h+=`<div class="panel"><h3>${esc(t('status'))}</h3>${bars(ST.map(s=>[stL(s),cases.filter(c=>c.status===s).length]))}</div>`;
  return h;
}

const TABS=[['clients','clients'],['diary','diary'],['calendar','calendar'],['cases','cases'],['fee','fee'],['reports','reports'],['settings','settings']];
function render(){
  $('#tabs').innerHTML=TABS.filter(([v])=>v!=='fee'||isAdmin).map(([v,k])=>`<button type="button" data-a="tab" data-v="${v}" class="${v===view?'on':''}">${esc(t(k))}</button>`).join('');
  if(!S.key)return;
  const V={diary:vDiary,calendar:vCal,cases:vCases,clients:vClients,fee:vFee,reports:vReports,settings:vSettings};
  $('#view').innerHTML=((view==='diary'||view==='clients')?gBanner()+backupNote():'')+(V[view]||vDiary)();if(view==='settings')storeInfo();
  $('#courts').innerHTML=[...new Set(cases.map(c=>c.court).filter(Boolean))].map(c=>`<option value="${esc(c)}">`).join('');
  $('#clientList').innerHTML=clients.map(c=>`<option value="${esc(c.name)}">${esc(c.phone||'')}</option>`).join('');
  if(curId&&$('#detDlg').open)detail(curId);
  if(curClient&&$('#clientDlg').open)clientCases(curClient);
}
function applyLang(){
  document.documentElement.lang=LANG;document.documentElement.dir=LANG==='ur'?'rtl':'ltr';
  $$('[data-t]').forEach(e=>e.textContent=t(e.dataset.t));
  const sel=(el,list,lab)=>{const v=el.value;el.innerHTML=list.map(x=>`<option value="${esc(x)}">${esc(lab?lab(x):x)}</option>`).join('');if(v)el.value=v};
  sel(E($('#caseForm')).type,TYPES);sel(E($('#caseForm')).status,ST,stL);sel(E($('#hearForm')).status,ST,stL);
  $$('.adm').forEach(e=>e.style.display=isAdmin?'':'none');
  render();
}

/* ---------- detail ---------- */
function detail(id){
  const c=byId(id);if(!c){$('#detDlg').close();curId=null;return}curId=id;
  $('#dTitle').textContent=ctitle(c);
  const fz=F(id),hs=(c.hearings||[]).map((x,i)=>({...x,i})).sort((a,b)=>(b.d||'').localeCompare(a.d||''));
  const kv=(k,v)=>v?`<span>${esc(t(k))} <b>${esc(v)}</b></span>`:'';
  const w=waHear(c);
  let h=`<div class="sum">${kv('client',cname(c))}${kv('phone',cphone(c))}${kv('opp',c.opp)}${kv('status',stL(c.status))}${kv('type',c.type)}</div>
  <div class="sum">${kv('court',c.court)}${kv('judge',c.judge)}${kv('caseNo',c.caseNo)}${kv('fir',c.fir)}${kv('ps',c.ps)}${kv('sections',c.sections)}</div>
  <div class="sum">${kv('filed',c.filed?fd(c.filed):'')}<span>${esc(t('nextDate'))} <b>${fd(c.nextDate)}</b></span>${kv('stage',c.stage)}</div>
  ${c.notes?`<div class="meta">${esc(c.notes)}</div>`:''}
  <div class="acts"><button class="sm pri" type="button" data-a="hear" data-id="${esc(id)}">${esc(t('update'))}</button><button class="sm" type="button" data-a="editCase" data-id="${esc(id)}">${esc(t('edit'))}</button><button class="sm" type="button" data-a="scan">${esc(t('scan'))}</button><button class="sm" type="button" data-a="upload">${esc(t('upload'))}</button>${w?`<a class="btn sm ghost" href="${esc(w)}" target="_blank" rel="noopener">${esc(t('waRem'))}</a>`:''}${c.clientId?`<button class="sm ghost" type="button" data-a="openClient" data-id="${esc(c.clientId)}">${esc(t('client'))}</button>`:''}</div>`;
  if(isAdmin){const pays=(fz.payments||[]).map((p,i)=>({...p,i})).sort((a,b)=>(b.d||'').localeCompare(a.d||''));
    h+=`<div class="panel" style="margin:0"><div class="sum"><span>${esc(t('agreed'))} <b>${rs(fz.fee)}</b></span><span>${esc(t('expenses'))} <b>${rs(expB(id))}</b></span><span>${esc(t('received'))} <b>${rs(paid(id))}</b></span><span>${esc(t('balance'))} <b style="color:var(--tape)">${rs(bal(id))}</b></span></div>
    <div class="acts" style="margin-top:8px"><button class="sm" type="button" data-a="pay" data-id="${esc(id)}">${esc(t('addFee'))}</button><button class="sm" type="button" data-a="exp" data-id="${esc(id)}">${esc(t('addExp'))}</button><button class="sm" type="button" data-a="inst" data-id="${esc(id)}">${esc(t('addInst'))}</button></div></div>
    <h4>${esc(t('feeRec'))}</h4><div class="hist">${pays.length?pays.map(p=>`<div class="p"><b>${rs(p.amt)}</b> ${fd(p.d)} · ${esc(p.mode||'')}${p.note?' · '+esc(p.note):''}<span class="sp"></span><span class="meta">${esc(p.rno||'')}</span><button class="sm" type="button" data-a="receipt" data-how="wa" data-id="${esc(id)}" data-i="${p.i}">${esc(t('waPdf'))}</button><button class="sm ghost" type="button" data-a="receipt" data-how="print" data-id="${esc(id)}" data-i="${p.i}">${esc(t('print'))}</button><button class="sm ghost" type="button" data-a="receipt" data-how="email" data-id="${esc(id)}" data-i="${p.i}">${esc(t('emailBtn'))}</button><button class="sm ghost danger" type="button" data-a="rmItem" data-k="payments" data-i="${p.i}">${esc(t('del'))}</button></div>`).join(''):`<div class="meta">${esc(t('noPay'))}</div>`}</div>
    <h4>${esc(t('expenses'))}</h4><div class="hist">${(fz.expenses||[]).length?(fz.expenses||[]).map((e,i)=>`<div><b>${rs(e.amt)}</b> ${fd(e.d)}${e.note?' · '+esc(e.note):''}${e.bill===false?'':' · '+esc(t('billable'))}<span class="sp"></span><button class="sm ghost danger" type="button" data-a="rmItem" data-k="expenses" data-i="${i}">${esc(t('del'))}</button></div>`).join(''):`<div class="meta">${esc(t('noExp'))}</div>`}</div>
    <h4>${esc(t('instalments'))}</h4><div class="hist">${(fz.plan||[]).length?(()=>{let cum=0;const pd=paid(id);return (fz.plan||[]).map((p,i)=>({...p,i})).sort((a,b)=>a.d<b.d?-1:1).map(p=>{cum+=+p.amt||0;const ok=cum<=pd;return `<div class="${ok?'p':p.d<=TODAY?'x':''}"><b>${rs(p.amt)}</b> ${fd(p.d)}${ok?' ✓':''}<span class="sp"></span><button class="sm ghost danger" type="button" data-a="rmItem" data-k="plan" data-i="${p.i}">${esc(t('del'))}</button></div>`}).join('')})():`<div class="meta">${esc(t('noInst'))}</div>`}</div>`}
  const dls=(c.deadlines||[]).map((x,i)=>({...x,i})).sort((a,b)=>(a.d||'').localeCompare(b.d||''));
  if(dls.length)h+=`<h4>${esc(t('deadlines'))}</h4><div class="hist">${dls.map(x=>`<div class="${x.done?'p':x.d<=TODAY?'x':''}"><b>${fd(x.d)}</b> ${esc(x.label||'')}${x.done?' ✓':''}<span class="sp"></span>${x.done?'':`<button class="sm ghost" type="button" data-a="dlDone" data-id="${esc(id)}" data-i="${x.i}">${esc(t('done'))}</button>`}</div>`).join('')}</div>`;
  h+=`<h4>${esc(t('docs'))}</h4><div class="hist">${(c.docs||[]).length?(c.docs||[]).map((d,i)=>`<div><a href="#" data-a="viewDoc" data-i="${i}">${esc(d.name||'Document')}</a> <span class="meta">${fd(d.d)}</span><span class="sp"></span>${isAdmin?`<button class="sm ghost danger" type="button" data-a="delDoc" data-i="${i}">${esc(t('del'))}</button>`:''}</div>`).join(''):`<div class="meta">${esc(t('noDocs'))}</div>`}</div>`;
  h+=`<h4>${esc(t('hearHist'))}</h4><div class="hist">${hs.length?hs.map(x=>`<div><b>${fd(x.d)}</b> — ${esc(x.note||'—')}${x.next?` <span class="meta">→ ${fd(x.next)}</span>`:''}</div>`).join(''):`<div class="meta">${esc(t('noHear'))}</div>`}</div>`;
  h+=`<div style="border-top:1px solid var(--line);padding-top:12px"><button class="sm ghost danger" type="button" data-a="delCase">${esc(t('del'))}</button></div>`;
  $('#dBody').innerHTML=h;
  if(!$('#detDlg').open)$('#detDlg').showModal();
}

/* ---------- forms ---------- */
function dlRow(x){const lab=x.label||'';const known=TASKS.includes(lab);return `<div class="dlrow"><label><span>${esc(t('label'))}</span><select data-f="task">${TASKS.map(k=>`<option ${k===(known?lab:'Other')?'selected':''}>${esc(k)}</option>`).join('')}</select><input data-f="label" value="${esc(known?'':lab)}" placeholder="${esc(t('otherTask'))}" style="margin-top:4px;${known?'display:none':''}"></label><label><span>${esc(t('dueDate'))}</span><input type="date" data-f="d" value="${esc(x.d||'')}"></label><label><span>${esc(t('remindBefore'))}</span><select data-f="rem">${[1,2,3,7].map(n=>`<option value="${n}" ${n===(+x.rem||2)?'selected':''}>${n} ${esc(t('days'))}</option>`).join('')}</select></label><button class="sm ghost danger" type="button" data-a="rmDl" aria-label="${esc(t('del'))}">✕</button><input type="hidden" data-f="done" value="${x.done?1:''}"></div>`}
function fillPicks(root){root.querySelectorAll('[data-pick]').forEach(box=>{const k=box.dataset.pick;let list;
  if(k==='ctype')list=COURT_TYPES;else if(k==='city'){const rc=cases.map(c=>(c.court||'').split(',').slice(1).join(',').trim()).filter(Boolean);list=[...new Set([...CITIES,...rc])].slice(0,14).concat(['Other'])}
  else if(k==='task')list=TASKS.filter(x=>x!=='Other');else if(k==='rem')list=[['0',0],['1',1],['2',2],['3',3],['7',7]];else if(k==='jumpT')list=[['+3',3],['+7',7],['+15',15],['+30',30]];
  else if(k==='stage')list=STAGES;else if(k==='jump')list=[['+7',7],['+14',14],['+21',21],['+30',30]];
  box.innerHTML=list.map(x=>Array.isArray(x)?`<button type="button" data-a="pick" data-k="${k==='rem'?'rem':k==='jumpT'?'jumpT':'jump'}" data-v="${x[1]}">${esc(x[0])} ${esc(t('days'))}</button>`:`<button type="button" data-a="pick" data-k="${k}" data-v="${esc(x)}">${esc(x)}</button>`).join('')})}
function openCase(c){
  const f=E($('#caseForm'));f.reset();f.dataset.id=c?c.id:'';
  $('#cfTitle').textContent=c?t('edit'):t('newCase').replace('+','').trim();
  if(c){for(const k of ['title','opp','caseNo','fir','ps','sections','court','judge','type','status','filed','nextDate','stage','notes'])f[k].value=c[k]??'';f.client.value=cname(c);f.phone.value=cphone(c);f.fee.value=F(c.id).fee||''}
  else{f.status.value='Active';f.type.value='Civil';if(curClient){const cl=clients.find(x=>x.id===curClient);if(cl&&$('#clientDlg').open){f.client.value=cl.name||'';f.phone.value=cl.phone||''}}}
  $('#dlRows').innerHTML=(c&&c.deadlines||[]).map(dlRow).join('');fillPicks($('#caseDlg'));addMics();
  $('#caseDlg').showModal();
}
async function findOrMakeClient(name,phone){
  name=name.trim();phone=phone.trim();if(!name&&!phone)return '';
  let cl=clients.find(c=>name&&(c.name||'').trim().toLowerCase()===name.toLowerCase())||(!name&&clients.find(c=>phone&&c.phone===phone));
  if(cl){if(phone&&cl.phone!==phone)await put('clients',cl.id,{...strip(cl),phone});return cl.id}
  const id=newId('clients');return (await put('clients',id,{name,phone,created:new Date().toISOString()}))?id:'';
}
E($('#caseForm')).addEventListener('submit',async e=>{e.preventDefault();const f=E(e.target),id=f.dataset.id||newId('cases');
  const old=f.dataset.id?strip(byId(f.dataset.id)):{hearings:[],docs:[],created:new Date().toISOString()};
  const d={...old};for(const k of ['title','opp','caseNo','fir','ps','sections','court','judge','type','status','filed','nextDate','stage','notes'])d[k]=f[k].value.trim();
  d.deadlines=$$('#dlRows .dlrow').map(r=>{const tk=r.querySelector('[data-f=task]').value,o=r.querySelector('[data-f=label]').value.trim();return{label:tk==='Other'?(o||'Other'):tk,d:r.querySelector('[data-f=d]').value,rem:+r.querySelector('[data-f=rem]').value||2,done:!!r.querySelector('[data-f=done]').value}}).filter(x=>x.d);
  d.clientId=await findOrMakeClient(f.client.value,f.phone.value);
  if(!(await put('cases',id,d)))return;
  if(isAdmin){const fee=+f.fee.value||0,fz=strip(F(id));if(fee!==(+fz.fee||0)||!fees[id]&&fee)await put('fees',id,{...fz,fee})}
  $('#caseDlg').close();toast(t('saved'));if($('#detDlg').open)detail(id);
});
E($('#clientForm')).addEventListener('submit',async e=>{e.preventDefault();const f=E(e.target),id=curClient||newId('clients');
  const d={...(curClient?strip(clients.find(c=>c.id===curClient)):{created:new Date().toISOString()})};for(const k of ['name','phone','cnic','ref','address','email','notes'])d[k]=f[k].value.trim();
  if(await put('clients',id,d)){curClient=id;toast(t('saved'));clientCases(id)}
});
function openClient(id){const f=E($('#clientForm'));f.reset();curClient=id||null;const c=id?clients.find(x=>x.id===id):null;
  $('#clTitle').textContent=c?(c.name||t('untitledClient')):t('clientNew');
  if(c)for(const k of ['name','phone','cnic','ref','address','email','notes'])f[k].value=c[k]||'';addMics();
  $('#clEdit').open=!c;
  $('#delClientBtn').style.display=c&&isAdmin?'':'none';delete $('#delClientBtn').dataset.sure;$('#delClientBtn').textContent=t('del');
  clientCases(id);if(!$('#clientDlg').open)$('#clientDlg').showModal()}
function nextInst(cid){let cum=0;const pd=paid(cid);for(const p of (F(cid).plan||[]).slice().sort((a,b)=>a.d<b.d?-1:1)){cum+=+p.amt||0;if(cum>pd)return{...p,due:Math.min(+p.amt||0,cum-pd)}}return null}
const dl=d=>{const n=daysLeft(d);return n<0?`<span class="danger">${esc(t('overdue'))}</span>`:n===0?esc(t('today')):n+' '+esc(t('daysLeft'))};
function caseCard(x){const ni=isAdmin?nextInst(x.id):null,dls=(x.deadlines||[]).filter(d=>!d.done&&d.d).sort((a,b)=>a.d<b.d?-1:1),last=(x.hearings||[]).slice(-1)[0];
  return `<div class="ccard"><h6><a href="#" data-a="open" data-id="${esc(x.id)}">${esc(ctitle(x))}</a></h6>
  <div class="ln meta">${esc(stL(x.status))}${x.court?' · '+esc(x.court):''}${x.caseNo?' · '+esc(x.caseNo):''}</div>
  <div class="ln"><span>${esc(t('nextDate'))}: <b>${fd(x.nextDate)}</b>${x.nextDate&&x.status==='Active'?' ('+dl(x.nextDate)+')':''}</span>${x.stage?`<span class="tag">${esc(x.stage)}</span>`:''}</div>
  ${last?`<div class="ln meta">${esc(t('lastHearing'))}: ${fd(last.d)} — ${esc(last.note||'—')}</div>`:''}
  ${isAdmin?`<div class="ln"><span>${esc(t('agreed'))} <b>${rs(owed(x.id))}</b></span><span>${esc(t('received'))} <b>${rs(paid(x.id))}</b></span><span>${esc(t('balance'))} <b style="color:var(--tape)">${rs(bal(x.id))}</b></span></div>
  <div class="ln">${ni?`<span>${esc(t('feeDueOn'))}: <b>${rs(ni.due)}</b> · ${fd(ni.d)} (${dl(ni.d)}) · ${esc(t('remindClient'))}: ${+ni.rem||0} ${esc(t('days'))}</span>`:`<span class="meta">${esc(t('noFeeDate'))}</span>`}</div>`:''}
  ${dls.map(d=>`<div class="ln"><span><b>${esc(d.label)}</b> · ${fd(d.d)} (${dl(d.d)}) · ${esc(t('remindBefore'))}: ${d.rem===0?0:(+d.rem||2)} ${esc(t('days'))}</span></div>`).join('')}
  <div class="acts"><button class="sm" type="button" data-a="hear" data-id="${esc(x.id)}">${esc(t('update'))}</button><button class="sm" type="button" data-a="task" data-id="${esc(x.id)}">${esc(t('addTask'))}</button>${isAdmin?`<button class="sm" type="button" data-a="pay" data-id="${esc(x.id)}">${esc(t('addFee'))}</button><button class="sm" type="button" data-a="inst" data-id="${esc(x.id)}">${esc(t('feeDueDate'))}</button>`:''}</div></div>`}
function clientCases(id){const cs=id?cases.filter(x=>x.clientId===id):[];if(!id){$('#clCases').innerHTML='';return}
  const cl=cli(id),groups={};cs.sort((a,b)=>(a.status==='Active'?0:1)-(b.status==='Active'?0:1)).forEach(x=>{(groups[x.type||'Other']=groups[x.type||'Other']||[]).push(x)});
  const tot=cs.reduce((a,x)=>a+owed(x.id),0),rec=cs.reduce((a,x)=>a+paid(x.id),0),b=clientBal(id),w=isAdmin&&b?feeRemLink(id):'',n=waNum(cl.phone);
  $('#clCases').innerHTML=`<div class="cl-top">${cl.phone?`<a class="btn sm" href="tel:${esc(String(cl.phone).replace(/[^\d+]/g,''))}">${esc(t('call'))} ${esc(cl.phone)}</a>`:''}${n?`<a class="btn sm" href="https://wa.me/${n}" target="_blank" rel="noopener">${esc(t('whatsapp'))}</a>`:''}${w?`<a class="btn sm" href="${esc(w)}" target="_blank" rel="noopener">${esc(t('feeReminder'))}</a>`:''}<button type="button" class="sm pri" data-a="newCase">${esc(t('newCase'))}</button></div>
  ${isAdmin&&cs.length?`<div class="sum" style="margin-top:10px"><span>${esc(t('agreed'))} <b>${rs(tot)}</b></span><span>${esc(t('received'))} <b>${rs(rec)}</b></span><span>${esc(t('balance'))} <b style="color:var(--tape)">${rs(b)}</b></span></div>`:''}
  ${Object.entries(groups).map(([ty,list])=>`<div class="grp"><h5>${esc(ty)} · ${list.length}</h5>${list.map(caseCard).join('')}</div>`).join('')||`<p class="meta">${esc(t('noCasesYet'))}</p>`}`}


E($('#taskForm')).addEventListener('submit',async e=>{e.preventDefault();const f=E(e.target),c=byId(curId);if(!c)return;if(!f.d.value){f.d.focus();return}
  const d=strip(c);d.deadlines=[...(d.deadlines||[]),{label:f.label.value.trim()||'Task',d:f.d.value,rem:Math.max(0,+f.rem.value||0),done:false}];if(await put('cases',c.id,d)){$('#taskDlg').close();toast(t('saved'))}});
E($('#hearForm')).addEventListener('submit',async e=>{e.preventDefault();const f=E(e.target),c=byId(curId);if(!c)return;
  const d=strip(c);d.hearings=[...(d.hearings||[]),{d:f.d.value||TODAY,note:f.note.value.trim(),next:f.next.value}];
  d.nextDate=f.next.value;if(f.stage.value.trim())d.stage=f.stage.value.trim();d.status=f.status.value;
  if(await put('cases',c.id,d)){$('#hearDlg').close();toast(f.next.value?t('nextDate')+': '+fd(f.next.value):t('saved'))}});

function openMoney(kind,id){moneyKind=kind;curId=id;const c=byId(id),f=E($('#moneyForm'));f.reset();f.d.value=TODAY;f.bill.checked=true;
  $('#mTitle').textContent=kind==='pay'?t('addFee').replace('+','').trim():kind==='exp'?t('addExp').replace('+','').trim():t('addInst').replace('+','').trim();
  $('#mModeL').style.display=kind==='pay'?'':'none';$('#mBillL').style.display=kind==='exp'?'':'none';$('#mRemL').style.display=kind==='inst'?'':'none';fillPicks($('#moneyDlg'));
  if(kind==='inst')f.d.value=addDays(TODAY,30);
  $('#mCase').textContent=ctitle(c)+' · '+t('balance')+' '+rs(bal(id));addMics();$('#moneyDlg').showModal()}
E($('#moneyForm')).addEventListener('submit',async e=>{e.preventDefault();const f=E(e.target),id=curId,amt=+f.amt.value||0;if(!amt){f.amt.focus();return}
  const fz=strip(F(id));const item={d:f.d.value||TODAY,amt,note:f.note.value.trim()};let key='payments';
  if(moneyKind==='pay'){item.mode=f.mode.value;const y=item.d.slice(0,4);const n=allPays().filter(p=>(p.rno||'').startsWith('MLA-'+y)).map(p=>+p.rno.split('-')[2]||0);item.rno='MLA-'+y+'-'+pad4(Math.max(0,...n)+1)}
  else if(moneyKind==='exp'){key='expenses';item.bill=f.bill.checked}else{key='plan';item.rem=Math.max(0,+f.rem.value||0)}
  fz[key]=[...(fz[key]||[]),item];
  if(await put('fees',id,fz)){$('#moneyDlg').close();toast(moneyKind==='pay'?rs(amt)+' · '+item.rno:t('saved'))}});
const pad4=n=>String(n).padStart(4,'0');

/* ---------- events ---------- */
document.addEventListener('click',async e=>{const el=e.target.closest('[data-a]');if(!el)return;const a=el.dataset.a,id=el.dataset.id,i=+el.dataset.i;
  if(el.tagName==='A'&&el.getAttribute('href')==='#')e.preventDefault();
  switch(a){
  case 'close':el.closest('dialog').close();if(el.closest('#clientDlg'))curClient=null;break;
  case 'tab':view=el.dataset.v;render();break;
  case 'lang':LANG=LANG==='en'?'ur':'en';try{localStorage.setItem('mla_lang',LANG)}catch(x){}applyLang();break;
  case 'newCase':openCase(null);break;
  case 'open':if($('#clientDlg').open){$('#clientDlg').close();curClient=null}detail(id);break;
  case 'editCase':openCase(byId(id));break;
  case 'openClient':if($('#detDlg').open)$('#detDlg').close();openClient(id);break;
  case 'newClient':openClient(null);break;
  case 'hear':{curId=id;const c=byId(id),f=E($('#hearForm'));f.reset();f.d.value=c.nextDate&&c.nextDate<=TODAY?c.nextDate:TODAY;f.stage.value=c.stage||'';f.status.value=c.status||'Active';$('#hCase').textContent=ctitle(c)+' · '+cname(c);fillPicks($('#hearDlg'));addMics();$('#hearDlg').showModal();break}
  case 'pay':openMoney('pay',id);break;case 'exp':openMoney('exp',id);break;case 'inst':openMoney('inst',id);break;
  case 'receipt':receipt(id,i,el.dataset.how);break;
  case 'readyShare':if(READY){const r=READY;READY=null;$('#readyDlg').close();navigator.share({files:[r.file],...(r.opt.text?{text:r.opt.text}:{})}).catch(()=>{})}break;
  case 'readyDl':if(READY){download(READY.file);if(READY.opt.wa)window.open(READY.opt.wa,'_blank');READY=null;$('#readyDlg').close()}break;
  case 'rmItem':{if(!el.dataset.sure){el.dataset.sure=1;el.textContent=t('tapAgain');break}const fz=strip(F(curId)),k=el.dataset.k;(fz[k]||[]).splice(i,1);if(await put('fees',curId,fz))toast(t('deleted'));break}
  case 'dlDone':{const c=byId(id);const d=strip(c);if(d.deadlines&&d.deadlines[i]){d.deadlines[i].done=true;if(await put('cases',id,d))toast(t('done'))}break}
  case 'pick':{const lab=el.closest('label');const inp=lab&&lab.querySelector('input');if(!inp)break;const k=el.dataset.k,v=el.dataset.v;if(k==='jump'){const base=E($('#hearForm')).d.value||TODAY;inp.value=addDays(base,+v)}else if(k==='jumpT')inp.value=addDays(TODAY,+v);else if(k==='ctype'||k==='city'){const parts=inp.value.split(',');let ty=parts[0].trim(),ci=parts.slice(1).join(',').trim();if(k==='ctype')ty=v;else if(v==='Other'){inp.value=ty?ty+', ':'';inp.focus();break}else ci=v;if(!ci&&k==='ctype')ci='Bahawalpur';inp.value=[ty,ci].filter(Boolean).join(', ')}else inp.value=v;el.parentElement.querySelectorAll('button').forEach(b=>b.classList.toggle('on',b===el));break}
  case 'task':{curId=id;const c=byId(id),f=E($('#taskForm'));f.reset();f.rem.value=2;$('#tkCase').textContent=ctitle(c)+' · '+cname(c);fillPicks($('#taskDlg'));$('#taskDlg').showModal();break}
  case 'feeRem':{const w=feeRemLink(id);if(w)window.open(w,'_blank');else toast(t('noPhone'));break}
  case 'addDl':$('#dlRows').insertAdjacentHTML('beforeend',dlRow({}));break;
  case 'rmDl':el.closest('.dlrow').remove();break;
  case 'viewDoc':viewDoc(i);break;
  case 'scan':$('#camIn').value='';$('#camIn').click();break;
  case 'upload':$('#fileIn').value='';$('#fileIn').click();break;
  case 'delDoc':{if(!el.dataset.sure){el.dataset.sure=1;el.textContent=t('tapAgain');break}const c=byId(curId),d=strip(c),doc=(d.docs||[])[i];if(!doc)break;d.docs.splice(i,1);if(await put('cases',curId,d)){try{if(CLOUD&&!doc.local)C.fs.collection('files').doc(doc.id).delete().catch(()=>{});else await idbDel('files',doc.id)}catch(x){}toast(t('deleted'))}break}
  case 'delCase':{if(!el.dataset.sure){el.dataset.sure=1;el.textContent=t('tapAgain');break}const cid=curId;if(await del('cases',cid)){if(fees[cid]&&isAdmin)await del('fees',cid);$('#detDlg').close();curId=null;toast(t('deleted'))}break}
  case 'delClient':{if(!el.dataset.sure){el.dataset.sure=1;el.textContent=t('tapAgain');break}if(curClient&&await del('clients',curClient)){$('#clientDlg').close();curClient=null;toast(t('deleted'))}break}
  case 'calPrev':case 'calNext':{const [y,m]=calM.split('-').map(Number);const d=new Date(y,m-1+(a==='calNext'?1:-1),1);calM=iso(d).slice(0,7);render();break}
  case 'calDay':calDay=el.dataset.d;if(calDay.slice(0,7)!==calM)calM=calDay.slice(0,7);render();break;
  case 'causePdf':causeList('pdf');break;case 'causePrint':causeList('print');break;case 'causeXls':causeList('xlsx');break;
  case 'backup':backup();break;
  }
});
async function compressImg(file){try{const url=URL.createObjectURL(file);const img=await new Promise((ok,no)=>{const im=new Image();im.onload=()=>ok(im);im.onerror=no;im.src=url});
  const m=1800,r=Math.min(1,m/Math.max(img.naturalWidth,img.naturalHeight));const cv=document.createElement('canvas');cv.width=Math.round(img.naturalWidth*r);cv.height=Math.round(img.naturalHeight*r);
  cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);URL.revokeObjectURL(url);const b=await new Promise(ok=>cv.toBlob(ok,'image/jpeg',.8));return b&&b.size<file.size?b:file}catch(x){return file}}
async function addFile(file){if(!file||!S.key||!curId)return;
  if(file.size>25*1024*1024){toast('File over 25 MB');return}toast(t('uploading'));
  try{let blob=file,name=file.name||('scan-'+TODAY+'.jpg');if(/^image\//.test(file.type)){blob=await compressImg(file);if(blob!==file)name=name.replace(/\.[^.]+$/,'')+'.jpg'}
    const type=blob.type||file.type||'application/octet-stream',bytes=new Uint8Array(await blob.arrayBuffer()),id='f'+newId();let local=false;
    if(CLOUD){const p=pk(await enc(C.ok,bytes));if(p.length<950000)C.fs.collection('files').doc(id).set({p,type,u:Date.now()}).catch(e=>toast(cErr(e)));else{const o=await enc(C.ok,bytes);o.type=type;await idbPut('files',id,o);local=true}}
    else{const o=await enc(S.key,bytes);o.type=type;await idbPut('files',id,o)}
    const c=byId(curId),d=strip(c);d.docs=[...(d.docs||[]),{id,name,d:TODAY,size:bytes.length,...(local?{local:1}:{})}];if(await put('cases',curId,d))toast(local&&CLOUD?t('onlyDevice'):t('saved'))}
  catch(x){toast('Could not store file — storage may be full')}}
$('#fileIn').addEventListener('change',e=>addFile(e.target.files[0]));
$('#camIn').addEventListener('change',e=>addFile(e.target.files[0]));
async function fileBytes(doc){
  if(CLOUD&&!doc.local){const s=await C.fs.collection('files').doc(doc.id).get();if(!s.exists)return null;const v=s.data();return{type:v.type,bytes:await dec(C.ok,unpk(v.p))}}
  const o=await idbGet('files',doc.id);if(!o)return null;return{type:o.type,bytes:await dec(CLOUD?C.ok:S.key,o)}}
async function viewDoc(i){const c=byId(curId);const doc=c&&(c.docs||[])[i];if(!doc)return;
  try{const f=await fileBytes(doc);if(!f){toast(t('fileMissing'));return}const blob=new Blob([f.bytes],{type:f.type});openBlob(blob,doc.name)}catch(x){toast(CLOUD?t('needOnline'):'Could not open file')}}
function openBlob(blob,name){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';if(!/^image\/|pdf/.test(blob.type))a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(url)},120000)}
document.addEventListener('input',e=>{const id=e.target.id;if(id==='q'||id==='cq'){ui[id]=e.target.value;const p=e.target.selectionStart;render();const n=$('#'+id);n.focus();try{n.setSelectionRange(p,p)}catch(x){}}});
document.addEventListener('change',e=>{if(e.target.dataset&&e.target.dataset.f==='task'){const o=e.target.parentElement.querySelector('[data-f=label]');o.style.display=e.target.value==='Other'?'':'none'}if(e.target.id==='f'){ui.f=e.target.value;render()}if(e.target.id==='causeD')ui.cause=e.target.value});

/* ---------- backup / restore ---------- */
const pack=o=>({iv:b64(o.iv),ct:b64(o.ct),...(o.type?{type:o.type}:{})}),unpack=o=>({iv:unb64(o.iv),ct:unb64(o.ct),...(o.type?{type:o.type}:{})});
async function encBackup(){
  if(!S.key)return;await saving;toast(t('working'));
  try{let out;
    if(!CLOUD){const meta=await idbGet('kv','meta'),state=await idbGet('kv','state'),keys=await idbKeys('files');
      const files=[];for(const k of keys){const o=await idbGet('files',k);if(o)files.push({id:k,...pack(o)})}
      out={app:'mla-diary',v:1,created:new Date().toISOString(),meta:{salt:b64(meta.salt),ver:pack(meta.ver)},state:pack(state),files}}
    else{const data={clients,cases,fees:C.fk?fees:{},settings};const files=[];
      for(const c of cases)for(const d of c.docs||[]){try{const f=await fileBytes(d);if(f){const o=await enc(S.key,f.bytes);o.type=f.type;files.push({id:d.id,...pack(o)})}}catch(x){}}
      out={app:'mla-diary',v:1,created:new Date().toISOString(),meta:{salt:C.ring.salt,ver:pack(unpk(C.ring.ver))},state:pack(await encJ(S.key,data)),files}}
    await saveFile('MLA-Diary-backup-'+TODAY+'.json',JSON.stringify(out));
    settings.lastBackup=TODAY;await persist();render();toast(t('backupMade'))}
  catch(e){toast(CLOUD?t('needOnline'):'Backup failed')}
}
async function readBackup(file,pass){
  let o;try{o=JSON.parse(await file.text())}catch(x){throw new Error(t('badFile'))}
  if(!o||o.app!=='mla-diary'||!o.meta||!o.state)throw new Error(t('badFile'));
  const meta={salt:unb64(o.meta.salt),ver:unpack(o.meta.ver)};const key=await deriveKey(pass,meta.salt);
  try{await dec(key,meta.ver)}catch(x){throw new Error(t('wrongPass'))}
  const st=unpack(o.state);return{o,meta,key,st,data:await decJ(key,st)}}
async function doRestore(file,pass){
  const b=await readBackup(file,pass);
  if(!CLOUD){await idbClear('files');for(const f of b.o.files||[])await idbPut('files',f.id,unpack(f));
    await idbPut('kv','meta',b.meta);await idbPut('kv','state',b.st);S.key=b.key;S.meta=b.meta;load_(b.data);return}
  // cloud: upload everything into the shared office data
  const d=b.data;let n=0;
  for(const c of d.clients||[]){const {id,...r}=c;await put('clients',id,r);n++}
  for(const c of d.cases||[]){const {id,...r}=c;for(const doc of r.docs||[]){const f=(b.o.files||[]).find(x=>x.id===doc.id);if(!f)continue;try{const bytes=await dec(b.key,unpack(f));const pp=pk(await enc(C.ok,bytes));if(pp.length<950000){await C.fs.collection('files').doc(doc.id).set({p:pp,type:f.type||'',u:Date.now()});delete doc.local}else{const oo=await enc(C.ok,bytes);oo.type=f.type;await idbPut('files',doc.id,oo);doc.local=1}}catch(x){}}
    await put('cases',id,r);n++}
  if(C.fk)for(const [id,f] of Object.entries(d.fees||{}))await put('fees',id,f);
  toast(t('restored')+' · '+n)}
function load_(d){clients=d.clients||[];cases=d.cases||[];fees=d.fees||{};settings=d.settings||{}}

/* ---------- Excel import ---------- */
const ALIAS={client:['client','client name','name','party','موکل'],phone:['phone','mobile','contact','cell','whatsapp','فون'],cnic:['cnic','id card'],email:['email','e-mail'],title:['case','case title','title','case name','عنوان'],caseNo:['case no','case no.','case number','caseno','suit no'],opp:['opposite party','respondent','defendant','vs','versus'],fir:['fir','fir no','fir no.'],ps:['police station','ps','thana'],sections:['sections','section','offence','u/s'],court:['court','عدالت'],judge:['judge'],type:['type','category','nature','case type'],status:['status'],filed:['filed','filing date','institution date','instituted'],nextDate:['next date','next hearing','hearing date','date','next','تاریخ'],stage:['stage','for','purpose','proceedings'],fee:['agreed fee','fee','total fee','fees'],received:['received','paid','fee received','advance'],notes:['notes','remarks','note']};
function xDate(v){if(v==null||v==='')return '';if(typeof v==='number'){const d=new Date(Math.round((v-25569)*864e5));return isNaN(d)?'':d.toISOString().slice(0,10)}
  if(v instanceof Date)return iso(v);const s=String(v).trim();let m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);if(m){let y=+m[3];if(y<100)y+=2000;return y+'-'+pad(+m[2])+'-'+pad(+m[1])}
  m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);if(m)return m[1]+'-'+pad(+m[2])+'-'+pad(+m[3]);const d=new Date(s);return isNaN(d)?'':iso(d)}
let IMPORT=null;
async function importExcel(file){
  try{const X=await XL();const wb=X.read(await file.arrayBuffer(),{type:'array',cellDates:false});const ws=wb.Sheets[wb.SheetNames[0]];const rows=X.utils.sheet_to_json(ws,{defval:''});
    const out=rows.map(r=>{const o={};const keys=Object.keys(r);for(const [f,al] of Object.entries(ALIAS)){const k=keys.find(k=>al.includes(String(k).trim().toLowerCase()));if(k!==undefined)o[f]=r[k]}return o}).filter(o=>String(o.client||o.title||'').trim());
    IMPORT=out;view='settings';render();if(!out.length)toast(t('importNone'))}catch(e){toast(t('badFile'))}}
async function runImport(){const rows=IMPORT;IMPORT=null;if(!rows)return;toast(t('working'));let n=0;
  for(const r of rows){const cid=await findOrMakeClient(String(r.client||''),String(r.phone||''));if(cid&&(r.cnic||r.email)){const cl=clients.find(x=>x.id===cid);if(cl)await put('clients',cid,{...strip(cl),...(r.cnic?{cnic:String(r.cnic)}:{}),...(r.email?{email:String(r.email)}:{})})}
    const st=String(r.status||'').toLowerCase();const status=st.startsWith('dec')?'Decided':st.startsWith('with')?'Withdrawn':st.startsWith('clos')||st.startsWith('dispos')?'Closed':'Active';
    const ty=String(r.type||'').trim();const type=TYPES.find(x=>x.toLowerCase().startsWith(ty.toLowerCase().slice(0,4))&&ty)||(ty||'Other');
    const id=newId();await put('cases',id,{title:String(r.title||'').trim(),clientId:cid,opp:String(r.opp||''),caseNo:String(r.caseNo||''),fir:String(r.fir||''),ps:String(r.ps||''),sections:String(r.sections||''),court:String(r.court||''),judge:String(r.judge||''),type,status,filed:xDate(r.filed),nextDate:xDate(r.nextDate),stage:String(r.stage||''),notes:String(r.notes||''),hearings:[],docs:[],deadlines:[],created:new Date().toISOString()});
    const fee=+String(r.fee||'').replace(/[^\d.]/g,'')||0,rec=+String(r.received||'').replace(/[^\d.]/g,'')||0;
    if(isAdmin&&(fee||rec))await put('fees',id,{fee,payments:rec?[{d:TODAY,amt:rec,mode:'Cash',note:'Opening balance (imported)',rno:''}]:[]});n++}
  toast(t('imported')+': '+n);render()}
async function excelTemplate(){try{const X=await XL();const H=['Client','Phone','Case','Case no','Opposite party','FIR no','Police station','Sections','Court','Judge','Type','Status','Filing date','Next date','Stage','Agreed fee','Received','Notes'];const ws=X.utils.aoa_to_sheet([H]);ws['!cols']=H.map(()=>({wch:18}));const ex=X.utils.aoa_to_sheet([H,['Ali Raza','0300-1234567','Ali Raza vs The State','123/2026','The State','45/2026','City Bahawalpur','302/34 PPC','Sessions Judge, Bahawalpur','','Criminal','Active','01/10/2026','05/12/2026','Bail arguments',50000,20000,'']]);
  const wb=X.utils.book_new();X.utils.book_append_sheet(wb,ws,'Cases');X.utils.book_append_sheet(wb,ex,'Example (not imported)');await saveFile('MLA-Diary-import-template.xlsx',new Blob([X.write(wb,{bookType:'xlsx',type:'array'})]))}catch(e){toast('Could not load the file maker')}}

/* ---------- phone calendar reminders (.ics) ---------- */
function icsEsc(s){return String(s||'').replace(/[\;,]/g,m=>'\\'+m).replace(/\n/g,'\\n')}
async function exportIcs(){
  const L=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MLA Diary//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];const stamp=new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z';let n=0;
  const ev=(uid,date,sum,desc,alarms)=>{const d=date.replace(/-/g,''),e=addDays(date,1).replace(/-/g,'');L.push('BEGIN:VEVENT','UID:'+uid+'@mla-diary','DTSTAMP:'+stamp,'DTSTART;VALUE=DATE:'+d,'DTEND;VALUE=DATE:'+e,'SUMMARY:'+icsEsc(sum),'DESCRIPTION:'+icsEsc(desc));for(const a of alarms)L.push('BEGIN:VALARM','ACTION:DISPLAY','DESCRIPTION:'+icsEsc(sum),'TRIGGER:'+a,'END:VALARM');L.push('END:VEVENT');n++};
  for(const c of cases.filter(c=>c.status==='Active')){
    if(c.nextDate&&c.nextDate>=TODAY)ev('h-'+c.id+'-'+c.nextDate,c.nextDate,'Hearing: '+ctitle(c),[cname(c),c.court,c.stage].filter(Boolean).join(' · '),['-PT4H','PT8H']);
    for(const x of c.deadlines||[])if(!x.done&&x.d&&x.d>=TODAY){const nd=+x.rem||2;ev('d-'+c.id+'-'+x.d+'-'+(x.label||'').replace(/\W/g,''),x.d,(x.label||t('deadline'))+': '+ctitle(c),[cname(c),c.court].filter(Boolean).join(' · '),['-P'+nd+'D','-PT4H'])}}
  L.push('END:VCALENDAR');if(!n){toast(t('noUpcoming'));return}
  const blob=new Blob([L.join('\r\n')],{type:'text/calendar'}),name='MLA-Diary-reminders-'+TODAY+'.ics';ICS={blob,name};
  const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;if(!/iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent)||!('ontouchend' in document))a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{a.remove()},1000);
  settings.icsAt=TODAY;persist();$('#icsN').textContent=n+' '+t('icsEvents');if(!$('#icsDlg').open)$('#icsDlg').showModal()}
let ICS=null;

/* ---------- voice typing ---------- */
let REC=null;
function voice(target,btn){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast(t('micKeyboard'));target.focus();return}
  if(REC){try{REC.stop()}catch(x){}REC=null;return}
  const r=new SR();r.lang=LANG==='ur'?'ur-PK':'en-IN';r.interimResults=false;r.maxAlternatives=1;REC=r;btn.classList.add('on');toast(t('listening'));
  r.onresult=e=>{const txt=[...e.results].map(x=>x[0].transcript).join(' ');target.value=(target.value?target.value.trim()+' ':'')+txt;target.dispatchEvent(new Event('input',{bubbles:true}))};
  r.onerror=()=>toast(t('micKeyboard'));r.onend=()=>{REC=null;btn.classList.remove('on')};try{r.start()}catch(x){REC=null;btn.classList.remove('on')}}
function addMics(){$$('[data-voice]').forEach(el=>{if(el.nextElementSibling&&el.nextElementSibling.classList.contains('mic'))return;el.insertAdjacentHTML('afterend',`<button type="button" class="sm ghost mic" data-a="mic">${esc(t('speak'))}</button>`)})}

/* ---------- cloud (Firebase) ---------- */
async function cInit(){for(const f of ['vendor/firebase-app-compat.js','vendor/firebase-auth-compat.js','vendor/firebase-firestore-compat.js'])await load(f);
  firebase.initializeApp(CFG.firebase);C.auth=firebase.auth();C.fs=firebase.firestore();try{await C.fs.enablePersistence({synchronizeTabs:true})}catch(x){}
  await new Promise(r=>{const u=C.auth.onAuthStateChanged(()=>{u();r()})})}
function cUnsub(){C.unsub.forEach(u=>{try{u()}catch(x){}});C.unsub=[]}
function cRebuild(){const cs=[],cl=[];for(const [id,v] of C.cache){if(!v.o)continue;(v.k==='case'?cs:cl).push({id,...v.o})}cases=cs;clients=cl}
function cSubscribe(){cUnsub();C.cache.clear();clients=[];cases=[];fees={};let first=0;const need=C.fk?2:1;const timer=setTimeout(()=>status(t('offline')),12000);
  const ready=()=>{if(++first>=need){clearTimeout(timer);status('')}};let r1=0,r2=0;
  C.unsub.push(C.fs.collection('records').onSnapshot(snap=>{C.q=C.q.then(async()=>{for(const ch of snap.docChanges()){const id=ch.doc.id;if(ch.type==='removed'){C.cache.delete(id);continue}const d=ch.doc.data();const c=C.cache.get(id);if(c&&c.p===d.p)continue;try{C.cache.set(id,{k:d.k,p:d.p,o:await decS(C.ok,d.p)})}catch(x){}}cRebuild();if(!snap.metadata.fromCache&&!r1++)ready();render()})},e=>{clearTimeout(timer);status(cErr(e))}));
  if(C.fk)C.unsub.push(C.fs.collection('fees').onSnapshot(snap=>{C.q=C.q.then(async()=>{for(const ch of snap.docChanges()){const id=ch.doc.id;if(ch.type==='removed'){delete fees[id];continue}try{fees[id]=await decS(C.fk,ch.doc.data().p)}catch(x){}}if(!snap.metadata.fromCache&&!r2++)ready();render()})},e=>toast(cErr(e))));
}
async function makeRing(pass,keys){const salt=crypto.getRandomValues(new Uint8Array(16));const k=await deriveKey(pass,salt);return{k,doc:{salt:b64(salt),ver:pk(await enc(k,te.encode('mla-ok'))),ring:await encS(k,keys),u:Date.now()}}}
async function staffList(){const el=$('#staffList');if(!el||!C.adv)return;try{const q=await C.fs.collection('staff').get();el.innerHTML=q.docs.length?q.docs.map(d=>`<div><b>${esc(d.id)}</b> <span class="meta">${esc(t('added'))} ${fd(d.data().added)}</span><span class="sp"></span><button class="sm ghost danger" type="button" data-a="rmStaff" data-id="${esc(d.id)}">${esc(t('remove'))}</button></div>`).join(''):`<div class="meta">${esc(t('noStaff'))}</div>`}catch(e){el.textContent=cErr(e)}}
async function addStaff(email,pass){email=email.trim().toLowerCase();if(!/^\S+@\S+\.\S+$/.test(email)){toast(t('badEmail'));return}if(pass.length<6){toast(t('passShort'));return}
  try{const r=await makeRing(pass,{o:C.oraw});await C.fs.collection('keyrings').doc(email).set(r.doc);await C.fs.collection('staff').doc(email).set({added:TODAY,by:C.email});toast(t('staffAdded'));staffList()}catch(e){toast(cErr(e))}}

/* ---------- settings view ---------- */
const daysSince=d=>d?Math.floor((new Date(TODAY+'T00:00')-new Date(d+'T00:00'))/864e5):Infinity;
function backupNote(){if(!cases.length)return '';const n=daysSince(settings.lastBackup);if(n<7)return '';return `<div class="note">${esc(t('lastBackup'))}: <b>${settings.lastBackup?fd(settings.lastBackup):esc(t('never'))}</b> · <button class="sm" type="button" data-a="encBackup">${esc(t('backupNow'))}</button></div>`}
function vSettings(){
  const al=settings.autoLock||5;
  let h=`<div class="panel"><h3>${esc(t('security'))}</h3>${CLOUD?`<p class="meta">${esc(t('signedInAs'))} <b>${esc(C.email)}</b>${C.adv?'':' · '+esc(t('staffNote'))}</p>`:''}
  <form id="pwForm" class="g2" autocomplete="off"><label><span>${esc(t('oldPass'))}</span><input type="password" name="o" autocomplete="current-password"></label><label><span>${esc(t('newPass'))}</span><input type="password" name="n" autocomplete="new-password"></label><label><span>${esc(t('confirmPass'))}</span><input type="password" name="c" autocomplete="new-password"></label><div style="align-self:end"><button class="pri" type="submit">${esc(t('changePass'))}</button></div></form>
  <div class="bar" style="margin:14px 0 0"><label class="chk" style="gap:10px">${esc(t('autoLock'))}<select id="autoLock" style="width:auto">${[1,5,15,30].map(m=>`<option value="${m}" ${m===al?'selected':''}>${m} ${esc(t('minutes'))}</option>`).join('')}</select></label><button class="sm" type="button" data-a="lockNow">${esc(t('lockNow'))}</button></div></div>`;
  if(CLOUD&&C.adv)h+=`<div class="panel"><h3>${esc(t('team'))}</h3><p class="meta">${esc(t('teamHelp'))}</p><div class="hist" id="staffList"><div class="meta">…</div></div>
    <form id="staffForm" class="g2" style="margin-top:10px" autocomplete="off"><label><span>${esc(t('munshiEmail'))}</span><input name="e" type="email" inputmode="email"></label><label><span>${esc(t('tempPass'))}</span><input name="p" type="text" autocomplete="off"></label><div style="align-self:end"><button class="pri" type="submit">${esc(t('addMunshi'))}</button></div></form></div>`;
  h+=`<div class="panel"><h3>${esc(t('faceId'))}</h3><p class="meta">${esc(t('bioHelp'))}</p><div id="bioBox" class="acts"></div></div>`;
  h+=gPanel();
  h+=`<div class="panel"><h3>${esc(t('reminders'))}</h3><p class="meta">${esc(t('icsHelp'))}</p><p class="meta">${esc(t('lastIcs'))}: <b>${settings.icsAt?fd(settings.icsAt):esc(t('never'))}</b></p><button class="pri" type="button" data-a="ics">${esc(t('icsBtn'))}</button></div>`;
  h+=`<div class="panel"><h3>${esc(t('importExcel'))}</h3><p class="meta">${esc(t('importHelp'))}</p>`+(IMPORT?`<div class="note">${esc(t('importFound'))}: <b>${IMPORT.length}</b> — ${IMPORT.slice(0,3).map(r=>esc(r.title||r.client)).join(', ')}${IMPORT.length>3?'…':''}</div><div class="acts"><button class="pri" type="button" data-a="runImport">${esc(t('importNow'))}</button><button type="button" class="ghost" data-a="cancelImport">${esc(t('cancel'))}</button></div>`:`<div class="acts"><button type="button" data-a="pickExcel">${esc(t('importExcel'))}</button><button type="button" class="ghost" data-a="xlTemplate">${esc(t('template'))}</button></div>`)+`</div>`;
  h+=`<div class="panel"><h3>${esc(t('backup'))}</h3><p class="meta">${esc(t('backupHelp'))}</p><p>${esc(t('lastBackup'))}: <b>${settings.lastBackup?fd(settings.lastBackup):esc(t('never'))}</b></p>
  <div class="acts"><button class="pri" type="button" data-a="encBackup">${esc(t('backupNow'))}</button><button type="button" data-a="restoreStart">${esc(CLOUD?t('importBackup'):t('restore'))}</button><button type="button" data-a="backup">${esc(t('exportExcel'))}</button></div></div>
  <div class="panel"><h3>${esc(t('device'))}</h3><p class="meta">${esc(CLOUD?t('cloudOn'):t('localOnly'))}</p><p class="meta" id="storeInfo"></p><p class="meta">${esc(t('installHint'))}</p></div>
  <div class="panel"><h3 class="danger">${esc(CLOUD?t('removeDevice'):t('erase'))}</h3><p class="meta">${esc(CLOUD?t('removeDeviceHelp'):t('eraseHelp'))}</p><button type="button" class="ghost danger" data-a="eraseStart">${esc(CLOUD?t('removeDevice'):t('erase'))}</button></div>`;
  return h}
async function storeInfo(){staffList();bioBox();const el=$('#storeInfo');if(!el||!navigator.storage||!navigator.storage.estimate)return;try{const e=await navigator.storage.estimate();const p=navigator.storage.persisted?await navigator.storage.persisted():false;el.textContent=`${t('storageUsed')}: ${(e.usage/1048576).toFixed(1)} MB · ${p?t('persistOn'):t('persistOff')}`}catch(x){}}

/* ---------- Google Calendar sync (iPhone + Android via Google Calendar) ---------- */
const GCID=window.MLA_GOOGLE_CLIENT_ID||'';
const G={tok:null,exp:0,busy:false,timer:null,last:''};
const gOK=()=>G.tok&&Date.now()<G.exp;
function gConnect(prompt){return new Promise(async(ok,no)=>{try{await load('https://accounts.google.com/gsi/client')}catch(x){no(new Error(t('needOnline')));return}
  const c=google.accounts.oauth2.initTokenClient({client_id:GCID,scope:'https://www.googleapis.com/auth/calendar.app.created',prompt:prompt||'',
    callback:r=>{if(r.error){no(r);return}G.tok=r.access_token;G.exp=Date.now()+((+r.expires_in||3600)-120)*1000;ok()},error_callback:e=>no(e)});c.requestAccessToken()})}
async function gApi(method,path,body){const r=await fetch('https://www.googleapis.com/calendar/v3'+path,{method,headers:{Authorization:'Bearer '+G.tok,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  if(r.status===401){G.tok=null;throw new Error('auth')}if(r.status===204)return null;const j=await r.json().catch(()=>null);if(!r.ok){const e=new Error((j&&j.error&&j.error.message)||r.status);e.status=r.status;throw e}return j}
async function gid(key){const h=new Uint8Array(await crypto.subtle.digest('SHA-256',te.encode(key)));return 'mla'+[...h.slice(0,18)].map(b=>b.toString(16).padStart(2,'0')).join('')}
const at9=n=>n>0?n*1440-540:0;
function gEvents(){const ev=[];const allDay=(d)=>({start:{date:d},end:{date:addDays(d,1)}});
  for(const c of cases.filter(c=>c.status==='Active')){const who=cname(c),ph=cphone(c);
    if(c.nextDate)ev.push({key:'h|'+c.id,body:{summary:'Hearing: '+ctitle(c)+(who?' — '+who:''),description:[c.court,c.stage?'For: '+c.stage:'',c.caseNo?'Case no: '+c.caseNo:'',ph?'Client: '+who+' '+ph:'',isAdmin&&bal(c.id)?'Fee remaining: '+rs(bal(c.id)):''].filter(Boolean).join('\n'),location:c.court||'',...allDay(c.nextDate),colorId:'9',reminders:{useDefault:false,overrides:[{method:'popup',minutes:240}]}}});
    (c.deadlines||[]).forEach((x,i)=>{if(x.done||!x.d)return;const n=x.rem===0?0:(+x.rem||2);ev.push({key:'d|'+c.id+'|'+i,body:{summary:(x.label||'Filing')+': '+ctitle(c),description:[who,c.court].filter(Boolean).join(' · '),...allDay(x.d),colorId:'11',reminders:{useDefault:false,overrides:[{method:'popup',minutes:at9(n)},{method:'popup',minutes:240}].filter((o,j,a)=>a.findIndex(z=>z.minutes===o.minutes)===j)}}})});
    if(isAdmin){const ni=nextInst(c.id);if(ni)ev.push({key:'f|'+c.id,body:{summary:'Fee due '+rs(ni.due)+(who?' — '+who:''),description:ctitle(c)+'\nRemaining on case: '+rs(bal(c.id))+(ph?'\nClient phone: '+ph:''),...allDay(ni.d),colorId:'5',reminders:{useDefault:false,overrides:[{method:'popup',minutes:at9(+ni.rem||0)}]}}})}}
  return ev}
async function gSync(manual){if(!GCID||!(settings.gcal&&settings.gcal.on))return;if(G.busy){G.again=1;return}if(!gOK()){if(manual)toast(t('gcalReconnect'));render();return}
  G.busy=true;try{const st=settings.gcal;st.h=st.h||{};
    if(!st.cal){const cal=await gApi('POST','/calendars',{summary:'MLA Diary',timeZone:'Asia/Karachi',description:'Hearings, filings and fee due dates from MLA Diary'});st.cal=cal.id}
    const cal=encodeURIComponent(st.cal);const ev=gEvents(),seen=new Set();let n=0;
    for(const e of ev){const id=await gid(e.key);seen.add(id);const body={...e.body,id,status:'confirmed'};const hash=JSON.stringify(body);if(st.h[id]===hash)continue;
      try{await gApi('PUT','/calendars/'+cal+'/events/'+id,body)}catch(x){if(x.status===404)await gApi('POST','/calendars/'+cal+'/events',body);else throw x}st.h[id]=hash;n++}
    for(const id of Object.keys(st.h))if(!seen.has(id)){try{await gApi('DELETE','/calendars/'+cal+'/events/'+id)}catch(x){if(x.status!==404&&x.status!==410)throw x}delete st.h[id];n++}
    st.at=new Date().toISOString();await persist();if(manual)toast(t('gcalSynced')+' ('+n+')')}
  catch(x){if(x.message==='auth'){toast(t('gcalReconnect'))}else if(x.status===404&&settings.gcal){settings.gcal.cal='';settings.gcal.h={};await persist()}else toast(t('gcalFail'))}
  finally{G.busy=false;render();if(G.again){G.again=0;gQueue()}}}
function gQueue(){if(!(settings.gcal&&settings.gcal.on)||!gOK())return;clearTimeout(G.timer);G.timer=setTimeout(()=>gSync(false),4000)}
function gBanner(){if(!GCID||!(settings.gcal&&settings.gcal.on)||gOK())return '';return `<div class="note">${esc(t('gcalPaused'))} <button class="sm" type="button" data-a="gcalSync">${esc(t('gcalSyncNow'))}</button></div>`}
function gPanel(){const on=settings.gcal&&settings.gcal.on;
  if(!GCID)return `<div class="panel"><h3>${esc(t('gcal'))}</h3><p class="meta">${esc(t('gcalNeedsSetup'))}</p></div>`;
  return `<div class="panel"><h3>${esc(t('gcal'))}</h3><p class="meta">${esc(t('gcalHelp'))}</p>${on?`<p><span class="tag paid">${esc(t('gcalOn'))}</span> ${settings.gcal.at?`<span class="meta">${esc(t('lastSync'))}: ${fd(settings.gcal.at.slice(0,10))} ${settings.gcal.at.slice(11,16)} UTC</span>`:''}</p><div class="acts"><button class="pri" type="button" data-a="gcalSync">${esc(t('gcalSyncNow'))}</button><button class="ghost danger" type="button" data-a="gcalOff">${esc(t('gcalOff'))}</button></div>`:`<button class="pri" type="button" data-a="gcalConnect">${esc(t('gcalConnect'))}</button>`}</div>`}

/* ---------- Face ID / fingerprint (passkey + PRF) ---------- */
const bioKey=()=>CLOUD?'bio_'+C.email:'bio';
const PRF_SALT=new Uint8Array(32).map((_,i)=>'mla-diary-prf-salt-v1-0123456789'.charCodeAt(i));
const bioOK=()=>!!(window.PublicKeyCredential&&navigator.credentials);
async function prfGet(rawId){const a=await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),allowCredentials:[{type:'public-key',id:rawId}],userVerification:'required',timeout:60000,extensions:{prf:{eval:{first:PRF_SALT}}}}});
  const r=a&&a.getClientExtensionResults().prf;const b=r&&r.results&&r.results.first;if(!b)throw new Error('noprf');return crypto.subtle.importKey('raw',new Uint8Array(b),'AES-GCM',false,['encrypt','decrypt'])}
async function bioEnable(pass){
  if(!bioOK()){toast(t('bioNo'));return}
  try{if(CLOUD){const k=await deriveKey(pass,unb64(C.ring.salt));await dec(k,unpk(C.ring.ver))}else{const k=await deriveKey(pass,S.meta.salt);await dec(k,S.meta.ver)}}catch(x){toast(t('wrongPass'));return}
  try{const cred=await navigator.credentials.create({publicKey:{rp:{name:'MLA Diary'},user:{id:crypto.getRandomValues(new Uint8Array(16)),name:CLOUD?C.email:'MLA Diary',displayName:'MLA Diary'},challenge:crypto.getRandomValues(new Uint8Array(32)),
      pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'preferred'},timeout:60000,extensions:{prf:{eval:{first:PRF_SALT}}}}});
    const raw=new Uint8Array(cred.rawId);let key;const r=cred.getClientExtensionResults().prf;
    if(r&&r.results&&r.results.first)key=await crypto.subtle.importKey('raw',new Uint8Array(r.results.first),'AES-GCM',false,['encrypt','decrypt']);else key=await prfGet(raw);
    const blob=await enc(key,te.encode(pass));await idbPut('kv',bioKey(),{id:b64(raw),blob:pack(blob)});toast(t('bioOn'));render()}
  catch(x){toast(x&&x.message==='noprf'?t('bioNo'):(x&&x.name==='NotAllowedError'?t('bioCancel'):t('bioNo')))}}
async function bioUnlock(){try{const rec=await idbGet('kv',bioKey());if(!rec)return;const key=await prfGet(unb64(rec.id));const pass=tdec.decode(await dec(key,unpack(rec.blob)));
  const f=E($('#lockForm'));f.p1.value=pass;$('#lockForm').requestSubmit()}catch(x){if(!(x&&x.name==='NotAllowedError'))$('#lkErr').textContent=t('bioFail')}}
async function bioOff(){await idbDel('kv',bioKey());toast(t('bioOffDone'));render()}

async function bioBox(){const el=$('#bioBox');if(!el)return;const rec=await idbGet('kv',bioKey()).catch(()=>null);
  el.innerHTML=rec?`<span class="tag paid">${esc(t('bioActive'))}</span><button type="button" class="sm ghost danger" data-a="bioOff">${esc(t('bioDisable'))}</button>`:`<input type="password" id="bioPass" placeholder="${esc(t('password'))}" autocomplete="current-password" style="flex:1 1 180px;width:auto"><button type="button" class="pri" data-a="bioOn">${esc(t('bioEnable'))}</button>`}
/* ---------- lock ---------- */
let idleT=null,hiddenAt=0,fails=0,waitUntil=0,LKMODE='';
function bump(){if(!S.key)return;clearTimeout(idleT);idleT=setTimeout(lock,(settings.autoLock||5)*60000)}
['pointerdown','keydown','touchstart','scroll'].forEach(ev=>document.addEventListener(ev,bump,{passive:true}));
document.addEventListener('visibilitychange',()=>{if(document.hidden)hiddenAt=Date.now();else if(S.key&&hiddenAt&&Date.now()-hiddenAt>Math.min(2,settings.autoLock||5)*60000)lock()});
function lock(){S.key=null;if(CLOUD){cUnsub();C.ok=C.fk=null;C.oraw=C.fraw='';C.cache.clear()}clients=[];cases=[];fees={};curId=null;curClient=null;$$('dialog').forEach(d=>{if(d.open)d.close()});$('#view').innerHTML='';clearTimeout(idleT);showLock()}
async function showLock(){
  const f=E($('#lockForm'));f.reset();const err=$('#lkErr');err.textContent='';let mode;
  if(!CLOUD){const meta=await idbGet('kv','meta').catch(()=>null);S.meta=meta||null;mode=meta?'unlock':'setup'}
  else{const u=C.auth.currentUser;if(!u)mode='login';else{C.email=(u.email||'').toLowerCase();C.adv=C.email===String(CFG.advocate||'').toLowerCase();
    try{const r=await C.fs.collection('keyrings').doc(C.email).get();C.ring=r.exists?r.data():null;mode=C.ring?'unlock':(C.adv?'setup':'wait')}catch(e){mode='wait';err.textContent=cErr(e)}}}
  LKMODE=mode;const show=(sel,on)=>{$(sel).style.display=on?'':'none'};
  $('#lkSub').textContent={login:t('loginSub'),setup:CLOUD?t('setupCloudSub'):t('setupSub'),unlock:CLOUD?t('signedInAs')+' '+C.email:t('unlockSub'),wait:t('waitAdd')}[mode];
  show('#lkE',mode==='login');show('#lkP1',mode!=='wait');show('#lkC',mode==='setup');show('#lkBtn',mode!=='wait');show('#lkRetry',mode==='wait');show('#lkOut',CLOUD&&mode!=='login');
  $('#lkL1').textContent=mode==='login'?t('loginPass'):mode==='setup'?t('newPass'):t('password');
  $('#lkWarn').textContent=mode==='setup'?t('passWarn'):'';$('#lkBtn').textContent=mode==='login'?t('signIn'):mode==='setup'?t('setPass'):t('unlock');
  show('#lkErase',!CLOUD&&mode==='unlock');show('#lkRestore',!CLOUD);
  const bio=mode==='unlock'&&bioOK()?await idbGet('kv',bioKey()).catch(()=>null):null;show('#lkBio',!!bio);if(bio&&!showLock.tried){showLock.tried=1;setTimeout(bioUnlock,400)}
  f.p1.setAttribute('autocomplete',mode==='setup'?'new-password':'current-password');
  $('#lock').hidden=false;$('#appWrap').hidden=true;setTimeout(()=>{try{(mode==='login'?f.em:f.p1).focus()}catch(x){}},50);
}
async function opened(){
  $('#lock').hidden=true;$('#appWrap').hidden=false;view='clients';isAdmin=!CLOUD||!!C.fk;applyLang();bump();
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(x){}
  load(LIB.pdf).then(()=>load(LIB.at)).catch(()=>{});logo();
}
$('#lockForm').addEventListener('submit',async e=>{e.preventDefault();const f=E(e.target),err=$('#lkErr'),btn=$('#lkBtn');err.textContent='';const p1=f.p1.value;
  if(Date.now()<waitUntil){err.textContent=t('waitTry');return}
  btn.disabled=true;
  try{
    if(LKMODE==='login'){try{await C.auth.signInWithEmailAndPassword(f.em.value.trim(),p1)}catch(x){err.textContent=t('wrongLogin');return}await showLock();return}
    if(LKMODE==='setup'){if(p1.length<6){err.textContent=t('passShort');return}if(p1!==f.p2.value){err.textContent=t('passMismatch');return}
      if(!CLOUD){const salt=crypto.getRandomValues(new Uint8Array(16));const key=await deriveKey(p1,salt);const ver=await enc(key,te.encode('mla-ok'));
        await idbPut('kv','meta',{salt,ver});S.key=key;S.meta={salt,ver};load_({});settings.created=TODAY;await persist();opened();return}
      const m=await C.fs.collection('meta').doc('office').get().catch(()=>null);if(m&&m.exists){err.textContent=t('alreadySetup');return}
      const keys={o:rnd(32),f:rnd(32)};const r=await makeRing(p1,keys);await C.fs.collection('keyrings').doc(C.email).set(r.doc);await C.fs.collection('meta').doc('office').set({created:TODAY,by:C.email});
      C.ring=r.doc;await unlockCloud(r.k,keys);return}
    if(!CLOUD){try{const key=await deriveKey(p1,S.meta.salt);await dec(key,S.meta.ver);S.key=key;fails=0;const st=await idbGet('kv','state');load_(st?await decJ(key,st):{});opened()}catch(x){fails++;if(fails>=5){waitUntil=Date.now()+30000;fails=0}err.textContent=t('wrongPass')}return}
    try{const k=await deriveKey(p1,unb64(C.ring.salt));await dec(k,unpk(C.ring.ver));fails=0;await unlockCloud(k,await decS(k,C.ring.ring))}catch(x){fails++;if(fails>=5){waitUntil=Date.now()+30000;fails=0}err.textContent=t('wrongPass')}
  }catch(x){err.textContent=cErr(x)}finally{btn.disabled=false}
});
async function unlockCloud(k,keys){S.key=k;S.meta={salt:unb64(C.ring.salt),ver:unpk(C.ring.ver)};C.oraw=keys.o;C.fraw=keys.f||'';C.ok=await rawKey(keys.o);C.fk=keys.f?await rawKey(keys.f):null;
  settings=(await idbGet('kv','settings_'+C.email).catch(()=>null))||{};cSubscribe();opened()}
document.addEventListener('submit',async e=>{
  if(e.target.id==='staffForm'){e.preventDefault();const f=E(e.target);await addStaff(f.e.value,f.p.value);f.reset();return}
  if(e.target.id!=='pwForm')return;e.preventDefault();const f=E(e.target);
  if(f.n.value.length<6){toast(t('passShort'));return}if(f.n.value!==f.c.value){toast(t('passMismatch'));return}
  try{const old=await deriveKey(f.o.value,S.meta.salt);await dec(old,S.meta.ver)}catch(x){toast(t('wrongPass'));return}
  toast(t('working'));
  try{if(CLOUD){const r=await makeRing(f.n.value,{o:C.oraw,...(C.fraw?{f:C.fraw}:{})});await C.fs.collection('keyrings').doc(C.email).set(r.doc);C.ring=r.doc;S.key=r.k;S.meta={salt:unb64(r.doc.salt),ver:unpk(r.doc.ver)};f.reset();await idbDel('kv',bioKey()).catch(()=>{});toast(t('passChanged'));return}
    const salt=crypto.getRandomValues(new Uint8Array(16)),key=await deriveKey(f.n.value,salt);
    for(const k of await idbKeys('files')){const o=await idbGet('files',k);const n=await enc(key,await dec(S.key,o));n.type=o.type;await idbPut('files',k,n)}
    const ver=await enc(key,te.encode('mla-ok'));await idbPut('kv','meta',{salt,ver});S.meta={salt,ver};S.key=key;await persist();f.reset();await idbDel('kv',bioKey()).catch(()=>{});toast(t('passChanged'))}
  catch(x){toast(CLOUD?cErr(x):'Could not change password')}
});
document.addEventListener('change',e=>{if(e.target.id==='autoLock'){settings.autoLock=+e.target.value;persist();bump()}});
$('#xlIn').addEventListener('change',e=>{const f=e.target.files[0];if(f)importExcel(f)});
$('#restoreForm').addEventListener('submit',async e=>{e.preventDefault();const f=E(e.target),file=$('#restoreFile').files[0],err=$('#rsErr');err.textContent='';
  if(!file){err.textContent=t('badFile');return}
  $('#rsBtn').disabled=true;try{await doRestore(file,f.rp.value);$('#restoreDlg').close();if(!CLOUD){toast(t('restored'));opened()}}catch(x){err.textContent=x.message||t('badFile')}finally{$('#rsBtn').disabled=false}});
$('#eraseForm').addEventListener('submit',async e=>{e.preventDefault();if(E(e.target).w.value.trim().toUpperCase()!=='ERASE')return;
  await idbClear('files');await idbClear('kv');$('#eraseDlg').close();
  if(CLOUD){try{await C.fs.clearPersistence().catch(()=>{});await C.auth.signOut()}catch(x){}location.reload();return}
  S.key=null;S.meta=null;load_({});lock();toast(t('erased'))});
document.addEventListener('click',async e=>{const el=e.target.closest('[data-a]');if(!el)return;const a=el.dataset.a;
  if(a==='lockNow')lock();
  if(a==='gcalConnect'){try{await gConnect('consent');settings.gcal={on:true,cal:(settings.gcal&&settings.gcal.cal)||'',h:(settings.gcal&&settings.gcal.h)||{}};await persist();await gSync(true)}catch(x){toast(t('gcalFail'))}}
  if(a==='gcalSync'){try{if(!gOK())await gConnect('');await gSync(true)}catch(x){toast(t('gcalFail'))}}
  if(a==='gcalOff'){settings.gcal={on:false,cal:settings.gcal&&settings.gcal.cal||'',h:{}};G.tok=null;await persist();render();toast(t('gcalOffDone'))}
  if(a==='bioOn'){const v=($('#bioPass')||{}).value||'';if(!v){toast(t('password'));return}bioEnable(v)}
  if(a==='bioOff')bioOff();
  if(a==='bioUnlock')bioUnlock();
  if(a==='encBackup')encBackup();
  if(a==='ics')exportIcs();
  if(a==='icsShare'&&ICS){const f=new File([ICS.blob],ICS.name,{type:'text/calendar'});try{await navigator.share({files:[f]})}catch(x){download(f)}}
  if(a==='icsGoogle'){window.open('https://calendar.google.com/calendar/u/0/r/settings/export','_blank')}
  if(a==='pickExcel'){$('#xlIn').value='';$('#xlIn').click()}
  if(a==='xlTemplate')excelTemplate();
  if(a==='runImport')runImport();
  if(a==='cancelImport'){IMPORT=null;render()}
  if(a==='mic'){const tg=el.previousElementSibling;if(tg)voice(tg,el)}
  if(a==='rmStaff'){if(!el.dataset.sure){el.dataset.sure=1;el.textContent=t('tapAgain');return}const id=el.dataset.id;try{await C.fs.collection('staff').doc(id).delete();await C.fs.collection('keyrings').doc(id).delete();toast(t('deleted'));staffList()}catch(x){toast(cErr(x))}}
  if(a==='lkRetry')showLock();
  if(a==='lkOut'){try{await C.auth.signOut()}catch(x){}showLock()}
  if(a==='restoreStart'){E($('#restoreForm')).reset();$('#rsErr').textContent='';$('#rsWarn').textContent=CLOUD?t('importWarn'):(S.meta?t('restoreWarn'):'');$('#restoreDlg').showModal()}
  if(a==='eraseStart'){E($('#eraseForm')).reset();$('#eraseDlg').showModal()}
  if(a==='langLock'){LANG=LANG==='en'?'ur':'en';try{localStorage.setItem('mla_lang',LANG)}catch(x){}document.documentElement.lang=LANG;document.documentElement.dir=LANG==='ur'?'rtl':'ltr';$$('[data-t]').forEach(x=>x.textContent=t(x.dataset.t));showLock()}
});
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
document.documentElement.lang=LANG;document.documentElement.dir=LANG==='ur'?'rtl':'ltr';$$('[data-t]').forEach(x=>x.textContent=t(x.dataset.t));
(async()=>{if(CLOUD){try{await cInit()}catch(x){$('#lock').hidden=false;$('#lkErr').textContent=t('needOnline');return}}showLock()})();
}
