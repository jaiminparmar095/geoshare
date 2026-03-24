// ═══════════════════════════════════════════════════════════
//  GeoShare — Google Apps Script  |  Code.gs
//  Deployed at:
//  https://script.google.com/macros/s/AKfycbzXDUvblpb-D7lBlOa4Q786RRGi_tIwf7PtELYxwZkbCWMkI0yO7HYIVZ2FB55QOWWx/exec
// ═══════════════════════════════════════════════════════════

const SHEET_NAME = 'GeoShare';
const MAX_ROWS   = 1000;

// ── GET ──────────────────────────────────────────────────────
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || '';

  // CORS for browser fetch
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  switch(action) {
    case 'latest': return respond(getLatest());
    case 'all':    return respond(getAll());
    case 'stats':  return respond(getStats());
    default:       return respond({ ok:true, service:'GeoShare', ts:new Date().toISOString() });
  }
}

// ── POST ─────────────────────────────────────────────────────
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const { latitude, longitude, accuracy, timestamp, mapsUrl, source } = body;

    if(latitude == null || longitude == null)
      return respond({ ok:false, error:'Missing lat/lng' });

    const sheet = getSheet();
    const ts    = timestamp || new Date().toISOString();
    const url   = mapsUrl || `https://maps.google.com/?q=${latitude},${longitude}`;
    const src   = source  || 'web';

    sheet.appendRow([ts, +latitude, +longitude, accuracy ? Math.round(+accuracy) : 0, url, src]);
    formatRow(sheet, sheet.getLastRow());
    trim(sheet);

    return respond({ ok:true, row: sheet.getLastRow()-1, saved:true });
  } catch(ex) {
    return respond({ ok:false, error: ex.toString() });
  }
}

// ── QUERIES ──────────────────────────────────────────────────
function getLatest() {
  const sheet = getSheet();
  const last  = sheet.getLastRow();
  if(last < 2) return { ok:true, found:false };
  const r = sheet.getRange(last, 1, 1, 6).getValues()[0];
  return { ok:true, found:true, timestamp:r[0], latitude:r[1], longitude:r[2], accuracy:r[3], mapsUrl:r[4], source:r[5] };
}

function getAll() {
  const sheet = getSheet();
  const last  = sheet.getLastRow();
  if(last < 2) return { ok:true, count:0, data:[] };
  const start = Math.max(2, last-199);
  const rows  = sheet.getRange(start, 1, last-start+1, 6).getValues();
  return {
    ok:true, count:rows.length,
    data: rows.reverse().map(r => ({ timestamp:r[0], latitude:r[1], longitude:r[2], accuracy:r[3], mapsUrl:r[4], source:r[5] }))
  };
}

function getStats() {
  const sheet = getSheet();
  const total = Math.max(0, sheet.getLastRow()-1);
  return { ok:true, total, sheet:SHEET_NAME, ts:new Date().toISOString() };
}

// ── SHEET ────────────────────────────────────────────────────
function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s    = ss.getSheetByName(SHEET_NAME);
  if(!s) { s = ss.insertSheet(SHEET_NAME); initSheet(s); }
  else if(s.getLastRow()===0) initSheet(s);
  return s;
}

function initSheet(s) {
  s.appendRow(['Timestamp','Latitude','Longitude','Accuracy (m)','Google Maps Link','Source']);
  const h = s.getRange(1,1,1,6);
  h.setBackground('#030712').setFontColor('#22d98a').setFontWeight('bold').setFontSize(11);
  h.setBorder(false,false,true,false,false,false,'#22d98a',SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  s.setColumnWidths(1,6,[200,130,130,110,280,150]);
  s.setFrozenRows(1);
  s.setTabColor('#22d98a');
}

function formatRow(s, row) {
  const r  = s.getRange(row,1,1,6);
  const bg = row%2===0 ? '#080f1e' : '#060c18';
  r.setBackground(bg).setFontColor('#c8d4e8').setFontSize(10);
  s.getRange(row,2).setNumberFormat('0.00000000');
  s.getRange(row,3).setNumberFormat('0.00000000');
  const cell = s.getRange(row,5);
  const url  = cell.getValue();
  if(url && String(url).startsWith('http')) {
    cell.setFormula(`=HYPERLINK("${url}","📍 View")`);
    cell.setFontColor('#38bdf8');
  }
}

function trim(s) {
  const last = s.getLastRow();
  if(last > MAX_ROWS+1) s.deleteRows(2, last-MAX_ROWS-1);
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
