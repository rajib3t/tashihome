import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../../services/seo/seo-service';

@Component({
  selector: 'app-vendor-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './vendor-not-found.html'
})
export class VendorNotFound implements OnInit {
  private readonly seoService = inject(SeoService);

  ngOnInit(): void {
    this.seoService.setNoIndex('Host Portal Not Found (404)');
  }
}

