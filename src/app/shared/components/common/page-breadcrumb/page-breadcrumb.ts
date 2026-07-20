import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
@Component({
  selector: 'app-page-breadcrumb',
  imports: [RouterModule],
  templateUrl: './page-breadcrumb.html',
  styleUrl: './page-breadcrumb.css',
})
export class PageBreadcrumb {
  @Input() pageTitle = '';
}
