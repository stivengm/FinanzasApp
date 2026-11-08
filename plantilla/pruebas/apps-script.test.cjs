// Pruebas del backend: node plantilla/pruebas/apps-script.test.cjs (o npm run test:script)
const assert = require('assert');
const path = require('path');
const { loadScript } = require('./gas-mock.cjs');

const SCRIPT = path.join(__dirname, '..', 'apps-script.gs');
const gas = loadScript(SCRIPT);

gas.configurar();
assert.deepStrictEqual(Object.keys(gas.sheets).sort(), ['Abonos', 'Ahorro', 'Deudas', 'Fijos', 'Gastos', 'Ingresos', 'Pagos', 'Usuarios']);

// Registro y validaciones
assert.strictEqual(gas.post({ action: 'register', usuario: 'ab', clave: '1234' }).ok, false);
const reg = gas.post({ action: 'register', usuario: 'stiven@correo.com', clave: 'clave123', nombre: 'Stiven' });
assert.ok(reg.ok && reg.token, JSON.stringify(reg));
assert.strictEqual(reg.perfil.tipoSalario, 'Fijo');
assert.strictEqual(gas.post({ action: 'register', usuario: 'STIVEN@correo.com ', clave: 'x1234' }).error, 'Ese usuario ya está registrado');
const amigo = gas.post({ action: 'register', usuario: 'amigo', clave: '9999' });

// Login: nunca devuelve la clave
assert.strictEqual(gas.post({ action: 'login', usuario: 'stiven@correo.com', clave: 'mala' }).error, 'Usuario o clave incorrectos');
const login = gas.post({ action: 'login', usuario: 'Stiven@correo.com', clave: 'clave123' });
assert.strictEqual(login.token, reg.token);
assert.strictEqual(JSON.stringify(login).includes('clave123'), false);
assert.strictEqual(gas.post({ action: 'data', usuario: 'stiven@correo.com', token: 'x' }).ok, false);

// Escritura y aislamiento entre usuarios
const s = { usuario: 'stiven@correo.com', token: reg.token };
const a = { usuario: 'amigo', token: amigo.token };
assert.ok(gas.post({ ...s, action: 'append', sheet: 'gastos', values: { fecha: '2026-10-23', descripcion: 'Almuerzo', monto: 120000 } }).ok);
assert.ok(gas.post({ ...a, action: 'append', sheet: 'gastos', values: { fecha: '2026-10-20', descripcion: 'Cine', monto: 30000 } }).ok);
assert.strictEqual(gas.post({ ...s, action: 'append', sheet: 'usuarios', values: {} }).ok, false, 'no puede escribir en Usuarios');
const datos = gas.post({ ...s, action: 'data' });
assert.deepStrictEqual(datos.tablas.gastos.rows.map((r) => r.cells[2]), ['Almuerzo']);
assert.strictEqual(datos.tablas.gastos.rows[0].cells[1], '2026-10-23');
assert.strictEqual(gas.post({ ...a, action: 'data' }).tablas.gastos.rows[0].cells[2], 'Cine');

// Deudas y abonos, aislados por usuario
assert.ok(gas.post({ ...s, action: 'append', sheet: 'deudas', values: { id: 'D1', deuda: 'Crédito', monto: 5000000, fecha: '2026-11-08', interesmensual: 1.8, cuotamensual: 450000 } }).ok);
assert.ok(gas.post({ ...s, action: 'append', sheet: 'abonos', values: { fecha: '2026-12-08', deudaid: 'D1', deuda: 'Crédito', tipo: 'Cuota', monto: 450000, nota: 'Cuota 1' } }).ok);
const dd = gas.post({ ...s, action: 'data' }).tablas;
assert.deepStrictEqual(dd.deudas.headers, ['Usuario', 'ID', 'Deuda', 'Acreedor', 'Monto', 'Fecha', 'Interés Mensual', 'Cuota Mensual']);
assert.deepStrictEqual(dd.deudas.rows[0].cells.slice(1), ['D1', 'Crédito', '', 5000000, '2026-11-08', 1.8, 450000]);
assert.deepStrictEqual(dd.abonos.rows[0].cells.slice(1), ['2026-12-08', 'D1', 'Crédito', 'Cuota', 450000, 'Cuota 1']);
assert.strictEqual(gas.post({ ...a, action: 'data' }).tablas.deudas.rows.length, 0);

// Perfil
const p = gas.post({ ...s, action: 'profile', values: { salario: 5000000, nombre: 'Stiven G', tipoSalario: 'Variable', fechaIngreso: '2026-09-18' } });
assert.deepStrictEqual(p.perfil, { usuario: 'stiven@correo.com', nombre: 'Stiven G', salario: 5000000, tipoSalario: 'Variable', fechaIngreso: '2026-09-18' });
assert.strictEqual(gas.post({ ...s, action: 'profile', values: { fechaIngreso: '' } }).perfil.fechaIngreso, '');

// Hoja antigua: las columnas y pestañas que faltan se agregan solas
const viejo = loadScript(SCRIPT);
viejo.configurar();
viejo.sheets.Usuarios.data.length = 0;
viejo.sheets.Usuarios.data.push(['Usuario', 'Clave', 'Nombre', 'Salario', 'Token', 'Registrado'], ['yo', '1234', '', 5000000, 'tok', '']);
const pv = viejo.post({ action: 'profile', usuario: 'yo', token: 'tok', values: { tipoSalario: 'Fijo', fechaIngreso: '2026-09-18' } });
assert.strictEqual(pv.perfil.fechaIngreso, '2026-09-18');
assert.deepStrictEqual(viejo.sheets.Usuarios.data[0].slice(-2), ['Tipo Salario', 'Fecha Ingreso']);
viejo.sheets.Gastos.data.length = 0;
viejo.sheets.Gastos.data.push(['Fecha', 'Descripción', 'Detalle', 'Categoría', 'Método de Pago', 'Monto']);
delete viejo.sheets.Deudas;
viejo.post({ action: 'data', usuario: 'yo', token: 'tok' });
assert.deepStrictEqual(viejo.sheets.Gastos.data[0].slice(-1), ['Usuario']);
assert.ok(viejo.sheets.Deudas, 'crea la pestaña Deudas si no existe');

console.log('OK: todas las pruebas del Apps Script pasaron');
