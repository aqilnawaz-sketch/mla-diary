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
function persist(){const snap={clients,cases,fees,settings};saving=saving.then(async()=>{if(S.key)await idbPut('kv','state',await encJ(S.key,snap))}).catch(()=>toast('Could not save on this device — storage may be full'));return saving}
const A={db:true};

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
async function put(coll,id,data){
  if(!S.key){toast(t('locked'));return false}
  const d={...clone(data),updated:new Date().toISOString()};
  if(coll==='fees')fees[id]=d;else{const arr=coll==='cases'?cases:clients;const i=arr.findIndex(x=>x.id===id);const o={id,...d};if(i<0)arr.push(o);else arr[i]=o}
  await persist();render();return true}
async function del(coll,id){if(!S.key)return false;if(coll==='fees')delete fees[id];else if(coll==='cases')cases=cases.filter(x=>x.id!==id);else clients=clients.filter(x=>x.id!==id);await persist();render();return true}
const newId=()=>Date.now().toString(36)+crypto.getRandomValues(new Uint32Array(1))[0].toString(36);

/* ---------- WhatsApp ---------- */
function waNum(p){p=String(p||'').replace(/\D/g,'');if(!p)return '';if(p.startsWith('0'))p='92'+p.slice(1);else if(p.length===10&&p.startsWith('3'))p='92'+p;return p}
function waLink(phone,msg){const n=waNum(phone);return n?'https://wa.me/'+n+'?text='+encodeURIComponent(msg):''}
const waHear=c=>waLink(cphone(c),`Assalam-o-Alaikum ${cname(c)||''}, your case "${ctitle(c)}" is fixed for hearing on ${fd(c.nextDate)}${c.court?' before '+c.court:''}${c.stage?' ('+c.stage+')':''}. Please contact us if needed. — ${FIRM.name}, 0333-3621111`);

