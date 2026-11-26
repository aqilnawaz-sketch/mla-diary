const V='mla-diary-v5';
const SHELL=['./','index.html','app.js','i18n.js','manifest.webmanifest','icons/icon-180.png','icons/icon-192.png','icons/icon-512.png','icons/favicon-32.png','icons/logo.jpg','icons/mian-law-associates-logo-128.webp','icons/mian-law-associates-logo-256.webp','vendor/jspdf.umd.min.js','vendor/jspdf.plugin.autotable.min.js','vendor/xlsx.full.min.js','config.js','vendor/firebase-app-compat.js','vendor/firebase-auth-compat.js','vendor/firebase-firestore-compat.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  if(u.origin===location.origin){/* app files: network first so updates arrive, cache when offline */
    e.respondWith(fetch(r,{cache:'no-cache'}).then(res=>{if(res.ok){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('index.html'))));return}
  if(/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)){e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{const cp=res.clone();caches.open(V).then(c=>c.put(r,cp));return res})))}
});
