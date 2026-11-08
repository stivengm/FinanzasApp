"""Genera plantilla/finanzas-plantilla.xlsx con las pestañas que usa el Apps Script.

Uso: python3 plantilla/generar-plantilla.py   (requiere: pip install openpyxl)
"""
import os
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.worksheet.datavalidation import DataValidation

SALIDA = os.path.join(os.path.dirname(__file__), 'finanzas-plantilla.xlsx')
HEADER_FILL = PatternFill('solid', fgColor='0F1C2C')
HEADER_FONT = Font(bold=True, color='FFFFFF')
MONEY = '"$" #,##0'
DATE = 'dd/mm/yyyy'

wb = Workbook()
wb.remove(wb.active)


def sheet(name, headers, money=(), dates=(), widths=(), lists=None, formats=None):
    ws = wb.create_sheet(name)
    ws.append(headers)
    for c in ws[1]:
        c.fill, c.font, c.alignment = HEADER_FILL, HEADER_FONT, Alignment(vertical='center')
    for i, h in enumerate(headers, start=1):
        col = ws.cell(1, i).column_letter
        fmt = MONEY if h in money else DATE if h in dates else (formats or {}).get(h)
        if fmt:
            for r in range(2, 1001):
                ws[f'{col}{r}'].number_format = fmt
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[ws.cell(1, i).column_letter].width = w
    for h, values in (lists or {}).items():
        col = ws.cell(1, headers.index(h) + 1).column_letter
        dv = DataValidation(type='list', formula1='"' + ','.join(values) + '"', allow_blank=True)
        dv.add(f'{col}2:{col}1000')
        ws.add_data_validation(dv)
    ws.freeze_panes = 'A2'


sheet('Usuarios', ['Usuario', 'Clave', 'Nombre', 'Salario', 'Token', 'Registrado', 'Tipo Salario', 'Fecha Ingreso'],
      money=['Salario'], dates=['Registrado', 'Fecha Ingreso'], widths=[28, 16, 20, 14, 38, 14, 14, 14],
      lists={'Tipo Salario': ['Fijo', 'Variable']})
sheet('Ingresos', ['Usuario', 'Fecha', 'Fuente', 'Descripción', 'Tipo', 'Monto'],
      money=['Monto'], dates=['Fecha'], widths=[24, 12, 28, 30, 14, 14],
      lists={'Tipo': ['Salario', 'Extra', 'Prima', 'Bonificación', 'Renta', 'Otro']})
sheet('Ahorro', ['Usuario', 'Objetivo', 'Descripción', 'Meta', 'Ahorrado', 'Aporte Mensual'],
      money=['Meta', 'Ahorrado', 'Aporte Mensual'], widths=[24, 24, 28, 14, 14, 16])
sheet('Fijos', ['Usuario', 'Servicio', 'Proveedor', 'Categoría', 'Frecuencia', 'Día de Pago', 'Monto'],
      money=['Monto'], widths=[24, 30, 24, 14, 12, 12, 14],
      lists={'Frecuencia': ['Mensual', 'Bimestral', 'Trimestral', 'Semestral', 'Anual']})
sheet('Pagos', ['Usuario', 'Fecha', 'Servicio', 'Monto'], money=['Monto'], dates=['Fecha'], widths=[24, 12, 30, 14])
sheet('Gastos', ['Usuario', 'Fecha', 'Descripción', 'Detalle', 'Categoría', 'Método de Pago', 'Monto'],
      money=['Monto'], dates=['Fecha'], widths=[24, 12, 32, 30, 24, 20, 14],
      lists={'Categoría': ['Comida & Salidas', 'Celebraciones & Regalos', 'Ocio & Eventos', 'Pago Tarjetas',
                           'Transporte', 'Mercado', 'Salud', 'Hogar', 'Otros'],
             'Método de Pago': ['Débito', 'Tarjeta de Crédito', 'Efectivo', 'Transferencia']})
# Interés Mensual en % (0 = sin interés). ID enlaza cada deuda con sus abonos.
sheet('Deudas', ['Usuario', 'ID', 'Deuda', 'Acreedor', 'Monto', 'Fecha', 'Interés Mensual', 'Cuota Mensual'],
      money=['Monto', 'Cuota Mensual'], dates=['Fecha'], widths=[24, 18, 28, 20, 14, 12, 14, 14],
      formats={'Interés Mensual': '0.00'})
sheet('Abonos', ['Usuario', 'Fecha', 'Deuda ID', 'Deuda', 'Tipo', 'Monto', 'Nota'],
      money=['Monto'], dates=['Fecha'], widths=[24, 12, 18, 28, 16, 14, 30],
      lists={'Tipo': ['Cuota', 'Abono a capital', 'Pago total']})

wb.save(SALIDA)
print('Plantilla generada:', SALIDA)
