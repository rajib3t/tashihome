import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api/api-service';
import { ApiResponse } from '../api/api-response.model';
import {
  AdminFeatureTestimonialRequest,
  AdminTestimonialQuery,
  AdminUpdateStatusTestimonialRequest,
  PublicTestimonialsParams,
  SubmitTestimonialRequest,
  TestimonialData,
  TestimonialStatus,
  UpdateTestimonialRequest,
  UserTestimonialsParams,
} from './testimonial.model';
import { generateIdempotencyKey } from '../../utils/idempotency';

function buildPublicTestimonialParams(
  params?: PublicTestimonialsParams
): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = {
    page: params?.page ?? 1,
    page_size: params?.page_size ?? 6,
    sort_order: params?.sort_order ?? 'desc',
  };

  if (params?.is_featured !== undefined) {
    query['is_featured'] = params.is_featured;
  }
  if (params?.user_role) {
    query['user_role'] = params.user_role;
  }

  return query;
}

function buildUserTestimonialParams(
  params?: UserTestimonialsParams
): Record<string, string | number> {
  const query: Record<string, string | number> = {};
  if (params?.page !== undefined) query['page'] = params.page;
  if (params?.page_size !== undefined) query['page_size'] = params.page_size;
  if (params?.sort_order !== undefined) query['sort_order'] = params.sort_order;
  return query;
}

function buildAdminTestimonialParams(
  query?: AdminTestimonialQuery
): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {
    page: query?.page ?? 1,
    page_size: query?.page_size ?? 10,
    sort_order: query?.sort_order ?? 'desc',
  };

  if (query?.status) {
    params['status'] = query.status;
  }
  if (query?.user_role) {
    params['user_role'] = query.user_role;
  }
  if (query?.is_featured !== undefined) {
    params['is_featured'] = query.is_featured;
  }
  if (query?.search?.trim()) {
    params['search'] = query.search.trim();
  }

  return params;
}

@Injectable({ providedIn: 'root' })
export class TestimonialService {
  private readonly apiService = inject(ApiService);

  public extractApiErrorMessage(error: any): string | null {
    return this.apiService.extractApiErrorMessage(error);
  }

  // ================= 1. PUBLIC TESTIMONIALS =================
  public readonly public = {
    /**
     * Get approved testimonials for landing pages / public view
     */
    getTestimonials: (
      params?: PublicTestimonialsParams
    ): Observable<ApiResponse<TestimonialData[]>> => {
      const queryParams = buildPublicTestimonialParams(params);
      return this.apiService.get<TestimonialData[]>('/public/testimonials', {
        params: queryParams,
      });
    },
  };

  // ================= 2. USER TESTIMONIALS (GUESTS) =================
  public readonly user = {
    /**
     * Submit guest testimonial
     */
    submitTestimonial: (
      data: SubmitTestimonialRequest,
      idempotencyKey?: string
    ): Observable<ApiResponse<TestimonialData>> => {
      const key = idempotencyKey || generateIdempotencyKey();
      return this.apiService.protectedPost<TestimonialData>('/user/testimonials/', data, {
        idempotencyKey: key,
      });
    },

    /**
     * Get user's submitted testimonials
     */
    getTestimonials: (
      params?: UserTestimonialsParams
    ): Observable<ApiResponse<TestimonialData[]>> => {
      const queryParams = params ? buildUserTestimonialParams(params) : undefined;
      return this.apiService.protectedGet<TestimonialData[]>('/user/testimonials/', {
        params: queryParams,
      });
    },

    /**
     * Update submitted testimonial
     */
    updateTestimonial: (
      testimonialId: string,
      data: UpdateTestimonialRequest
    ): Observable<ApiResponse<TestimonialData>> => {
      return this.apiService.protectedPut<TestimonialData>(
        `/user/testimonials/${encodeURIComponent(testimonialId)}`,
        data
      );
    },

    /**
     * Delete submitted testimonial
     */
    deleteTestimonial: (testimonialId: string): Observable<ApiResponse<void>> => {
      return this.apiService.protectedDelete<void>(
        `/user/testimonials/${encodeURIComponent(testimonialId)}`
      );
    },
  };

