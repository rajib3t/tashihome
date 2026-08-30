import { CommonModule } from '@angular/common';
import { Component, ElementRef, forwardRef, inject, Input, ViewChild, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { SettingsService } from '../../../../services/settings/settings-service';

@Component({
  selector: 'app-date-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateInput),
      multi: true,
    },
  ],
  template: `
    @if (variant === 'property') {
      <!-- Property reservation card style -->
      <div
        class="relative w-full rounded-xl border border-ink/15 bg-white/75 p-2.5 hover:border-ochre/40 focus-within:border-ochre transition-colors cursor-pointer select-none"
        (click)="openPicker()"
      >
        <div class="text-[10px] uppercase tracking-wider font-semibold text-ink/50 flex items-center justify-between">
          <span class="flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" class="text-mossD">
              <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" stroke-width="1.8" />
              <path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
            {{ label }}
          </span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" class="text-ink/40">
            <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.8" />
            <path d="M3 10h18M8 2v4M16 2v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
        </div>

        <div class="mt-1 flex items-center justify-between">
          <span
            [class.text-ink]="!!value()"
            [class.text-ink/40]="!value()"
            class="text-xs sm:text-sm font-semibold truncate"
          >
            {{ displayFormattedDate() }}
          </span>
        </div>

        <input
          #nativeInput
          type="date"
          [min]="min"
          [max]="max"
          [disabled]="disabled"
          [value]="value()"
          (input)="onNativeInputChange($event)"
          (change)="onNativeInputChange($event)"
          class="absolute inset-0 opacity-0 w-full h-full cursor-pointer pointer-events-none"
          tabindex="-1"
        />
      </div>
    } @else {
      <!-- Default admin / vendor dashboard style -->
      <div
        class="relative flex items-center w-full cursor-pointer group"
        (click)="openPicker()"
      >
        <div
          [class]="inputClasses"
          class="w-full flex items-center justify-between transition cursor-pointer select-none"
        >
          <span
            [class.text-slate-400]="!value()"
            [class.dark:text-slate-500]="!value()"
            [class.text-slate-800]="!!value()"
            [class.dark:text-slate-100]="!!value()"
            class="truncate"
          >
            {{ displayFormattedDate() }}
          </span>

          <div class="flex items-center gap-1.5 shrink-0 ml-2">
            @if (value() && allowClear && !disabled) {
              <button
                type="button"
                (click)="clear($event)"
                class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Clear date"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            }
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              class="text-slate-400 group-hover:text-primary transition-colors"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.8" />
              <path d="M3 10h18M8 2v4M16 2v4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            </svg>
          </div>
        </div>

        <!-- Hidden native date input triggered by showPicker() -->
        <input
          #nativeInput
          type="date"
          [min]="min"
          [max]="max"
          [disabled]="disabled"
          [value]="value()"
          (input)="onNativeInputChange($event)"
          (change)="onNativeInputChange($event)"
          class="absolute inset-0 opacity-0 w-full h-full cursor-pointer pointer-events-none"
          tabindex="-1"
        />
      </div>
    }
  `,
})
export class DateInput implements ControlValueAccessor {
  private readonly settingsService = inject(SettingsService);

  @ViewChild('nativeInput') nativeInputRef!: ElementRef<HTMLInputElement>;

  @Input() min = '';
  @Input() max = '';
  @Input() placeholder = '';
  @Input() label = 'Date';
  @Input() variant: 'default' | 'property' = 'default';
  @Input() allowClear = true;
  @Input() disabled = false;
  @Input() inputClasses = 'rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none transition focus-within:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

  readonly value = signal<string>('');

  displayFormattedDate(): string {
    const v = this.value();
    if (!v) {
      return this.placeholder || this.settingsService.dateFormat();
    }
    return this.settingsService.formatDate(v);
  }

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(val: any): void {
    const str = val ? String(val).split('T')[0] : '';
    this.value.set(str);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  openPicker(): void {
    if (this.disabled) return;
    this.onTouched();
    const input = this.nativeInputRef?.nativeElement;
    if (input) {
      if (typeof input.showPicker === 'function') {
        try {
          input.showPicker();
          return;
        } catch {
          // fallback if showPicker is blocked by user gesture
        }
      }
      input.focus();
      input.click();
    }
  }

  onNativeInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const val = target.value || '';
    this.value.set(val);
    this.onChange(val);
  }

  clear(event: MouseEvent): void {
    event.stopPropagation();
    this.value.set('');
    this.onChange('');
    if (this.nativeInputRef?.nativeElement) {
      this.nativeInputRef.nativeElement.value = '';
    }
  }
}

