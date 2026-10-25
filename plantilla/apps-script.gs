/**
 * FinanzSync — backend en Google Apps Script.
 *
 * La hoja queda PRIVADA: la app solo habla con este script, que lee y escribe
 * con los permisos del propietario y nunca devuelve la columna "Clave".
 * Cada usuario solo ve y escribe sus propias filas (columna "Usuario").
 *
 * Instalación: ver README.md → "Configurar el backend".
 */
const HOJAS = {
  usuarios: { nombre: 'Usuarios', columnas: ['Usuario', 'Clave', 'Nombre', 'Salario', 'Token', 'Registrado', 'Tipo Salario', 'Fecha Ingreso'] },
  ingresos: { nombre: 'Ingresos', columnas: ['Usuario', 'Fecha', 'Fuente', 'Descripción', 'Tipo', 'Monto'] },
  ahorro: { nombre: 'Ahorro', columnas: ['Usuario', 'Objetivo', 'Descripción', 'Meta', 'Ahorrado', 'Aporte Mensual'] },
  fijos: { nombre: 'Fijos', columnas: ['Usuario', 'Servicio', 'Proveedor', 'Categoría', 'Frecuencia', 'Día de Pago', 'Monto'] },
  pagos: { nombre: 'Pagos', columnas: ['Usuario', 'Fecha', 'Servicio', 'Monto'] },
  gastos: { nombre: 'Gastos', columnas: ['Usuario', 'Fecha', 'Descripción', 'Detalle', 'Categoría', 'Método de Pago', 'Monto'] },
};
const DATOS = ['ingresos', 'ahorro', 'fijos', 'pagos', 'gastos'];

/** Ejecútala una vez desde el editor: crea las pestañas y pide los permisos. */
function configurar() {
  Object.keys(HOJAS).forEach(hoja_);
}

function doGet() {
  return json_({ ok: true, app: 'FinanzSync' });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const accion = ACCIONES[body.action];
    if (!accion) throw new Error('Acción no soportada: ' + body.action);
    return json_(Object.assign({ ok: true }, accion(body)));
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  }
}

const ACCIONES = {
  register: function (b) {
    const usuario = String(b.usuario || '').trim();
    const clave = String(b.clave || '');
    if (usuario.length < 3) throw new Error('El usuario debe tener al menos 3 caracteres');
    if (clave.length < 4) throw new Error('La clave debe tener al menos 4 caracteres');
    return conLock_(function () {
      if (buscarUsuario_(usuario)) throw new Error('Ese usuario ya está registrado');
      const token = Utilities.getUuid();
      agregarFila_('usuarios', {
        usuario: usuario,
        clave: clave,
        nombre: String(b.nombre || '').trim(),
        salario: 0,
        token: token,
        registrado: new Date(),
        tiposalario: 'Fijo',
      });
      return { token: token, perfil: perfil_(buscarUsuario_(usuario)) };
    });
  },

  login: function (b) {
    const u = buscarUsuario_(String(b.usuario || '').trim());
    if (!u || String(u.datos.clave) !== String(b.clave || '')) throw new Error('Usuario o clave incorrectos');
    let token = String(u.datos.token || '');
    if (!token) {
      token = Utilities.getUuid();
      escribirCelda_(u, 'token', token);
    }
    return { token: token, perfil: perfil_(u) };
  },

  data: function (b) {
    const u = autenticar_(b);
    const tablas = {};
    DATOS.forEach(function (key) {
      const sheet = hoja_(key);
      const values = sheet.getDataRange().getValues();
      const headers = values[0].map(function (h) { return String(h).trim(); });
      const col = indice_(headers, 'usuario');
      const rows = [];
      for (let i = 1; i < values.length; i++) {
        if (igual_(values[i][col], u.datos.usuario)) {
          rows.push({ rowNumber: i + 1, cells: values[i].map(celda_) });
        }
      }
      tablas[key] = { headers: headers, rows: rows };
    });
    return { perfil: perfil_(u), tablas: tablas };
  },

  append: function (b) {
    const u = autenticar_(b);
    if (DATOS.indexOf(b.sheet) < 0) throw new Error('Pestaña no permitida: ' + b.sheet);
    const values = Object.assign({}, b.values, { usuario: u.datos.usuario });
    return conLock_(function () {
      return { row: agregarFila_(b.sheet, values) };
    });
  },

  profile: function (b) {
    const u = autenticar_(b);
    const v = b.values || {};
    if (v.nombre !== undefined) escribirCelda_(u, 'nombre', String(v.nombre).trim());
    if (v.salario !== undefined) escribirCelda_(u, 'salario', Number(v.salario) || 0);
    if (v.tipoSalario !== undefined) escribirCelda_(u, 'tiposalario', v.tipoSalario === 'Variable' ? 'Variable' : 'Fijo');
    if (v.fechaIngreso !== undefined) escribirCelda_(u, 'fechaingreso', aCelda_('Fecha Ingreso', v.fechaIngreso));
    return { perfil: perfil_(buscarUsuario_(u.datos.usuario)) };
  },
};

