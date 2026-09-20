import {
  Component,
  OnInit,
  AfterViewInit,
  OnDestroy,
  inject,
  signal,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

export type LegalTab = 'all' | 'terms' | 'host-agreement' | 'privacy' | 'refund' | 'grievance';

@Component({
  selector: 'app-legal',
  imports: [CommonModule],
  templateUrl: './legal.html',
  styleUrl: './legal.css',
})
export class Legal implements OnInit, AfterViewInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private revealObserver?: IntersectionObserver;

  public activeTab = signal<LegalTab>('all');
  public searchQuery = signal<string>('');

  public tabs: Array<{ id: LegalTab; label: string; icon: string; path: string }> = [
    { id: 'all', label: 'All Platform Policies', icon: 'document', path: '/legal' },
    { id: 'terms', label: 'Terms of Service (Guests)', icon: 'user', path: '/terms' },
    { id: 'host-agreement', label: 'Host Partner Agreement', icon: 'home', path: '/host-agreement' },
    { id: 'privacy', label: 'Privacy Policy', icon: 'shield', path: '/privacy-policy' },
    { id: 'refund', label: 'Cancellation & Refund Policy', icon: 'refresh', path: '/refund-policy' },
    { id: 'grievance', label: 'Grievance & Intermediary', icon: 'scale', path: '/legal' },
  ];

  public tableOfContents = [
    { id: 'sec-1', number: '1', title: 'Definitions & Interpretation', category: 'general' },
    { id: 'sec-2', number: '2', title: 'Nature of the Platform (Marketplace, Not Operator)', category: 'general' },
    { id: 'sec-3', number: '3', title: 'Terms of Service — Guests', category: 'terms' },
    { id: 'sec-4', number: '4', title: 'Homestay Partner (Host) Agreement', category: 'host-agreement' },
    { id: 'sec-5', number: '5', title: 'Booking, Pricing & Payments', category: 'terms' },
    { id: 'sec-6', number: '6', title: 'Cancellation & Refund Policy', category: 'refund' },
    { id: 'sec-7', number: '7', title: 'Reviews, Conduct & Community Guidelines', category: 'terms' },
    { id: 'sec-8', number: '8', title: 'Privacy Policy', category: 'privacy' },
    { id: 'sec-9', number: '9', title: 'Intermediary Status & Grievance Redressal Mechanism', category: 'privacy' },
    { id: 'sec-10', number: '10', title: 'Limitation of Liability, Indemnity & Insurance', category: 'general' },
    { id: 'sec-11', number: '11', title: 'Intellectual Property', category: 'general' },
    { id: 'sec-12', number: '12', title: 'Dispute Resolution, Governing Law & Jurisdiction', category: 'general' },
    { id: 'sec-13', number: '13', title: 'Miscellaneous / General Provisions', category: 'general' },
  ];

  ngOnInit(): void {
    this.route.data.subscribe((data) => {
      if (data && data['tab']) {
        this.activeTab.set(data['tab'] as LegalTab);
      }
    });

    this.route.queryParams.subscribe((params) => {
      if (params['tab'] && this.isValidTab(params['tab'])) {
        this.activeTab.set(params['tab'] as LegalTab);
      }
    });

    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  public setTab(tab: LegalTab, targetPath?: string): void {
    this.activeTab.set(tab);
    if (targetPath) {
      this.router.navigate([targetPath], { queryParamsHandling: 'merge' });
    }
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  public scrollToSection(elementId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  public printPage(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.print();
    }
  }

  public onSearchChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value.toLowerCase().trim());
  }

  public isSectionVisible(category: string, sectionNumber: string): boolean {
    const tab = this.activeTab();
    if (tab === 'all') return true;
    if (tab === 'terms') {
      return ['1', '2', '3', '5', '7', '10', '11', '12', '13'].includes(sectionNumber);
    }
    if (tab === 'host-agreement') {
      return ['1', '2', '4', '5', '10', '11', '12', '13'].includes(sectionNumber);
    }
    if (tab === 'privacy') {
      return ['1', '8', '9', '12', '13'].includes(sectionNumber);
    }
    if (tab === 'refund') {
      return ['1', '5', '6', '10', '12', '13'].includes(sectionNumber);
    }
    if (tab === 'grievance') {
      return ['1', '2', '9', '10', '12'].includes(sectionNumber);
    }
    return true;
  }

  private isValidTab(tab: string): tab is LegalTab {
    return ['all', 'terms', 'host-agreement', 'privacy', 'refund', 'grievance'].includes(tab);
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initRevealObserver();
    }
  }

  ngOnDestroy(): void {
    this.revealObserver?.disconnect();
  }

  private initRevealObserver(): void {
    const reveals = document.querySelectorAll('.reveal');
    if (!reveals.length) return;

    this.revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            this.revealObserver?.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );

    reveals.forEach((el) => this.revealObserver?.observe(el));
  }
}

