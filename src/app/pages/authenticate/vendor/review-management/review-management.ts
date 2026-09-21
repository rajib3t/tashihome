import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, DestroyRef} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ReviewData, ReviewQuery, ReviewStatus } from '../../../../services/review/review.model';
import { ReviewService } from '../../../../services/review/review-service';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../shared/components/ui/card/card';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { Pagination, PaginationMeta } from '../../../../shared/components/ui/pagination/pagination';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-vendor-review-management',
  imports: [CommonModule, RouterModule, PageBreadcrumb, Card, FormsModule, ReactiveFormsModule, Modal, Pagination],
  templateUrl: './review-management.html',
  styleUrl: './review-management.css',
})
export class VendorReviewManagement implements OnInit {
  public readonly assetUrl = environment.assetUrl;
  private readonly fb = inject(FormBuilder);
  private readonly reviewService = inject(ReviewService);
  private readonly destroyRef = inject(DestroyRef);
  private messageTimeout?: ReturnType<typeof setTimeout>;

  readonly reviews = signal<ReviewData[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly successMessage = signal('');

  readonly currentPage = signal(1);
  readonly pageSize = signal(10);
  readonly totalItems = signal(0);
  readonly pageSizeOptions = [10, 20, 30];

  meta: PaginationMeta = {
    page: 1,
    size: 10,
    total: 0,
  };

  readonly searchForm = this.fb.group({
    search: [''],
    status: [''],
  });

  // Reply Modal State
  readonly isReplyModalOpen = signal(false);
  readonly isSubmittingReply = signal(false);
  readonly selectedReview = signal<ReviewData | null>(null);
  replyText = '';
  replyError = '';

  // Detail Modal State
  readonly isDetailModalOpen = signal(false);

  ngOnInit(): void {
    this.loadReviews();
  }

  loadReviews(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const formVal = this.searchForm.value;
    const query: ReviewQuery = {
      page: this.currentPage(),
      page_size: this.pageSize(),
      search: formVal.search?.trim() || undefined,
      status: (formVal.status as ReviewStatus) || undefined,
      sort_order: 'desc',
    };

    this.reviewService.vendor.getReviews(query).subscribe({
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
        const msg = this.reviewService.extractApiErrorMessage(err) || 'Failed to load property reviews.';
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

  // Summary Metrics
  get averageRating(): number {
    const list = this.reviews();
    if (list.length === 0) return 0;
    const sum = list.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    return +(sum / list.length).toFixed(1);
  }

  get repliedCount(): number {
    return this.reviews().filter((r) => !!r.host_reply).length;
  }

  get pendingReplyCount(): number {
    return this.reviews().filter((r) => !r.host_reply).length;
  }

  // Reply Modal
  openReplyModal(review: ReviewData): void {
    this.selectedReview.set(review);
    this.replyText = review.host_reply || '';
    this.replyError = '';
    this.isReplyModalOpen.set(true);
  }

  closeReplyModal(): void {
    this.isReplyModalOpen.set(false);
    this.selectedReview.set(null);
    this.replyText = '';
    this.replyError = '';
  }

  submitReply(): void {
    const review = this.selectedReview();
    if (!review) return;

    if (!this.replyText.trim()) {
      this.replyError = 'Please write your response message before submitting.';
      return;
    }

    this.isSubmittingReply.set(true);
    this.replyError = '';

    this.reviewService.vendor.replyToReview(review.id, this.replyText.trim()).subscribe({
      next: (res) => {
        this.isSubmittingReply.set(false);
        this.closeReplyModal();
        this.showSuccessNotification('Your response has been published to guests.');
        this.loadReviews();
      },
      error: (err) => {
        this.isSubmittingReply.set(false);
        this.replyError = this.reviewService.extractApiErrorMessage(err) || 'Failed to submit reply.';
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

  ngOnDestroy(): void {
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
  }
}

