// Simulación mínima de Google Apps Script para ejecutar plantilla/apps-script.gs en Node.
const fs = require('fs');
const vm = require('vm');
const crypto = require('crypto');

function createSheet(name) {
  const data = [];
  const setCell = (r, c, v) => {
    while (data.length < r) data.push([]);
    const row = data[r - 1];
    while (row.length < c) row.push('');
    row[c - 1] = v;
  };
  const sheet = {
    name,
    data,
    getLastRow: () => data.length,
    getLastColumn: () => data.reduce((m, r) => Math.max(m, r.length), 0),
    getDataRange: () => sheet.getRange(1, 1, Math.max(data.length, 1), Math.max(sheet.getLastColumn(), 1)),
    getRange: (row, col, numRows = 1, numCols = 1) => ({
      getValues: () =>
        Array.from({ length: numRows }, (_, i) =>
          Array.from({ length: numCols }, (_, j) => (data[row - 1 + i] || [])[col - 1 + j] ?? ''),
        ),
      setValues: (vals) => {
        vals.forEach((r, i) => r.forEach((v, j) => setCell(row + i, col + j, v)));
        return { setFontWeight: () => {} };
      },
      setValue: (v) => setCell(row, col, v),
      setFontWeight: () => {},
    }),
    appendRow: (r) => data.push([...r]),
    setFrozenRows: () => {},
  };
  return sheet;
}

function loadScript(path) {
  const sheets = {};
  const pad = (n) => String(n).padStart(2, '0');
  const ctx = {
    SpreadsheetApp: {
      getActive: () => ({
        getSheetByName: (n) => sheets[n] || null,
        insertSheet: (n) => (sheets[n] = createSheet(n)),
      }),
    },
    ContentService: {
      MimeType: { JSON: 'json' },
      createTextOutput: (text) => ({ text, setMimeType() { return this; } }),
    },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      formatDate: (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    Session: { getScriptTimeZone: () => 'America/Bogota' },
    console,
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path, 'utf8') + '\nthis.doPost = doPost; this.doGet = doGet; this.configurar = configurar;', ctx);
  return {
    sheets,
    post: (body) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(body) } }).text),
    get: () => JSON.parse(ctx.doGet().text),
    configurar: () => ctx.configurar(),
  };
}

module.exports = { loadScript };
