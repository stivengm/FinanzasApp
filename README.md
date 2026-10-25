# FinanzSync — finanzas-app

Aplicación web en **Angular 21** para llevar finanzas personales sobre una hoja de **Google Sheets** privada. Cada persona se registra con usuario (o correo) y clave; todos comparten la misma hoja, pero cada uno solo ve sus propios datos. El diseño sigue el prototipo de `prototipo/` (sistema *Precision Editorial Finance*).

## Pantallas

| Ruta | Pantalla |
| --- | --- |
| `/inicio` | Resumen: balance del mes, meta de ahorro, próximos vencimientos, últimos movimientos |
| `/ingresos` | Salario mensual, prima sugerida, ingresos extra del mes, bóveda de ahorro y remanente |
| `/fijos` | Responsabilidades fijas con estado pagado / pendiente / programado |
| `/gastos` | Gastos variables con búsqueda, filtros por categoría y promedio diario |
| `/sheets` | Analítica (tasa de ahorro, distribución, evolución trimestral) y hub de sincronización |
| `/ingresar` | Ingreso y registro con usuario o correo + clave (y modo demo) |
| `/perfil` | Nombre, tipo de salario (fijo o variable), salario, fecha de ingreso y cierre de sesión |

## Ejecutar

```bash
npm install
npm start          # http://localhost:4200
npm test           # pruebas unitarias (Vitest)
npm run build      # build de producción en dist/
```

## Configurar el backend (una sola vez, lo hace el propietario)

La app no lee la hoja directamente: habla con un **Apps Script** publicado como aplicación web, que corre con tus permisos. Así la hoja puede quedar **privada** y nadie ve las claves.

1. Crea una hoja nueva en Google Sheets (o sube `plantilla/finanzas-plantilla.xlsx` y ábrela como Hoja de cálculo de Google).
2. Menú **Extensiones → Apps Script**. Borra el contenido de `Código.gs` y pega todo `plantilla/apps-script.gs`. Guarda (💾).
3. En la barra superior elige la función **`configurar`** y pulsa **Ejecutar**. Google pedirá permisos: *Revisar permisos → tu cuenta → Configuración avanzada → Ir a FinanzSync (no seguro) → Permitir*. Esto crea las pestañas que falten.
4. **Implementar → Nueva implementación** → ⚙️ *Tipo: Aplicación web*:
   - Descripción: `FinanzSync`
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier usuario**
5. Pulsa **Implementar** y copia la **URL de la aplicación web** (termina en `/exec`).
6. Pégala en `src/app/app.settings.ts`:
   ```ts
   export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/XXXX/exec';
   ```
7. En la hoja, **Compartir → Acceso general: Restringido** (solo tú). La app sigue funcionando porque el script corre como tú.

> Si cambias el código del script: **Implementar → Gestionar implementaciones → ✏️ → Versión: Nueva versión → Implementar**. La URL no cambia.

## Usuarios

- Cualquiera con la URL de la app puede **crear su cuenta** con usuario o correo y clave (mín. 4 caracteres).
- Las cuentas quedan en la pestaña `Usuarios` en texto plano (Usuario, Clave, Nombre, Salario, Token, Registrado). El script nunca devuelve la clave a la app.
- Todas las pestañas de datos tienen la columna `Usuario`; el script solo lee y escribe las filas del usuario autenticado.

## Estructura de la hoja

| Pestaña | Columnas |
| --- | --- |
| `Usuarios` | Usuario · Clave · Nombre · **Salario** · Token · Registrado · Tipo Salario (Fijo/Variable) · Fecha Ingreso |
| `Ingresos` | Usuario · Fecha · Fuente · Descripción · Tipo (Salario/Extra/Prima/Bonificación/Renta/Otro) · Monto |
| `Ahorro` | Usuario · Objetivo · Descripción · Meta · Ahorrado · Aporte Mensual |
| `Fijos` | Usuario · Servicio · Proveedor · Categoría · Frecuencia (Mensual/Bimestral/…) · Día de Pago · Monto |
| `Pagos` | Usuario · Fecha · Servicio · Monto — un registro por cada pago de un fijo |
| `Gastos` | Usuario · Fecha · Descripción · Detalle · Categoría · Método de Pago · Monto |

Reglas de cálculo:

- **Tipo de salario** (perfil):
  - **Fijo**: se ingresa el salario **bruto** una vez (columna `Salario`) y cuenta todos los meses.
  - **Variable**: cada mes se registra el salario bruto en `Ingresos` con `Tipo = Salario`; la app lo recuerda en Inicio.
- Como ingreso cuenta el **neto** = bruto − 4% salud − 4% pensión (p. ej. $5.000.000 → $4.600.000). No incluye retención en la fuente ni fondo de solidaridad pensional.
- Los ingresos de `Ingresos` cuentan solo en el mes de su fecha.
- **Prima de servicios** = salario base × días trabajados en el semestre ÷ 360, con meses de 30 días (semestre completo = 180 días = salario ÷ 2). Sin descuentos de salud ni pensión.
  - Se sugiere en junio (pago hasta el 30, semestre ene–jun) y diciembre (hasta el 20, semestre jul–dic).
  - Si hay **fecha de ingreso** en el perfil dentro del semestre, cuenta desde esa fecha. Ej.: ingreso 18 sep 2026 → 103 días → $5.000.000 × 103 ÷ 360 = $1.430.556.
  - Al registrarla se pregunta si el semestre fue completo o desde/hasta qué fecha, y se recalcula.
  - Base: el salario fijo, o el **promedio** del salario variable registrado en el semestre.
- Un fijo está **pagado** en un mes si existe una fila en `Pagos` con el mismo servicio en ese mes. Los fijos bimestrales, trimestrales, etc. se programan a partir de su último pago.
- **Balance disponible** = ingresos − (fijos + gastos variables) − aportes mensuales de ahorro.

## Arquitectura

```
src/app/
  core/        sesión (localStorage), cliente del Apps Script, store con signals, parseo
  layout/      shell: header, navegación inferior, toasts
  forms/       formularios en hoja inferior (gasto, ingreso, fijo, meta)
  pages/       ingresar, perfil, inicio, ingresos, fijos, gastos, sheets
  shared/      pipe de moneda COP, selector de mes, iconos por categoría
plantilla/     plantilla .xlsx y backend en Apps Script
app.settings.ts  URL del Apps Script
```

Estilos con Tailwind CSS v4; los tokens del prototipo están en `src/styles.css`.
