/**
 * Biblioteca CdRF – admin și editare
 * Aplicație web legată de tabelul „Biblioteca CdRF – Baza de date”.
 * Datele stau în tabul „Cărți”; listele permise în „Liste”;
 * cine are acces în „Utilizatori”; fiecare modificare se scrie în „Istoric”.
 */

const SH_BOOKS = 'Cărți';
const SH_LISTS = 'Liste';
const SH_USERS = 'Utilizatori';
const SH_LOG = 'Istoric';
const SH_PANELS = 'Panouri';
const SITE = 'https://alexmolovatacdrf.github.io/biblioteca-cdrf/';

// Coloane afișate în listă (restul se încarcă la deschiderea fișei)
const LIST_COLS = ['ID', 'Stare', 'Titlu', 'Fotograf / autor', 'An', 'Tip', 'Raft', 'Copertă', 'Verificat la raft', 'Copertă de verificat'];
// Câmpuri pe care editorii nu le pot schimba
const ADMIN_ONLY = ['ID', 'Wix ID'];

// Interfața (Index.html) se ia direct din GitHub, ca să nu mai fie nevoie de redeploy la fiecare schimbare.
// Dacă GitHub nu răspunde, se folosește copia locală „Index” din proiect.
/* Interfața (Index.html) stă în proiectul Apps Script, lângă Code.gs, și se publică împreună cu el.
 * Nu o mai luăm din GitHub: dacă GitHub nu răspunde, adminul cădea pe o copie veche și dădea „Error: AUTH”.
 * Doar pentru teste: proprietatea de script UI_REF (un commit din repo) încarcă interfața de acolo. */
function uiHtml_() {
  const ref = props_().getProperty('UI_REF');
  if (ref) {
    try {
      const r = UrlFetchApp.fetch('https://raw.githubusercontent.com/alexmolovatacdrf/biblioteca-cdrf/' + ref + '/admin/Index.html', { muteHttpExceptions: true });
      if (r.getResponseCode() === 200) return r.getContentText('UTF-8');
    } catch (err) {}
  }
  return HtmlService.createHtmlOutputFromFile('Index').getContent();
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.api === 'panouri') return panelsApi_();
  if (p.api === 'carti') return booksApi_();
  if (p.api === 'stat') return statLog_(p);
  const boot = { code: String(p.code || '').slice(0, 4096), state: String(p.state || '').slice(0, 256),
    error: p.error ? 'Conectarea Google nu s-a finalizat.' : '', google: !!props_().getProperty('GOOGLE_CLIENT_ID') };
  /* datele de pornire (logarea Google) intră în <head>; nu ne bazăm doar pe comentariul <!--BOOT-->, pe care Apps Script îl poate elimina */
  const tag = '<script>window.BOOT=' + JSON.stringify(boot).replace(/</g, '\\u003c') + ';</script>';
  let html = uiHtml_();
  html = html.indexOf('<!--BOOT-->') >= 0 ? html.replace('<!--BOOT-->', tag)
       : /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, m => m + tag) : tag + html;
  return HtmlService.createHtmlOutput(html)
    .setTitle('Biblioteca CdRF – admin')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function props_() { return PropertiesService.getScriptProperties(); }

/*
 * Logare cu Google (ca la FM13): aplicația rulează ca proprietarul tabelului,
 * iar fiecare persoană se identifică prin contul Google (OAuth, fluxul „authorization code”).
 * Proprietăți necesare (Project Settings → Script properties):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, WEBAPP_URL (adresa /exec a aplicației)
 * Fără GOOGLE_CLIENT_ID, aplicația folosește contul cu care e deschisă (deploy „User accessing”).
 */
const SESSION_DAYS = 30;        // dacă bifezi „rămân conectat”
const SESSION_HOURS_SHORT = 12; // altfel: sesiunea se închide odată cu browserul, iar pe server expiră în 12 ore

function userByEmail_(email) {
  email = String(email || '').trim().toLowerCase();
  const rows = ss_().getSheetByName(SH_USERS).getDataRange().getValues().slice(1);
  const r = rows.find(x => String(x[0]).trim().toLowerCase() === email);
  if (!email || !r) return null;
  return { email: email, name: String(r[1] || email), role: String(r[2] || 'editor').trim().toLowerCase() };
}

function me_(session) {
  if (props_().getProperty('GOOGLE_CLIENT_ID')) {
    if (typeof session !== 'string' || !/^[A-Za-z0-9_-]{30,80}$/.test(session)) throw new Error('AUTH');
    const raw = props_().getProperty('S_' + hash_(session));
    const row = raw ? JSON.parse(raw) : null;
    if (!row || Date.now() > row.exp) throw new Error('AUTH');
    const u = userByEmail_(row.email);
    if (!u) throw new Error('Contul ' + row.email + ' nu mai are acces. Cere-i lui Alex să te adauge în tabul „Utilizatori”.');
    return u;
  }
  const email = (Session.getActiveUser().getEmail() || '').toLowerCase();
  const u = userByEmail_(email);
  if (!u) throw new Error('Contul ' + (email || 'necunoscut') + ' nu are acces. Cere-i lui Alex să te adauge în tabul „Utilizatori”.');
  return u;
}

function hash_(s) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8)).replace(/=+$/, '');
}
function random_() {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Utilities.getUuid() + Date.now())).replace(/=+$/, '');
}

