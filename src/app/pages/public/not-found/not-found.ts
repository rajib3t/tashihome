import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SeoService } from '../../../services/seo/seo-service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.css'
})
export class NotFound implements OnInit {
  private readonly seoService = inject(SeoService);
  private readonly router = inject(Router);

  public searchQuery = '';

  public readonly popularDestinations = [
    { name: 'Darjeeling', slug: 'darjeeling' },
    { name: 'Kalimpong', slug: 'kalimpong' },
    { name: 'Kurseong', slug: 'kurseong' },
    { name: 'Mirik', slug: 'mirik' },
    { name: 'Dooars', slug: 'dooars' },
    { name: 'Takdah', slug: 'takdah' }
  ];

  ngOnInit(): void {
    this.seoService.setNoIndex('Page Not Found (404)');
  }

  public onSearchSubmit(): void {
    const q = this.searchQuery.trim();
    if (q) {
      this.router.navigate(['/search'], { queryParams: { query: q } });
    } else {
      this.router.navigate(['/stays']);
    }
  }
}

