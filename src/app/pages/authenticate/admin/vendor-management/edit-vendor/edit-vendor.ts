import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { PageBreadcrumb } from '../../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../../shared/components/ui/card/card';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-edit-vendor',
  imports: [
    CommonModule,
    PageBreadcrumb,
    Card,
    RouterModule
  ],
  templateUrl: './edit-vendor.html',
  styleUrl: './edit-vendor.css',
})
export class EditVendor {
  private destroyRef = inject(DestroyRef);
  private readonly activatedRoute = inject(ActivatedRoute);

  readonly vendorId = signal('');

  ngOnInit(): void{
    this.activatedRoute.paramMap.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe((params) => {
      this.vendorId.set(params.get('id') ?? '');
    });
  }
}
