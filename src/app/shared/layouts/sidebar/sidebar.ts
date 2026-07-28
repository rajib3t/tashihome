import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef, Component, Input, OnDestroy, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { SidebarService } from '../../../services/sidebar/sidebar-service';
import { combineLatest, map, Subscription, take, shareReplay } from 'rxjs';
import { Logo } from '../../components/common/logo/logo';
import { SafeHtmlPipePipe } from '../../../pipes/safe-html-pipe/safe-html-pipe';

export type NavItem = {
  name: string;
  icon: string;
  path?: string;
  new?: boolean;
  subItems?: { name: string; path: string; pro?: boolean; new?: boolean }[];
};

@Component({
  selector: 'app-sidebar',
  imports: [
    RouterModule,
    CommonModule,
    Logo,
    SafeHtmlPipePipe
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  @Input() public navItems: NavItem[] = [];
  @Input() public title: string = 'Menu';

  openSubmenu: string | null | number = null;
  subMenuHeights: { [key: string]: number } = {};

  public sidebarService = inject(SidebarService);
  readonly isExpanded$ = this.sidebarService.isExpanded$;
  readonly isMobileOpen$ = this.sidebarService.isMobileOpen$;
  readonly isHovered$ = this.sidebarService.isHovered$;

  // Single shared source of truth — computed once, replayed to every subscriber
  // (async pipe / @let in the template, and the internal subscription below)
  // instead of building the same combineLatest twice.
  readonly isVisible$ = combineLatest([this.isExpanded$, this.isMobileOpen$, this.isHovered$]).pipe(
    map(([expanded, mobile, hovered]) => expanded || mobile || hovered),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private subscription: Subscription = new Subscription();
  private savedSubMenuHeights: { [key: string]: number } = {};
  private savedOpenSubmenu: string | null | number = null;

  private router = inject(Router);
  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.subscription.add(
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.setActiveMenuFromRoute(this.router.url);
        }
      })
    );

    // Close open submenus (and remember their heights) when the sidebar
    // collapses entirely; restore them if it re-expands.
    this.subscription.add(
      this.isVisible$.subscribe(isVisible => {
        if (!isVisible) {
          this.savedSubMenuHeights = { ...this.subMenuHeights };
          this.savedOpenSubmenu = this.openSubmenu;
          this.openSubmenu = null;
          this.subMenuHeights = {};
        } else if (Object.keys(this.savedSubMenuHeights).length) {
          this.subMenuHeights = { ...this.savedSubMenuHeights };
          this.savedSubMenuHeights = {};
          this.openSubmenu = this.savedOpenSubmenu;
          this.savedOpenSubmenu = null;
        }
        this.cdr.detectChanges();
      })
    );

    this.setActiveMenuFromRoute(this.router.url);
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  isActive(path: string): boolean {
    return this.router.url === path;
  }

  toggleSubmenu(section: string, index: number) {
    const key = `${section}-${index}`;

    if (this.openSubmenu === key) {
      this.openSubmenu = null;
      this.subMenuHeights = { ...this.subMenuHeights, [key]: 0 };
      this.cdr.detectChanges();
    } else {
      this.openSubmenu = key;

      setTimeout(() => {
        if (isPlatformBrowser(this.platformId)) {
          const el = document.getElementById(key);
          if (el) {
            const measured = el.scrollHeight;
            const height = measured > 0 ? measured : (this.subMenuHeights[key] || 0);
            this.subMenuHeights = { ...this.subMenuHeights, [key]: height };
            this.cdr.detectChanges();
          }
        }
      });
    }
  }

  onSidebarMouseEnter() {
    this.isExpanded$.pipe(take(1)).subscribe(expanded => {
      if (!expanded) {
        this.sidebarService.setHovered(true);
      }
    });
  }

  onSubmenuClick() {
    this.isMobileOpen$.pipe(take(1)).subscribe(isMobile => {
      if (isMobile) {
        this.sidebarService.setMobileOpen(false);
      }
    });
  }

  private setActiveMenuFromRoute(currentUrl: string) {
    const menuGroups = [
      { items: this.navItems, prefix: 'main' },
    ];

    menuGroups.forEach(group => {
      group.items.forEach((nav, i) => {
        if (nav.subItems) {
          nav.subItems.forEach(subItem => {
            if (currentUrl === subItem.path) {
              const key = `${group.prefix}-${i}`;
              this.openSubmenu = key;

              setTimeout(() => {
                if (isPlatformBrowser(this.platformId)) {
                  const el = document.getElementById(key);
                  if (el) {
                    this.subMenuHeights = { ...this.subMenuHeights, [key]: el.scrollHeight };
                    this.cdr.detectChanges();
                  }
                }
              });
            }
          });
        }
      });
    });
  }
}
