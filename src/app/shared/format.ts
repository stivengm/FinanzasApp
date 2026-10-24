import { Pipe, PipeTransform } from '@angular/core';
import { normalize } from '../core/parse';

const COP = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

export function formatMoney(value: number, sign = false): string {
  const abs = `$${COP.format(Math.abs(Math.round(value)))}`;
  if (value < 0) return `-${abs}`;
  return sign && value > 0 ? `+${abs}` : abs;
}

/** Formato compacto para gráficas: $5.2M, $850K. */
export function formatShort(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(value: number | null | undefined, sign = false): string {
    return formatMoney(value ?? 0, sign);
  }
}

@Pipe({ name: 'short' })
export class ShortMoneyPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    return formatShort(value ?? 0);
  }
}

const ICONS: [string[], string][] = [
  [['luz', 'energia', 'electric'], 'bolt'],
  [['gas'], 'local_fire_department'],
  [['agua', 'acueducto'], 'water_drop'],
  [['celular', 'movil', 'telefono'], 'smartphone'],
  [['internet', 'wifi', 'fibra'], 'router'],
  [['administracion', 'edificio', 'condominio'], 'apartment'],
  [['parqueadero', 'carro', 'vehiculo'], 'directions_car'],
  [['arriendo', 'renta', 'apartamento', 'alquiler'], 'real_estate_agent'],
  [['salario', 'sueldo', 'nomina'], 'business'],
  [['freelance', 'consultor', 'diseno'], 'brush'],
  [['almuerzo', 'restaurante', 'comida', 'salida'], 'restaurant'],
  [['cafe', 'postre'], 'local_cafe'],
  [['cumple', 'celebracion', 'regalo', 'aniversario'], 'cake'],
  [['fiesta', 'bebida', 'ocio', 'evento', 'cine'], 'celebration'],
  [['tarjeta'], 'credit_card'],
  [['gasolina', 'transporte', 'taxi', 'uber'], 'local_gas_station'],
  [['mercado', 'super'], 'shopping_cart'],
  [['salud', 'medic', 'farmacia'], 'medical_services'],
  [['seguro'], 'shield'],
  [['emergencia'], 'health_and_safety'],
  [['viaje', 'vacacion'], 'flight_takeoff'],
  [['hogar', 'casa'], 'home'],
  [['educacion', 'colegio', 'universidad', 'curso'], 'school'],
  [['gimnasio', 'gym'], 'fitness_center'],
  [['streaming', 'netflix', 'spotify', 'suscripcion'], 'subscriptions'],
];

export function iconFor(...texts: string[]): string {
  const haystack = texts.map(normalize).join(' ');
  for (const [keys, icon] of ICONS) {
    if (keys.some((k) => haystack.includes(k))) return icon;
  }
  return 'receipt';
}

export function methodIcon(method: string): string {
  const m = normalize(method);
  if (m.includes('credito') || m.includes('tc') || m.includes('visa')) return 'credit_card';
  if (m.includes('efectivo')) return 'payments';
  if (m.includes('transfer')) return 'sync_alt';
  return 'credit_card';
}
