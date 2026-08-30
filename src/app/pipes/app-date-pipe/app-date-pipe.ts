import { Pipe, PipeTransform, inject } from '@angular/core';
import { SettingsService } from '../../services/settings/settings-service';

@Pipe({
  name: 'appDate',
  standalone: true,
})
export class AppDatePipe implements PipeTransform {
  private readonly settingsService = inject(SettingsService);

  transform(
    value: string | Date | number | null | undefined,
    customFormat?: string
  ): string {
    return this.settingsService.formatDate(value, customFormat);
  }
}

@Pipe({
  name: 'appDateTime',
  standalone: true,
})
export class AppDateTimePipe implements PipeTransform {
  private readonly settingsService = inject(SettingsService);

  transform(
    value: string | Date | number | null | undefined,
    customDateFormat?: string,
    customTimeFormat?: string
  ): string {
    return this.settingsService.formatDateTime(value, customDateFormat, customTimeFormat);
  }
}

