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
const UI_URL = 'https://raw.githubusercontent.com/alexmolovatacdrf/biblioteca-cdrf/main/admin/Index.html';

function uiHtml_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('ui');
  if (hit) return hit;
  try {
    const r = UrlFetchApp.fetch(UI_URL + '?t=' + Math.floor(Date.now() / 300000), { muteHttpExceptions: true });
    if (r.getResponseCode() === 200) {
      const html = r.getContentText('UTF-8');
      if (html.length < 95000) cache.put('ui', html, 300);
      return html;
    }
  } catch (e) {}
  return HtmlService.createHtmlOutputFromFile('Index').getContent();
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.api === 'panouri') return panelsApi_();
  const boot = { code: String(p.code || '').slice(0, 4096), state: String(p.state || '').slice(0, 256),
    error: p.error ? 'Conectarea Google nu s-a finalizat.' : '', google: !!props_().getProperty('GOOGLE_CLIENT_ID') };
  const html = uiHtml_().replace('<!--BOOT-->', '<script>window.BOOT=' + JSON.stringify(boot).replace(/</g, '\\u003c') + ';</script>');
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
const SESSION_DAYS = 30;

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
function beginLogin() {
  const P = props_(), id = P.getProperty('GOOGLE_CLIENT_ID'), url = P.getProperty('WEBAPP_URL');
  if (!id || !url) throw new Error('Logarea cu Google nu e configurată.');
  const state = random_(), nonce = random_();
  CacheService.getScriptCache().put('st_' + state, nonce, 600);
  const q = { client_id: id, redirect_uri: url, response_type: 'code', scope: 'openid email',
    access_type: 'online', prompt: 'select_account', state: state, nonce: nonce };
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + Object.keys(q).map(k => k + '=' + encodeURIComponent(q[k])).join('&');
}

/** Pasul 2: Google ne trimite înapoi un cod; îl schimbăm pe server și deschidem o sesiune. */
function finishLogin(code, state) {
  const P = props_(), cache = CacheService.getScriptCache();
  const nonce = cache.get('st_' + state);
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
  P.setProperty('S_' + hash_(session), JSON.stringify({ email: u.email, exp: Date.now() + SESSION_DAYS * 864e5 }));
  cleanSessions_();
  return { session: session, user: u };
}

function logout(session) {
  if (typeof session === 'string') props_().deleteProperty('S_' + hash_(session));
  return true;
}

function cleanSessions_() {
  const all = props_().getProperties(), now = Date.now();
  Object.keys(all).forEach(k => { if (k.indexOf('S_') === 0) { try { if (JSON.parse(all[k]).exp < now) props_().deleteProperty(k); } catch (e) { props_().deleteProperty(k); } } });
}

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
  const lock = LockService.getDocumentLock();
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
    Object.keys(changes).forEach(k => {
      const i = h.indexOf(k);
      if (i < 0) return;
      if (user.role !== 'admin' && ADMIN_ONLY.indexOf(k) >= 0) return;
      let nv = String(changes[k] == null ? '' : changes[k]);
      if (k === 'Stare' && nv === 'Publicată' && user.role !== 'admin') throw new Error('Doar adminul poate publica o carte. Pune „Gata de publicare”.');
      if (before && k in before && String(before[k]) !== String(cur[i])) { conflicts.push({ field: k, now: cur[i] }); return; }
      if (nv === cur[i]) return;
      const cell = sh.getRange(row, i + 1);
      if (/^(ISBN|ID|An|Wix ID)$/.test(k) || /^[0-9+\-=]/.test(nv)) cell.setNumberFormat('@');
      cell.setValue(nv);
      log.push([now, user.name, String(id), k, cur[i], nv]);
    });
    if (log.length) {
      const lg = ss_().getSheetByName(SH_LOG);
      lg.getRange(lg.getLastRow() + 1, 1, log.length, 6).setValues(log);
    }
    return { saved: log.length, conflicts: conflicts, record: getRecord(session, id) };
  } finally { lock.releaseLock(); }
}

/** Carte nouă: primește următorul ID liber, starea Ciornă. */
function newRecord(session, title) {
  const user = me_(session);
  const lock = LockService.getDocumentLock();
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
    lg.appendRow([new Date(), user.name, id, 'Carte nouă', '', title || '']);
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

/* ---------------- Panouri pe prima pagină ----------------
 * Tabul „Panouri”: un rând pe panou. Site-ul public le citește prin ?api=panouri
 * (doar cele pornite și încă neexpirate), deci o schimbare apare pe site în câteva minute, fără republicare.
 * Afișare de la / până la: fereastra în care panoul e pe site. Goale = de acum până se termină evenimentul.
 * Propunerile (Sursă începe cu „propunere”, Activ = nu) nu ajung pe site până nu le aprobă un editor.
 */
// Tipuri speciale: „Cartea săptămânii” (o carte, cu text) și „Cărți noi” (până la 12 cărți) au secțiunile lor pe prima pagină;
// restul sunt evenimente și intră în caruselul de sus.
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
    const list = panelRows_().filter(p => p.active && (p.to ? p.to >= d : (!p.date || (p.end || p.date) >= d)))
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
  if (!String(p.title || '').trim() && !String(p.guest || '').trim() && !(p.books || []).length) throw new Error('Panoul are nevoie de titlu, invitat sau cel puțin o carte.');
  const lock = LockService.getDocumentLock(); lock.waitLock(20000);
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
      src: p.src || (before && before.src) || 'manual', updated: Utilities.formatDate(new Date(), 'Europe/Bucharest', 'dd.MM.yyyy HH:mm') + ', ' + user.name };
    const line = h.map(c => { const i = PANEL_COLS.indexOf(c); return i < 0 ? '' : String(val[PANEL_KEYS[i]] == null ? '' : val[PANEL_KEYS[i]]).slice(0, 2000); });
    sh.getRange(row, 1, 1, h.length).setNumberFormat('@').setValues([line]);
    const lg = ss_().getSheetByName(SH_LOG);
    lg.appendRow([new Date(), user.name, 'panou ' + id, before ? 'Panou modificat' : 'Panou nou', before ? (before.title || before.kind) : '', (p.title || p.kind) + (p.active ? '' : ' (oprit)')]);
    CacheService.getScriptCache().remove('panels');
    return panelRows_().find(r => r.id === id);
  } finally { lock.releaseLock(); }
}

/** Șterge un panou: adminul oricare, editorii doar propunerile (respinse). De obicei e mai bine să-l oprești. */
function deletePanel(session, id) {
  const user = me_(session);
  const lock = LockService.getDocumentLock(); lock.waitLock(20000);
  try {
    const sh = panelsSheet_();
    const ids = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 1).getDisplayValues().map(r => r[0]);
    const i = ids.indexOf(String(id)); if (i < 0) throw new Error('Nu găsesc panoul ' + id);
    const cur = panelRows_().find(r => r.id === String(id));
    const prop = cur && !cur.active && /^propunere/i.test(cur.src || '');
    if (user.role !== 'admin' && !(prop && user.role === 'editor')) throw new Error('Doar adminul poate șterge un panou. Îl poți opri.');
    sh.deleteRow(i + 2);
    ss_().getSheetByName(SH_LOG).appendRow([new Date(), user.name, 'panou ' + id, 'Panou șters', '', '']);
    CacheService.getScriptCache().remove('panels');
    return true;
  } finally { lock.releaseLock(); }
}
