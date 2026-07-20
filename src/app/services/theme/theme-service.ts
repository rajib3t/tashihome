import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID, Service } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
type Theme = 'light' | 'dark';
@Service()
export class ThemeService {
    private platformId = inject(PLATFORM_ID);
    private isBrowser = isPlatformBrowser(this.platformId);
    private themeSubject = new BehaviorSubject<Theme>('light');
    theme$ = this.themeSubject.asObservable();

    constructor() {
        if (this.isBrowser) {
            const savedTheme = (localStorage.getItem('theme') as Theme) || 'light';
            this.setTheme(savedTheme);
        }
    }

    toggleTheme() {
        const newTheme = this.themeSubject.value === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    setTheme(theme: Theme) {
        this.themeSubject.next(theme);
        if (this.isBrowser) {
            localStorage.setItem('theme', theme);
            const root = document.documentElement;
            if (theme === 'dark') {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
    }
}