/** Pasul 1: adresa la care trimitem browserul ca să aleagă contul Google. */
function beginLogin(keep) {
  const P = props_(), id = P.getProperty('GOOGLE_CLIENT_ID'), url = P.getProperty('WEBAPP_URL');
  if (!id || !url) throw new Error('Logarea cu Google nu e configurată.');
  const state = random_(), nonce = random_();
  CacheService.getScriptCache().put('st_' + state, nonce + (keep ? '|k' : ''), 600);
  const q = { client_id: id, redirect_uri: url, response_type: 'code', scope: 'openid email',
    access_type: 'online', prompt: 'select_account', state: state, nonce: nonce };
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + Object.keys(q).map(k => k + '=' + encodeURIComponent(q[k])).join('&');
}

/** Pasul 2: Google ne trimite înapoi un cod; îl schimbăm pe server și deschidem o sesiune. */
function finishLogin(code, state) {
  const P = props_(), cache = CacheService.getScriptCache();
  const st = cache.get('st_' + state) || '';
  const nonce = st.split('|')[0], keep = st.indexOf('|k') > 0;
  if (!nonce) throw new Error('Linkul de conectare a expirat. Încearcă din nou.');
  cache.remove('st_' + state);
  const r = UrlFetchApp.fetch('https://oauth2.googleapis.com/token', { method: 'post', muteHttpExceptions: true, followRedirects: false,
    payload: { code: code, client_id: P.getProperty('GOOGLE_CLIENT_ID'), client_secret: P.getProperty('GOOGLE_CLIENT_SECRET'),
      redirect_uri: P.getProperty('WEBAPP_URL'), grant_type: 'authorization_code' } });
  if (r.getResponseCode() !== 200) throw new Error('Google nu a confirmat conectarea. Încearcă din nou.');
  const tok = JSON.parse(r.getContentText()).id_token || '';
  const parts = tok.split('.');
  if (parts.length !== 3) throw new Error('Răspuns Google invalid.');
  // Tokenul vine direct de la Google pe canal securizat (server la server), deci ajunge verificarea câmpurilor.
  const c = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[1] + '==='.slice((parts[1].length + 3) % 4))).getDataAsString('UTF-8'));
  if (['https://accounts.google.com', 'accounts.google.com'].indexOf(c.iss) < 0 || c.aud !== P.getProperty('GOOGLE_CLIENT_ID') ||
      c.nonce !== nonce || c.email_verified !== true || !c.email || c.exp * 1000 < Date.now()) throw new Error('Conectare respinsă.');
  const u = userByEmail_(c.email);
  if (!u) throw new Error('Contul ' + c.email + ' nu are acces la bibliotecă. Cere-i lui Alex să te adauge.');
  const session = random_();
  P.setProperty('S_' + hash_(session), JSON.stringify({ email: u.email, exp: Date.now() + (keep ? SESSION_DAYS * 864e5 : SESSION_HOURS_SHORT * 36e5) }));
  cleanSessions_();
  return { session: session, user: u, keep: keep };
}

function logout(session) {
  if (typeof session === 'string') props_().deleteProperty('S_' + hash_(session));
  return true;
}

function cleanSessions_() {
  const all = props_().getProperties(), now = Date.now();
  Object.keys(all).forEach(k => { if (k.indexOf('S_') === 0) { try { if (JSON.parse(all[k]).exp < now) props_().deleteProperty(k); } catch (e) { props_().deleteProperty(k); } } });
}

/* Istoric: o linie, scrisă ca text (un „=” la început nu devine formulă). */
function logRow_(vals) {
  const lg = ss_().getSheetByName(SH_LOG);
  lg.getRange(lg.getLastRow() + 1, 1, 1, vals.length).setNumberFormat('@').setValues([vals]);
}
const STATES = ['Ciornă', 'În lucru', 'Gata de publicare', 'Publicată'];
function headers_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
}

function lists_() {
  const v = ss_().getSheetByName(SH_LISTS).getDataRange().getValues();
  const h = v[0].map(String);
  const out = {};
  h.forEach((k, i) => { out[k] = v.slice(1).map(r => String(r[i]).trim()).filter(Boolean); });
  return out;
}

/** Datele pentru ecranul principal. */
function getInit(session) {
  const user = me_(session);
  const sh = ss_().getSheetByName(SH_BOOKS);
  const h = headers_(sh);
  const data = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), h.length).getDisplayValues();
  const idx = LIST_COLS.map(c => h.indexOf(c));
  const rows = data.filter(r => r[0]).map(r => idx.map(i => (i < 0 ? '' : r[i])));
  return { user: user, cols: LIST_COLS, rows: rows, headers: h, lists: lists_(), site: SITE };
}

