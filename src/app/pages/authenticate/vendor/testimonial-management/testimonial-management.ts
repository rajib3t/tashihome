import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  SubmitTestimonialRequest,
  TestimonialData,
  TestimonialStatus,
  UpdateTestimonialRequest,
  UserTestimonialsParams,
} from '../../../../services/testimonial/testimonial.model';
import { TestimonialService } from '../../../../services/testimonial/testimonial-service';
import { AuthService } from '../../../../services/auth/auth-service';
import { PageBreadcrumb } from '../../../../shared/components/common/page-breadcrumb/page-breadcrumb';
import { Card } from '../../../../shared/components/ui/card/card';
import { Modal } from '../../../../shared/components/ui/modal/modal';
import { Pagination, PaginationMeta } from '../../../../shared/components/ui/pagination/pagination';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-vendor-testimonial-management',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    PageBreadcrumb,
    Card,
    FormsModule,
    ReactiveFormsModule,
    Modal,
    Pagination,
  ],
  templateUrl: './testimonial-management.html',
  styleUrl: './testimonial-management.css',
})
export class VendorTestimonialManagement implements OnInit {
  public readonly assetUrl = environment.assetUrl;
  private readonly fb = inject(FormBuilder);
  private readonly testimonialService = inject(TestimonialService);
  private readonly authService = inject(AuthService);

  readonly testimonials = signal<TestimonialData[]>([]);
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

  // Create / Submit Modal State
  readonly isCreateModalOpen = signal(false);
  readonly isSubmitting = signal(false);
  readonly createForm = this.fb.group({
    name: [''],
    designation: ['Homestay Host in Sikkim', [Validators.required]],
    rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    content: ['', [Validators.required, Validators.minLength(10)]],
  });

  // Edit Modal State
  readonly isEditModalOpen = signal(false);
  readonly isUpdating = signal(false);
  readonly selectedTestimonial = signal<TestimonialData | null>(null);
  readonly editForm = this.fb.group({
    designation: ['', [Validators.required]],
    rating: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    content: ['', [Validators.required, Validators.minLength(10)]],
  });

  // Delete Modal State
  readonly isDeleteModalOpen = signal(false);
  readonly isDeleting = signal(false);

  // Detail Modal State
  readonly isDetailModalOpen = signal(false);

  ngOnInit(): void {
    this.loadTestimonials();
  }

  loadTestimonials(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');

    const params: UserTestimonialsParams = {
      page: this.currentPage(),
      page_size: this.pageSize(),
      sort_order: 'desc',
    };

    this.testimonialService.vendor.getTestimonials(params).subscribe({
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
        const msg = this.testimonialService.extractApiErrorMessage(err) || 'Failed to load your testimonials.';
        this.errorMessage.set(msg);
      },
    });
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

  // Create Modal Actions
  openCreateModal(): void {
    const user = this.authService.authUser();
    this.createForm.reset({
      name: user?.full_name || '',
      designation: 'Homestay Host',
      rating: 5,
      content: '',
    });
    this.isCreateModalOpen.set(true);
  }

  closeCreateModal(): void {
    this.isCreateModalOpen.set(false);
  }

  setCreateRating(rating: number): void {
    this.createForm.patchValue({ rating });
  }

  submitCreate(): void {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    const formVal = this.createForm.value;
    const payload: SubmitTestimonialRequest = {
      name: formVal.name?.trim() || undefined,
      designation: formVal.designation?.trim() || undefined,
      rating: Number(formVal.rating) || 5,
      content: formVal.content?.trim() || '',
    };

    this.testimonialService.vendor.submitTestimonial(payload).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.closeCreateModal();
        this.showSuccessNotification('Your host story has been submitted for approval!');
        this.loadTestimonials();
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(this.testimonialService.extractApiErrorMessage(err) || 'Failed to submit testimonial.');
      },
    });
  }

  // Edit Modal Actions
  openEditModal(t: TestimonialData): void {
    this.selectedTestimonial.set(t);
    this.editForm.reset({
      designation: t.designation || '',
      rating: t.rating || 5,
      content: t.content || '',
    });
    this.isEditModalOpen.set(true);
  }

  closeEditModal(): void {
    this.isEditModalOpen.set(false);
    this.selectedTestimonial.set(null);
  }

  setEditRating(rating: number): void {
    this.editForm.patchValue({ rating });
  }

  submitEdit(): void {
    const t = this.selectedTestimonial();
    if (!t) return;

    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.isUpdating.set(true);
    const formVal = this.editForm.value;
    const payload: UpdateTestimonialRequest = {
      designation: formVal.designation?.trim() || undefined,
      rating: Number(formVal.rating) || 5,
      content: formVal.content?.trim() || '',
    };

    this.testimonialService.vendor.updateTestimonial(t.id, payload).subscribe({
      next: () => {
        this.isUpdating.set(false);
        this.closeEditModal();
        this.showSuccessNotification('Your testimonial has been updated.');
        this.loadTestimonials();
      },
      error: (err) => {
        this.isUpdating.set(false);
        this.errorMessage.set(this.testimonialService.extractApiErrorMessage(err) || 'Failed to update testimonial.');
      },
    });
  }

  // Delete Modal Actions
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
    this.testimonialService.vendor.deleteTestimonial(t.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        this.closeDeleteModal();
        this.showSuccessNotification('Testimonial deleted successfully.');
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
}

