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
    const row = h.map(k => k === 'ID' ? id : k === 'Stare' ? 'Ciornă' : k === 'Titlu' ? (title || '') : '');
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
