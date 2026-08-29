import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({ providedIn: 'root' })
export class RazorpayService {
  private readonly platformId = inject(PLATFORM_ID);

  /** Single shared promise — guaranteed to run only once across all components */
  private loadPromise: Promise<boolean> | null = null;

  /**
   * Call this only when the user is about to pay (lazy).
   * Returns true if Razorpay SDK is ready, false on failure.
   */
  load(): Promise<boolean> {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined') {
      return Promise.resolve(false);
    }

    // Already loaded into window — resolve immediately
    if ((window as any).Razorpay) {
      return Promise.resolve(true);
    }

    // Already in-flight — return same promise
    if (this.loadPromise) {
      return this.loadPromise;
    }

    // Script tag exists but window.Razorpay not yet set — wait for its load event
    const existing = document.getElementById('razorpay-checkout-js') as HTMLScriptElement | null;
    if (existing) {
      this.loadPromise = new Promise<boolean>((resolve) => {
        if ((window as any).Razorpay) {
          resolve(true);
          return;
        }
        existing.addEventListener('load', () => {
          this.loadPromise = null;
          resolve(true);
        }, { once: true });
        existing.addEventListener('error', () => {
          this.loadPromise = null;
          resolve(false);
        }, { once: true });
      });
      return this.loadPromise;
    }

    // First call — inject script tag lazily
    this.loadPromise = new Promise<boolean>((resolve) => {
      const script = document.createElement('script');
      script.id = 'razorpay-checkout-js';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => {
        this.loadPromise = null;
        resolve(true);
      };
      script.onerror = () => {
        this.loadPromise = null;
        script.remove();
        resolve(false);
      };
      document.head.appendChild(script);
    });

    return this.loadPromise;
  }
}
