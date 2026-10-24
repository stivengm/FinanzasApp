import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/api.service';
import { FinanceStore } from '../../core/finance.store';
import { SessionService } from '../../core/session.service';

type Modo = 'ingresar' | 'registro';

@Component({
  selector: 'app-ingresar',
  imports: [FormsModule],
  templateUrl: './ingresar.html',
})
export class Ingresar {
  private readonly api = inject(ApiService);
  private readonly store = inject(FinanceStore);
  private readonly router = inject(Router);
  protected readonly session = inject(SessionService);

  protected readonly modo = signal<Modo>('ingresar');
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly verClave = signal(false);

  protected usuario = '';
  protected clave = '';
  protected confirmar = '';

  protected cambiar(modo: Modo): void {
    this.modo.set(modo);
    this.error.set(null);
  }

  protected async enviar(): Promise<void> {
    const usuario = this.usuario.trim();
    if (usuario.length < 3) return this.error.set('Escribe tu usuario o correo (mínimo 3 caracteres).');
    if (this.clave.length < 4) return this.error.set('La clave debe tener al menos 4 caracteres.');
    const registro = this.modo() === 'registro';
    if (registro && this.clave !== this.confirmar) return this.error.set('Las claves no coinciden.');

    this.enviando.set(true);
    this.error.set(null);
    try {
      const res = registro ? await this.api.register(usuario, this.clave) : await this.api.login(usuario, this.clave);
      this.session.iniciar({ modo: 'cuenta', usuario: res.perfil.usuario, token: res.token });
      this.store.reset();
      this.store.perfil.set(res.perfil);
      this.store.load();
      // Una cuenta nueva empieza configurando el perfil (salario).
      this.router.navigate(registro ? ['/perfil'] : ['/inicio'], registro ? { queryParams: { bienvenida: 1 } } : {});
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.enviando.set(false);
    }
  }

  protected async demo(): Promise<void> {
    this.session.iniciar({ modo: 'demo', usuario: 'demo', token: '' });
    this.store.reset();
    await this.store.load();
    this.router.navigate(['/inicio']);
  }
}
