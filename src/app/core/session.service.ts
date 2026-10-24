import { Injectable, computed, signal } from '@angular/core';
import { APPS_SCRIPT_URL } from '../app.settings';
import { Sesion } from './models';

const STORAGE_KEY = 'finanzsync.sesion';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly state = signal<Sesion | null>(this.load());

  readonly sesion = this.state.asReadonly();
  readonly activa = computed(() => this.state() !== null);
  readonly isDemo = computed(() => this.state()?.modo === 'demo');
  /** El backend existe solo cuando se configuró la URL del Apps Script. */
  readonly backendListo = !!APPS_SCRIPT_URL;

  iniciar(sesion: Sesion): void {
    this.state.set(sesion);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
    } catch {
      /* almacenamiento no disponible: la sesión vive solo en memoria */
    }
  }

  cerrar(): void {
    this.state.set(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignorar */
    }
  }

  private load(): Sesion | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Sesion) : null;
    } catch {
      return null;
    }
  }
}
