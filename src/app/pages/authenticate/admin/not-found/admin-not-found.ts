import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../../services/seo/seo-service';

@Component({
  selector: 'app-admin-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-not-found.html'
})
export class AdminNotFound implements OnInit {
  private readonly seoService = inject(SeoService);

  ngOnInit(): void {
    this.seoService.setNoIndex('Admin View Not Found (404)');
  }
}

