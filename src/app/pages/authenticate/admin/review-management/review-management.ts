import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ReviewData, ReviewQuery, ReviewStatus } from '../../../../services/review/review.model';
import { ReviewService } from '../../../../services/review/review-service';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../shared/components/ui/card/card';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { Pagination, PaginationMeta } from '../../../../shared/components/ui/pagination/pagination';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-admin-review-management',
  imports: [CommonModule, RouterModule, PageBreadcrumb, Card, ReactiveFormsModule, Modal, Pagination],
  templateUrl: './review-management.html',
  styleUrl: './review-management.css',
})
export class AdminReviewManagement implements OnInit {
  public readonly assetUrl = environment.assetUrl;
  private readonly fb = inject(FormBuilder);
  private readonly reviewService = inject(ReviewService);

  readonly reviews = signal<ReviewData[]>([]);
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
  });

  // Action Modals
  readonly selectedReview = signal<ReviewData | null>(null);
  readonly isStatusModalOpen = signal(false);
  readonly isUpdatingStatus = signal(false);
  readonly statusToSet = signal<ReviewStatus>('published');

  readonly isDeleteModalOpen = signal(false);
  readonly isDeleting = signal(false);

  // Review Detail View Modal
  readonly isDetailModalOpen = signal(false);

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const query: ReviewQuery = {
      page: this.currentPage(),
      page_size: this.pageSize(),
      search: this.searchForm.value.search?.trim() || undefined,
      status: (this.searchForm.value.status as ReviewStatus) || undefined,
      sort_order: 'desc',
    };

    this.reviewService.admin.getReviews(query).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        let list: ReviewData[] = [];
        if (Array.isArray(res?.data)) {
          list = res.data;
        } else if (res?.data && Array.isArray((res.data as any).data)) {
          list = (res.data as any).data;
        }

        this.reviews.set(list);

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
        const msg = this.reviewService.extractApiErrorMessage(err) || 'Failed to load reviews.';
        this.errorMessage.set(msg);
      },
    });
  }

  onSearch(): void {
    this.currentPage.set(1);
    this.loadReviews();
  }

  onReset(): void {
    this.searchForm.reset({ search: '', status: '' });
    this.currentPage.set(1);
    this.loadReviews();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.loadReviews();
  }

  onPageSizeChange(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadReviews();
  }

  getSerialNumber(index: number): number {
    return (this.currentPage() - 1) * this.pageSize() + index + 1;
  }

  // Quick Action: Approve
  approveReview(review: ReviewData): void {
    this.reviewService.admin.approveReview(review.id).subscribe({
      next: () => {
        this.showSuccessNotification(`Review by ${review.guest?.full_name || 'Guest'} approved.`);
        this.loadReviews();
      },
      error: (err) => {
        this.errorMessage.set(this.reviewService.extractApiErrorMessage(err) || 'Failed to approve review.');
      },
    });
  }

  // Quick Action: Reject
  rejectReview(review: ReviewData): void {
    this.reviewService.admin.rejectReview(review.id).subscribe({
      next: () => {
        this.showSuccessNotification(`Review by ${review.guest?.full_name || 'Guest'} rejected.`);
        this.loadReviews();
      },
      error: (err) => {
        this.errorMessage.set(this.reviewService.extractApiErrorMessage(err) || 'Failed to reject review.');
      },
    });
  }

  // Status Change Modal
  openStatusModal(review: ReviewData): void {
    this.selectedReview.set(review);
    this.statusToSet.set(review.status);
    this.isStatusModalOpen.set(true);
  }

  closeStatusModal(): void {
    this.isStatusModalOpen.set(false);
    this.selectedReview.set(null);
  }

  updateReviewStatus(): void {
    const review = this.selectedReview();
    if (!review) return;

    this.isUpdatingStatus.set(true);
    this.reviewService.admin.updateStatus(review.id, this.statusToSet()).subscribe({
      next: () => {
        this.isUpdatingStatus.set(false);
        this.closeStatusModal();
        this.showSuccessNotification(`Review status updated to "${this.statusToSet()}".`);
        this.loadReviews();
      },
      error: (err) => {
        this.isUpdatingStatus.set(false);
        this.errorMessage.set(this.reviewService.extractApiErrorMessage(err) || 'Failed to update review status.');
      },
    });
  }

  // Delete Modal
  openDeleteModal(review: ReviewData): void {
    this.selectedReview.set(review);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal(): void {
    this.isDeleteModalOpen.set(false);
    this.selectedReview.set(null);
  }

  confirmDelete(): void {
    const review = this.selectedReview();
    if (!review) return;

    this.isDeleting.set(true);
    this.reviewService.admin.deleteReview(review.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeDeleteModal();
        this.showSuccessNotification('Review deleted permanently.');
        this.loadReviews();
      },
      error: (err) => {
        this.isDeleting.set(false);
        this.errorMessage.set(this.reviewService.extractApiErrorMessage(err) || 'Failed to delete review.');
      },
    });
  }

  // Details Modal
  openDetailModal(review: ReviewData): void {
    this.selectedReview.set(review);
    this.isDetailModalOpen.set(true);
  }

  closeDetailModal(): void {
    this.isDetailModalOpen.set(false);
    this.selectedReview.set(null);
  }

  getStatusBadgeClass(status: ReviewStatus): string {
    switch (status) {
      case 'published':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40';
      case 'pending':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40';
      case 'flagged':
        return 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40';
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
}

