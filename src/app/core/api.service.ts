import { Injectable } from '@angular/core';
import { APPS_SCRIPT_URL } from '../app.settings';
import { Perfil, SheetTable, TabKey } from './models';
import { normalize } from './parse';

export type WriteValues = Record<string, string | number>;

interface Credenciales {
  usuario: string;
  token: string;
}

export interface AuthResponse {
  token: string;
  perfil: Perfil;
}

export interface DataResponse {
  perfil: Perfil;
  tablas: Record<TabKey, SheetTable>;
}

/** Error de sesión inválida: la app debe volver a pedir usuario y clave. */
export class SesionExpiradaError extends Error {}

/**
 * Cliente del backend en Apps Script (plantilla/apps-script.gs).
 * La hoja es privada; todo pasa por el script, que filtra por usuario.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  register(usuario: string, clave: string): Promise<AuthResponse> {
    return this.call('register', { usuario, clave });
  }

  login(usuario: string, clave: string): Promise<AuthResponse> {
    return this.call('login', { usuario, clave });
  }

  data(cred: Credenciales): Promise<DataResponse> {
    return this.call('data', { ...cred });
  }

  append(cred: Credenciales, sheet: TabKey, values: WriteValues): Promise<{ row: number }> {
    const normalized: WriteValues = {};
    for (const [k, v] of Object.entries(values)) normalized[normalize(k)] = v;
    return this.call('append', { ...cred, sheet, values: normalized });
  }

  profile(cred: Credenciales, values: Partial<Omit<Perfil, 'usuario'>>): Promise<{ perfil: Perfil }> {
    return this.call('profile', { ...cred, values });
  }

  private async call<T>(action: string, payload: object): Promise<T> {
    if (!APPS_SCRIPT_URL) throw new Error('Falta configurar la URL del Apps Script (src/app/app.settings.ts)');
    let res: Response;
    try {
      // text/plain evita el preflight CORS que Apps Script no soporta.
      res = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, ...payload }),
      });
    } catch {
      throw new Error('No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.');
    }
    const body = await res.json().catch(() => null);
    if (!body) throw new Error('El servidor respondió algo inesperado. Revisa la implementación del Apps Script.');
    if (!body.ok) {
      const msg = String(body.error || 'Error desconocido');
      throw msg.startsWith('Sesión expirada') ? new SesionExpiradaError(msg) : new Error(msg);
    }
    return body as T;
  }
}
