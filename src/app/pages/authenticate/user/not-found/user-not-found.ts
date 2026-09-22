import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../../../services/seo/seo-service';

@Component({
  selector: 'app-user-not-found',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-not-found.html'
})
export class UserNotFound implements OnInit {
  private readonly seoService = inject(SeoService);

  ngOnInit(): void {
    this.seoService.setNoIndex('Account Section Not Found (404)');
  }
}

