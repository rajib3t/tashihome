import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';
import { LocationService } from '../../../services/location/location-service';
import { LocationResponse } from '../../../services/location/location-model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-location-autocomplete',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './location-autocomplete.html',
  styleUrl: './location-autocomplete.css',
})
export class LocationAutocomplete implements OnInit, OnChanges, OnDestroy {
  public readonly assetUrl = environment.assetUrl;
  private readonly locationService = inject(LocationService);
  private readonly elementRef = inject(ElementRef);

  @Input() public placeholder = 'Search location or hill region...';
  @Input() public label = 'Destination';
  @Input() public showLabel = true;
  @Input() public variant: 'hero' | 'default' | 'pill' = 'default';
  @Input() public selectedLocationId: string | null = null;
  @Input() public selectedLocationSlug: string | null = null;
  @Input() public initialLocationName: string | null = null;

  @Output() public locationSelected = new EventEmitter<LocationResponse | null>();

  public query = signal<string>('');
  public isOpen = signal<boolean>(false);
  public isLoading = signal<boolean>(false);
  public locations = signal<LocationResponse[]>([]);
  public selectedLocation = signal<LocationResponse | null>(null);
  public highlightedIndex = signal<number>(-1);

  private searchSubject = new Subject<string>();
  private searchSubscription: { unsubscribe: () => void } | null = null;

  ngOnInit(): void {
    this.searchSubscription = this.searchSubject
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        switchMap((term) => {
          this.isLoading.set(true);
          const trimmed = term.trim();
          return this.locationService.public
            .getLocations({
              search: trimmed ? { name: trimmed } : undefined,
              size: 15,
              sort_by: trimmed ? 'name' : 'created_at',
              sort_order: trimmed ? 'asc' : 'desc',
            })
            .pipe(
              catchError((err) => {
                console.warn('Failed to search locations:', err);
                return of({ data: [], total: 0, page: 1, size: 15, status: '', message: '' });
              })
            );
        })
      )
      .subscribe((res) => {
        this.isLoading.set(false);
        this.locations.set(res?.data || []);
        this.highlightedIndex.set(-1);

        // If we have selectedLocationId or selectedLocationSlug but no object yet, match it
        if (!this.selectedLocation()) {
          const match = (res?.data || []).find(
            (l) =>
              (this.selectedLocationId && l.id === this.selectedLocationId) ||
              (this.selectedLocationSlug && l.slug === this.selectedLocationSlug)
          );
          if (match) {
            this.selectedLocation.set(match);
            this.query.set(this.formatLocationTitle(match));
          }
        }
      });

    // Initial fetch of popular/recent locations
    this.fetchInitialLocations();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialLocationName'] && this.initialLocationName && !this.selectedLocation()) {
      this.query.set(this.initialLocationName);
    }

    if (
      (changes['selectedLocationId'] || changes['selectedLocationSlug']) &&
      (this.selectedLocationId || this.selectedLocationSlug)
    ) {
      const current = this.selectedLocation();
      const matchesCurrent =
        current &&
        ((this.selectedLocationId && current.id === this.selectedLocationId) ||
          (this.selectedLocationSlug && current.slug === this.selectedLocationSlug));

      if (!matchesCurrent) {
        const found = this.locations().find(
          (l) =>
            (this.selectedLocationId && l.id === this.selectedLocationId) ||
            (this.selectedLocationSlug && l.slug === this.selectedLocationSlug)
        );
        if (found) {
          this.selectedLocation.set(found);
          this.query.set(this.formatLocationTitle(found));
        } else if (!this.query() && this.initialLocationName) {
          this.query.set(this.initialLocationName);
        }
      }
    } else if (
      (changes['selectedLocationId'] || changes['selectedLocationSlug']) &&
      !this.selectedLocationId &&
      !this.selectedLocationSlug
    ) {
      if (!this.initialLocationName) {
        this.selectedLocation.set(null);
        this.query.set('');
      }
    }
  }

  ngOnDestroy(): void {
    this.searchSubscription?.unsubscribe();
  }

  private fetchInitialLocations(): void {
    this.locationService.public
      .getLocations({
        size: 15,
        sort_by: 'created_at',
        sort_order: 'desc',
      })
      .pipe(
        catchError(() => of({ data: [], total: 0, page: 1, size: 15, status: '', message: '' }))
      )
      .subscribe((res) => {
        const data = res?.data || [];
        this.locations.set(data);

        // Check if selected matches
        if (this.selectedLocationId || this.selectedLocationSlug) {
          const match = data.find(
            (l) =>
              (this.selectedLocationId && l.id === this.selectedLocationId) ||
              (this.selectedLocationSlug && l.slug === this.selectedLocationSlug)
          );
          if (match) {
            this.selectedLocation.set(match);
            this.query.set(this.formatLocationTitle(match));
          }
        }
      });
  }

  public onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    this.query.set(value);
    this.selectedLocation.set(null);
    this.isOpen.set(true);
    this.searchSubject.next(value);
  }

  public onFocus(): void {
    this.isOpen.set(true);
    if (!this.locations().length) {
      this.searchSubject.next(this.query());
    }
  }

  public selectLocation(loc: LocationResponse | null): void {
    this.selectedLocation.set(loc);
    this.isOpen.set(false);
    this.highlightedIndex.set(-1);

    if (loc) {
      this.query.set(this.formatLocationTitle(loc));
      this.locationSelected.emit(loc);
    } else {
      this.query.set('');
      this.locationSelected.emit(null);
    }
  }

  public clear(event?: MouseEvent): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectLocation(null);
  }

  public onKeyDown(event: KeyboardEvent): void {
    const items = this.locations();
    if (!this.isOpen()) {
      if (event.key === 'ArrowDown' || event.key === 'Enter') {
        this.isOpen.set(true);
        event.preventDefault();
      }
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.highlightedIndex.update((i) => Math.min(i + 1, items.length - 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.highlightedIndex.update((i) => Math.max(i - 1, -1));
        break;
      case 'Enter':
        event.preventDefault();
        const idx = this.highlightedIndex();
        if (idx >= 0 && idx < items.length) {
          this.selectLocation(items[idx]);
        } else if (items.length > 0 && this.query()) {
          this.selectLocation(items[0]);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.isOpen.set(false);
        this.highlightedIndex.set(-1);
        break;
    }
  }

  public formatLocationTitle(loc: LocationResponse): string {
    if (!loc) return '';
    if (loc.city?.name) {
      return `${loc.name}, ${loc.city.name}`;
    }
    return loc.name;
  }

  public formatCitySubtitle(loc: LocationResponse): string {
    if (!loc) return '';
    const parts: string[] = [];
    if (loc.city?.name) parts.push(loc.city.name);
    if (loc.city?.country?.name) parts.push(loc.city.country.name);
    return parts.join(', ');
  }

  @HostListener('document:click', ['$event'])
  public onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
      this.highlightedIndex.set(-1);
      // If user typed something but didn't select an item, leave query as-is
    }
  }
}