function findRow_(sh, id) {
  const ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

/** O fișă completă. */
function getRecord(session, id) {
  me_(session);
  const sh = ss_().getSheetByName(SH_BOOKS);
  const h = headers_(sh);
  const row = findRow_(sh, id);
  if (row < 0) throw new Error('Nu găsesc cartea cu ID ' + id);
  const v = sh.getRange(row, 1, 1, h.length).getDisplayValues()[0];
  const rec = {}; h.forEach((k, i) => rec[k] = v[i]);
  return rec;
}

/**
 * Salvează modificările unei fișe.
 * changes: {câmp: valoare nouă}; before: {câmp: valoarea văzută când s-a deschis fișa}
 * Dacă între timp altcineva a schimbat același câmp, nu suprascrie și întoarce conflictul.
 */
function saveRecord(session, id, changes, before) {
  const user = me_(session);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = ss_().getSheetByName(SH_BOOKS);
    const h = headers_(sh);
    const row = findRow_(sh, id);
    if (row < 0) throw new Error('Nu găsesc cartea cu ID ' + id);
    const range = sh.getRange(row, 1, 1, h.length);
    const cur = range.getDisplayValues()[0];
    const conflicts = [];
    const log = [];
    const now = new Date();
    /* întâi verificăm tot, abia apoi scriem: o cerere respinsă nu lasă nimic schimbat */
    const writes = [];
    Object.keys(changes).forEach(k => {
      const i = h.indexOf(k);
      if (i < 0) return;
      if (user.role !== 'admin' && ADMIN_ONLY.indexOf(k) >= 0) return;
      let nv = String(changes[k] == null ? '' : changes[k]);
      if (k === 'ID') throw new Error('ID-ul nu se schimbă.');
      if (k === 'Stare' && STATES.indexOf(nv) < 0) throw new Error('Stare necunoscută: ' + nv);
      if (k === 'Stare' && nv === 'Publicată' && user.role !== 'admin') throw new Error('Doar adminul poate publica o carte. Pune „Gata de publicare”.');
      if (before && k in before && String(before[k]) !== String(cur[i])) { conflicts.push({ field: k, now: cur[i] }); return; }
      if (nv === cur[i]) return;
      writes.push([i, k, nv]);
    });
    writes.forEach(([i, k, nv]) => {
      sh.getRange(row, i + 1).setNumberFormat('@').setValue(nv);
      log.push([now, user.name, String(id), k, cur[i], nv]);
    });
    if (log.length) {
      const lg = ss_().getSheetByName(SH_LOG);
      lg.getRange(lg.getLastRow() + 1, 1, log.length, 6).setNumberFormat('@').setValues(log);
      CacheService.getScriptCache().remove('carti');
    }
    return { saved: log.length, conflicts: conflicts, record: getRecord(session, id) };
  } finally { lock.releaseLock(); }
}

/** Carte nouă: primește următorul ID liber, starea Ciornă. */
function newRecord(session, title) {
  const user = me_(session);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = ss_().getSheetByName(SH_BOOKS);
    const h = headers_(sh);
    const ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(r => Number(r[0]) || 0);
    const id = String(Math.max.apply(null, ids.concat([0])) + 1);
    const row = h.map(k => k === 'ID' ? id : k === 'Stare' ? 'Ciornă' : k === 'Titlu' ? (title || '') : k === 'Intrată în bibliotecă' ? today_() : '');
    const r = sh.getLastRow() + 1;
    sh.getRange(r, 1, 1, h.length).setNumberFormat('@').setValues([row]);
    const lg = ss_().getSheetByName(SH_LOG);
    logRow_([new Date(), user.name, id, 'Carte nouă', '', title || '']);
    CacheService.getScriptCache().remove('carti');
    return getRecord(session, id);
  } finally { lock.releaseLock(); }
}

/** Inventar: marchează cartea ca găsită la raft (sau anulează). */
function markShelf(session, id, found, note) {
  const user = me_(session);
  const stamp = found ? Utilities.formatDate(new Date(), 'Europe/Bucharest', 'dd.MM.yyyy') + ', ' + user.name : '';
  const ch = { 'Verificat la raft': stamp };
  if (note != null) ch['Note'] = note;
  return saveRecord(session, id, ch, null);
}

/** Istoricul unei cărți, cele mai noi întâi. */
function getHistory(session, id) {
  me_(session);
  const lg = ss_().getSheetByName(SH_LOG);
  if (lg.getLastRow() < 2) return [];
  return lg.getRange(2, 1, lg.getLastRow() - 1, 6).getDisplayValues()
    .filter(r => String(r[2]) === String(id)).reverse().slice(0, 50);
}


/* ---------------- Fișele editate în admin, pentru site ----------------
 * Site-ul public are o copie a catalogului, făcută la build. Ca editările din admin să apară
 * imediat, site-ul cere ?api=carti și primește doar cărțile atinse în admin (după tabul Istoric):
 * starea de acum, câmpurile schimbate și fișa completă (pentru cărțile publicate).
 * Nu ies niciodată: sursele descrierii, linkurile surselor, notele, Wix ID, verificarea la raft.
 */
