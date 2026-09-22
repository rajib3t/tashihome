import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-table-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full">
      @if (showText) {
        <div class="flex items-center justify-center gap-2.5 py-3.5 bg-slate-50/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60 text-xs font-medium text-slate-500 dark:text-slate-400">
          <svg class="h-4 w-4 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>{{ message }}</span>
        </div>
      }
      <div class="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
        @for (row of rowList; track row) {
          <div class="flex items-center justify-between px-4 py-3.5 gap-4 animate-pulse">
            <!-- Index / Checkbox skeleton -->
            <div class="h-4 w-6 rounded bg-slate-200 dark:bg-slate-800 shrink-0"></div>

            <!-- Primary cell (Avatar/Icon + Title + Subtitle) -->
            <div class="flex items-center gap-3 min-w-0 flex-1 max-w-xs">
              <div class="h-9 w-9 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0"></div>
              <div class="space-y-1.5 flex-1 min-w-0">
                <div class="h-3.5 rounded bg-slate-200 dark:bg-slate-800" [style.width]="row % 2 === 0 ? '75%' : '60%'"></div>
                <div class="h-2.5 rounded bg-slate-100 dark:bg-slate-850" [style.width]="row % 2 === 0 ? '45%' : '35%'"></div>
              </div>
            </div>

            <!-- Secondary Column 1 -->
            <div class="hidden sm:block flex-1 max-w-[140px]">
              <div class="h-3.5 rounded bg-slate-200 dark:bg-slate-800" [style.width]="row % 3 === 0 ? '80%' : '65%'"></div>
            </div>

            <!-- Secondary Column 2 -->
            <div class="hidden md:block flex-1 max-w-[120px]">
              <div class="h-3.5 rounded bg-slate-200 dark:bg-slate-800" [style.width]="row % 2 === 0 ? '55%' : '70%'"></div>
            </div>

            <!-- Secondary Column 3 -->
            <div class="hidden lg:block flex-1 max-w-[100px]">
              <div class="h-3.5 rounded bg-slate-200 dark:bg-slate-800" [style.width]="row % 2 === 0 ? '90%' : '60%'"></div>
            </div>

            <!-- Status Badge Skeleton -->
            <div class="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0"></div>

            <!-- Action Button Skeleton -->
            <div class="h-7 w-20 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0 ml-auto"></div>
          </div>
        }
      </div>
    </div>
  `
})
export class TableLoaderComponent {
  @Input() message: string = 'Loading records...';
  @Input() rows: number = 5;
  @Input() showText: boolean = true;

  get rowList(): number[] {
    return Array.from({ length: this.rows }, (_, i) => i + 1);
  }
}
