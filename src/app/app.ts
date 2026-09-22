import { Component, DestroyRef, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SeoService } from './services/seo/seo-service';
import { SeoConfig } from './services/seo/seo.model';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
})
export class App implements OnInit {
  protected readonly title = signal('tashihomes-app');
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly seoService = inject(SeoService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        let route = this.activatedRoute;
        while (route.firstChild) {
          route = route.firstChild;
        }

        const seoData: SeoConfig | undefined = route.snapshot.data?.['seo'];
        if (seoData) {
          this.seoService.updateSeo(seoData);
        }

        if (
          isPlatformBrowser(this.platformId) &&
          typeof window !== 'undefined' &&
          typeof (window as unknown as { gtag?: Function }).gtag === 'function'
        ) {
          (window as unknown as { gtag: Function }).gtag('event', 'page_view', {
            page_title: document.title,
            page_location: window.location.href,
            page_path: event.urlAfterRedirects,
          });
        }
      });
  }
}