  // ================= 3. VENDOR TESTIMONIALS (HOSTS) =================
  public readonly vendor = {
    /**
     * Submit host / vendor testimonial
     */
    submitTestimonial: (
      data: SubmitTestimonialRequest,
      idempotencyKey?: string
    ): Observable<ApiResponse<TestimonialData>> => {
      const key = idempotencyKey || generateIdempotencyKey();
      return this.apiService.protectedPost<TestimonialData>('/vendor/testimonials', data, {
        idempotencyKey: key,
      });
    },

    /**
     * Get vendor's submitted testimonials
     */
    getTestimonials: (
      params?: UserTestimonialsParams
    ): Observable<ApiResponse<TestimonialData[]>> => {
      const queryParams = params ? buildUserTestimonialParams(params) : undefined;
      return this.apiService.protectedGet<TestimonialData[]>('/vendor/testimonials', {
        params: queryParams,
      });
    },

    /**
     * Update submitted testimonial
     */
    updateTestimonial: (
      testimonialId: string,
      data: UpdateTestimonialRequest
    ): Observable<ApiResponse<TestimonialData>> => {
      return this.apiService.protectedPut<TestimonialData>(
        `/vendor/testimonials/${encodeURIComponent(testimonialId)}`,
        data
      );
    },

    /**
     * Delete submitted testimonial
     */
    deleteTestimonial: (testimonialId: string): Observable<ApiResponse<void>> => {
      return this.apiService.protectedDelete<void>(
        `/vendor/testimonials/${encodeURIComponent(testimonialId)}`
      );
    },
  };

  // ================= 4. ADMIN MODERATION =================
  public readonly admin = {
    /**
     * List all testimonials with filtering
     */
    getTestimonials: (
      query?: AdminTestimonialQuery
    ): Observable<ApiResponse<TestimonialData[]>> => {
      const params = buildAdminTestimonialParams(query);
      return this.apiService.protectedGet<TestimonialData[]>('/admin/testimonials/', {
        params,
      });
    },

    /**
     * Approve testimonial
     */
    approveTestimonial: (
      testimonialId: string
    ): Observable<ApiResponse<TestimonialData>> => {
      return this.apiService.protectedPost<TestimonialData>(
        `/admin/testimonials/${encodeURIComponent(testimonialId)}/approve`,
        {}
      );
    },

    /**
     * Reject testimonial
     */
    rejectTestimonial: (
      testimonialId: string
    ): Observable<ApiResponse<TestimonialData>> => {
      return this.apiService.protectedPost<TestimonialData>(
        `/admin/testimonials/${encodeURIComponent(testimonialId)}/reject`,
        {}
      );
    },

    /**
     * Toggle or set featured flag on testimonial
     */
    featureTestimonial: (
      testimonialId: string,
      isFeatured: boolean
    ): Observable<ApiResponse<TestimonialData>> => {
      const data: AdminFeatureTestimonialRequest = { is_featured: isFeatured };
      return this.apiService.protectedPatch<TestimonialData>(
        `/admin/testimonials/${encodeURIComponent(testimonialId)}/feature`,
        data
      );
    },

    /**
     * Update status
     */
    updateStatus: (
      testimonialId: string,
      status: TestimonialStatus
    ): Observable<ApiResponse<TestimonialData>> => {
      const data: AdminUpdateStatusTestimonialRequest = { status };
      return this.apiService.protectedPatch<TestimonialData>(
        `/admin/testimonials/${encodeURIComponent(testimonialId)}/status`,
        data
      );
    },

    /**
     * Delete testimonial permanently
     */
    deleteTestimonial: (testimonialId: string): Observable<ApiResponse<void>> => {
      return this.apiService.protectedDelete<void>(
        `/admin/testimonials/${encodeURIComponent(testimonialId)}`
      );
    },
  };
}

