
(function(){
const B=window.BOOKS, byId=Object.fromEntries(B.map(b=>[b.id,b]));
/* Adrese: fiecare carte are /carte/0417-titlu; codul (4 cifre) identifică, titlul e doar de citit. #carte-N vechi merge în continuare. */
const pad4=id=>String(id).padStart(4,'0');
function slug(t){let x=(t||'').toLowerCase().replace(/[ăâ]/g,'a').replace(/î/g,'i').replace(/[șş]/g,'s').replace(/[țţ]/g,'t').replace(/ß/g,'ss').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); if(x.length>60){x=x.slice(0,60); x=x.slice(0,x.lastIndexOf('-')>0?x.lastIndexOf('-'):60);} return x||'carte';}
const bookPath=b=>'/carte/'+pad4(b.id)+'-'+slug(b.title);
function curH(){const m=location.pathname.match(/^\/carte\/0*(\d+)/); return m?'carte-'+m[1]:location.hash.slice(1);}
function nav(h,replace){const b=h.startsWith('carte-')?byId[h.slice(6)]:null; const url=h.startsWith('carte-')?(b?bookPath(b):'/'):('/'+(h?'#'+h:'')); if(url!==location.pathname+location.hash) history[replace?'replaceState':'pushState'](null,'',url); onRoute();}
function onRoute(){route(); gaPage(); statPage();}
const app=document.getElementById('app');
const norm=s=>(s||'').toString().normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const esc=s=>(s||'').toString().replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* imaginile vin doar din folderele noastre (sau placeholderul SVG generat de machetă) */
const PH='data:image/svg+xml;utf8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400"><rect width="300" height="400" fill="#ddd"/></svg>');
const safeUrl=u=>/^https:\/\/[^\s"'<>]+$/.test(u||'');
const safeSrc=s=>(typeof s==='string'&&(/^(covers|pages)\/[\w.-]+\.(webp|jpe?g|png)$/i.test(s)||/^\/_blob\/[0-9a-f]{32}$/.test(s)||s.startsWith('data:image/svg+xml;utf8,')))?s:PH;
const coll=new Intl.Collator('ro');
const PERIODS=[['2020','2020–'+new Date().getFullYear(),y=>y>=2020],['2010','2010–2019',y=>y>=2010&&y<2020],['2000','2000–2009',y=>y>=2000&&y<2010],['1990','1990–1999',y=>y>=1990&&y<2000],['vechi','înainte de 1990',y=>y<1990]];
function prepBook(b){
  /* Numele fotografului pus în fața titlului („Eric Klemm: Silent Warriors”) nu se mai afișează a doua oară:
     titlul se arată fără nume, numele rămâne la autori. Căutarea folosește în continuare titlul întreg. */
  b.full=b.title;
  for(const p of b.people){ const m=b.title.match(new RegExp('^'+p.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*[:.–—-]\\s+(.+)$')); if(m&&!/^\d/.test(m[1])){ b.title=m[1].charAt(0).toUpperCase()+m[1].slice(1); break; } }
  b._t=norm(b.full+' '+b.subtitle); b._p=norm(b.people.join(' ')+' '+(b.contrib||[]).map(c=>c.n).join(' ')); b._g=norm(b.tags.join(' ')+' '+b.category+' '+b.type+' '+(b.series||'')); b._o=norm(b.publisher+' '+String(b.isbn||'').replace(/[-\s]/g,'')); b._d=norm(b.desc);
  const y=+b.year; b._period=y?(PERIODS.find(p=>p[2](y))||[''])[0]:'';
}
B.forEach(prepBook);
/* imaginile ascunse / alese în admin, deja scrise în build */
B.forEach(b=>{ if((b.imgHide&&b.imgHide.length)||b.hovImg||b.gridImg) applyImgs(b); });
/* Cărțile cu coperta de verificat nu apar public; le vedeți în admin, marcate cu roșu, până le confirmați. */
const HID={};
function hideChk(){let n=0; for(let i=B.length-1;i>=0;i--) if(B[i].coverCheck){HID[B[i].id]=B[i]; delete byId[B[i].id]; B.splice(i,1); n++;} return n;}
hideChk();
let SELECTIONS=[
  {id:'femei-fotografe',title:'Femei în fotografie',sub:'De la Julia Margaret Cameron la Nan Goldin',ids:['235','95','193','175','278','395','296','510','63']},
  {id:'bucuresti',title:'București, fotografiat',sub:'Orașul văzut de patru fotografi',ids:['223','78','179','283']},
  {id:'fotografie-romaneasca',title:'Fotografie românească',sub:'Albume apărute în România',ids:['168','385','227','522','524','501','63','96','283']},
  {id:'cum-citim',title:'Cum citim o fotografie',sub:'Istorie, teorie și eseuri',ids:['376','17','320','429','309','96']},
  {id:'portret',title:'Portretul',sub:'Chipuri, de la studio la stradă',ids:["227", "418", "63", "364", "154", "332", "395", "87", "453", "264"]},
  {id:'moda',title:'Moda în fotografie',sub:'Albume de modă și fotografi de modă',ids:["348", "177", "37", "245", "432", "229", "450", "249"]},
  {id:'strada',title:'Pe stradă',sub:'Street photography',ids:["193", "300", "76", "113", "27"]},
  {id:'invata',title:'Învață fotografia',sub:'Manuale și ghiduri practice',ids:["101", "418", "421", "107", "403", "2", "345", "336", "428"]},
];
const selCovers=(s,avoid)=>{const c=s.ids.filter(i=>!avoid.includes(i)).slice(0,3); for(const i of s.ids){if(c.length>=3)break; if(!c.includes(i))c.push(i);} return c;};
const selClean=()=>SELECTIONS.forEach(s=>{if(!s.all) s.all=s.ids.slice(); s.ids=s.all.filter(i=>byId[i]);}); selClean();
/* Meet the Book: cartea prezentată săptămâna aceasta. when/guest rămân goale până le completezi. */
/* Meet the Book: prezentările viitoare, în ordinea datei. Cele trecute dispar singure din banda de sus. */
const EVENT_KINDS=['Meet the Book','Seară de film','Curs','Workshop','Club de carte','Expoziție','Târg','Prezentare','Artist talk'];
/* Panourile de pe prima pagină vin din tabul „Panouri” (admin). La build se pune aici o copie;
   pe site se cere și varianta la zi, ca schimbările din admin să apară fără republicare. */
/* Panourile vin doar din admin (?api=panouri). Nu mai punem o copie în pagină: ar arăta panouri vechi o clipă.
   Ce a primit vizitorul ultima dată stă în browser și se arată direct la vizita următoare; altfel zona așteaptă, goală. */
const PKEY='bib.panels';
let MEETS=[], MEETS_OK=false;
try{const c=JSON.parse(localStorage.getItem(PKEY)||'null'); if(c&&Array.isArray(c.p)&&Date.now()-c.t<14*864e5){MEETS=c.p; MEETS_OK=true;}}catch(e){}
const PANELS_API='https://script.google.com/macros/s/AKfycbzcbEAfbJQsOc1FqoTACVsaCqBf3NV4mTPR05FRSayUBGqtyTwwyEq32LUA2gaSXm0_4w/exec';
const todayISO=()=>{const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
/* vizibil: pornit, în fereastra de afișare (dacă are una), altfel până se termină evenimentul */
const meetVis=m=>{const d=todayISO(); if(m.active===false) return false; if(m.from&&m.from>d) return false; if(m.to) return m.to>=d; return !m.date||(m.end||m.date)>=d;};
const WEEK='Cartea săptămânii';
const NEWK='Cărți noi';
const newPick=()=>MEETS.filter(m=>m.kind===NEWK&&meetVis(m)&&(m.books||[]).some(i=>byId[i])).sort((a,b)=>(b.from||'').localeCompare(a.from||''))[0];
const weekPick=()=>MEETS.filter(m=>m.kind===WEEK&&meetVis(m)&&(m.books||[]).some(i=>byId[i])).sort((a,b)=>(b.from||'').localeCompare(a.from||''))[0];
/* toate panourile stau în același carusel; cartea săptămânii intră a doua, după primul eveniment */
const upcoming=()=>{const ok=m=>meetVis(m)&&m.kind!==SUGK&&(m.kind!==WEEK&&m.kind!==NEWK||(m.books||[]).some(i=>byId[i]));
  const L=MEETS.filter(m=>ok(m)&&m.kind!==WEEK).sort((a,b)=>(a.date||a.from||'').localeCompare(b.date||b.from||''));
  const w=weekPick(); if(w) L.splice(Math.min(1,L.length),0,w); return L;};
/* Apps Script răspunde uneori foarte încet (pornire la rece); așteptăm până la 30 s și mai încercăm o dată.
   Răspunsul bun se ține în browser 14 zile și se aplică imediat la vizita următoare, până vine cel nou. */
const apiOK=()=>/^https?:/.test(PANELS_API)&&/^https?:$/.test(location.protocol)&&!!window.fetch;
function apiGet(q,tries){
  tries=tries==null?2:tries;
  const ctl=window.AbortController?new AbortController():null; const tm=setTimeout(()=>ctl&&ctl.abort(),30000);
  return fetch(PANELS_API+'?api='+q,{signal:ctl&&ctl.signal}).then(r=>{clearTimeout(tm); return r.ok?r.json():null;})
    .catch(e=>{clearTimeout(tm); if(tries>1) return new Promise(res=>setTimeout(res,2500)).then(()=>apiGet(q,tries-1)); throw e;});
}
const cacheGet=k=>{try{const c=JSON.parse(localStorage.getItem(k)||'null'); return c&&Date.now()-c.t<14*864e5?c.v:null;}catch(e){return null;}};
const cachePut=(k,v)=>{try{localStorage.setItem(k,JSON.stringify({t:Date.now(),v:v}));}catch(e){}};
const panelsGiveUp=()=>{if(!MEETS_OK){MEETS_OK=true; const h=curH(); if(!/^(admin|carte-|despre|lista)/.test(h)) renderHome(window.scrollY);}};
/* Un singur apel (?api=tot) aduce panourile, selecțiile și cărțile editate: trei apeluri în paralel se blocau des. */
function liveAll(){
  if(!apiOK()) return;
  const cs=cacheGet('bib.selectii'); if(cs) applySel(cs);
  const cb=cacheGet('bib.carti'); if(cb) applyBooks(cb);
  apiGet('tot').then(j=>{
    if(!j){panelsGiveUp(); return;}
    applyPanels(j);
    if(Array.isArray(j.selections)&&j.selections.length){cachePut('bib.selectii',j); applySel(j);}
    if(Array.isArray(j.books)){cachePut('bib.carti',j); applyBooks(j);}
  }).catch(panelsGiveUp);
}
function applyPanels(j){
    if(!j||!Array.isArray(j.panels)){panelsGiveUp(); return;}
    const ok=s=>typeof s==='string'?s.slice(0,600):'', dt=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'')?s:'';
    const next=j.panels.map(p=>({id:ok(p.id),active:p.active!==false,kind:ok(p.kind)||'Eveniment',title:ok(p.title),guest:ok(p.guest),when:ok(p.when),text:ok(p.text),
      date:dt(p.date),end:dt(p.end),from:dt(p.from),to:dt(p.to),logo:LOGOS[p.logo]?p.logo:'',books:(Array.isArray(p.books)?p.books:[]).map(String).filter(x=>/^\d+$/.test(x))}));
    try{localStorage.setItem(PKEY,JSON.stringify({t:Date.now(),p:next}));}catch(e){}
    const was=MEETS_OK; MEETS_OK=true;
    if(was&&JSON.stringify(next)===JSON.stringify(MEETS)) return;
    MEETS=next; const h=curH(); if(!/^(admin|carte-|despre|lista)/.test(h)){meetIdx=0; renderHome(window.scrollY);}
}
/* Fișele schimbate în admin vin la zi din tabel (prin ?api=tot): doar cărțile atinse în admin, câmpurile editate.
   Copia din build rămâne rezerva; pozele rămân cele din build. */
/* Imaginile alese în admin: unele se pot ascunde (nu și coperta), iar imaginea de la mouse se poate fixa. */
/* Coperta aleasă în admin poate fi oricare dintre imaginile cărții: ea trece prima, iar cea veche rămâne în galerie (și se poate ascunde). */
function setCover(b,src){
  const L=b._imgs||b.images; const k=L.findIndex(im=>im.src===src);
  if(k>0){ const im=L.splice(k,1)[0]; if(L[0]&&L[0].cap==='Coperta') L[0].cap='Coperta (varianta anterioară)'; im.cap='Coperta'; L.unshift(im); }
  else if(k<0&&L[0]){ L[0]=Object.assign({},L[0],{src}); }
  b.cover=L[0].src; b.cw=L[0].w; b.ch=L[0].h; if(b._imgs) b.images=b._imgs;
}
function applyImgs(b){
  if(!b._imgs){ b._imgs=b.images; b._hov0=b.hov||0; }
  const hide=b.imgHide||[];
  let ims=b._imgs.filter((im,i)=>i===0||!hide.includes(im.src));
  const ints=ims.filter(im=>/^Interior · \d+ din \d+$/.test(im.cap||''));
  ims=ims.map(im=>{const k=ints.indexOf(im); return k>=0?Object.assign({},im,{cap:'Interior · '+(k+1)+' din '+ints.length}):im;});
  b.images=ims;
  let h=b.hovImg?ims.findIndex(im=>im.src===b.hovImg&&!im.ext):-1;
  if(h<1){ const o=b._imgs[b._hov0]; h=o?ims.findIndex(im=>im.src===o.src):-1; }
  b.hov=h>0?h:0;
  /* imaginea din grilă aleasă în admin (implicit coperta); pe fișa cărții prima rămâne coperta */
  const g=b.gridImg?ims.findIndex(im=>im.src===b.gridImg):-1;
  b.g=g>0?ims[g]:null;
}
const gImg=b=>b.g?{src:b.g.src,w:b.g.w,h:b.g.h,cut:false}:{src:b.cover,w:b.cw,h:b.ch,cut:b.cut};
/* Selecțiile vin din foaia „Selecții” (prin ?api=tot), în ordinea de acolo; copia din build rămâne rezerva. */
function applySel(j){
    if(!j||!Array.isArray(j.selections)||!j.selections.length) return;
    const ok=s=>typeof s==='string'?s.slice(0,200):'';
    const next=j.selections.map((x,k)=>({id:ok(x.id).replace(/[^a-z0-9-]/g,''),title:ok(x.title),sub:ok(x.sub),all:(Array.isArray(x.ids)?x.ids:[]).map(String).filter(i=>/^\d+$/.test(i)),ids:(Array.isArray(x.ids)?x.ids:[]).map(String).filter(i=>/^\d+$/.test(i)&&byId[i]),order:k+1})).filter(x=>x.id&&x.title&&x.ids.length);
    if(!next.length||JSON.stringify(next)===JSON.stringify(SELECTIONS)) return;
    SELECTIONS=next; selClean();
    const h=curH(); if(st.sel&&!SELECTIONS.find(x=>x.id===st.sel)) st.sel=null;
    if(!/^(admin|carte-|despre|lista)/.test(h)) renderHome(window.scrollY);
}
function applyBooks(j){
    if(!j||!Array.isArray(j.books)) return;
    const S=v=>typeof v==='string'?v.slice(0,6000):(typeof v==='number'?String(v):'');
    const L=v=>Array.isArray(v)?v.map(S).filter(Boolean).slice(0,300):[];
    const KEYS=['title','subtitle','people','contrib','publisher','place','year','edition','series','vol','isbn','lang','type','category','tags','shelf','pages','dim','binding','desc','coverCheck','video','imgHide','hovImg','gridImg'];
    const dimA=v=>{if(Array.isArray(v)) return v.slice(0,2).map(Number).filter(n=>n>0); const m=String(v||'').replace(',','.').replace(',','.').match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i); return m?[parseFloat(m[1]),parseFloat(m[2])]:[];};
    const clean=(k,v)=>k==='dim'?dimA(v):(k==='people'||k==='lang'||k==='tags')?L(v):k==='contrib'?(Array.isArray(v)?v.filter(c=>c&&c.n).slice(0,400).map(c=>({n:S(c.n),r:S(c.r)})):[]):k==='imgHide'?L(v).filter(x=>/^(covers|pages)\/[\w.-]+$/.test(x)):k==='hovImg'?(/^pages\/[\w.-]+$/.test(S(v))?S(v):''):k==='gridImg'?(/^(covers|pages)\/[\w.-]+$/.test(S(v))?S(v):''):k==='coverCheck'?v===true:k==='video'?(Array.isArray(v)?v.filter(x=>x&&/^[\w-]{11}$/.test(x.yt||'')).map(x=>({yt:x.yt})):[]):S(v);
    let ch=false;
    j.books.forEach(r=>{
      const id=String(r&&r.id||''); if(!/^\d+$/.test(id)) return;
      const ed=Array.isArray(r.edited)?r.edited:[]; let b=byId[id];
      /* o carte ascunsă pentru copertă revine dacă în admin s-a scos marcajul */
      if(!b&&HID[id]&&r.stare==='Publicată'){b=HID[id]; delete HID[id]; B.push(b); byId[id]=b; ch=true;}
      if(r.stare!=='Publicată'){ if(b&&ed.includes('stare')){B.splice(B.indexOf(b),1); delete byId[id]; ch=true;} return; }
      const f=r.fields||{};
      if(b){ const before=JSON.stringify(b); b.title=b.full; ed.forEach(k=>{ if(KEYS.includes(k)&&(k in f)) b[k]=clean(k,f[k]); });
        if(ed.includes('cover')&&/^(covers|pages)\/[\w.-]+\.(webp|jpe?g|png)$/i.test(S(f.cover))&&b.cover!==S(f.cover)) setCover(b,S(f.cover)); if(ed.includes('cover')||ed.includes('imgHide')||ed.includes('hovImg')||ed.includes('gridImg')) applyImgs(b); prepBook(b); if(JSON.stringify(b)!==before) ch=true; }
      else if(ed.includes('stare')||ed.includes('*')){
        const nb={id:id,related:[],editor:''}; KEYS.forEach(k=>nb[k]=clean(k,f[k]));
        const cv=safeSrc(S(f.cover))!==PH?S(f.cover):'';
        nb.cover=cv||PH; nb.cw=300; nb.ch=400; nb.images=[{src:nb.cover,w:300,h:400,cap:'Coperta'}];
        if(!nb.title) return; prepBook(nb); B.push(nb); byId[id]=nb; ch=true;
      }
    });
    if(hideChk()) ch=true;
    if(!ch) return; selClean();
    const h=curH();
    if(h.startsWith('carte-')) renderBook(h.slice(6)); else if(!/^(despre|lista)/.test(h)) renderHome(window.scrollY);
}
let meetIdx=0, meetTimer=null;
/* Grupuri mari: tot ce e periodic sau tipăritură mică merge la „Reviste și zine-uri”. */
const PERIODIC=new Set(['Revistă','Zine','Fanzine','Ziar','Carte poștală','Tipăritură']);
const GROUPS=[['toate','Toate'],['carti','Cărți'],['reviste','Reviste și zine-uri']];
const inGroup=(b,g)=>g==='toate'||(g==='reviste'?PERIODIC.has(b.type):!PERIODIC.has(b.type));
/* Lista mea: se ține doar în browserul vizitatorului. */
const LKEY='cdrf-biblioteca-lista'; let mine=[];
try{mine=JSON.parse(localStorage.getItem(LKEY)||'[]').filter(i=>byId[i]);}catch(e){mine=[];}
const saveMine=()=>{try{localStorage.setItem(LKEY,JSON.stringify(mine));}catch(e){} updNav();};
const isMine=id=>mine.includes(id);
function updNav(){const n=document.getElementById('navlist'); if(n) n.innerHTML='Lista mea'+(mine.length?`<span class="n">${mine.length}</span>`:'');}
const BM='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2h8v12l-4-3-4 3z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
const BMF='<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2h8v12l-4-3-4 3z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>';
function toast(html){let el=document.getElementById('toast'); if(!el){el=document.createElement('div');el.id='toast';el.className='toast';el.setAttribute('role','status');document.body.appendChild(el);}
  el.innerHTML=html; el.classList.add('on'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('on'),4200);}
function toggleMine(id){ const add=!isMine(id); if(!add) mine=mine.filter(x=>x!==id); else mine.push(id); saveMine(); if(add) stat('lista',{id:id});
  const n=document.querySelector('#navlist .n'); if(n){n.classList.remove('bump'); void n.offsetWidth; n.classList.add('bump');}
  if(curH()!=='lista') toast(add?`<span>Adăugată în Lista mea · ${mine.length} ${mine.length===1?'carte':'cărți'}</span><button data-list>Vezi lista</button>`:`<span>Scoasă din Lista mea</span>`);
  document.querySelectorAll(`[data-save="${id}"]`).forEach(b=>{const on=isMine(id); b.setAttribute('aria-pressed',on); b.setAttribute('aria-label',on?'Scoate din lista mea':'Adaugă în lista mea'); b.innerHTML=b.classList.contains('savebig')?(on?BMF+'În lista mea':BM+'Adaugă în lista mea'):(on?BMF:BM);});
  if(curH()==='lista') renderList(); }
/* țara se deduce din oraș doar pentru orașe fără ambiguitate; altfel se completează în fișă */
const CITY_COUNTRY={'București':'România','Timișoara':'România','Cluj-Napoca':'România','Iași':'România','Brașov':'România','Sibiu':'România','Chișinău':'Republica Moldova','Londra':'Regatul Unit','Paris':'Franța','Arles':'Franța','New York':'SUA','Chicago':'SUA','Los Angeles':'SUA','San Francisco':'SUA','Kempen':'Germania','Berlin':'Germania','Köln':'Germania','Göttingen':'Germania','München':'Germania','Heidelberg':'Germania','Ostfildern':'Germania','Bologna':'Italia','Milano':'Italia','Roma':'Italia','Amsterdam':'Țările de Jos','Zürich':'Elveția','Tokyo':'Japonia','Varșovia':'Polonia','Praga':'Cehia','Viena':'Austria','Madrid':'Spania','Barcelona':'Spania','Craiova':'România','Onești':'România','Petrila':'România','Seoul':'Coreea de Sud','Melbourne':'Australia','Oslo':'Norvegia'};
const placeOf=b=>[b.place,b.country||CITY_COUNTRY[b.place]].filter(Boolean).join(', ');
/* panourile de tip „Sugestii căutare” nu mai apar pe site */
const SUGK='Sugestii căutare';
const VARB=true;
const PAGE=48;
const st={page:1,pkey:'',fsq:{},side:false,open:{ppl:true,pub:false,tg:false},ppl:new Set(),pub:new Set(),tg:new Set(),group:'toate',q:'',type:new Set(),category:new Set(),lang:new Set(),period:new Set(),tag:null,person:null,series:null,sel:null,sort:'aleator',userSort:false};
const RSEED=Math.floor(Math.random()*2**31);
/* listă de nume în fișă: la liste lungi arătăm primele 8, restul la cerere; toate rămân căutabile */
function nameList(ns,more){const L=n=>`<button class="lnk" data-person="${esc(n)}">${esc(n)}</button>`;const k=8;
  if(ns.length<=k+2) return ns.map(L).join(', ')+(more?' și alții':'');
  return ns.slice(0,k).map(L).join(', ')+`<span class="nmore" hidden>, ${ns.slice(k).map(L).join(', ')}${more?' și alții':''}</span> <button class="lnk nmorebtn" type="button">+ încă ${ns.length-k}${more?' și alții':''}</button>`;}
/* ordinea numerelor dintr-o serie: după numărul revistei sau anul ediției */
function issueKey(b){const m=String(b.vol||b.year||'').match(/\d+/g);if(!m)return 1e12;return m.slice(0,2).reduce((a,n)=>a*10000+ +n,0)*(m.length===1?10000:1);}
function rkey(id){let h=RSEED^2166136261;for(const c of String(id)){h=Math.imul(h^c.charCodeAt(0),16777619);}h^=h>>>13;h=Math.imul(h,0x5bd1e995);return (h^h>>>15)>>>0;}
let lastScroll=0, toastTimer=null, heroObs=null, galIdx=0;

/* un ISBN tastat cu cratime sau spații se caută ca un singur număr */
function words(){return norm(/^[\d\s-]{10,}$/.test(st.q.trim())?st.q.replace(/[-\s]/g,''):st.q).trim().split(/\s+/).filter(Boolean).map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));}
/* relevanță: titlu > autor > teme > editură > descriere */
function score(b,ws){
  let s=0;
  for(const w of ws){
    let m=0; const wb=new RegExp('(^|[^a-z0-9])'+w);
    if(b._t.startsWith(w)) m+=16; else if(wb.test(b._t)) m+=12; else if(b._t.includes(w)) m+=8;
    if(wb.test(b._p)) m+=10; else if(b._p.includes(w)) m+=6;
    if(b._g.includes(w)) m+=5;
    if(b._o.includes(w)) m+=3;
    if(b._d.includes(w)) m+=1.5;
    if(!m) return 0;
    s+=m;
  }
  return s;
}
function filtered(){
  const ws=words();
  let r=B.filter(b=>{
    if(ws.length && !(b._sc=score(b,ws))) return false;
    if(!inGroup(b,st.group)) return false;
    if(st.type.size && !st.type.has(tipF(b.type))) return false;
    if(st.category.size && !st.category.has(b.category)) return false;
    if(st.lang.size && !langF(b.lang).some(l=>st.lang.has(l))) return false;
    if(st.period.size && !st.period.has(b._period)) return false;
    if(st.ppl.size && !b.people.some(p=>st.ppl.has(p))) return false;
    if(st.pub.size && !st.pub.has(b.publisher)) return false;
    if(st.tg.size && !b.tags.some(x=>st.tg.has(x))) return false;
    if(st.tag && !b.tags.includes(st.tag)) return false;
    if(st.person && !b.people.includes(st.person) && !(b.contrib||[]).some(c=>c.n===st.person)) return false;
    if(st.series && b.series!==st.series) return false;
    if(st.publisher && b.publisher!==st.publisher) return false;
    if(st.sel){const s=SELECTIONS.find(x=>x.id===st.sel); if(!s||!s.ids.includes(b.id)) return false;}
    return true;});
  const sort=(!ws.length&&st.sort==='relevanta')?'aleator':st.sort;
  /* Recomandate: întâi cărțile de pe panourile de acum, apoi amestecate */
  if(sort==='aleator'&&st.series){r.sort((a,b)=>issueKey(a)-issueKey(b)||a.title.localeCompare(b.title));}
  else if(sort==='aleator'){const F=new Set(MEETS.filter(meetVis).flatMap(m=>m.books||[])); r.sort((a,b)=>(F.has(b.id)-F.has(a.id))||(rkey(a.id)-rkey(b.id)));}
  if(sort==='relevanta') r.sort((a,b)=>b._sc-a._sc||coll.compare(a.title,b.title));
  if(sort==='titlu') r.sort((a,b)=>coll.compare(a.title,b.title));
  if(sort==='an-nou') r.sort((a,b)=>(+b.year||0)-(+a.year||0)||coll.compare(a.title,b.title));
  if(sort==='an-vechi') r.sort((a,b)=>(+a.year||9999)-(+b.year||9999)||coll.compare(a.title,b.title));
  if(sort==='titlu-za') r.sort((a,b)=>coll.compare(b.title,a.title));
  if(st.sel&&sort==='titlu'&&false) {}
  return r;
}
function hl(text){
  const ws=words(); if(!ws.length) return esc(text);
  const n=norm(text); const marks=new Array(text.length).fill(false);
  ws.forEach(w=>{const re=new RegExp(w,'g'); let m; while((m=re.exec(n))){for(let i=m.index;i<m.index+m[0].length;i++) marks[i]=true; if(!m[0].length) break;}});
  let out='',open=false; for(let i=0;i<text.length;i++){ if(marks[i]&&!open){out+='<mark>';open=true;} if(!marks[i]&&open){out+='</mark>';open=false;} out+=esc(text[i]); } if(open) out+='</mark>'; return out;
}
function card(b,highlight){
  const n=b.images.length-1; const ppl=b.people.slice(0,2).join(', ');
  const m=[b.type,b.year].filter(Boolean).map(esc).join(' · ');
  /* la trecerea mausului arătăm primul interior, nu alte fotografii ale exteriorului (coperta plată, spatele) */
  /* „hov” = interiorul ales pentru trecerea mausului (cel mai plin vizual); altfel primul interior */
  let i2=(b.hov&&b.images[b.hov]&&!b.images[b.hov].ext)?b.images[b.hov]:b.images.slice(1).find(im=>!im.ext);
  const g=gImg(b);
  /* dacă în grilă e altă imagine decât coperta, la hover arătăm coperta (sau imaginea fixată în admin) */
  if(b.g&&(!b.hovImg||!i2||i2.src===g.src)) i2=b.images[0];
  return `<a class="card${i2?' has2':''}${b.coverCheck?' chk':''}" href="${bookPath(b)}" data-id="${b.id}"><div class="shelf"><img class="c1${g.cut?' cutc':''}" src="${safeSrc(g.src)}" alt="Coperta: ${esc(b.title)}" loading="lazy" width="${g.w}" height="${g.h}">${i2?`<img class="c2" src="${safeSrc(i2.src)}" alt="" loading="lazy" width="${i2.w}" height="${i2.h}">`:''}<button class="save" data-save="${b.id}" title="Lista mea: cărțile pe care vrei să le vezi la bibliotecă" aria-pressed="${isMine(b.id)}" aria-label="${isMine(b.id)?'Scoate din lista mea':'Adaugă în lista mea'}">${isMine(b.id)?BMF:BM}</button>${b.images.slice(1).some(im=>!im.ext)?'<span class="pgs" title="Are pagini din interior" aria-label="Are pagini din interior"><i></i><i></i></span>':''}</div><div class="cap">${m?`<div class="m">${m}</div>`:''}<div class="t">${highlight?hl(b.title):esc(b.title)}</div>${ppl?`<div class="p">${highlight?hl(ppl):esc(ppl)}${b.people.length>2?' și alții':''}${b.year?`<span class="yr"> · ${esc(b.year)}</span>`:''}</div>`:(b.year?`<div class="p yr">${esc(b.year)}</div>`:'')}</div></a>`;
}
const TIPS=['Album foto','Carte','Catalog expoziție','Revistă','Alte tipuri'];
const tipF=t=>!t?'':TIPS.includes(t)?t:'Alte tipuri';
const LANGS=['Engleză','Română','Germană','Franceză','Alte limbi'];
const langF=ls=>[...new Set((ls||[]).map(l=>LANGS.includes(l)?l:'Alte limbi'))];
const FACETS=[
  {key:'type',label:'Tip',get:b=>tipF(b.type),order:v=>{const i=TIPS.indexOf(v);return i<0?99:i}},
  {key:'category',label:'Categorie',get:b=>b.category},
  {key:'lang',label:'Limbă',get:b=>langF(b.lang),order:v=>{const i=LANGS.indexOf(v);return i<0?99:i}},
  {key:'ppl',label:'Fotograf / autor',get:b=>b.people,search:true},
  {key:'tg',label:'Temă',get:b=>b.tags,search:true},
  {key:'period',label:'Anul',get:b=>b._period,fmt:v=>(PERIODS.find(p=>p[0]===v)||[0,v])[1],order:v=>PERIODS.findIndex(p=>p[0]===v)},
];
function dd(f){
  const c={}; B.filter(b=>inGroup(b,st.group)).forEach(b=>[].concat(f.get(b)).filter(Boolean).forEach(v=>c[v]=(c[v]||0)+1));
  const set=st[f.key];
  const keys=Object.keys(c).sort((a,b)=>f.order?f.order(a)-f.order(b):coll.compare(a,b));
  const opts=keys.map(v=>`<label><input type="checkbox" data-f="${f.key}" value="${esc(v)}" ${set.has(v)?'checked':''}>${esc(f.fmt?f.fmt(v):v)}</label>`).join('');
  return `<div class="dd"><button type="button" aria-expanded="false" class="${set.size?'on':''}" data-dd="${f.key}">${f.label}${set.size?` <span class="n">${set.size}</span>`:''}<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></button><div class="menu" hidden>${opts}</div></div>`;
}
function sideGroup(f){
  const c={}; B.forEach(b=>[].concat(f.get(b)).filter(Boolean).forEach(v=>c[v]=(c[v]||0)+1));
  const set=st[f.key]; const open=st.open[f.key]||set.size>0;
  const keys=Object.keys(c).sort((a,b)=>f.order?f.order(a)-f.order(b):coll.compare(a,b));
  return `<div class="fg2"><button type="button" class="fh" data-fh="${f.key}" aria-expanded="${open}"><span>${f.label}${set.size?` <span class="n">${set.size}</span>`:''}</span><svg width="12" height="12" viewBox="0 0 10 10" aria-hidden="true"><path d="${open?'M1 3l4 4 4-4':'M3 1l4 4-4 4'}" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></button>
    ${open?`<div class="fb">${f.search?`<input class="fs-q" type="search" placeholder="Caută un nume" data-fsq="${f.key}" value="${esc(st.fsq[f.key]||'')}" aria-label="Caută în ${f.label}">`:''}<div class="fl">${keys.map(v=>`<label data-n="${esc(norm(v))}" ${f.search&&st.fsq[f.key]&&!norm(v).includes(norm(st.fsq[f.key]))&&!set.has(v)?'hidden':''}><input type="checkbox" data-f="${f.key}" value="${esc(v)}" ${set.has(v)?'checked':''}><span>${esc(f.fmt?f.fmt(v):v)}</span></label>`).join('')}</div>${set.size?`<button class="fclr" data-fclr="${f.key}">Șterge</button>`:''}</div>`:''}</div>`;
}
function activeChips(){
  const out=[];
  if(st.sel){const s=SELECTIONS.find(x=>x.id===st.sel); if(s) out.push(['sel',null,'Selecție: '+s.title]);}
  if(st.q) out.push(['q',null,'„'+st.q+'”']);
  FACETS.forEach(f=>st[f.key].forEach(v=>out.push([f.key,v,f.fmt?f.fmt(v):v])));
  if(st.tag) out.push(['tag',null,'Temă: '+st.tag]);
  if(st.person) out.push(['person',null,st.person]);
  if(st.series) out.push(['series',null,'Serie: '+st.series]);
  if(st.publisher) out.push(['publisher',null,'Editura: '+st.publisher]);
  if(!out.length) return '';
  return out.map(([k,v,l])=>`<button class="chip" data-rm="${k}" data-v="${esc(v||'')}" aria-label="Elimină filtrul ${esc(l)}">${esc(l)} <span class="x" aria-hidden="true">✕</span></button>`).join('')+`<button class="linkbtn" data-rm="all">Șterge tot</button>`;
}
const FICON=`<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" stroke-width="1.8" fill="none"/></svg>`;
const nAct=()=>FACETS.reduce((n,f)=>n+st[f.key].size,0);
const ICON=`<svg viewBox="0 0 24 24" fill="none" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`;
function listHeading(){
  if(st.q) return `Rezultate pentru „${esc(st.q)}”`;
  if(st.sel){const s=SELECTIONS.find(x=>x.id===st.sel); if(s) return esc(s.title);}
  if(st.person) return esc(st.person);
  if(st.series) return 'Seria '+esc(st.series);
  if(st.publisher) return esc(st.publisher);
  if(st.tag) return esc(st.tag);
  return 'Toate cărțile';
}
function renderHome(keepScroll){
  const list=filtered(); const years=B.map(b=>+b.year).filter(Boolean);
  const hasQ=!!words().length, narrowed=hasQ||st.sel||st.person||st.tag||st.series||st.publisher;
  app.innerHTML=`
  <div class="intro">
    <div class="facts"><span>Str. Popa Tatu nr. 68, București · consultare pe loc</span></div>
  </div>
  ${narrowed?'':(!MEETS_OK?'<section class="meet band mwait" aria-hidden="true"></section>':(upcoming().length?meetCarousel():''))}
  ${!narrowed?`<section aria-labelledby="h-sel">
    <div class="sec-head"><h2 id="h-sel">Selecții</h2><span class="note">Cărți grupate de echipa bibliotecii</span></div>
    <div class="selrow"><div class="sel-grid">${SELECTIONS.filter(s=>s.show!==false&&s.ids.length).sort((x,y)=>rkey('sel'+x.id)-rkey('sel'+y.id)).reduce((acc,s)=>{acc.push({s,cov:selCovers(s,acc.length?acc[acc.length-1].cov:[])});return acc;},[]).map(({s,cov})=>`<button class="sel" data-sel="${s.id}"><div class="sel-covers">${cov.map(i=>{const g=gImg(byId[i]);return `<img src="${safeSrc(g.src)}"${g.cut?' class="cutc"':''} alt="" loading="lazy">`;}).join('')}</div><div><div class="sel-title">${esc(s.title)}</div><div class="sel-sub">${esc(s.sub)}</div></div></button>`).join('')}</div><div class="scrollbar" aria-hidden="true"><i></i></div></div>
  </section>`:''}
  <section id="toate" aria-labelledby="h-all" style="padding-bottom:0">
    <div class="sec-head"><h2 id="h-all">${listHeading()}</h2>${narrowed?`<button class="linkbtn" data-rm="all">Înapoi la toate cărțile</button>`:''}</div>
    <div class="fstick"><div class="filters">
      <button class="stog" data-side aria-expanded="${st.side}">${VARB?'':FICON}${st.side?'Ascunde coloana':'Autori și teme'}${!st.side&&(st.ppl.size+st.pub.size+st.tg.size)?` <span class="n">${st.ppl.size+st.pub.size+st.tg.size}</span>`:''}${VARB?'<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>':''}</button>
      <button class="fbtn" data-fpanel>${VARB?'':FICON}Filtre${nAct()?` <span class="n">${nAct()}</span>`:''}${VARB?'<svg class="chv" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>':''}</button>
      ${['type','category','lang','period'].map(k=>dd(FACETS.find(f=>f.key===k))).join('')}
      <span class="spacer"></span>
      ${(()=>{const S=[['aleator','Recomandate'],...(hasQ?[['relevanta','Cele mai potrivite']]:[]),['titlu','Titlu A–Z'],['titlu-za','Titlu Z–A'],['an-nou','Cele mai noi'],['an-vechi','Cele mai vechi']]; const cur=(S.find(x=>x[0]===st.sort)||S[0]);
        return `<div class="dd sortdd"><button type="button" aria-expanded="false" data-dd="sort" aria-label="Ordonează: ${cur[1]}"><span class="hide-s sl">Ordonează:</span> ${cur[1]}<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></button><div class="menu" hidden>${S.map(([v,l])=>`<label><input type="radio" name="sortr" value="${v}" ${cur[0]===v?'checked':''}>${l}</label>`).join('')}</div></div>`;})()}
    </div>
    <div class="active">${activeChips()}</div></div>
    <div class="libw${st.side?'':' nofs'}"><aside class="fside" aria-label="Filtre">${['ppl','tg'].map(k=>sideGroup(FACETS.find(f=>f.key===k))).join('')}</aside>
    ${(()=>{const key=JSON.stringify([st.q,st.sort,st.group,st.sel,st.person,st.tag,st.series,st.publisher,...FACETS.map(f=>[...st[f.key]].sort())]); if(key!==st.pkey){st.pkey=key; st.page=1;} const np=Math.max(1,Math.ceil(list.length/PAGE)); if(st.page>np) st.page=np; const show=VARB?list.slice((st.page-1)*PAGE,st.page*PAGE):list;
      return `<div class="grid">${list.length?show.map(b=>card(b,hasQ)).join(''):`<div class="empty">Nicio carte nu se potrivește. <button class="linkbtn" data-rm="all">Șterge filtrele</button></div>`}</div>
      ${VARB&&np>1?`<div class="more"><button type="button" class="morebtn" data-page="${st.page-1}" ${st.page<=1?'disabled':''}><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M7 1 3 5l4 4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>Înapoi</button><span class="sub">Pagina ${st.page} din ${np}</span><button type="button" class="morebtn" data-page="${st.page+1}" ${st.page>=np?'disabled':''}>Următoarele<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="m3 1 4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></button></div>`:''}`;})()}</div>
  </section>`;
  document.title='Biblioteca CdRF';
  {const fs=app.querySelector('.fstick'); if(fs) document.documentElement.style.setProperty('--fsh',fs.offsetHeight+'px');}
  meetStart(); selBar();
  if(keepScroll!==undefined) window.scrollTo(0,keepScroll);
  watchHero();
}
function meetSlide(M,i){
  if(M.kind===WEEK){const b=byId[(M.books||[]).find(x=>byId[x])];
    return `<div class="mslide" data-mi="${i}">
    <div><div class="mk"><b>${esc(WEEK)}</b><span>${esc(M.when||'')}</span></div>
      <h2>${esc(b.title)}</h2>${b.people.length?`<div class="mp">${esc(b.people.slice(0,2).join(', '))}</div>`:''}${M.text?`<p class="mtxt">${esc(M.text)}</p>`:''}
      <div class="mbooks"><span class="ml">${esc([b.type,b.year].filter(Boolean).join(' · '))}</span><button class="mbook" data-id="${b.id}"><b>Vezi cartea</b>${b.shelf?` <span class="msh">raft ${esc(b.shelf)}</span>`:''}</button></div></div>
    <div class="cv"><img src="${safeSrc(b.cover)}"${b.cut?' class="cutc"':''} alt="Coperta: ${esc(b.title)}" width="${b.cw}" height="${b.ch}" data-id="${b.id}"></div></div>`;}
  const bks=(M.books||[]).map(id=>byId[id]).filter(Boolean);
  const head=M.title||M.kind.split(' · ')[0];
  const txt=M.text?`<p class="mtxt">${esc(M.text)}</p>`:'';
  const bk=b=>`<button class="mbook" data-id="${b.id}"><b>${esc(b.title)}</b>${b.people.length?` <span>${esc(b.people.slice(0,2).join(', '))}</span>`:''}${b.shelf?` <span class="msh">raft ${esc(b.shelf)}</span>`:''}</button>`;
  const isMtb=M.kind==='Meet the Book';
  bks.splice(isMtb?1:4); /* Meet the Book: o singură carte; altfel cel mult 4, toate cu copertă */
  const booksHtml=bks.length?(isMtb?`<div class="mbooks"><span class="ml">Cartea prezentată</span>${bk(bks[0])}</div>`
      :`<div class="mbooks"><span class="ml">Din bibliotecă</span>${bks.map(bk).join('')}</div>`)
    :'';
  return `<div class="mslide${bks.length?'':' nobook'}" data-mi="${i}">
    <div><div class="mk">${M.title?`<b>${esc(M.kind)}</b>`:''}<span>${esc(M.when||'')}</span></div>
      <h2>${esc(head)}</h2>${M.guest?`<div class="mp">cu ${esc(M.guest)}</div>`:''}${txt}${booksHtml}${M.logo&&LOGOS[M.logo]?`<img class="mlogo" src="${LOGOS[M.logo].src}" alt="${LOGOS[M.logo].alt}" width="72" height="72" loading="lazy">`:''}</div>
    ${bks.length?`<div class="cv${bks.length>1?' many':''}${bks.length>3?' n4':''}">${bks.slice(0,4).map((b,k)=>`<img src="${safeSrc(b.cover)}" class="${[k?'':'big',b.cut?'cutc':''].filter(Boolean).join(' ')}" alt="Coperta: ${esc(b.title)}" width="${b.cw}" height="${b.ch}" data-id="${b.id}">`).join('')}</div>`:''}</div>`;
}
const LOGOS={afcn:{src:'brand/afcn-t.webp',alt:'Proiect co-finanțat de Administrația Fondului Cultural Național'}};
function meetCarousel(){
  const U=upcoming(); if(meetIdx>=U.length) meetIdx=0;
  return `<section class="meet band" aria-roledescription="carusel" aria-label="Evenimente la CdRF">
    <div class="mtrack">${U.map((M,i)=>meetSlide(M,i)).join('')}</div>
    ${U.length>1?`<div class="mnav"><button class="marr" data-mstep="-1" aria-label="Panoul anterior"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>${U.map((M,i)=>`<button class="mdot" data-mgo="${i}" aria-label="Prezentarea ${i+1}" aria-current="${i===meetIdx}"></button>`).join('')}<button class="marr" data-mstep="1" aria-label="Panoul următor"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button></div>`:''}
  </section>`;
}
function selBar(){const g=document.querySelector('.sel-grid'), bar=document.querySelector('.selrow .scrollbar i'); if(!g||!bar) return;
  const upd=()=>{const vis=g.clientWidth/g.scrollWidth; if(vis>=0.999){bar.parentElement.style.visibility='hidden';return;} bar.parentElement.style.visibility=''; bar.style.width=(vis*100)+'%'; bar.style.left=(g.scrollLeft/g.scrollWidth*100)+'%';};
  g.addEventListener('scroll',upd,{passive:true}); upd();
  const track=bar.parentElement; let dr=null;
  track.addEventListener('pointerdown',e=>{e.preventDefault(); const r=track.getBoundingClientRect(), th=bar.getBoundingClientRect();
    if(e.target!==bar){ const x=(e.clientX-r.left-th.width/2)/r.width; g.scrollTo({left:x*g.scrollWidth,behavior:'smooth'}); return; }
    dr={x:e.clientX,left:g.scrollLeft}; track.classList.add('drag'); track.setPointerCapture(e.pointerId); g.style.scrollSnapType='none';});
  track.addEventListener('pointermove',e=>{ if(!dr) return; const r=track.getBoundingClientRect(); g.scrollLeft=dr.left+(e.clientX-dr.x)/r.width*g.scrollWidth; });
  const end=()=>{ if(!dr) return; dr=null; track.classList.remove('drag'); g.style.scrollSnapType=''; };
  track.addEventListener('pointerup',end); track.addEventListener('pointercancel',end);
}
function meetShow(i){
  const U=upcoming(); if(!U.length) return; meetIdx=(i+U.length)%U.length;
  document.querySelectorAll('.mslide').forEach(s=>s.classList.toggle('on',+s.dataset.mi===meetIdx));
  document.querySelectorAll('.mdot').forEach(d=>d.setAttribute('aria-current',String(+d.dataset.mgo===meetIdx)));
}
function meetStart(){
  clearInterval(meetTimer); meetShow(meetIdx);
  /* pe telefon nu se rotește singur: înălțimea urmează panoul, iar trecerea se face cu degetul */
  if(upcoming().length<2||window.matchMedia('(prefers-reduced-motion:reduce),(max-width:760px)').matches) return;
  meetTimer=setInterval(()=>{const s=document.querySelector('.meet'); if(!s){clearInterval(meetTimer);return;} if(s.matches(':hover')||s.contains(document.activeElement)) return; meetShow(meetIdx+1);},7000);
}
function renderList(){
  const items=mine.map(i=>byId[i]).filter(Boolean).sort((a,b)=>coll.compare(a.shelf||'~',b.shelf||'~')||coll.compare(a.title,b.title));
  const pdate=new Date().toLocaleDateString('ro-RO',{day:'numeric',month:'long',year:'numeric'});
  app.innerHTML=`<div class="list">
    <div class="phead" aria-hidden="true"><img src="brand/logo-negru.png" alt="" width="103" height="40"><span class="plib">Biblioteca CdRF</span><span class="pdate">Lista mea · ${esc(pdate)}</span></div>
    <h1>Lista mea</h1>
    <p class="lead">Cărțile pe care vrei să le vezi la bibliotecă, ordonate după raft. Lista rămâne doar în acest browser.</p>
    ${items.length?`<div class="acts"><button class="pbtn" data-print><span class="hide-s">Tipărește sau salvează ca PDF</span><span class="show-s">Salvează PDF</span></button><button class="linkbtn" data-clearlist>Golește lista</button></div>`:''}
    <div class="litems">${items.length?items.map(b=>`<div class="li"><span class="pchk" aria-hidden="true"></span><div class="r"><small>Raft</small>${esc(b.shelf||'—')}</div><div class="th"><img src="${safeSrc(b.cover)}"${b.cut?' class="cutc"':''} alt="" width="${b.cw}" height="${b.ch}"></div><div><div class="tt"><a href="${bookPath(b)}" data-id="${b.id}">${esc(b.title)}</a></div><div class="pp">${esc([b.people.slice(0,2).join(', '),b.year].filter(Boolean).join(' · '))}</div></div><div class="pdet" aria-hidden="true">${esc(b.publisher||'')}<small>${esc([b.type,(b.lang||[]).map(l=>l.toLowerCase()).join(', ')].filter(Boolean).join(' · '))}</small></div><button class="rm" data-save="${b.id}" aria-pressed="true" aria-label="Scoate din lista mea">Scoate</button></div>`).join(''):`<div class="empty" style="text-align:left">Lista e goală. ${VARB?'Bifează pătratul din colțul unei coperte':`Apasă semnul ${BM.replace('<svg','<svg style="width:14px;height:14px;vertical-align:-2px"')} de pe o copertă`} ca să adaugi cărți.<br><button class="linkbtn" data-back style="margin-top:12px">Mergi la catalog</button></div>`}</div>
    <div class="pfoot" aria-hidden="true"><img class="pmark" src="brand/semn-negru.png" alt="" width="40" height="40"><div><b>Centrul de Resurse în Fotografie</b>Str. Popa Tatu nr. 68, București</div><div><b>Program</b>Luni–Vineri 09–20 · Sâmbătă–Duminică 10–20</div><div><b>Cum funcționează</b>Cărțile se consultă pe loc — cere-le la bibliotecar, după raft.</div><div><b>Catalogul online</b>biblioteca.cdrf.ro</div></div>
  </div>`;
  document.title='Lista mea · Biblioteca CdRF'; watchHero();
}
function watchHero(){
  if(heroObs){heroObs.disconnect();heroObs=null;}
  const pt=document.getElementById('ptitle'); pt.classList.remove('on');
  const h=document.querySelector('.titles h1'); if(!h||!('IntersectionObserver' in window)){pt.textContent='';return;}
  pt.textContent=h.textContent;
  const hh=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hh'))||80;
  heroObs=new IntersectionObserver(([e])=>pt.classList.toggle('on',!e.isIntersecting&&e.boundingClientRect.top<hh),{rootMargin:`-${Math.round(hh)}px 0px 0px 0px`});
  heroObs.observe(h);
}
function openPanel(){
  const draft=Object.fromEntries(FACETS.map(f=>[f.key,new Set(st[f.key])]));
  const p=document.createElement('div'); p.className='fpanel'; p.setAttribute('role','dialog'); p.setAttribute('aria-label','Filtre');
  const count=()=>{const keep=Object.fromEntries(FACETS.map(f=>[f.key,st[f.key]])); FACETS.forEach(f=>st[f.key]=draft[f.key]); const n=filtered().length; FACETS.forEach(f=>st[f.key]=keep[f.key]); return n;};
  const groups=FACETS.map(f=>{const c={}; B.filter(b=>inGroup(b,st.group)).forEach(b=>[].concat(f.get(b)).filter(Boolean).forEach(v=>c[v]=(c[v]||0)+1)); const keys=Object.keys(c).sort((a,b)=>f.order?f.order(a)-f.order(b):coll.compare(a,b));
    const nSel=draft[f.key].size;
    return `<details class="pg" data-pg="${f.key}" ${nSel?'open':''}><summary><span>${f.label}</span><span class="pn">${nSel?nSel:''}</span><svg class="chv" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 3l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></summary><div class="pl">${keys.length>12?`<input type="search" class="pq" data-pq placeholder="Caută în ${esc(f.label.toLowerCase())}" aria-label="Caută în ${esc(f.label)}">`:''}${keys.map(v=>`<label data-v="${esc(norm(f.fmt?f.fmt(v):v))}"><input type="checkbox" data-pf="${f.key}" value="${esc(v)}" ${draft[f.key].has(v)?'checked':''}>${esc(f.fmt?f.fmt(v):v)}</label>`).join('')}</div></details>`;}).join('');
  p.innerHTML=`<div class="sheet"><div class="sh"><b>Filtre</b><button class="x" data-pclose aria-label="Închide filtrele"><svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 3l12 12M15 3 3 15" stroke="currentColor" stroke-width="2"/></svg></button></div><div class="body">${groups}</div><div class="ft"><button class="linkbtn" data-pclear>Șterge tot</button><button class="apply" data-papply>Vezi ${count()} titluri</button></div></div>`;
  const upd=()=>{p.querySelector('[data-papply]').textContent=VARB?(count()?'Vezi cărțile':'Nicio carte'):`Vezi ${count()} ${count()===1?'titlu':'titluri'}`;};
  const close=apply=>{ if(apply){FACETS.forEach(f=>st[f.key]=draft[f.key]); renderHome(0); const el=document.getElementById('toate'); if(el) window.scrollTo({top:el.offsetTop-(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hh'))||80)-8});} p.remove(); document.body.style.overflow=''; };
  p.addEventListener('change',e=>{const i=e.target.closest('[data-pf]'); if(!i) return; const s=draft[i.dataset.pf]; i.checked?s.add(i.value):s.delete(i.value); const pn=i.closest('details').querySelector('.pn'); pn.textContent=s.size||''; upd();});
  p.addEventListener('input',e=>{const q=e.target.closest('[data-pq]'); if(!q) return; const t=norm(q.value.trim()); q.parentNode.querySelectorAll('label[data-v]').forEach(l=>l.hidden=!!t&&!l.dataset.v.includes(t));});
  p.addEventListener('click',e=>{ if(e.target===p) return close(false); const t=e.target.closest('[data-pclose],[data-papply],[data-pclear]'); if(!t) return;
    if(t.matches('[data-pclose]')) close(false); else if(t.matches('[data-papply]')) close(true); else {FACETS.forEach(f=>draft[f.key].clear()); p.querySelectorAll('[data-pf]').forEach(i=>i.checked=false); p.querySelectorAll('.pn').forEach(x=>x.textContent=''); upd();}});
  upd();
  if(VARB){ const btn=document.querySelector('[data-fpanel]'); const hh=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hh'))||80;
    window.scrollBy({top:btn.getBoundingClientRect().top-hh-8,behavior:'instant'}); const r=btn.getBoundingClientRect(); p.classList.add('drop');
    const sh=p.querySelector('.sheet'); sh.style.top=Math.round(r.bottom+6)+'px'; sh.style.left=Math.round(Math.max(16,r.left))+'px';
    sh.style.maxHeight=Math.round(window.innerHeight-r.bottom-22)+'px'; }
  document.body.appendChild(p); document.body.style.overflow='hidden'; p.querySelector('[data-pclose]').focus();
}
/* Pe telefon și tabletă antetul se ascunde la derulare în jos și revine la cea mai mică derulare în sus („sticky on scroll up”). */
(function(){const h=document.querySelector('header.top'), de=document.documentElement; const mq=window.matchMedia('(max-width:1100px)');
  const set=()=>{ de.style.setProperty('--hh',h.getBoundingClientRect().height+'px'); }; set(); if('ResizeObserver' in window) new ResizeObserver(set).observe(h); window.addEventListener('resize',set);
  let ly=window.scrollY, acc=0; const off=v=>de.classList.toggle('hdr-off',v);
  window.addEventListener('scroll',()=>{ if(!mq.matches){off(false); return;} const y=window.scrollY, d=y-ly; ly=y;
    if(y<h.offsetHeight||document.activeElement===document.querySelector('#hsearch input')){off(false); acc=0; return;}
    if(d>0){acc=Math.max(0,acc)+d; if(acc>24) off(true);} else if(d<0){acc=Math.min(0,acc)+d; if(acc<-8) off(false);} },{passive:true});
  window.addEventListener('popstate',()=>off(false));
})();
function refreshList(scrollTop){
  renderHome(scrollTop?0:window.scrollY);
}
function row(title,why,ids){
  ids=[...new Set(ids)].filter(i=>byId[i]).slice(0,6);
  if(!ids.length) return '';
  return `<div class="row"><h3>${title}</h3>${why?`<div class="why">${why}</div>`:''}<div class="grid">${ids.map(i=>card(byId[i])).join('')}</div></div>`;
}
function backLabel(){
  if(st.q) return `Înapoi la rezultate pentru „${esc(st.q)}”`;
  if(st.sel){const s=SELECTIONS.find(x=>x.id===st.sel); if(s) return 'Înapoi la selecția '+esc(s.title);}
  if(st.series) return 'Înapoi la seria '+esc(st.series);
  if(st.publisher) return 'Înapoi la '+esc(st.publisher);
  if(st.person||st.tag||FACETS.some(f=>st[f.key].size)) return 'Înapoi la rezultate';
  return 'Înapoi la toate cărțile';
}
function renderBook(id){
  const b=byId[id]; if(!b){nav('',true);return;}
  if(location.pathname!==bookPath(b)) history.replaceState(null,'',bookPath(b));
  const order=B.slice().sort((x,y)=>coll.compare(x.title,y.title)).map(x=>x.id);
  const k=order.indexOf(id), prev=order[(k-1+order.length)%order.length], next=order[(k+1)%order.length];
  const others=x=>x.id!==id;
  const rows=[]; const shown=new Set();
  const push=(t,w,ids)=>{ids=[...new Set(ids)].filter(i=>i!==id); if(ids.length){rows.push(row(t,w,ids)); ids.slice(0,6).forEach(i=>shown.add(i));}};
  b.people.forEach(p=>{const ids=B.filter(x=>others(x)&&x.people.includes(p)).map(x=>x.id); if(ids.length) push(`Tot cu <button data-person="${esc(p)}">${esc(p)}</button>`,'Alte cărți din bibliotecă la care a contribuit',ids);});
  if(b.series){const ids=B.filter(x=>others(x)&&x.series===b.series).map(x=>x.id); if(ids.length) push(`Din aceeași serie: <button data-series="${esc(b.series)}">${esc(b.series)}</button>`,'',ids);}
  SELECTIONS.filter(s=>s.ids.includes(id)).forEach(s=>push(`Din selecția <button data-sel="${s.id}">${esc(s.title)}</button>`,esc(s.sub),s.ids));
  const tag=b.tags.find(t=>B.some(x=>others(x)&&x.tags.includes(t)&&!shown.has(x.id)));
  if(tag) push(`Aceeași temă: <button data-tag="${esc(tag)}">${esc(tag)}</button>`,'',B.filter(x=>others(x)&&x.tags.includes(tag)).map(x=>x.id));
  push('Ți-ar putea plăcea și','Alese după teme și descrieri apropiate',b.related.filter(i=>!shown.has(i)));
  if(b.shelf) push(`Pe același raft, ${esc(b.shelf)}`,'Cărți pe care le găsești lângă ea în bibliotecă',B.filter(x=>others(x)&&x.shelf===b.shelf&&!shown.has(x.id)).map(x=>x.id));
  const nf=x=>String(x).replace('.',',');
  const tech=[
    ['Fotograf / autor',nameList(b.people)],
    ...Object.entries((b.contrib||[]).reduce((o,c)=>{(o[c.r]=o[c.r]||[]).push(c.n);return o;},{})).map(([r,ns])=>[esc(r),nameList(ns,(b.contribMore||[]).includes(r))]),
    ['Editura',b.publisher?`<button class="lnk" data-pub="${esc(b.publisher)}">${esc(b.publisher)}</button>`:''],['Locul apariției',esc(placeOf(b))],['Anul',esc(b.year)],['Ediția',esc(b.edition)],
    ['Serie',b.series?`<button class="lnk" data-series="${esc(b.series)}">${esc(b.series)}</button>${b.vol?' · '+esc(b.vol):''}<br><button class="lnk" data-series="${esc(b.series)}">Toate numerele din serie</button>`:''],
    ['Limba',esc(b.lang.join(', '))],['Coordonare',esc(b.editor)],
    ['Pagini',b.pages?esc(b.pages):''],['Legătura',esc(b.binding)],['Dimensiuni',b.dim&&b.dim.length?`${nf(b.dim[0])} × ${nf(b.dim[1])} cm`:''],
    ['ISBN',esc(b.isbn)],['Tip',esc(b.type)],
  ].filter(r=>r[1]);
  let fmt='';
  if(b.dim&&b.dim.length===2){
    const [w,h]=b.dim, s=Math.min(5,200/Math.max(h,29.7)), W=Math.ceil(Math.max(w,21)*s)+2, H=Math.ceil(Math.max(h,29.7)*s)+2;
    const svg=`<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Mărimea cărții față de o foaie A4"><rect x="1" y="${(H-1-h*s).toFixed(1)}" width="${(w*s).toFixed(1)}" height="${(h*s).toFixed(1)}" fill="var(--band)" stroke="var(--ink)" stroke-width="1"/><rect x="1" y="${(H-1-29.7*s).toFixed(1)}" width="${(21*s).toFixed(1)}" height="${(29.7*s).toFixed(1)}" fill="none" stroke="var(--muted)" stroke-width="1.2" stroke-dasharray="4 3"/></svg>`;
    fmt=`<div class="fmt">${svg}<div><div class="dim">${nf(w)} × ${nf(h)} cm</div><div class="fs">${['lățime × înălțime',b.pages?esc(b.pages)+' de pagini':'',esc(b.binding||'')].filter(Boolean).join(' · ')}</div><div class="fn"><svg width="22" height="2" aria-hidden="true"><line x1="0" y1="1" x2="22" y2="1" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3"/></svg>o foaie A4, pentru comparație</div></div></div>`;
  }
  const ppl=b.people.map((p,i)=>`<button data-person="${esc(p)}">${esc(p)}</button>${i<b.people.length-1?', ':''}`).join('');
  galIdx=0;
  const multi=b.images.length>1;
  app.innerHTML=`<div class="detail">
    <div class="hero band hgrad">
      <div class="crumbs"><button class="back" data-back><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M13 8H3m4-4L3 8l4 4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>${backLabel()}</button><span class="sep" aria-hidden="true"></span><span>${esc(b.category)}</span>${VARB?`<span class="bnav"><button data-go="${prev}"><svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M7 1 3 5l4 4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>Cartea anterioară</button><button data-go="${next}">Cartea următoare<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg></button></span>`:''}</div>
      <div class="titles">
        <div class="kick">${[b.type,b.year].filter(Boolean).map(x=>`<span>${esc(x)}</span>`).join('')}</div>
        <h1>${esc(b.title)}</h1>
        ${b.subtitle?`<div class="sub">${esc(b.subtitle)}</div>`:''}
        ${ppl?`<div class="people">${ppl}</div>`:''}
        <div class="acts"><button class="savebig" data-save="${b.id}" aria-pressed="${isMine(b.id)}">${isMine(b.id)?BMF+'În lista mea':BM+'Adaugă în lista mea'}</button><button class="share" data-share title="Trimite linkul cărții"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3 3 10.5l7.5 3L13.5 21 21 3z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10.5 13.5 21 3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg><span>${matchMedia('(pointer:coarse)').matches?'Trimite':'Copiază linkul'}</span></button></div>
      </div>
      <div class="gallery">
        <div class="stage${b.coverCheck?' chk':''}">${b.coverCheck?'<span class="chkb">Copertă de verificat</span>':''}<img id="mainimg"${b.cut?' class="cutc"':''} src="${safeSrc(b.cover)}" alt="Coperta: ${esc(b.title)}" width="${b.cw}" height="${b.ch}" data-open-cur>
          ${multi?`<button class="arr p" data-img="-1" aria-label="Imaginea anterioară"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button><button class="arr n" data-img="1" aria-label="Imaginea următoare"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>`:''}
        </div>
        ${multi?`<div class="gtw"><div class="gthumbs" role="group" aria-label="Imagini">${b.images.map((im,i)=>`<button data-thumb="${i}" aria-current="${i===0}" aria-label="${esc(im.cap)}"><img src="${safeSrc(im.src)}" alt="" loading="lazy"></button>`).join('')}</div></div>`:''}
        <div class="gbar">${multi?`<span class="counter" id="counter">1 / ${b.images.length}</span>`:'<span></span>'}<button class="linkbtn" data-open-cur>Pe tot ecranul</button></div>
      </div>
    </div>
    <div class="d-body">
      <div>
        ${b.shelf?`<div class="raft"><span>Raft</span><b>${esc(b.shelf)}</b></div>`:''}
        <dl class="tech">${tech.map(([k,v])=>`<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
        <div class="booknav"><button data-go="${prev}">${VARB?'<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M7 1 3 5l4 4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>':'← '}Cartea anterioară</button><button data-go="${next}">Cartea următoare${VARB?'<svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>':' →'}</button></div>
      </div>
      <div>
        <p class="desc">${esc(b.desc)}</p>
        ${(b.video||[]).filter(v=>/^[\w-]{11}$/.test(v.yt||'')).length?`<div class="vid"><h3>Video</h3>${b.video.filter(v=>/^[\w-]{11}$/.test(v.yt||'')).map(v=>`<div class="vitem"><button class="vplay" data-yt="${v.yt}" aria-label="Pornește video: ${esc(v.t)}"><img src="https://i.ytimg.com/vi/${v.yt}/hqdefault.jpg" alt="" loading="lazy"><span class="pl" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></span></button><div class="vcap">${esc(v.t)}${v.s?` <span>· ${esc(v.s)}</span>`:''} <a href="https://www.youtube.com/watch?v=${v.yt}" target="_blank" rel="noopener noreferrer">pe YouTube</a></div></div>`).join('')}</div>`:''}
        ${b.descSrc?`<p class="dsrc">Text CdRF, ${esc(b.descSrc)}${(b.srcs||[]).filter(s=>safeUrl(s.u)).length?' · '+(b.srcs||[]).filter(s=>safeUrl(s.u)).map((s,k)=>`<a href="${esc(s.u)}" target="_blank" rel="noopener noreferrer">${esc(s.t||('sursa '+(k+1)))}</a>`).join(', '):''}</p>`:''}
        ${(b.press||[]).filter(p=>safeUrl(p.u)).length?`<div class="press"><h3>Despre carte în presă</h3><ul>${b.press.filter(p=>safeUrl(p.u)).map(p=>`<li><a href="${esc(p.u)}" target="_blank" rel="noopener noreferrer">${esc(p.o)}</a>${p.a?` · ${esc(p.a)}`:''}${p.d?` <span>${esc(p.d)}</span>`:''}</li>`).join('')}</ul></div>`:''}
        ${fmt}
        ${b.tags.length?`<div class="tags">${b.tags.map(t=>`<button class="tag" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div>`:''}
      </div>
    </div>
    <div class="rows">${rows.join('')}</div>
  </div>`;
  document.title=b.title+' · Biblioteca CdRF';
  window.scrollTo(0,0);
  watchHero();
}
function setImg(i){
  const b=byId[curH().slice(6)]; if(!b) return; const n=b.images.length; galIdx=(i+n)%n; const im=b.images[galIdx];
  const m=document.getElementById('mainimg'); m.src=safeSrc(im.src); m.width=im.w; m.height=im.h; m.alt=(galIdx?`${b.title}, ${im.cap}`:`Coperta: ${b.title}`); m.classList.toggle('cover',galIdx===0); m.classList.toggle('cut',!!im.cut); m.classList.toggle('cutc',!!im.cutc);
  const c=document.getElementById('counter'); if(c) c.textContent=`${galIdx+1} / ${n}`;
  document.querySelectorAll('[data-thumb]').forEach(x=>{const on=+x.dataset.thumb===galIdx; x.setAttribute('aria-current',String(on)); if(on){const s=x.parentElement; const l=x.offsetLeft-s.offsetLeft, r=l+x.offsetWidth; if(l<s.scrollLeft||r>s.scrollLeft+s.clientWidth) s.scrollTo({left:l-s.clientWidth/2+x.offsetWidth/2,behavior:'smooth'});}});
}
function lightbox(b,i){
  const ims=b.images; let cur=i;
  const lb=document.createElement('div'); lb.className='lb'; lb.setAttribute('role','dialog'); lb.setAttribute('aria-label','Imagini: '+b.title);
  const draw=()=>{
    const arrows=ims.length>1;
    lb.innerHTML=`<div class="bar"><span><b style="color:var(--ink);font-weight:500">${esc(b.title)}</b>${b.people.length?' · '+esc(b.people.join(', ')):''} · ${esc(ims[cur].cap)} · ${cur+1} / ${ims.length}</span><span class="hint hide-s">Esc sau click pe fundal pentru a ieși</span>${ims.length>1?'<span class="hint show-s">Glisează pentru imaginea următoare</span>':''}<button class="close" data-close aria-label="Închide imaginea"><svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3 3l12 12M15 3 3 15" stroke="currentColor" stroke-width="2"/></svg>Închide</button></div>
    <div class="view">${arrows?`<button class="arrow prev" data-step="-1" aria-label="Imaginea anterioară"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>`:''}<img src="${safeSrc(ims[cur].src)}" alt="${esc(b.title)}, ${esc(ims[cur].cap)}"${ims[cur].cut?' class="cut"':ims[cur].cutc?' class="cutc"':''}>${arrows?`<button class="arrow next" data-step="1" aria-label="Imaginea următoare"><svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>`:''}</div>
    ${arrows?`<div class="thumbs">${ims.map((im,k)=>`<button data-k="${k}" aria-current="${k===cur}" aria-label="${esc(im.cap)}"><img src="${safeSrc(im.src)}" alt=""></button>`).join('')}</div>`:'<div></div>'}`;
    lb.querySelector('[data-close]').focus();
  };
  const step=d=>{cur=(cur+d+ims.length)%ims.length;draw();};
  lb.addEventListener('click',e=>{
    const t=e.target.closest('[data-close],[data-step],[data-k]');
    if(!t){ if(e.target===lb||e.target.classList.contains('view')) close(); return; }
    if(t.matches('[data-close]')) close(); else if(t.matches('[data-step]')) step(+t.dataset.step); else {cur=+t.dataset.k;draw();}
  });
  const key=e=>{ e.stopPropagation(); if(e.key==='Escape') close(); else if(e.key==='ArrowRight') step(1); else if(e.key==='ArrowLeft') step(-1); };
  function close(){document.removeEventListener('keydown',key,true); lb.remove(); if(document.getElementById('mainimg')) setImg(cur);}
  document.addEventListener('keydown',key,true);
  draw(); document.body.appendChild(lb);
}
function route(){
  const h=curH();
  document.querySelector('.right .nav.ab').setAttribute('aria-current',h==='despre'?'page':'false'); document.getElementById('navlist').setAttribute('aria-current',h==='lista'?'page':'false');
  if(h.startsWith('carte-')) renderBook(h.slice(6));
  else if(h==='despre') renderAbout();
  else if(h==='lista'){renderList(); window.scrollTo(0,0);}
  else {renderHome(); window.scrollTo(0,lastScroll);}
}
function renderAbout(){
  const T=s=>`<span class="todo">${s}</span>`;
  const secs=[
    ['fond','Fondul',`<p>Biblioteca strânge cărți despre fotografie: albume, monografii de autor, cataloage de expoziție, istorie și teorie, manuale și reviste. Fișele din catalog sunt în curs de verificare.</p>${T('cum s-a format fondul (donații, achiziții, colecții primite), ce îl face special și ce titluri rare are.')}`],
    ['consultare','Cum consulți cărțile',`<p>Nu avem împrumut: cărțile se citesc pe loc, la CdRF, în timpul programului. Fiecare fișă din catalog arată raftul pe care stă cartea, așa că poți veni știind exact ce cauți.</p>${T('e nevoie de programare? accesul e gratuit? se pot fotografia pagini?')}`],
    ['cercetare','Pentru studenți, cercetători și grupuri',T('dacă oferiți ajutor la căutare, prezentări ale fondului pentru grupuri sau clase, recomandări de lectură pe o temă.')],
    ['donatii','Donații de carte',T('primiți cărți donate? ce fel de titluri și cum se aduc?')],
    ['contact','Program și contact',`<dl><dt>Adresa</dt><dd>Str. Popa Tatu nr. 68, București</dd><dt>Luni–Vineri</dt><dd>09–20</dd><dt>Sâmbătă–Duminică</dt><dd>10–20</dd></dl><p style="margin-top:1em"></p>${T('adresa de e-mail a bibliotecii și persoana de contact.')}`],
  ];
  /* notițele „de completat” sunt pentru echipă, nu pentru public: le scoatem, iar secțiunile rămase goale nu apar */
  secs.forEach(s=>{s[2]=s[2].replace(/<span class="todo">[\s\S]*?<\/span>/g,'').replace(/<p style="margin-top:1em"><\/p>/g,'');});
  for(let i=secs.length-1;i>=0;i--) if(!secs[i][2].replace(/<[^>]+>/g,'').trim()) secs.splice(i,1);
  app.innerHTML=`<div class="about">
    <div class="ahero band"><div><h1>Biblioteca</h1></div><div><p>Cărți de fotografie, de consultat pe loc la CdRF. Caută în catalog înainte de vizită și vezi pe ce raft e cartea.</p><div class="acov">${B.filter(b=>b.cover).sort((a,b)=>rkey('a'+a.id)-rkey('a'+b.id)).slice(0,5).map(b=>`<img src="${safeSrc(b.cover)}"${b.cut?' class="cutc"':''} alt="Coperta: ${esc(b.title)}" width="${b.cw}" height="${b.ch}" data-id="${b.id}" loading="lazy">`).join('')}</div></div></div>
    <nav class="anav" aria-label="Secțiuni">${secs.map(([id,h])=>`<button data-scroll="a-${id}">${h}</button>`).join('')}</nav>
    ${secs.map(([id,h,x])=>`<section class="asec" id="a-${id}"><h2>${h}</h2><div class="txt">${x}</div></section>`).join('')}
    <section class="asec"><h2>Catalogul</h2><div class="txt"><p>Toate cărțile, cu filtre după tip, categorie, limbă și anul apariției. Cu „Adaugă în lista mea” îți faci lista înainte să vii, ordonată după raft.</p><button class="savebig" data-back style="margin-top:6px">Deschide catalogul</button></div></section>
  </div>`;
  document.title='Despre bibliotecă · Biblioteca CdRF';
  window.scrollTo(0,0); watchHero();
}
function openBook(id){ if(!curH().startsWith('carte-')) lastScroll=window.scrollY; nav('carte-'+id); }
function goHomeWith(fn){ fn(); if(curH()){ lastScroll=0; history.replaceState(null,'','/'); } renderHome(); const el=document.getElementById('toate'); if(el) window.scrollTo({top:el.offsetTop-(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hh'))||80)-8}); }

// meniurile de filtre se deschid la trecerea mausului (doar unde există maus)
let ddHoverAt=0, ddTimer=null;
const canHover=window.matchMedia('(hover:hover) and (pointer:fine)');
const ddShow=dd=>{const b=dd.querySelector('[data-dd]'),m=dd.querySelector('.menu'); if(!b||!m) return; document.querySelectorAll('.dd .menu').forEach(x=>{if(x!==m){x.hidden=true;x.previousElementSibling.setAttribute('aria-expanded','false')}}); if(m.hidden){m.hidden=false;b.setAttribute('aria-expanded','true');ddHoverAt=Date.now();}};
document.addEventListener('mouseover',e=>{ if(!canHover.matches) return; const dd=e.target.closest('.filters .dd'); if(!dd) return; clearTimeout(ddTimer); ddShow(dd); });
document.addEventListener('mouseout',e=>{ if(!canHover.matches) return; const dd=e.target.closest('.filters .dd'); if(!dd||(e.relatedTarget&&dd.contains(e.relatedTarget))) return; clearTimeout(ddTimer); ddTimer=setTimeout(()=>{ if(dd.matches(':hover')||dd.contains(document.activeElement)&&document.activeElement.tagName==='INPUT'&&false) return; const m=dd.querySelector('.menu'); if(m){m.hidden=true;m.previousElementSibling.setAttribute('aria-expanded','false');} },280); });
function clearAll(){st.group='toate';st.q='';st.ppl.clear();st.pub.clear();st.tg.clear();FACETS.forEach(f=>st[f.key].clear());st.tag=st.person=st.sel=st.series=st.publisher=null;document.getElementById('q2').value='';if(st.sort==='relevanta')st.sort='aleator';}
/* ---------- Statistici: Google Analytics pornește doar după acordul vizitatorului ---------- */
const GA_ID='G-XYVC90BLZ2';
const gaOn=()=>/^G-[A-Z0-9]+$/.test(GA_ID)&&/(github\.io|cdrf\.ro)$/.test(location.hostname);
let gaReady=false, gaLast=null, gaQT=null, gaLastQ='';
function gaGet(){try{return localStorage.getItem('cdrf_stat')||''}catch(e){return ''}}
function gaSet(v){try{localStorage.setItem('cdrf_stat',v)}catch(e){}}
function gaLoad(){
  if(gaReady||!gaOn()) return; gaReady=true; window['ga-disable-'+GA_ID]=false;
  window.dataLayer=window.dataLayer||[]; window.gtag=function(){dataLayer.push(arguments);};
  gtag('js',new Date()); gtag('config',GA_ID,{send_page_view:false});
  const s=document.createElement('script'); s.async=true; s.src='https://www.googletagmanager.com/gtag/js?id='+GA_ID; document.head.appendChild(s);
  gaPage();
}
function gaPage(){
  if(!gaReady||window['ga-disable-'+GA_ID]) return;
  const h=curH(); if(h===gaLast) return; gaLast=h;
  let title='Biblioteca CdRF', path=location.pathname.replace(/[^/]*$/,'');
  if(h.startsWith('carte-')){const b=byId[h.slice(6)]; title=b?(b.full||b.title):'Carte'; path+='carte/'+h.slice(6);}
  else if(h==='despre'){title='Despre bibliotecă'; path+='despre';}
  else if(h==='lista'){title='Lista mea'; path+='lista';}
  gtag('event','page_view',{page_title:title,page_location:location.origin+path});
}
function gaSearch(v){
  clearTimeout(gaQT);
  gaQT=setTimeout(()=>{const q=String(v||'').trim().slice(0,80); if(q.length<3||q===gaLastQ) return; gaLastQ=q;
    let n=0; try{n=filtered().length}catch(e){}
    if(gaReady&&!window['ga-disable-'+GA_ID]) gtag('event','search',{search_term:q,nr_rezultate:n});
    stat('cautare',{q:q,n:n});},1500);
}
/* Statistica proprie a bibliotecii: doar numărători (ce carte s-a deschis, ce s-a căutat), fără cookie-uri și fără date despre vizitator. */
/* statistici doar pe adresa publică și doar în fereastra principală (nu și din telefon.html, care încarcă site-ul în două iframe-uri) */
const pubHost=()=>/(pages\.dev|cdrf\.ro)$/.test(location.hostname)&&window.self===window.top;
let statLastH='';
function stat(t,o){
  if(!pubHost()||!/^https:/.test(PANELS_API)) return;
  try{ const u=PANELS_API+'?api=stat&t='+t+Object.keys(o).map(k=>'&'+k+'='+encodeURIComponent(o[k])).join('');
    fetch(u,{mode:'no-cors',keepalive:true,credentials:'omit'}).catch(()=>{}); }catch(e){}
}
function statPage(){ const h=curH(); if(h===statLastH) return; statLastH=h; if(h.startsWith('carte-')&&byId[h.slice(6)]) stat('carte',{id:h.slice(6)}); }
/* Cloudflare Web Analytics: fără cookie-uri, deci fără acord; doar pe site-ul public */
const CF_TOKEN='f44006c6040f4a51b455d77179d36fac';
function cfInit(){ if(!pubHost()||!/^[0-9a-f]{32}$/.test(CF_TOKEN)) return;
  const s=document.createElement('script'); s.defer=true; s.src='https://static.cloudflareinsights.com/beacon.min.js'; s.setAttribute('data-cf-beacon',JSON.stringify({token:CF_TOKEN,spa:true})); document.head.appendChild(s); }
function gaBanner(){
  if(document.getElementById('consent')) return;
  const d=document.createElement('div'); d.id='consent'; d.setAttribute('role','dialog'); d.setAttribute('aria-label','Statistici și cookie-uri');
  d.innerHTML='<p>Vrem să știm ce cărți și ce căutări îi interesează pe vizitatori, ca să îmbunătățim catalogul. Pentru asta folosim Google Analytics, care pune cookie-uri. Îl pornim doar dacă ești de acord.</p><div><button class="cbtn" data-consent="y">Sunt de acord</button><button class="cbtn sec" data-consent="n">Nu, mulțumesc</button></div>';
  document.body.appendChild(d);
  d.addEventListener('click',e=>{const b=e.target.closest('[data-consent]'); if(!b) return; const v=b.dataset.consent; gaSet(v); d.remove();
    if(v==='y') gaLoad();
    else { window['ga-disable-'+GA_ID]=true; document.cookie.split(';').map(c=>c.split('=')[0].trim()).filter(n=>/^_ga/.test(n)).forEach(n=>{
      [location.hostname,'.'+location.hostname.split('.').slice(-2).join('.'),''].forEach(dm=>{document.cookie=n+'=; Max-Age=0; path=/'+(dm?'; domain='+dm:'');});}); }
  });
}
function gaInit(){
  if(!gaOn()) return;
  const c=document.getElementById('cset'); if(c){c.hidden=false; c.onclick=gaBanner;}
  const v=gaGet(); if(v==='y') gaLoad(); else if(v!=='n') gaBanner();
}
function setQuery(v){
  st.q=v; const q2=document.getElementById('q2'); if(q2.value!==v) q2.value=v; gaSearch(v);
  if(v.trim()&&!st.userSort) st.sort='relevanta';
  if(!v.trim()&&st.sort==='relevanta') st.sort='aleator';
  if(curH().startsWith('carte-')){goHomeWith(()=>{}); window.scrollTo(0,0); return;}
  refreshList(true);
}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-share],[data-sscroll],[data-mstep],[data-mgo],[data-meetadd],[data-meetrm],[data-fh],[data-side],[data-page],[data-fclr],[data-tscroll],[data-login],[data-logout],[data-save],[data-list],[data-group],[data-print],[data-clearlist],[data-about],[data-scroll],[data-id],[data-sel],[data-rm],[data-dd],[data-person],[data-tag],[data-series],[data-pub],[data-cat],[data-back],[data-go],[data-open-cur],[data-img],[data-thumb],[data-try],[data-fpanel],#home');
  if(!t){document.querySelectorAll('.dd .menu').forEach(m=>{if(!m.contains(e.target)){m.hidden=true;m.previousElementSibling.setAttribute('aria-expanded','false')}});return;}
  if(t.matches('[data-mstep]')){meetShow(meetIdx+(+t.dataset.mstep)); return;}
  if(t.matches('[data-mgo]')){meetShow(+t.dataset.mgo); return;}
  if(t.matches('[data-fh]')){const k=t.dataset.fh; st.open[k]=!(st.open[k]||st[k].size>0); renderHome(window.scrollY); return;}
  if(t.matches('[data-side]')){st.side=!st.side; renderHome(window.scrollY); return;}
  if(t.matches('[data-page]')){st.page=+t.dataset.page; renderHome(0); const g=document.querySelector('.libw'); if(g){const y=g.getBoundingClientRect().top+window.scrollY-120; window.scrollTo(0,Math.max(0,y));} return;}
  if(t.matches('[data-fclr]')){st[t.dataset.fclr].clear(); renderHome(window.scrollY); return;}
  if(t.matches('[data-sscroll]')){const s=t.parentElement.querySelector('.sel-grid'); s.scrollBy({left:(+t.dataset.sscroll)*s.clientWidth,behavior:'smooth'}); return;}
  if(t.matches('[data-tscroll]')){const s=t.parentElement.querySelector('.gthumbs'); s.scrollBy({left:(+t.dataset.tscroll)*s.clientWidth*0.8,behavior:'smooth'}); return;}
  if(t.matches('[data-save]')){e.preventDefault();e.stopPropagation();toggleMine(t.dataset.save);return;}
  if(t.matches('[data-list]')){const tt=document.getElementById('toast'); if(tt) tt.classList.remove('on'); nav('lista');return;}
  if(t.matches('[data-group]')){st.group=t.dataset.group; FACETS.forEach(f=>st[f.key].clear()); refreshList(); return;}
  if(t.matches('[data-print]')){try{window.print();}catch(err){} return;}
  if(t.matches('[data-clearlist]')){mine=[]; saveMine(); renderList(); return;}
  if(t.matches('[data-about]')){nav('despre');return;}
  if(t.matches('[data-scroll]')){const el=document.getElementById(t.dataset.scroll); if(el) el.scrollIntoView({behavior:'smooth'});return;}
  if(t.matches('[data-id]')){e.preventDefault();openBook(t.dataset.id);return;}
  /* sigla = acasă de la zero: fără căutare, filtre, serie sau editură, ordinea implicită, sus pe pagină */
  if(t.id==='home'){clearAll(); st.sort='aleator'; st.userSort=false; lastScroll=0; if(curH()){history.replaceState(null,'','/');} renderHome(); window.scrollTo(0,0); return;}
  if(t.matches('[data-back]')){if(curH()){nav('');}else window.scrollTo({top:0,behavior:'smooth'});return;}
  if(t.matches('[data-go]')){nav('carte-'+t.dataset.go);return;}
  if(t.matches('[data-share]')){const b=byId[curH().slice(6)]; if(!b) return; const url=location.origin+bookPath(b); const d={title:b.title,text:[b.title,b.people.slice(0,2).join(', ')].filter(Boolean).join(' · '),url};
    if(navigator.share&&matchMedia('(pointer:coarse)').matches&&(!navigator.canShare||navigator.canShare(d))) navigator.share(d).catch(()=>{}); else navigator.clipboard.writeText(url).then(()=>toast('<span>Link copiat</span>'),()=>prompt('Linkul cărții:',url)); return;}
  if(t.matches('[data-open-cur]')){lightbox(byId[curH().slice(6)],galIdx);return;}
  if(t.matches('[data-img]')){setImg(galIdx+(+t.dataset.img));return;}
  if(t.matches('[data-thumb]')){setImg(+t.dataset.thumb);return;}
  if(t.matches('[data-fpanel]')){openPanel();return;}
  if(t.matches('[data-sel]')){goHomeWith(()=>{clearAll();st.sel=t.dataset.sel;});return;}
  if(t.matches('[data-person]')){goHomeWith(()=>{clearAll();st.person=t.dataset.person;});return;}
  if(t.matches('[data-tag]')){goHomeWith(()=>{clearAll();st.tag=t.dataset.tag;});return;}
  if(t.matches('[data-series]')){goHomeWith(()=>{clearAll();st.series=t.dataset.series;});return;}
  if(t.matches('[data-pub]')){goHomeWith(()=>{clearAll();st.publisher=t.dataset.pub;});return;}
  if(t.matches('[data-cat]')){goHomeWith(()=>{clearAll();st.category.add(t.dataset.cat);});return;}
  if(t.matches('[data-rm]')){const k=t.dataset.rm,v=t.dataset.v;
    if(k==='all') clearAll(); else if(k==='q'){setQuery('',false);return;} else if(st[k] instanceof Set) st[k].delete(v); else st[k]=null;
    refreshList(); return;}
  if(t.matches('[data-dd]')){const m=t.nextElementSibling; if(!m.hidden&&Date.now()-ddHoverAt<600) return; const open=m.hidden; document.querySelectorAll('.dd .menu').forEach(x=>{x.hidden=true;x.previousElementSibling.setAttribute('aria-expanded','false')}); m.hidden=!open; t.setAttribute('aria-expanded',String(open)); return;}
});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.matches('[data-f]')){const s=st[t.dataset.f]; t.checked?s.add(t.value):s.delete(t.value);
    renderHome(window.scrollY);
    const btn=document.querySelector(`[data-dd="${t.dataset.f}"]`); if(btn){btn.nextElementSibling.hidden=false;btn.setAttribute('aria-expanded','true');ddHoverAt=Date.now();}
    return;}
  if(t.id==='sort'||t.name==='sortr'){st.sort=t.value; st.userSort=true; refreshList();}
});
let qTimer=null;
document.addEventListener('input',e=>{
  if(e.target.matches('[data-fsq]')){st.fsq[e.target.dataset.fsq]=e.target.value; const q=norm(e.target.value); e.target.parentElement.querySelectorAll('.fl label').forEach(l=>l.hidden=q&&!l.dataset.n.includes(q)); return;}
  if(e.target.id!=='q2') return;
  const v=e.target.value;
  clearTimeout(qTimer); qTimer=setTimeout(()=>setQuery(v),220);
});
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target.id==='q2'){clearTimeout(qTimer); setQuery(e.target.value);}
  if(e.key==='Escape'&&document.querySelector('.fpanel')){document.querySelector('.fpanel [data-pclose]').click();return;}
  if(e.key==='Escape'){const m=[...document.querySelectorAll('.dd .menu')].find(x=>!x.hidden); if(m){m.hidden=true;return;} if(curH().startsWith('carte-')) nav('');}
  if(curH().startsWith('carte-') && !e.target.matches('input,select') && (e.key==='ArrowLeft'||e.key==='ArrowRight')){const d=e.key==='ArrowLeft'?-1:1; if(document.getElementById('counter')) setImg(galIdx+d); else {const b=document.querySelector(`.booknav [data-go]:${d<0?'first':'last'}-child`); if(b) b.click();}}
});
let sw=null;
document.addEventListener('touchstart',e=>{const z=e.target.closest('.stage,.lb .view,.meet'); if(!z||e.touches.length!==1) return; sw={z,x:e.touches[0].clientX,y:e.touches[0].clientY};},{passive:true});
document.addEventListener('touchend',e=>{if(!sw) return; const t=e.changedTouches[0], dx=t.clientX-sw.x, dy=t.clientY-sw.y, z=sw.z; sw=null; if(Math.abs(dx)<40||Math.abs(dx)<Math.abs(dy)*1.3) return;
  const d=dx<0?1:-1; if(z.classList.contains('meet')){meetShow(meetIdx+d);return;} if(z.classList.contains('view')){const btn=z.querySelector(d>0?'.next':'.prev'); if(btn) btn.click(); else {const lb=z.closest('.lb'); lb&&lb.dispatchEvent(new CustomEvent('swipe',{detail:d}));}} else if(document.getElementById('counter')) setImg(galIdx+d);},{passive:true});
/* video: se încarcă abia la click, din youtube-nocookie */
document.addEventListener('click',e=>{const m=e.target.closest('.nmorebtn'); if(!m) return; const s=m.previousElementSibling; if(s){s.hidden=false;} m.remove();});
document.addEventListener('click',e=>{const b=e.target.closest('.vplay'); if(!b) return; const id=b.dataset.yt; if(!/^[\w-]{11}$/.test(id)) return;
  const f=document.createElement('iframe'); f.className='vframe'; f.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0'; f.title=b.getAttribute('aria-label')||'Video';
  f.allow='autoplay; encrypted-media; picture-in-picture; fullscreen'; f.setAttribute('allowfullscreen',''); b.replaceWith(f);});
/* în panou, coperta peste care treci cu mausul devine cea mare */
document.addEventListener('mouseover',e=>{const im=e.target.closest('.meet .cv.many img'); if(!im||im.classList.contains('big')||!window.matchMedia('(hover:hover)').matches) return; im.parentElement.querySelectorAll('img.big').forEach(x=>x.classList.remove('big')); im.classList.add('big');});
/* caruselul de sus: tras cu mouse-ul, săgeți din tastatură */
let mdrag=null, mdragged=false;
document.addEventListener('pointerdown',e=>{const tr=e.target.closest('.mtrack'); if(!tr||e.pointerType!=='mouse'||e.button!==0) return; mdrag={x:e.clientX,y:e.clientY,tr}; mdragged=false;});
document.addEventListener('pointermove',e=>{if(!mdrag) return; if(!mdragged&&Math.abs(e.clientX-mdrag.x)>8){mdragged=true; mdrag.tr.classList.add('drag');} if(mdragged) e.preventDefault();});
document.addEventListener('pointerup',e=>{if(!mdrag) return; const dx=e.clientX-mdrag.x; mdrag.tr.classList.remove('drag'); mdrag=null; if(mdragged&&Math.abs(dx)>50) meetShow(meetIdx+(dx<0?1:-1)); setTimeout(()=>{mdragged=false;},0);});
document.addEventListener('click',e=>{if(mdragged&&e.target.closest('.mtrack')){e.preventDefault();e.stopPropagation();mdragged=false;}},true);
document.addEventListener('dragstart',e=>{if(e.target.closest('.mtrack')) e.preventDefault();});
document.addEventListener('keydown',e=>{const m=document.querySelector('.meet'); if(!m||!m.contains(document.activeElement)||(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')) return; e.preventDefault(); meetShow(meetIdx+(e.key==='ArrowRight'?1:-1));});
let drag=null;
document.addEventListener('pointerdown',e=>{const s=e.target.closest('.gthumbs,.sel-grid'); if(!s||e.pointerType!=='mouse'||e.button!==0) return; drag={s,x:e.clientX,left:s.scrollLeft,moved:false,id:e.pointerId};});
document.addEventListener('pointermove',e=>{if(!drag) return; const dx=e.clientX-drag.x; if(!drag.moved&&Math.abs(dx)>5){drag.moved=true; drag.s.classList.add('dragging');} if(drag.moved){drag.s.scrollLeft=drag.left-dx; e.preventDefault();}});
document.addEventListener('pointerup',e=>{if(!drag) return; const d=drag; drag=null; if(d.moved){setTimeout(()=>d.s.classList.remove('dragging'),0);} });
document.addEventListener('wheel',e=>{const s=e.target.closest(VARB?'.gthumbs':'.gthumbs,.sel-grid'); if(!s||s.scrollWidth<=s.clientWidth||Math.abs(e.deltaX)>Math.abs(e.deltaY)) return; s.scrollLeft+=e.deltaY; e.preventDefault();},{passive:false});
window.addEventListener('popstate',onRoute);
setTimeout(liveAll,50);
if(VARB){document.body.classList.add('vb');
  document.querySelector('.cdrffoot').hidden=false;
  document.getElementById('cyear').textContent=new Date().getFullYear();
}
/* în varianta de acum sigla duce la pagina principală a bibliotecii; în varianta B duce la cdrf.ro */
if(!VARB) document.getElementById('cdrfhome').addEventListener('click',e=>{e.preventDefault();document.getElementById('home').click();});
setTimeout(gaInit,400); setTimeout(()=>{statPage(); cfInit();},500);
updNav();
if(/^#carte-\d+$/.test(location.hash)&&!/^\/carte\//.test(location.pathname)){const _b=byId[location.hash.slice(7)]; history.replaceState(null,'',_b?bookPath(_b):'/');}
route();
})();
