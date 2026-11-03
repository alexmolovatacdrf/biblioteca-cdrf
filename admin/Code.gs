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

function doGet() {
  const t = HtmlService.createTemplateFromFile('Index');
  return t.evaluate()
    .setTitle('Biblioteca CdRF – admin')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function me_() {
  const email = (Session.getActiveUser().getEmail() || '').toLowerCase();
  const rows = ss_().getSheetByName(SH_USERS).getDataRange().getValues().slice(1);
  const r = rows.find(x => String(x[0]).trim().toLowerCase() === email);
  if (!email || !r) throw new Error('Contul ' + (email || 'necunoscut') + ' nu are acces. Cere-i lui Alex să te adauge în tabul „Utilizatori”.');
  return { email: email, name: String(r[1] || email), role: String(r[2] || 'editor').trim().toLowerCase() };
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
function getInit() {
  const user = me_();
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
function getRecord(id) {
  me_();
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
function saveRecord(id, changes, before) {
  const user = me_();
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
    return { saved: log.length, conflicts: conflicts, record: getRecord(id) };
  } finally { lock.releaseLock(); }
}

/** Carte nouă: primește următorul ID liber, starea Ciornă. */
function newRecord(title) {
  const user = me_();
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
    return getRecord(id);
  } finally { lock.releaseLock(); }
}

/** Inventar: marchează cartea ca găsită la raft (sau anulează). */
function markShelf(id, found, note) {
  const user = me_();
  const stamp = found ? Utilities.formatDate(new Date(), 'Europe/Bucharest', 'dd.MM.yyyy') + ', ' + user.name : '';
  const ch = { 'Verificat la raft': stamp };
  if (note != null) ch['Note'] = note;
  return saveRecord(id, ch, null);
}

/** Istoricul unei cărți, cele mai noi întâi. */
function getHistory(id) {
  me_();
  const lg = ss_().getSheetByName(SH_LOG);
  if (lg.getLastRow() < 2) return [];
  return lg.getRange(2, 1, lg.getLastRow() - 1, 6).getDisplayValues()
    .filter(r => String(r[2]) === String(id)).reverse().slice(0, 50);
}
