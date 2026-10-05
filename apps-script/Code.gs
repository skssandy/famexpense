/**
 * FamExpenses free sync backend — paste in Google Apps Script, deploy as Web App.
 * Setup: sheets.new → Extensions → Apps Script → paste this → set SECRET below →
 * Deploy → New deployment → Web app → Execute as: Me, Access: Anyone with link → copy URL into app.
 */
const SECRET = 'CHANGE-ME-sandy-family-2026'; // <-- must match secret typed in app on BOTH phones

function sheet(name, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(headers); }
  return sh;
}
function checkSecret(s) {
  if (s !== SECRET) throw new Error('bad secret — copy SECRET into Code.gs and app settings');
}
function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    checkSecret(p.secret);
    if (p.action === 'pull') return json({ ok: true, entries: readEntries(), budgets: readBudgets(), goals: readGoals() });
    return json({ ok: true, msg: 'FamExpenses API alive. Use ?action=pull&secret=...' });
  } catch (err) { return json({ ok: false, error: String(err) }); }
}
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    checkSecret(d.secret);
    if (d.action === 'push') {
      writeEntries(d.entries || []);
      writeBudgets(d.budgets || {});
      writeGoals(d.goals || []);
      return json({ ok: true, count: (d.entries || []).length });
    }
    return json({ ok: false, error: 'unknown action' });
  } catch (err) { return json({ ok: false, error: String(err) }); }
}
function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

// --- entries: id,type,date,amount,category,mode,note,by,updatedAt ---
function readEntries() {
  const sh = sheet('Entries', ['id','type','date','amount','category','mode','note','by','updatedAt']);
  const vals = sh.getDataRange().getValues(); vals.shift();
  return vals.filter(r => r[0]).map(r => ({ id: String(r[0]), type: r[1], date: String(r[2]), amount: Number(r[3])||0, category: String(r[4]), mode: String(r[5]), note: String(r[6]), by: String(r[7]), updatedAt: Number(r[8])||0 }));
}
function writeEntries(list) {
  const sh = sheet('Entries', ['id','type','date','amount','category','mode','note','by','updatedAt']);
  sh.clear(); sh.appendRow(['id','type','date','amount','category','mode','note','by','updatedAt']);
  const rows = list.map(x => [x.id,x.type,x.date,x.amount,x.category,x.mode,x.note,x.by,x.updatedAt||Date.now()]);
  if (rows.length) sh.getRange(2,1,rows.length,rows[0].length).setValues(rows);
}
function readBudgets() {
  const sh = sheet('Budgets', ['category','amount']);
  const vals = sh.getDataRange().getValues(); vals.shift();
  const o = {}; vals.forEach(r => { if (r[0]) o[String(r[0])] = Number(r[1])||0; }); return o;
}
function writeBudgets(o) {
  const sh = sheet('Budgets', ['category','amount']);
  sh.clear(); sh.appendRow(['category','amount']);
  const rows = Object.entries(o); if (rows.length) sh.getRange(2,1,rows.length,2).setValues(rows);
}
function readGoals() {
  const sh = sheet('Goals', ['id','name','target','saved','deadline','updatedAt']);
  const vals = sh.getDataRange().getValues(); vals.shift();
  return vals.filter(r => r[0]).map(r => ({ id: String(r[0]), name: String(r[1]), target: Number(r[2])||0, saved: Number(r[3])||0, deadline: String(r[4]||''), updatedAt: Number(r[5])||0 }));
}
function writeGoals(list) {
  const sh = sheet('Goals', ['id','name','target','saved','deadline','updatedAt']);
  sh.clear(); sh.appendRow(['id','name','target','saved','deadline','updatedAt']);
  const rows = list.map(g => [g.id,g.name,g.target,g.saved||0,g.deadline||'',g.updatedAt||Date.now()]);
  if (rows.length) sh.getRange(2,1,rows.length,rows[0].length).setValues(rows);
}
