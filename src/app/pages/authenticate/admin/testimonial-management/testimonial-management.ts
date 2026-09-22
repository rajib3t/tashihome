import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, DestroyRef} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  AdminTestimonialQuery,
  TestimonialData,
  TestimonialStatus,
  TestimonialUserRole,
} from '../../../../services/testimonial/testimonial.model';
import { TestimonialService } from '../../../../services/testimonial/testimonial-service';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../shared/components/ui/card/card';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { Pagination, PaginationMeta } from '../../../../shared/components/ui/pagination/pagination';
import { environment } from '../../../../../environments/environment';

import { TableLoaderComponent } from '../../../../shared/components/ui/table-loader/table-loader.component';

@Component({
  selector: 'app-admin-testimonial-management',
  imports: [CommonModule, RouterModule, PageBreadcrumb, Card, ReactiveFormsModule, Modal, Pagination, TableLoaderComponent],
  templateUrl: './testimonial-management.html',
  styleUrl: './testimonial-management.css',
})
export class AdminTestimonialManagement implements OnInit {
  public readonly assetUrl = environment.assetUrl;
  private readonly fb = inject(FormBuilder);
  private readonly testimonialService = inject(TestimonialService);
  private readonly destroyRef = inject(DestroyRef);
  private messageTimeout?: ReturnType<typeof setTimeout>;

  readonly testimonials = signal<TestimonialData[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly pageSizeOptions = [10, 20, 50];

  meta: PaginationMeta = {
    page: 1,
    size: 10,
    total: 0,
  };

  readonly searchForm = this.fb.group({
    search: [''],
    status: [''],
    user_role: [''],
    is_featured: [''],
  });

  // Action Modals
  readonly selectedTestimonial = signal<TestimonialData | null>(null);
  readonly isStatusModalOpen = signal(false);
  readonly isUpdatingStatus = signal(false);
  readonly statusToSet = signal<TestimonialStatus>('approved');

  readonly isDeleteModalOpen = signal(false);
  readonly isDeleting = signal(false);

  readonly isDetailModalOpen = signal(false);

  ngOnInit(): void {
    this.loadTestimonials();
  }

  loadTestimonials(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const formVal = this.searchForm.value;
    const query: AdminTestimonialQuery = {
      page: this.currentPage(),
      page_size: this.pageSize(),
      search: formVal.search?.trim() || undefined,
      status: (formVal.status as TestimonialStatus) || undefined,
      user_role: (formVal.user_role as TestimonialUserRole) || undefined,
      is_featured: formVal.is_featured === 'true' ? true : formVal.is_featured === 'false' ? false : undefined,
      sort_order: 'desc',
    };

    this.testimonialService.admin.getTestimonials(query).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        let list: TestimonialData[] = [];
        if (Array.isArray(res?.data)) {
          list = res.data;
        } else if (res?.data && Array.isArray((res.data as any).data)) {
          list = (res.data as any).data;
        }

        this.testimonials.set(list);

        const metaData = (res?.data as any)?.meta?.pagination || (res?.data as any)?.meta || (res as any)?.meta;
        const total = metaData?.total ?? list.length;
        this.totalItems.set(total);
        this.meta = {
          page: this.currentPage(),
          size: this.pageSize(),
          total,
        };
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = this.testimonialService.extractApiErrorMessage(err) || 'Failed to load testimonials.';
        this.errorMessage.set(msg);
      },
    });
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadTestimonials();
  }

  onReset(): void {
    this.searchForm.reset({ search: '', status: '', user_role: '', is_featured: '' });
    this.currentPage.set(1);
    this.loadTestimonials();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadTestimonials();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadTestimonials();
  }

  getSerialNumber(index: number): number {
    return (this.currentPage() - 1) * this.pageSize() + index + 1;
  }

  // Quick Action: Approve
  approveTestimonial(t: TestimonialData): void {
    this.testimonialService.admin.approveTestimonial(t.id).subscribe({
      next: () => {
        this.showSuccessNotification(`Testimonial by ${t.name} approved.`);
        this.loadTestimonials();
      },
      error: (err) => {
        this.errorMessage.set(this.testimonialService.extractApiErrorMessage(err) || 'Failed to approve testimonial.');
      },
    });
  }

  // Quick Action: Reject
  rejectTestimonial(t: TestimonialData): void {
    this.testimonialService.admin.rejectTestimonial(t.id).subscribe({
      next: () => {
        this.showSuccessNotification(`Testimonial by ${t.name} rejected.`);
        this.loadTestimonials();
      },
      error: (err) => {
        this.errorMessage.set(this.testimonialService.extractApiErrorMessage(err) || 'Failed to reject testimonial.');
      },
    });
  }

  // Toggle Featured
  toggleFeature(t: TestimonialData): void {
    const nextState = !t.is_featured;
    this.testimonialService.admin.featureTestimonial(t.id, nextState).subscribe({
      next: () => {
        this.showSuccessNotification(
          `Testimonial by ${t.name} ${nextState ? 'featured on homepage' : 'removed from featured'}.`
        );
        this.loadTestimonials();
      },
      error: (err) => {
        this.errorMessage.set(this.testimonialService.extractApiErrorMessage(err) || 'Failed to update featured flag.');
      },
    });
  }

  // Status Change Modal
  openStatusModal(t: TestimonialData): void {
    this.selectedTestimonial.set(t);
    this.statusToSet.set(t.status);
    this.isStatusModalOpen.set(true);
  }

  closeStatusModal(): void {
    this.isStatusModalOpen.set(false);
    this.selectedTestimonial.set(null);
  }

  updateTestimonialStatus(): void {
    const t = this.selectedTestimonial();
    if (!t) return;

    this.isUpdatingStatus.set(true);
    this.testimonialService.admin.updateStatus(t.id, this.statusToSet()).subscribe({
      next: () => {
        this.isUpdatingStatus.set(false);
        this.closeStatusModal();
        this.showSuccessNotification(`Testimonial status updated to "${this.statusToSet()}".`);
        this.loadTestimonials();
      },
      error: (err) => {
        this.isUpdatingStatus.set(false);
        this.errorMessage.set(this.testimonialService.extractApiErrorMessage(err) || 'Failed to update status.');
      },
    });
  }

  // Delete Modal
  openDeleteModal(t: TestimonialData): void {
    this.selectedTestimonial.set(t);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.selectedTestimonial.set(null);
  }

  confirmDelete(): void {
    const t = this.selectedTestimonial();
    if (!t) return;

    this.isDeleting.set(true);
    this.testimonialService.admin.deleteTestimonial(t.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeDeleteModal();
        this.showSuccessNotification('Testimonial deleted permanently.');
        this.loadTestimonials();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.errorMessage.set(this.testimonialService.extractApiErrorMessage(err) || 'Failed to delete testimonial.');
      },
    });
  }

  // Detail Modal
  openDetailModal(t: TestimonialData): void {
    this.selectedTestimonial.set(t);
    this.isDetailModalOpen.set(true);
  }

  closeDetailModal(): void {
    this.isDetailModalOpen.set(false);
    this.selectedTestimonial.set(null);
  }

  getStatusBadgeClass(status: TestimonialStatus): string {
    switch (status) {
      case 'approved':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40';
      case 'pending':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40';
      case 'rejected':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40';
      case 'hidden':
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  }

  private showSuccessNotification(msg: string): void {
    this.successMessage.set(msg);
    setTimeout(() => {
      this.successMessage.set('');
    }, 4000);
  }

  ngOnDestroy(): void {
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
  }
}