/* ---------- libraries & files ---------- */
const loaded={};
function load(src){return loaded[src]||(loaded[src]=new Promise((ok,no)=>{const s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=()=>{delete loaded[src];no(new Error('load'))};document.head.appendChild(s)}))}
const MIME={pdf:'application/pdf',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',json:'application/json',mladiary:'application/octet-stream'};
async function saveFile(name,data){
  const ext=name.split('.').pop();const file=new File([data],name,{type:MIME[ext]||'application/octet-stream'});
  if(matchMedia('(pointer:coarse)').matches&&navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:name});return}catch(e){if(e&&e.name==='AbortError')return}}
  const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},5000)}
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
    if(kind==='pdf'){const J=await jsPDF();const doc=new J({orientation:'landscape',unit:'mm',format:'a4'});
      const lg=await logo();if(lg)doc.addImage(lg,'JPEG',265,6,22,22);doc.setTextColor(150,118,40);doc.setFont('times','bold');doc.setFontSize(17);doc.text(FIRM.name+' — Cause List',14,16);doc.setTextColor(20,20,20);
      doc.setFont('helvetica','normal');doc.setFontSize(11);doc.text(WD[new Date(d+'T00:00').getDay()]+', '+fd(d)+'  ·  '+list.length+' case(s)',14,23);
      doc.autoTable({head:[head],body:rows,startY:28,styles:{fontSize:9,cellPadding:2},headStyles:{fillColor:[12,12,14],textColor:[228,196,110]},columnStyles:{0:{cellWidth:8}}});
      doc.setFontSize(8);doc.text(FIRM.addr+'  ·  '+FIRM.contact,14,200);
      await saveFile('Cause-list-'+d+'.pdf',doc.output('blob'))}
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
async function receipt(cid,i){
  const c=byId(cid);const p=(F(cid).payments||[])[i];if(!c||!p)return;
  try{const J=await jsPDF();const doc=new J({unit:'mm',format:'a5'});const W=148;
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
    await saveFile('Receipt-'+(p.rno||p.d)+'.pdf',doc.output('blob'));
  }catch(e){toast('Could not load the file maker — check connection')}
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
const upcomingDl=()=>cases.filter(c=>c.status==='Active').flatMap(c=>(c.deadlines||[]).map((x,i)=>({c,x,i}))).filter(o=>!o.x.done&&o.x.d&&o.x.d<=addDays(TODAY,15)).sort((a,b)=>a.x.d<b.x.d?-1:1);

/* ---------- views ---------- */
function vDiary(){
  const act=cases.filter(c=>c.status==='Active'),tom=addDays(TODAY,1),wk=addDays(TODAY,7);
  const past=act.filter(c=>c.nextDate&&c.nextDate<TODAY),dls=upcomingDl();
  let h=`<div class="chips">${chip(act.filter(c=>c.nextDate===TODAY).length,t('today'))}${chip(act.filter(c=>c.nextDate===tom).length,t('tomorrow'))}${chip(act.filter(c=>c.nextDate>=TODAY&&c.nextDate<=wk).length,t('next7'))}${chip(past.length,t('passed'),past.length)}${chip(dls.length,t('deadlines'),dls.some(o=>o.x.d<=TODAY))}${chip(act.filter(c=>!c.nextDate).length,t('noDate'))}</div>`;
  h+=`<div class="bar"><b>${esc(t('causeList'))}</b><input type="date" id="causeD" value="${esc(ui.cause)}" aria-label="${esc(t('causeList'))}"><button class="sm" type="button" data-a="causePdf">${esc(t('pdf'))}</button><button class="sm" type="button" data-a="causeXls">${esc(t('excel'))}</button></div>`;
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
  let h=`<div class="bar"><input id="cq" type="search" placeholder="${esc(t('search'))}" value="${esc(ui.cq)}"><button type="button" class="sm" data-a="newClient">${esc(t('newClient'))}</button></div>`;
  if(!list.length)return h+`<div class="empty">${esc(clients.length?t('noMatch'):t('noClients'))}</div>`;
  return h+`<table class="stack"><thead><tr><th>${esc(t('client'))}</th><th>${esc(t('phone'))}</th><th>${esc(t('referred'))}</th><th class="n">${esc(t('caseCount'))}</th>${isAdmin?`<th class="n">${esc(t('balance'))}</th>`:''}</tr></thead><tbody>${list.map(c=>{const cs=cases.filter(x=>x.clientId===c.id);return `<tr data-a="openClient" data-id="${esc(c.id)}"><td><b>${esc(c.name||t('untitledClient'))}</b></td><td>${esc(c.phone)}</td><td>${esc(c.ref)}</td><td class="n">${cs.length}</td>${isAdmin?`<td class="n">${rs(cs.reduce((a,x)=>a+bal(x.id),0))}</td>`:''}</tr>`}).join('')}</tbody></table>`;
}
function allPays(){return cases.flatMap(c=>(F(c.id).payments||[]).map((p,i)=>({...p,c,i})))}
function vFee(){
  if(!isAdmin)return `<div class="empty">${esc(t('staffNote'))}</div>`;
  const m=TODAY.slice(0,7),pays=allPays();
  const recM=pays.filter(p=>(p.d||'').startsWith(m)).reduce((a,p)=>a+(+p.amt||0),0),recA=pays.reduce((a,p)=>a+(+p.amt||0),0);
  const expM=cases.flatMap(c=>F(c.id).expenses||[]).filter(e=>(e.d||'').startsWith(m)).reduce((a,e)=>a+(+e.amt||0),0);
  const due=cases.reduce((a,c)=>a+bal(c.id),0);
  const od=cases.filter(c=>bal(c.id)>0).flatMap(c=>{let cum=0;const pd=paid(c.id);return (F(c.id).plan||[]).slice().sort((a,b)=>a.d<b.d?-1:1).filter(p=>{cum+=+p.amt||0;return p.d<=TODAY&&cum>pd}).map(p=>({c,p}))});
  let h=`<div class="chips">${chip(rs(recM),t('recMonth'))}${chip(rs(due),t('dueAll'),due)}${chip(rs(recA),t('recAll'))}${chip(rs(expM),t('expMonth'))}</div>`;
  if(od.length)h+=`<div class="panel"><h3>${esc(t('overdueInst'))}</h3><div class="hist">${od.map(o=>`<div class="x"><b>${rs(o.p.amt)}</b> ${fd(o.p.d)} · <a href="#" data-a="open" data-id="${esc(o.c.id)}">${esc(ctitle(o.c))}</a> · ${esc(cname(o.c))}</div>`).join('')}</div></div>`;
  const dues=cases.filter(c=>bal(c.id)>0).sort((a,b)=>bal(b.id)-bal(a.id));
  h+=`<h2 class="sec">${esc(t('feeDue'))}</h2>`+(dues.length?`<table class="stack"><thead><tr><th>${esc(t('title'))}</th><th>${esc(t('client'))}</th><th class="n">${esc(t('agreed'))}</th><th class="n">${esc(t('received'))}</th><th class="n">${esc(t('balance'))}</th></tr></thead><tbody>${dues.map(c=>`<tr data-a="open" data-id="${esc(c.id)}"><td><b>${esc(ctitle(c))}</b></td><td>${esc(cname(c))}</td><td class="n">${rs(owed(c.id))}</td><td class="n">${rs(paid(c.id))}</td><td class="n"><b>${rs(bal(c.id))}</b></td></tr>`).join('')}</tbody></table>`:`<div class="empty">—</div>`);
  const rec=pays.sort((a,b)=>(b.d||'').localeCompare(a.d||'')).slice(0,20);
  h+=`<h2 class="sec">${esc(t('recentPay'))}</h2>`+(rec.length?`<table class="stack"><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('client'))}</th><th>${esc(t('title'))}</th><th>${esc(t('mode'))}</th><th class="n">${esc(t('amount'))}</th><th>${esc(t('receipt'))}</th></tr></thead><tbody>${rec.map(p=>`<tr><td style="white-space:nowrap">${fd(p.d)}</td><td>${esc(cname(p.c))}</td><td>${esc(ctitle(p.c))}</td><td>${esc(p.mode)}</td><td class="n">${rs(p.amt)}</td><td><button class="sm ghost" type="button" data-a="receipt" data-id="${esc(p.c.id)}" data-i="${p.i}">${esc(p.rno||t('receipt'))}</button></td></tr>`).join('')}</tbody></table>`:`<div class="empty">${esc(t('noPay'))}</div>`);
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

const TABS=[['diary','diary'],['calendar','calendar'],['cases','cases'],['clients','clients'],['fee','fee'],['reports','reports'],['settings','settings']];
function render(){
  $('#tabs').innerHTML=TABS.filter(([v])=>v!=='fee'||isAdmin).map(([v,k])=>`<button type="button" data-a="tab" data-v="${v}" class="${v===view?'on':''}">${esc(t(k))}</button>`).join('');
  if(!S.key)return;
  const V={diary:vDiary,calendar:vCal,cases:vCases,clients:vClients,fee:vFee,reports:vReports,settings:vSettings};
  $('#view').innerHTML=(view==='diary'?backupNote():'')+(V[view]||vDiary)();if(view==='settings')storeInfo();
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
  <div class="acts"><button class="sm pri" type="button" data-a="hear" data-id="${esc(id)}">${esc(t('update'))}</button><button class="sm" type="button" data-a="editCase" data-id="${esc(id)}">${esc(t('edit'))}</button><button class="sm" type="button" data-a="upload">${esc(t('upload'))}</button>${w?`<a class="btn sm ghost" href="${esc(w)}" target="_blank" rel="noopener">${esc(t('waRem'))}</a>`:''}${c.clientId?`<button class="sm ghost" type="button" data-a="openClient" data-id="${esc(c.clientId)}">${esc(t('client'))}</button>`:''}</div>`;
  if(isAdmin){const pays=(fz.payments||[]).map((p,i)=>({...p,i})).sort((a,b)=>(b.d||'').localeCompare(a.d||''));
    h+=`<div class="panel" style="margin:0"><div class="sum"><span>${esc(t('agreed'))} <b>${rs(fz.fee)}</b></span><span>${esc(t('expenses'))} <b>${rs(expB(id))}</b></span><span>${esc(t('received'))} <b>${rs(paid(id))}</b></span><span>${esc(t('balance'))} <b style="color:var(--tape)">${rs(bal(id))}</b></span></div>
    <div class="acts" style="margin-top:8px"><button class="sm" type="button" data-a="pay" data-id="${esc(id)}">${esc(t('addFee'))}</button><button class="sm" type="button" data-a="exp" data-id="${esc(id)}">${esc(t('addExp'))}</button><button class="sm" type="button" data-a="inst" data-id="${esc(id)}">${esc(t('addInst'))}</button></div></div>
    <h4>${esc(t('feeRec'))}</h4><div class="hist">${pays.length?pays.map(p=>`<div class="p"><b>${rs(p.amt)}</b> ${fd(p.d)} · ${esc(p.mode||'')}${p.note?' · '+esc(p.note):''}<span class="sp"></span><button class="sm ghost" type="button" data-a="receipt" data-id="${esc(id)}" data-i="${p.i}">${esc(t('receipt'))} ${esc(p.rno||'')}</button>${waLink(cphone(c),'')?`<a class="btn sm ghost" target="_blank" rel="noopener" href="${esc(waLink(cphone(c),`Assalam-o-Alaikum ${cname(c)}, received with thanks ${rs(p.amt)} on ${fd(p.d)} for "${ctitle(c)}" (Receipt ${p.rno||''}). Balance: ${rs(bal(id))}. — ${FIRM.name}`))}">${esc(t('waRec'))}</a>`:''}<button class="sm ghost danger" type="button" data-a="rmItem" data-k="payments" data-i="${p.i}">${esc(t('del'))}</button></div>`).join(''):`<div class="meta">${esc(t('noPay'))}</div>`}</div>
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
function dlRow(x){return `<div class="dlrow"><label><span>${esc(t('label'))}</span><input data-f="label" value="${esc(x.label||'')}" placeholder="Limitation for appeal…"></label><label><span>${esc(t('dueDate'))}</span><input type="date" data-f="d" value="${esc(x.d||'')}"></label><button class="sm ghost danger" type="button" data-a="rmDl" aria-label="${esc(t('del'))}">✕</button><input type="hidden" data-f="done" value="${x.done?1:''}"></div>`}
function openCase(c){
  const f=E($('#caseForm'));f.reset();f.dataset.id=c?c.id:'';
  $('#cfTitle').textContent=c?t('edit'):t('newCase').replace('+','').trim();
  if(c){for(const k of ['title','opp','caseNo','fir','ps','sections','court','judge','type','status','filed','nextDate','stage','notes'])f[k].value=c[k]??'';f.client.value=cname(c);f.phone.value=cphone(c);f.fee.value=F(c.id).fee||''}
  else{f.status.value='Active';f.type.value='Civil';if(curClient){const cl=clients.find(x=>x.id===curClient);if(cl&&$('#clientDlg').open){f.client.value=cl.name||'';f.phone.value=cl.phone||''}}}
  $('#dlRows').innerHTML=(c&&c.deadlines||[]).map(dlRow).join('');
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
  d.deadlines=$$('#dlRows .dlrow').map(r=>({label:r.querySelector('[data-f=label]').value.trim(),d:r.querySelector('[data-f=d]').value,done:!!r.querySelector('[data-f=done]').value})).filter(x=>x.label||x.d);
  d.clientId=await findOrMakeClient(f.client.value,f.phone.value);
  if(!(await put('cases',id,d)))return;
  if(isAdmin){const fee=+f.fee.value||0,fz=strip(F(id));if(fee!==(+fz.fee||0)||!fees[id]&&fee)await put('fees',id,{...fz,fee})}
  $('#caseDlg').close();toast(t('saved'));if($('#detDlg').open)detail(id);
});
E($('#clientForm')).addEventListener('submit',async e=>{e.preventDefault();const f=E(e.target),id=curClient||newId('clients');
  const d={...(curClient?strip(clients.find(c=>c.id===curClient)):{created:new Date().toISOString()})};for(const k of ['name','phone','cnic','ref','address','notes'])d[k]=f[k].value.trim();
  if(await put('clients',id,d)){curClient=id;toast(t('saved'));clientCases(id)}
});
function openClient(id){const f=E($('#clientForm'));f.reset();curClient=id||null;const c=id?clients.find(x=>x.id===id):null;
  $('#clTitle').textContent=c?(c.name||t('untitledClient')):t('clientNew');
  if(c)for(const k of ['name','phone','cnic','ref','address','notes'])f[k].value=c[k]||'';
  $('#delClientBtn').style.display=c&&isAdmin?'':'none';delete $('#delClientBtn').dataset.sure;$('#delClientBtn').textContent=t('del');
  clientCases(id);if(!$('#clientDlg').open)$('#clientDlg').showModal()}
function clientCases(id){const cs=id?cases.filter(x=>x.clientId===id):[];
  $('#clCases').innerHTML=id?`<h4>${esc(t('caseClient'))}${isAdmin?` · ${esc(t('owes'))} ${rs(cs.reduce((a,x)=>a+bal(x.id),0))}`:''}</h4><div class="hist">${cs.length?cs.map(x=>`<div><a href="#" data-a="open" data-id="${esc(x.id)}">${esc(ctitle(x))}</a> <span class="meta">${esc(stL(x.status))} · ${fd(x.nextDate)}</span></div>`).join(''):'<div class="meta">—</div>'}</div><button type="button" class="sm" data-a="newCase" style="margin-top:8px">${esc(t('newCase'))}</button>`:''}

E($('#hearForm')).addEventListener('submit',async e=>{e.preventDefault();const f=E(e.target),c=byId(curId);if(!c)return;
  const d=strip(c);d.hearings=[...(d.hearings||[]),{d:f.d.value||TODAY,note:f.note.value.trim(),next:f.next.value}];
  d.nextDate=f.next.value;if(f.stage.value.trim())d.stage=f.stage.value.trim();d.status=f.status.value;
  if(await put('cases',c.id,d)){$('#hearDlg').close();toast(f.next.value?t('nextDate')+': '+fd(f.next.value):t('saved'))}});

function openMoney(kind,id){moneyKind=kind;curId=id;const c=byId(id),f=E($('#moneyForm'));f.reset();f.d.value=TODAY;f.bill.checked=true;
  $('#mTitle').textContent=kind==='pay'?t('addFee').replace('+','').trim():kind==='exp'?t('addExp').replace('+','').trim():t('addInst').replace('+','').trim();
  $('#mModeL').style.display=kind==='pay'?'':'none';$('#mBillL').style.display=kind==='exp'?'':'none';
  if(kind==='inst')f.d.value=addDays(TODAY,30);
  $('#mCase').textContent=ctitle(c)+' · '+t('balance')+' '+rs(bal(id));$('#moneyDlg').showModal()}
E($('#moneyForm')).addEventListener('submit',async e=>{e.preventDefault();const f=E(e.target),id=curId,amt=+f.amt.value||0;if(!amt){f.amt.focus();return}
  const fz=strip(F(id));const item={d:f.d.value||TODAY,amt,note:f.note.value.trim()};let key='payments';
  if(moneyKind==='pay'){item.mode=f.mode.value;const y=item.d.slice(0,4);const n=allPays().filter(p=>(p.rno||'').startsWith('MLA-'+y)).map(p=>+p.rno.split('-')[2]||0);item.rno='MLA-'+y+'-'+pad4(Math.max(0,...n)+1)}
  else if(moneyKind==='exp'){key='expenses';item.bill=f.bill.checked}else key='plan';
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
  case 'hear':{curId=id;const c=byId(id),f=E($('#hearForm'));f.reset();f.d.value=c.nextDate&&c.nextDate<=TODAY?c.nextDate:TODAY;f.stage.value=c.stage||'';f.status.value=c.status||'Active';$('#hCase').textContent=ctitle(c)+' · '+cname(c);$('#hearDlg').showModal();break}
  case 'pay':openMoney('pay',id);break;case 'exp':openMoney('exp',id);break;case 'inst':openMoney('inst',id);break;
  case 'receipt':receipt(id,i);break;
  case 'rmItem':{if(!el.dataset.sure){el.dataset.sure=1;el.textContent=t('tapAgain');break}const fz=strip(F(curId)),k=el.dataset.k;(fz[k]||[]).splice(i,1);if(await put('fees',curId,fz))toast(t('deleted'));break}
  case 'dlDone':{const c=byId(id);const d=strip(c);if(d.deadlines&&d.deadlines[i]){d.deadlines[i].done=true;if(await put('cases',id,d))toast(t('done'))}break}
  case 'addDl':$('#dlRows').insertAdjacentHTML('beforeend',dlRow({}));break;
  case 'rmDl':el.closest('.dlrow').remove();break;
  case 'viewDoc':viewDoc(i);break;
  case 'upload':$('#fileIn').value='';$('#fileIn').click();break;
  case 'delDoc':{if(!el.dataset.sure){el.dataset.sure=1;el.textContent=t('tapAgain');break}const c=byId(curId),d=strip(c),doc=(d.docs||[])[i];if(!doc)break;d.docs.splice(i,1);if(await put('cases',curId,d)){try{await idbDel('files',doc.id)}catch(x){}toast(t('deleted'))}break}
  case 'delCase':{if(!el.dataset.sure){el.dataset.sure=1;el.textContent=t('tapAgain');break}const cid=curId;if(await del('cases',cid)){if(fees[cid]&&isAdmin)await del('fees',cid);$('#detDlg').close();curId=null;toast(t('deleted'))}break}
  case 'delClient':{if(!el.dataset.sure){el.dataset.sure=1;el.textContent=t('tapAgain');break}if(curClient&&await del('clients',curClient)){$('#clientDlg').close();curClient=null;toast(t('deleted'))}break}
  case 'calPrev':case 'calNext':{const [y,m]=calM.split('-').map(Number);const d=new Date(y,m-1+(a==='calNext'?1:-1),1);calM=iso(d).slice(0,7);render();break}
  case 'calDay':calDay=el.dataset.d;if(calDay.slice(0,7)!==calM)calM=calDay.slice(0,7);render();break;
  case 'causePdf':causeList('pdf');break;case 'causeXls':causeList('xlsx');break;
  case 'backup':backup();break;
  }
});
$('#fileIn').addEventListener('change',async e=>{const file=e.target.files[0];if(!file||!S.key||!curId)return;
  if(file.size>25*1024*1024){toast('File over 25 MB');return}toast(t('uploading'));
  try{const id='f'+newId();const o=await enc(S.key,new Uint8Array(await file.arrayBuffer()));o.type=file.type||'application/octet-stream';await idbPut('files',id,o);
    const c=byId(curId),d=strip(c);d.docs=[...(d.docs||[]),{id,name:file.name,d:TODAY,size:file.size}];if(await put('cases',curId,d))toast(t('saved'))}
  catch(x){toast('Could not store file — device storage may be full')}});
async function viewDoc(i){const c=byId(curId);const doc=c&&(c.docs||[])[i];if(!doc)return;
  try{const o=await idbGet('files',doc.id);if(!o){toast('File missing on this device');return}const blob=new Blob([await dec(S.key,o)],{type:o.type});const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';if(!/^image\/|pdf/.test(o.type))a.download=doc.name;document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(url)},60000)}catch(x){toast('Could not open file')}}
document.addEventListener('input',e=>{const id=e.target.id;if(id==='q'||id==='cq'){ui[id]=e.target.value;const p=e.target.selectionStart;render();const n=$('#'+id);n.focus();try{n.setSelectionRange(p,p)}catch(x){}}});
document.addEventListener('change',e=>{if(e.target.id==='f'){ui.f=e.target.value;render()}if(e.target.id==='causeD')ui.cause=e.target.value});

/* ---------- settings view ---------- */
const daysSince=d=>d?Math.floor((new Date(TODAY+'T00:00')-new Date(d+'T00:00'))/864e5):Infinity;
function backupNote(){if(!cases.length)return '';const n=daysSince(settings.lastBackup);if(n<7)return '';return `<div class="note">${esc(t('lastBackup'))}: <b>${settings.lastBackup?fd(settings.lastBackup):esc(t('never'))}</b> · <button class="sm" type="button" data-a="encBackup">${esc(t('backupNow'))}</button></div>`}
function vSettings(){
  const al=settings.autoLock||5;
  return `<div class="panel"><h3>${esc(t('security'))}</h3>
  <form id="pwForm" class="g2" autocomplete="off"><label><span>${esc(t('oldPass'))}</span><input type="password" name="o" autocomplete="current-password"></label><label><span>${esc(t('newPass'))}</span><input type="password" name="n" autocomplete="new-password"></label><label><span>${esc(t('confirmPass'))}</span><input type="password" name="c" autocomplete="new-password"></label><div style="align-self:end"><button class="pri" type="submit">${esc(t('changePass'))}</button></div></form>
  <div class="bar" style="margin:14px 0 0"><label class="chk" style="gap:10px">${esc(t('autoLock'))}<select id="autoLock" style="width:auto">${[1,5,15,30].map(m=>`<option value="${m}" ${m===al?'selected':''}>${m} ${esc(t('minutes'))}</option>`).join('')}</select></label><button class="sm" type="button" data-a="lockNow">${esc(t('lockNow'))}</button></div></div>
  <div class="panel"><h3>${esc(t('backup'))}</h3><p class="meta">${esc(t('backupHelp'))}</p><p>${esc(t('lastBackup'))}: <b>${settings.lastBackup?fd(settings.lastBackup):esc(t('never'))}</b></p>
  <div class="acts"><button class="pri" type="button" data-a="encBackup">${esc(t('backupNow'))}</button><button type="button" data-a="restoreStart">${esc(t('restore'))}</button><button type="button" data-a="backup">${esc(t('exportExcel'))}</button></div></div>
  <div class="panel"><h3>${esc(t('device'))}</h3><p class="meta" id="storeInfo"></p><p class="meta">${esc(t('installHint'))}</p></div>
  <div class="panel"><h3 class="danger">${esc(t('erase'))}</h3><p class="meta">${esc(t('eraseHelp'))}</p><button type="button" class="ghost danger" data-a="eraseStart">${esc(t('erase'))}</button></div>`;
}
async function storeInfo(){const el=$('#storeInfo');if(!el||!navigator.storage||!navigator.storage.estimate)return;try{const e=await navigator.storage.estimate();const p=navigator.storage.persisted?await navigator.storage.persisted():false;el.textContent=`${t('storageUsed')}: ${(e.usage/1048576).toFixed(1)} MB · ${p?t('persistOn'):t('persistOff')}`}catch(x){}}

/* ---------- backup / restore ---------- */
const pack=o=>({iv:b64(o.iv),ct:b64(o.ct),...(o.type?{type:o.type}:{})}),unpack=o=>({iv:unb64(o.iv),ct:unb64(o.ct),...(o.type?{type:o.type}:{})});
async function encBackup(){
  if(!S.key)return;await saving;
  const meta=await idbGet('kv','meta'),state=await idbGet('kv','state'),keys=await idbKeys('files');
  const files=[];for(const k of keys){const o=await idbGet('files',k);if(o)files.push({id:k,...pack(o)})}
  const out={app:'mla-diary',v:1,created:new Date().toISOString(),meta:{salt:b64(meta.salt),ver:pack(meta.ver)},state:pack(state),files};
  await saveFile('MLA-Diary-backup-'+TODAY+'.json',JSON.stringify(out));
  settings.lastBackup=TODAY;await persist();render();toast(t('backupMade'));
}
async function doRestore(file,pass){
  let o;try{o=JSON.parse(await file.text())}catch(x){throw new Error(t('badFile'))}
  if(!o||o.app!=='mla-diary'||!o.meta||!o.state)throw new Error(t('badFile'));
  const meta={salt:unb64(o.meta.salt),ver:unpack(o.meta.ver)};
  const key=await deriveKey(pass,meta.salt);
  try{await dec(key,meta.ver)}catch(x){throw new Error(t('wrongPass'))}
  const st=unpack(o.state);const data=await decJ(key,st);
  await idbClear('files');for(const f of o.files||[])await idbPut('files',f.id,unpack(f));
  await idbPut('kv','meta',meta);await idbPut('kv','state',st);
  S.key=key;S.meta=meta;load_(data);
}
function load_(d){clients=d.clients||[];cases=d.cases||[];fees=d.fees||{};settings=d.settings||{}}

/* ---------- lock ---------- */
let idleT=null,hiddenAt=0,fails=0,waitUntil=0;
function bump(){if(!S.key)return;clearTimeout(idleT);idleT=setTimeout(lock,(settings.autoLock||5)*60000)}
['pointerdown','keydown','touchstart','scroll'].forEach(ev=>document.addEventListener(ev,bump,{passive:true}));
document.addEventListener('visibilitychange',()=>{if(document.hidden)hiddenAt=Date.now();else if(S.key&&hiddenAt&&Date.now()-hiddenAt>Math.min(2,settings.autoLock||5)*60000)lock()});
function lock(){S.key=null;clients=[];cases=[];fees={};curId=null;curClient=null;$$('dialog').forEach(d=>{if(d.open)d.close()});$('#view').innerHTML='';clearTimeout(idleT);showLock()}
async function showLock(){
  const meta=await idbGet('kv','meta').catch(()=>null);S.meta=meta||null;const setup=!meta;
  const f=E($('#lockForm'));f.reset();$('#lkErr').textContent='';
  $('#lkSub').textContent=setup?t('setupSub'):t('unlockSub');
  $('#lkL1').textContent=setup?t('newPass'):t('password');
  $('#lkC').style.display=setup?'':'none';$('#lkWarn').textContent=setup?t('passWarn'):'';
  $('#lkBtn').textContent=setup?t('setPass'):t('unlock');$('#lkErase').style.display=setup?'none':'';
  f.p1.setAttribute('autocomplete',setup?'new-password':'current-password');
  $('#lock').hidden=false;$('#appWrap').hidden=true;setTimeout(()=>f.p1.focus(),50);
}
async function opened(){
  $('#lock').hidden=true;$('#appWrap').hidden=false;view='diary';applyLang();bump();
  try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist()}catch(x){}
  load(LIB.pdf).then(()=>load(LIB.at)).catch(()=>{});
}
$('#lockForm').addEventListener('submit',async e=>{e.preventDefault();const f=E(e.target),err=$('#lkErr');err.textContent='';
  const p1=f.p1.value;
  if(!S.meta){if(p1.length<6){err.textContent=t('passShort');return}if(p1!==f.p2.value){err.textContent=t('passMismatch');return}
    $('#lkBtn').disabled=true;try{const salt=crypto.getRandomValues(new Uint8Array(16));const key=await deriveKey(p1,salt);const ver=await enc(key,te.encode('mla-ok'));
      await idbPut('kv','meta',{salt,ver});S.key=key;S.meta={salt,ver};load_({});settings.created=TODAY;await persist();opened()}catch(x){err.textContent='This browser cannot store data here. Use Safari or Chrome.'}finally{$('#lkBtn').disabled=false}return}
  if(Date.now()<waitUntil){err.textContent=t('waitTry');return}
  $('#lkBtn').disabled=true;
  try{const key=await deriveKey(p1,S.meta.salt);await dec(key,S.meta.ver);S.key=key;fails=0;const st=await idbGet('kv','state');load_(st?await decJ(key,st):{});opened()}
  catch(x){fails++;if(fails>=5){waitUntil=Date.now()+30000;fails=0}err.textContent=t('wrongPass')}finally{$('#lkBtn').disabled=false}
});
document.addEventListener('submit',async e=>{if(e.target.id!=='pwForm')return;e.preventDefault();const f=E(e.target);
  if(f.n.value.length<6){toast(t('passShort'));return}if(f.n.value!==f.c.value){toast(t('passMismatch'));return}
  try{const old=await deriveKey(f.o.value,S.meta.salt);await dec(old,S.meta.ver)}catch(x){toast(t('wrongPass'));return}
  toast(t('working'));
  try{const salt=crypto.getRandomValues(new Uint8Array(16)),key=await deriveKey(f.n.value,salt);
    for(const k of await idbKeys('files')){const o=await idbGet('files',k);const n=await enc(key,await dec(S.key,o));n.type=o.type;await idbPut('files',k,n)}
    const ver=await enc(key,te.encode('mla-ok'));await idbPut('kv','meta',{salt,ver});S.meta={salt,ver};S.key=key;await persist();f.reset();toast(t('passChanged'))}
  catch(x){toast('Could not change password')}
});
document.addEventListener('change',e=>{if(e.target.id==='autoLock'){settings.autoLock=+e.target.value;persist();bump()}});
$('#restoreForm').addEventListener('submit',async e=>{e.preventDefault();const f=E(e.target),file=$('#restoreFile').files[0],err=$('#rsErr');err.textContent='';
  if(!file){err.textContent=t('badFile');return}
  $('#rsBtn').disabled=true;try{await doRestore(file,f.rp.value);$('#restoreDlg').close();toast(t('restored'));opened()}catch(x){err.textContent=x.message||t('badFile')}finally{$('#rsBtn').disabled=false}});
$('#eraseForm').addEventListener('submit',async e=>{e.preventDefault();if(E(e.target).w.value.trim().toUpperCase()!=='ERASE')return;
  await idbClear('files');await idbClear('kv');S.key=null;S.meta=null;load_({});$('#eraseDlg').close();lock();toast(t('erased'))});
document.addEventListener('click',e=>{const el=e.target.closest('[data-a]');if(!el)return;const a=el.dataset.a;
  if(a==='lockNow')lock();
  if(a==='encBackup')encBackup();
  if(a==='restoreStart'){E($('#restoreForm')).reset();$('#rsErr').textContent='';$('#rsWarn').textContent=S.meta?t('restoreWarn'):'';$('#restoreDlg').showModal()}
  if(a==='eraseStart'){E($('#eraseForm')).reset();$('#eraseDlg').showModal()}
  if(a==='langLock'){LANG=LANG==='en'?'ur':'en';try{localStorage.setItem('mla_lang',LANG)}catch(x){}document.documentElement.lang=LANG;document.documentElement.dir=LANG==='ur'?'rtl':'ltr';$$('[data-t]').forEach(x=>x.textContent=t(x.dataset.t));showLock()}
});
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
document.documentElement.lang=LANG;document.documentElement.dir=LANG==='ur'?'rtl':'ltr';$$('[data-t]').forEach(x=>x.textContent=t(x.dataset.t));
showLock();
}
