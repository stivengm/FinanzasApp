import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FinanceStore } from '../../core/finance.store';
import { desgloseSalario } from '../../core/nomina';
import { SessionService } from '../../core/session.service';
import { UiService } from '../../core/ui.service';
import { MoneyPipe } from '../../shared/format';

@Component({
  selector: 'app-perfil',
  imports: [FormsModule, RouterLink, MoneyPipe],
  templateUrl: './perfil.html',
})
export class PerfilPage {
  protected readonly store = inject(FinanceStore);
  protected readonly session = inject(SessionService);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);

  protected readonly bienvenida = !!inject(ActivatedRoute).snapshot.queryParamMap.get('bienvenida');

  protected readonly nombre = linkedSignal(() => this.store.perfil()?.nombre ?? '');
  protected readonly salario = linkedSignal<number | null>(() => this.store.perfil()?.salario || null);
  protected readonly error = signal<string | null>(null);

  protected readonly desglose = computed(() => desgloseSalario(Number(this.salario()) || 0));
  /** La prima se calcula sobre el salario bruto y no tiene descuentos de salud ni pensión. */
  protected readonly primaSugerida = computed(() => Math.round(this.desglose().bruto / 2));

  protected readonly inicial = computed(() => {
    const p = this.store.perfil();
    return (p?.nombre || p?.usuario || '?').charAt(0).toUpperCase();
  });

  protected async guardar(): Promise<void> {
    this.error.set(null);
    try {
      await this.store.updatePerfil({ nombre: this.nombre().trim(), salario: Number(this.salario()) || 0 });
      this.ui.notify('Perfil actualizado');
      if (this.bienvenida) this.router.navigate(['/inicio']);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
}