const API_FIELDS = {
  'Titlu': 'title', 'Subtitlu': 'subtitle', 'Fotograf / autor': 'people', 'Colaboratori (nume – rol)': 'contrib',
  'Editură': 'publisher', 'Loc': 'place', 'An': 'year', 'Ediție': 'edition', 'Serie': 'series', 'Volum': 'vol',
  'ISBN': 'isbn', 'Limbă': 'lang', 'Tip': 'type', 'Categorie': 'category', 'Teme': 'tags', 'Raft': 'shelf',
  'Pagini': 'pages', 'Dimensiuni (cm)': 'dim', 'Legătură': 'binding', 'Descriere': 'desc',
  'Copertă de verificat': 'coverCheck', 'Video': 'video', 'Copertă': 'cover',
  'Imagini ascunse': 'imgHide', 'Imagine la mouse': 'hovImg'
};
function apiVal_(k, v) {
  v = String(v == null ? '' : v).trim();
  const list = s => s ? s.split(/\s*;\s*/).map(x => x.trim()).filter(Boolean) : [];
  if (k === 'people' || k === 'lang' || k === 'tags') return list(v);
  if (k === 'contrib') {
    const out = [];
    list(v).forEach(part => {
      const m = part.match(/^(.*?)\s+[–-]\s+(.+)$/);
      if (!m) { out.push({ n: part, r: '' }); return; }
      m[1].split(/\s*,\s*/).filter(Boolean).forEach(n => out.push({ n: n, r: m[2].trim() }));
    });
    return out;
  }
  if (k === 'imgHide') return list(v).filter(x => /^(covers|pages)\/[\w.-]+$/.test(x));
  if (k === 'hovImg') return /^pages\/[\w.-]+$/.test(v) ? v : '';
  if (k === 'coverCheck') return /^da$/i.test(v);
  if (k === 'video') return list(v).map(u => { const m = u.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/); return m ? { yt: m[1] } : null; }).filter(Boolean);
  if (k === 'cover') return /^covers\/[\w.-]+\.(webp|jpe?g|png)$/i.test(v) ? v : '';
  return v;
}
function booksApi_() {
  const cache = CacheService.getScriptCache();
  let out = cache.get('carti');
  if (!out) {
    const lg = ss_().getSheetByName(SH_LOG);
    const touched = {};
    if (lg.getLastRow() > 1) {
      lg.getRange(2, 3, lg.getLastRow() - 1, 2).getDisplayValues().forEach(r => {
        const id = String(r[0]).trim(), f = String(r[1]).trim();
        if (!/^\d+$/.test(id)) return;                 // rândurile de panouri au „panou P…”
        const k = f === 'Carte nouă' ? '*' : f === 'Stare' ? 'stare' : API_FIELDS[f];
        if (!k) return;
        (touched[id] = touched[id] || {})[k] = 1;
      });
    }
    const sh = ss_().getSheetByName(SH_BOOKS);
    const h = headers_(sh);
    const vals = sh.getRange(2, 1, sh.getLastRow() - 1, h.length).getDisplayValues();
    const books = [];
    vals.forEach(r => {
      const id = String(r[0]).trim();
      if (!touched[id]) return;
      const rec = { id: id, stare: String(r[h.indexOf('Stare')] || '').trim(), edited: Object.keys(touched[id]) };
      if (rec.stare === 'Publicată') {
        const f = {};
        Object.keys(API_FIELDS).forEach(col => { const i = h.indexOf(col); if (i >= 0) f[API_FIELDS[col]] = apiVal_(API_FIELDS[col], r[i]); });
        rec.fields = f;
      }
      books.push(rec);
    });
    out = JSON.stringify({ books: books, at: new Date().toISOString() });
    try { cache.put('carti', out, 60); } catch (err) { /* peste 100 KB nu intră în cache; se recalculează */ }
  }
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- Panouri pe prima pagină ----------------
 * Tabul „Panouri”: un rând pe panou. Site-ul public le citește prin ?api=panouri
 * (doar cele pornite și încă neexpirate), deci o schimbare apare pe site în câteva minute, fără republicare.
 * Afișare de la / până la: fereastra în care panoul e pe site. Goale = de acum până se termină evenimentul.
 * Propunerile (Sursă începe cu „propunere”, Activ = nu) nu ajung pe site până nu le aprobă un editor.
 */
// Tipuri speciale: „Cartea săptămânii” (o carte, cu text) și „Cărți noi” (până la 12 cărți) au secțiunile lor pe prima pagină;
// „Sugestii căutare”: cuvinte în Text, despărțite prin virgulă, puse primele la „Încearcă”.
// Restul sunt evenimente și intră în caruselul de sus.
const PANEL_COLS = ['ID', 'Activ', 'Tip', 'Titlu', 'Invitat', 'Când', 'Data', 'Până la', 'Afișare de la', 'Afișare până la', 'Cărți', 'Text', 'Sursă', 'Actualizat'];
const PANEL_KEYS = ['id', 'active', 'kind', 'title', 'guest', 'when', 'date', 'end', 'from', 'to', 'books', 'text', 'src', 'updated'];

function panelsSheet_() {
  let sh = ss_().getSheetByName(SH_PANELS);
  if (!sh) {
    sh = ss_().insertSheet(SH_PANELS);
    sh.getRange(1, 1, 1, PANEL_COLS.length).setValues([PANEL_COLS]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange(2, 1, 999, PANEL_COLS.length).setNumberFormat('@');
  }
  return sh;
}

function panelRows_() {
  const sh = panelsSheet_();
  if (sh.getLastRow() < 2) return [];
  const h = headers_(sh);
  return sh.getRange(2, 1, sh.getLastRow() - 1, h.length).getDisplayValues().filter(r => r[0]).map(r => {
    const o = {};
    PANEL_COLS.forEach((c, i) => { const j = h.indexOf(c); o[PANEL_KEYS[i]] = j < 0 ? '' : String(r[j]).trim(); });
    o.active = /^(da|true|1|activ)$/i.test(o.active);
    o.books = o.books ? o.books.split(/[\s,;]+/).filter(x => /^\d+$/.test(x)) : [];
    return o;
  });
}

function today_() { return Utilities.formatDate(new Date(), 'Europe/Bucharest', 'yyyy-MM-dd'); }

/** Public: panourile pornite care nu au expirat (filtrarea pe ziua de azi o face și site-ul). */
function panelsApi_() {
  const cache = CacheService.getScriptCache();
  let out = cache.get('panels');
  if (!out) {
    const d = today_();
    if (!ss_().getSheetByName(SH_PANELS)) return ContentService.createTextOutput('{"panels":[]}').setMimeType(ContentService.MimeType.JSON);
    const list = panelRows_().filter(p => p.active && (!p.from || p.from <= d) && (p.to ? p.to >= d : (!p.date || (p.end || p.date) >= d)))
      .map(p => ({ id: p.id, active: true, kind: p.kind, title: p.title, guest: p.guest, when: p.when, date: p.date, end: p.end,
        from: p.from, to: p.to, books: p.books, text: p.text }));
    out = JSON.stringify({ panels: list, at: new Date().toISOString() });
    cache.put('panels', out, 120);
  }
  return ContentService.createTextOutput(out).setMimeType(ContentService.MimeType.JSON);
}

/** Admin: toate panourile, inclusiv cele oprite sau expirate. */
function getPanels(session) {
  me_(session);
  return panelRows_();
}

function canPanels_(user) {
  if (user.role !== 'admin' && user.role !== 'editor') throw new Error('Doar adminii și editorii pot schimba panourile.');
}

/** Salvează un panou (nou dacă nu are ID). */
function savePanel(session, p) {
  const user = me_(session); canPanels_(user);
  const isDate = v => !v || /^\d{4}-\d{2}-\d{2}$/.test(v);
  ['date', 'end', 'from', 'to'].forEach(k => { if (!isDate(p[k] || '')) throw new Error('Dată greșită: ' + p[k]); });
  if (!String(p.kind || '').trim()) throw new Error('Alege tipul panoului.');
  if (!String(p.title || '').trim() && !String(p.guest || '').trim() && !(p.books || []).length && !String(p.text || '').trim()) throw new Error('Panoul are nevoie de titlu, invitat, o carte sau un text.');
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = panelsSheet_(), h = headers_(sh);
    const rows = panelRows_();
    let id = String(p.id || '');
    let row = -1;
    if (id) {
      const ids = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getDisplayValues().map(r => r[0]) : [];
      const i = ids.indexOf(id); if (i < 0) throw new Error('Nu găsesc panoul ' + id); row = i + 2;
    } else {
      const n = rows.map(r => Number(String(r.id).replace(/\D/g, '')) || 0);
      id = 'P' + (Math.max.apply(null, n.concat([0])) + 1);
      row = sh.getLastRow() + 1;
    }
    const before = rows.find(r => r.id === id);
    const val = { id: id, active: p.active ? 'da' : 'nu', kind: p.kind, title: p.title, guest: p.guest, when: p.when, date: p.date, end: p.end,
      from: p.from, to: p.to, books: (p.books || []).map(String).filter(x => /^\d+$/.test(x)).join(', '), text: p.text,
      src: (user.role === 'admin' && p.src) ? p.src : ((before && before.src) || 'manual'), updated: Utilities.formatDate(new Date(), 'Europe/Bucharest', 'dd.MM.yyyy HH:mm') + ', ' + user.name };
    const line = h.map(c => { const i = PANEL_COLS.indexOf(c); return i < 0 ? '' : String(val[PANEL_KEYS[i]] == null ? '' : val[PANEL_KEYS[i]]).slice(0, 2000); });
    sh.getRange(row, 1, 1, h.length).setNumberFormat('@').setValues([line]);
    const lg = ss_().getSheetByName(SH_LOG);
    logRow_([new Date(), user.name, 'panou ' + id, before ? 'Panou modificat' : 'Panou nou', before ? (before.title || before.kind) : '', (p.title || p.kind) + (p.active ? '' : ' (oprit)')]);
    CacheService.getScriptCache().remove('panels');
    return panelRows_().find(r => r.id === id);
  } finally { lock.releaseLock(); }
}

/** Șterge un panou: adminul oricare, editorii doar propunerile (respinse). De obicei e mai bine să-l oprești. */
function deletePanel(session, id) {
  const user = me_(session);
  const lock = LockService.getScriptLock(); lock.waitLock(20000);
  try {
    const sh = panelsSheet_();
    const ids = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getDisplayValues().map(r => r[0]);
    const i = ids.indexOf(String(id)); if (i < 0) throw new Error('Nu găsesc panoul ' + id);
    const cur = panelRows_().find(r => r.id === String(id));
    const prop = cur && !cur.active && /^propunere/i.test(cur.src || '');
    if (user.role !== 'admin' && !(prop && user.role === 'editor')) throw new Error('Doar adminul poate șterge un panou. Îl poți opri.');
    sh.deleteRow(i + 2);
    logRow_([new Date(), user.name, 'panou ' + id, 'Panou șters', '', '']);
    CacheService.getScriptCache().remove('panels');
    return true;
  } finally { lock.releaseLock(); }
}

/* ===================== Caută informații despre carte (fără AI) =====================
 * Surse gratuite: Open Library (fără cheie) și Google Books (doar dacă există cheia
 * GOOGLE_BOOKS_KEY în Script Properties; fără cheie, Google refuză cererile din Apps Script).
 * Nu scrie nimic în fișă: întoarce propuneri; utilizatorul bifează ce preia și apasă Salvează.
 */
const SH_RAW = 'Surse brute';
const RAW_COLS = ['Data', 'Cine', 'ID carte', 'Sursă', 'Link', 'Titlu găsit', 'Text brut (descriere)', 'Date brute (JSON)'];
const LANG3 = { eng: 'en', rum: 'ro', ron: 'ro', fre: 'fr', fra: 'fr', ger: 'de', deu: 'de', ita: 'it', spa: 'es', jpn: 'ja', dut: 'nl', nld: 'nl', pol: 'pl', swe: 'sv', slv: 'sl', chi: 'zh', zho: 'zh', hun: 'hu', cze: 'cs', ces: 'cs', por: 'pt', rus: 'ru' };

function fetchJson_(url) {
  try {
    const r = UrlFetchApp.fetch(url, { muteHttpExceptions: true, headers: { 'User-Agent': 'BibliotecaCdRF/1.0 (catalog de bibliotecă)' } });
    const c = r.getResponseCode();
    if (c !== 200) {
      let m = '';
      try { const j = JSON.parse(r.getContentText()); m = (j.error && (j.error.message || j.error)) || ''; } catch (e) {}
      return { __err: c + (m ? ': ' + String(m).slice(0, 160) : '') };
    }
    return JSON.parse(r.getContentText());
  } catch (e) { return { __err: String(e.message || e) }; }
}
function txt_(d) { return !d ? '' : typeof d === 'string' ? d : (d.value || ''); }
function cleanIsbn_(s) { return String(s || '').replace(/[^0-9Xx]/g, '').toUpperCase(); }

function olEdition_(ed, workKey) {
  /* ed: /books/OL..M.json ; completăm cu descrierea operei */
  let work = null;
  const wk = workKey || (ed.works && ed.works[0] && ed.works[0].key);
  if (wk) { work = fetchJson_('https://openlibrary.org' + wk + '.json'); if (work.__err) work = null; }
  const authors = [];
  (ed.authors || (work && work.authors) || []).slice(0, 6).forEach(a => {
    const k = a.key || (a.author && a.author.key);
    if (!k) return;
    const au = fetchJson_('https://openlibrary.org' + k + '.json');
    if (!au.__err && au.name) authors.push(au.name);
  });
  const isbn = (ed.isbn_13 && ed.isbn_13[0]) || (ed.isbn_10 && ed.isbn_10[0]) || '';
  const lang = ed.languages ? ed.languages.map(l => LANG3[String(l.key).split('/').pop()] || String(l.key).split('/').pop()) : [];
  return {
    src: 'Open Library', url: 'https://openlibrary.org' + ed.key,
    title: ed.title || '', subtitle: ed.subtitle || '', authors: authors,
    publisher: (ed.publishers || [])[0] || '', place: (ed.publish_places || [])[0] || '',
    year: (String(ed.publish_date || '').match(/\d{4}/) || [''])[0],
    pages: ed.number_of_pages ? String(ed.number_of_pages) : '', isbn: isbn, lang: lang,
    dims: ed.physical_dimensions || '', binding: ed.physical_format || '',
    desc: txt_(ed.description) || (work ? txt_(work.description) : ''),
    cover: ed.covers && ed.covers[0] > 0 ? 'https://covers.openlibrary.org/b/id/' + ed.covers[0] + '-M.jpg' : '',
    subjects: (work && work.subjects ? work.subjects : []).slice(0, 12),
    raw: JSON.stringify({ edition: ed, work: work })
  };
}

function olLookup_(q, notes) {
  const out = [];
  const isbn = cleanIsbn_(q.isbn);
  if (isbn.length === 10 || isbn.length === 13) {
    const ed = fetchJson_('https://openlibrary.org/isbn/' + isbn + '.json');
    if (!ed.__err && ed.key) out.push(olEdition_(ed));
    else notes.push('Open Library nu are ISBN-ul ' + isbn + '.');
  }
  if (!out.length && q.title) {
    let u = 'https://openlibrary.org/search.json?limit=4&fields=key,title,author_name,edition_key,first_publish_year&title=' + encodeURIComponent(q.title);
    if (q.author) u += '&author=' + encodeURIComponent(String(q.author).split(/[;,]/)[0]);
    const s = fetchJson_(u);
    if (s.__err) notes.push('Open Library nu răspunde acum (' + s.__err + ').');
    else (s.docs || []).slice(0, 3).forEach(d => {
      const ek = (d.edition_key || [])[0];
      if (!ek) return;
      const ed = fetchJson_('https://openlibrary.org/books/' + ek + '.json');
      if (!ed.__err && ed.key) out.push(olEdition_(ed, d.key));
    });
  }
  return out;
}

function gbLookup_(q, notes) {
  const key = props_().getProperty('GOOGLE_BOOKS_KEY');
  if (!key) { notes.push('Google Books nu e activ încă (lipsește cheia GOOGLE_BOOKS_KEY).'); return []; }
  const isbn = cleanIsbn_(q.isbn);
  const qt = s => '"' + String(s).replace(/"/g, '').trim() + '"';
  let qs = isbn.length >= 10 ? 'isbn:' + isbn : 'intitle:' + qt(q.title) + (q.author ? ' inauthor:' + qt(String(q.author).split(/[;,]/)[0]) : '');
  const s = fetchJson_('https://www.googleapis.com/books/v1/volumes?maxResults=3&q=' + encodeURIComponent(qs) + '&country=RO&key=' + encodeURIComponent(key));
  if (s.__err) { notes.push('Google Books nu răspunde acum (' + s.__err + ').'); return []; }
  return (s.items || []).map(it => {
    const v = it.volumeInfo || {};
    const ids = v.industryIdentifiers || [];
    const i13 = ids.filter(x => x.type === 'ISBN_13')[0] || ids.filter(x => x.type === 'ISBN_10')[0];
    const dm = v.dimensions ? [v.dimensions.height, v.dimensions.width, v.dimensions.thickness].filter(Boolean).join(' x ') : '';
    return {
      src: 'Google Books', url: v.infoLink || ('https://books.google.com/books?id=' + it.id),
      title: v.title || '', subtitle: v.subtitle || '', authors: v.authors || [],
      publisher: v.publisher || '', place: '', year: (String(v.publishedDate || '').match(/\d{4}/) || [''])[0],
      pages: v.pageCount ? String(v.pageCount) : '', isbn: i13 ? i13.identifier : '', lang: v.language ? [v.language] : [],
      dims: dm, binding: v.printType || '', desc: String(v.description || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      cover: v.imageLinks ? String(v.imageLinks.thumbnail || '').replace('http:', 'https:') : '',
      subjects: v.categories || [], raw: JSON.stringify(it)
    };
  });
}

/* ---------- Biblioteci naționale (SRU, gratuit, fără cheie): Library of Congress, Deutsche Nationalbibliothek, BnF ----------
 * Bibliotecile românești (BNR, BCU Cluj, BCU București) nu permit acces automat: BNR are verificare anti-robot,
 * BCU Cluj blochează serverele Google, BCU București are un catalog care merge doar în browser. */
function unesc_(s) {
  return String(s || '').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'").replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (m, n) => String.fromCharCode(parseInt(n, 16))).replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}
function dcRecords_(xml) {
  return String(xml).split(/<(?:\w+:)?recordData>/).slice(1).map(r => {
    r = r.split(/<\/(?:\w+:)?recordData>/)[0];
    const o = { _raw: r.slice(0, 20000) };
    r.replace(/<(?:\w+:)?(title|creator|contributor|publisher|date|format|language|identifier|subject|description)\b[^>]*>([\s\S]*?)<\/(?:\w+:)?\1>/g,
      (m, k, v) => { const t = unesc_(v); if (t) (o[k] = o[k] || []).push(t); return m; });
    return o;
  });
}
function cleanName_(s) {
  let n = String(s || '').replace(/\[[^\]]*\]/g, ' ').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  n = n.replace(/\s*\.\s+[A-ZÀ-Ý][^,]*$/, '');                 // BnF: „… . Auteur du texte”
  let parts = n.split(/\s*,\s*/).map(x => x.trim()).filter(Boolean);
  const k = parts.findIndex((x, i) => i > 0 && /^[a-zà-ÿ]/.test(x));  // „photographer.”, „host institution.”
  if (k > 0) parts = parts.slice(0, k);
  let out = parts.length === 2 && !/\d/.test(parts[1]) ? parts[1] + ' ' + parts[0] : parts.join(', ');
  return out.replace(/\s+/g, ' ').replace(/[.,;:\s]+$/, '').trim();
}
function dcToCand_(o, src, fallbackUrl) {
  const g = k => (o[k] || [])[0] || '';
  let title = g('title').split(/\s\/\s|\s\(\[|\s\[(?=[a-z])/)[0].replace(/\s*[\/:;,]\s*$/, '').trim();
  let sub = '';
  const ti = title.indexOf(' : ');
  if (ti > 0) { sub = title.slice(ti + 3); title = title.slice(0, ti); }
  let pub = g('publisher'), place = '';
  let m = pub.match(/^(.*?)\s*:\s*(.+)$/);
  if (m) { place = m[1]; pub = m[2]; }
  m = pub.match(/^([^()]+?)\s*\((.+)\)\s*$/);
  if (m) { pub = m[1]; place = place || m[2]; }
  pub = pub.replace(/[,;]\s*$/, '').replace(/,?\s*\[?\d{4}\]?\.?$/, '').trim();
  const fmt = (o.format || []).join(' ; ');
  const pg = fmt.match(/(\d+)\s*(?:p\b|pages|S\.|Seiten|unnumbered|non pag)/i);
  const dm = fmt.match(/(\d+(?:[.,]\d+)?)\s*(?:x\s*(\d+(?:[.,]\d+)?)\s*)?cm/i);
  const ids = (o.identifier || []).join(' ');
  const isb = ids.match(/97[89][\d-]{10,14}|\b\d{9}[\dXx]\b/);
  const link = (o.identifier || []).filter(x => /^https?:\/\//.test(x))[0] || fallbackUrl;
  const lang = (o.language || []).map(l => LANG3[String(l).toLowerCase()] || String(l).toLowerCase()).filter(Boolean);
  return {
    src: src, url: link, title: title, subtitle: sub, authors: (o.creator || []).map(cleanName_).filter(Boolean),
    others: (o.contributor || []).slice(0, 12), publisher: pub, place: place.replace(/[\[\]]/g, ''),
    year: (g('date').match(/\d{4}/) || [''])[0], pages: pg ? pg[1] : '', isbn: isb ? cleanIsbn_(isb[0]) : '',
    lang: lang, dims: dm ? (dm[2] ? dm[1] + ' x ' + dm[2] : dm[1]) + ' cm' : '', binding: '', desc: (o.description || []).filter(x => !/^Code à barres|^EAN/i.test(x)).join(' ').slice(0, 3000),
    cover: '', subjects: (o.subject || []).slice(0, 12), raw: o._raw
  };
}
function sruLookup_(q, notes) {
  const isbn = cleanIsbn_(q.isbn);
  const has = isbn.length === 10 || isbn.length === 13;
  const t = String(q.title || '').replace(/"/g, '').trim(), a = String(q.author || '').split(/[;,]/)[0].replace(/"/g, '').trim();
  if (!has && !t) return [];
  const S = [
    { src: 'Library of Congress', url: 'http://lx2.loc.gov:210/LCDB?version=1.1&operation=searchRetrieve&maximumRecords=2&recordSchema=dc&query=',
      q: has ? 'bath.isbn=' + isbn : 'dc.title="' + t + '"' + (a ? ' and dc.creator="' + a + '"' : ''),
      link: 'https://search.catalog.loc.gov/search?q=' + encodeURIComponent(has ? isbn : t) },
    { src: 'Deutsche Nationalbibliothek', url: 'https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&maximumRecords=2&recordSchema=oai_dc&query=',
      q: has ? 'num=' + isbn : 'tit="' + t + '"' + (a ? ' and per="' + a + '"' : ''),
      link: 'https://portal.dnb.de/opac.htm?method=simpleSearch&query=' + encodeURIComponent(has ? isbn : t) },
    { src: 'Bibliothèque nationale de France', url: 'https://catalogue.bnf.fr/api/SRU?version=1.2&operation=searchRetrieve&maximumRecords=2&recordSchema=dublincore&query=',
      q: has ? 'bib.isbn adj "' + isbn + '"' : 'bib.title all "' + t + '"' + (a ? ' and bib.author all "' + a + '"' : ''),
      link: 'https://catalogue.bnf.fr/rechercher.do?motRecherche=' + encodeURIComponent(has ? isbn : t) }
  ];
  let res;
  try {
    res = UrlFetchApp.fetchAll(S.map(x => ({ url: x.url + encodeURIComponent(x.q), muteHttpExceptions: true, headers: { 'User-Agent': 'BibliotecaCdRF/1.0' } })));
  } catch (e) { notes.push('Bibliotecile naționale nu răspund acum.'); return []; }
  const out = [];
  res.forEach((r, i) => {
    if (r.getResponseCode() !== 200) { notes.push(S[i].src + ' nu răspunde acum (' + r.getResponseCode() + ').'); return; }
    dcRecords_(r.getContentText()).slice(0, 2).forEach(o => { const c = dcToCand_(o, S[i].src, S[i].link); if (c.title) out.push(c); });
  });
  return out;
}

/** Caută cartea în sursele gratuite. q: {isbn, title, author, publisher, year} */
function lookupBook(session, q) {
  me_(session);
  q = q || {};
  if (!q.isbn && !q.title) throw new Error('Scrie cel puțin titlul sau ISBN-ul.');
  const notes = [];
  const cands = olLookup_(q, notes).concat(gbLookup_(q, notes)).concat(sruLookup_(q, notes));
  cands.forEach(c => { if (c.raw.length > 45000) c.raw = c.raw.slice(0, 45000); });
  return { cands: cands, notes: notes };
}

function rawSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(SH_RAW);
  if (!sh) {
    sh = ss.insertSheet(SH_RAW);
    sh.getRange(1, 1, 1, RAW_COLS.length).setValues([RAW_COLS]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Păstrează materialul brut al sursei din care s-a preluat ceva (intern, nu apare pe site). */
function saveRawSource(session, id, c) {
  const user = me_(session);
  const sh = rawSheet_();
  const row = [new Date(), user.name, String(id), String(c.src || ''), String(c.url || ''), String(c.title || ''),
    String(c.desc || '').slice(0, 45000), String(c.raw || '').slice(0, 45000)];
  sh.getRange(sh.getLastRow() + 1, 1, 1, row.length).setNumberFormat('@').setValues([row.map(String)]);
  return true;
}


/* ===================== Statistica proprie a site-ului =====================
 * Site-ul trimite doar: ce carte s-a deschis, ce s-a căutat (și câte rezultate), ce s-a pus în „Lista mea”.
 * Nu se salvează nimic despre vizitator (nici IP, nici cookie, nici identificator). */
const SH_STATS = 'Statistici';
const STAT_TYPES = { carte: 1, cautare: 1, lista: 1 };
function statSheet_() {
  const ss = ss_();
  let sh = ss.getSheetByName(SH_STATS);
  if (!sh) {
    sh = ss.insertSheet(SH_STATS);
    sh.getRange(1, 1, 1, 4).setValues([['Data', 'Tip', 'Ce (ID carte sau text căutat)', 'Rezultate']]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.getRange('A:C').setNumberFormat('@');
  }
  return sh;
}
function statLog_(p) {
  try {
    const t = String(p.t || '');
    if (STAT_TYPES[t]) {
      let k = t === 'cautare'
        ? String(p.q || '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 80)
        : (/^\d{1,6}$/.test(String(p.id || '')) ? String(p.id) : '');
      if (/^[=+\-@]/.test(k)) k = "'" + k;
      const cache = CacheService.getScriptCache(), ck = 'stn_' + today_();
      const used = Number(cache.get(ck) || 0);
      if (k.length >= 2 && used < 5000) {
        cache.put(ck, String(used + 1), 21600);
        const n = t === 'cautare' ? Math.max(0, Math.min(9999, parseInt(p.n, 10) || 0)) : '';
        statSheet_().appendRow([today_(), t, k, n]);
      }
    }
  } catch (err) { /* statistica nu trebuie să blocheze nimic */ }
  return ContentService.createTextOutput('ok');
}
/** Pentru pagina „Statistici” din admin. */
function getStats(session, days) {
  me_(session);
  days = Math.max(1, Math.min(365, parseInt(days, 10) || 30));
  const out = { days: days, total: { carte: 0, cautare: 0, lista: 0, zero: 0 }, open: [], list: [], search: [], zero: [], perDay: [] };
  const sh = ss_().getSheetByName(SH_STATS);
  if (!sh || sh.getLastRow() < 2) return out;
  const from = Utilities.formatDate(new Date(Date.now() - (days - 1) * 864e5), 'Europe/Bucharest', 'yyyy-MM-dd');
  const v = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getDisplayValues();
  const c = { carte: {}, cautare: {}, lista: {}, zero: {} }, per = {};
  v.forEach(r => {
    const d = String(r[0]), t = String(r[1]), k = String(r[2]).replace(/^'/, '');
    if (d < from || !c[t] || !k) return;
    out.total[t]++; c[t][k] = (c[t][k] || 0) + 1; per[d] = (per[d] || 0) + 1;
    if (t === 'cautare' && String(r[3]) === '0') { out.total.zero++; c.zero[k] = (c.zero[k] || 0) + 1; }
  });
  const top = (o, n) => Object.keys(o).map(k => [k, o[k]]).sort((a, b) => b[1] - a[1]).slice(0, n);
  const bs = ss_().getSheetByName(SH_BOOKS), h = headers_(bs);
  const rows = bs.getRange(2, 1, bs.getLastRow() - 1, h.length).getDisplayValues();
  const ti = h.indexOf('Titlu'), au = h.indexOf('Fotograf / autor'), T = {};
  rows.forEach(r => { T[r[0]] = [r[ti], r[au]]; });
  const withT = a => a.map(([id, n]) => [id, n, (T[id] || ['ID ' + id])[0], (T[id] || ['', ''])[1]]);
  out.open = withT(top(c.carte, 25)); out.list = withT(top(c.lista, 15));
  out.search = top(c.cautare, 30); out.zero = top(c.zero, 30);
  out.perDay = Object.keys(per).sort().map(d => [d, per[d]]);
  return out;
}
