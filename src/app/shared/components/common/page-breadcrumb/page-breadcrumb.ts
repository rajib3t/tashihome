import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  url?: string;
}

@Component({
  selector: 'app-page-breadcrumb',
  imports: [RouterModule],
  templateUrl: './page-breadcrumb.html',
  styleUrl: './page-breadcrumb.css',
})
export class PageBreadcrumb {
  @Input() pageTitle = '';
  @Input() homelink = '/admin';
  @Input() breadcrumbs: BreadcrumbItem[] = [];
}
