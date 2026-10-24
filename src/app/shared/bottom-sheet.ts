import { Component, input, output } from '@angular/core';

/** Hoja modal inferior (24px de radio superior) según el sistema de diseño. */
@Component({
  selector: 'app-bottom-sheet',
  host: { '(document:keydown.escape)': 'close.emit()' },
  template: `
    <div class="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
      <div class="absolute inset-0 bg-primary-container/40 backdrop-blur-sm" (click)="close.emit()"></div>
      <section
        role="dialog"
        aria-modal="true"
        [attr.aria-label]="title()"
        class="relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white/95 p-space-lg pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[0_4px_12px_rgba(13,27,42,0.06),0_16px_32px_rgba(13,27,42,0.04)] backdrop-blur-xl sm:rounded-3xl"
      >
        <div class="mx-auto mb-space-md h-1 w-10 rounded-full bg-outline-variant sm:hidden"></div>
        <header class="mb-space-md flex items-center justify-between gap-space-sm">
          <h2 class="text-headline-md">{{ title() }}</h2>
          <button
            type="button"
            aria-label="Cerrar"
            class="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high"
            (click)="close.emit()"
          >
            <span class="material-symbols-outlined text-[20px]">close</span>
          </button>
        </header>
        <ng-content />
      </section>
    </div>
  `,
})
export class BottomSheet {
  readonly title = input.required<string>();
  readonly close = output<void>();
}
