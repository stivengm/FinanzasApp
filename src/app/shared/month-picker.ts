import { Component, computed, inject } from '@angular/core';
import { addMonths, monthLabel } from '../core/dates';
import { FinanceStore } from '../core/finance.store';

@Component({
  selector: 'app-month-picker',
  template: `
    <div class="flex items-center gap-0.5 rounded-full bg-surface-container p-1 shadow-sm">
      <button
        type="button"
        aria-label="Mes anterior"
        class="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high active:scale-95"
        (click)="move(-1)"
      >
        <span class="material-symbols-outlined text-[18px]">chevron_left</span>
      </button>
      <span class="flex items-center gap-space-xs px-1 text-label-md font-semibold whitespace-nowrap text-on-surface">
        <span class="material-symbols-outlined text-[16px] text-secondary">calendar_today</span>
        {{ label() }}
      </span>
      <button
        type="button"
        aria-label="Mes siguiente"
        class="flex h-8 w-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high active:scale-95"
        (click)="move(1)"
      >
        <span class="material-symbols-outlined text-[18px]">chevron_right</span>
      </button>
    </div>
  `,
})
export class MonthPicker {
  private readonly store = inject(FinanceStore);
  protected readonly label = computed(() => monthLabel(this.store.month()));

  protected move(delta: number): void {
    this.store.setMonth(addMonths(this.store.month(), delta));
  }
}