// ---------- Utilidades ----------

function hoja_(key) {
  const def = HOJAS[key];
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName(def.nombre);
  if (!sheet) {
    sheet = ss.insertSheet(def.nombre);
    sheet.getRange(1, 1, 1, def.columnas.length).setValues([def.columnas]).setFontWeight('bold');
    sheet.setFrozenRows(1);
    return sheet;
  }
  // Agrega al final las columnas que falten (p. ej. "Usuario" en una hoja antigua).
  const actuales = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0].map(normalize_);
  const faltantes = def.columnas.filter(function (c) { return actuales.indexOf(normalize_(c)) < 0; });
  if (faltantes.length) {
    const inicio = sheet.getLastColumn() + 1;
    sheet.getRange(1, inicio, 1, faltantes.length).setValues([faltantes]).setFontWeight('bold');
  }
  return sheet;
}

function headers_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
}

function indice_(headers, campo) {
  const n = normalize_(campo);
  for (let i = 0; i < headers.length; i++) if (normalize_(headers[i]) === n) return i;
  return -1;
}

/** Agrega una fila; `values` usa claves normalizadas (minúsculas, sin tildes ni espacios). */
function agregarFila_(key, values) {
  const sheet = hoja_(key);
  const norm = {};
  Object.keys(values).forEach(function (k) { norm[normalize_(k)] = values[k]; });
  const row = headers_(sheet).map(function (h) { return aCelda_(h, norm[normalize_(h)]); });
  sheet.appendRow(row);
  return sheet.getLastRow();
}

function buscarUsuario_(usuario) {
  if (!usuario) return null;
  const sheet = hoja_('usuarios');
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function (h) { return String(h).trim(); });
  const col = indice_(headers, 'usuario');
  for (let i = 1; i < values.length; i++) {
    if (igual_(values[i][col], usuario)) {
      const datos = {};
      headers.forEach(function (h, j) { datos[normalize_(h)] = values[i][j]; });
      return { sheet: sheet, headers: headers, fila: i + 1, datos: datos };
    }
  }
  return null;
}

function autenticar_(b) {
  const u = buscarUsuario_(String(b.usuario || '').trim());
  if (!u || !b.token || String(u.datos.token) !== String(b.token)) {
    throw new Error('Sesión expirada. Ingresa de nuevo.');
  }
  return u;
}

function escribirCelda_(u, campo, valor) {
  u.sheet.getRange(u.fila, indice_(u.headers, campo) + 1).setValue(valor);
  u.datos[campo] = valor;
}

function perfil_(u) {
  return {
    usuario: String(u.datos.usuario),
    nombre: String(u.datos.nombre || ''),
    salario: Number(u.datos.salario) || 0,
    tipoSalario: u.datos.tiposalario === 'Variable' ? 'Variable' : 'Fijo',
    fechaIngreso: u.datos.fechaingreso ? String(celda_(u.datos.fechaingreso)) : '',
  };
}

function conLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function igual_(a, b) {
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

function normalize_(h) {
  return String(h).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function celda_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return v;
}

function aCelda_(header, value) {
  if (value === undefined || value === null) return '';
  if (normalize_(header).indexOf('fecha') === 0 && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const p = String(value).split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  return value;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
