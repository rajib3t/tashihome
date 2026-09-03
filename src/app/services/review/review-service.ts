import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api/api-service';
import { ApiResponse } from '../api/api-response.model';
import {
  AdminReviewStatusRequest,
  HostReplyRequest,
  PublicPropertyReviewsResponseData,
  ReviewData,
  ReviewQuery,
  ReviewStatus,
  ReviewSummary,
  SubmitReviewRequest,
  UpdateReviewRequest,
} from './review.model';
import { generateIdempotencyKey } from '../../utils/idempotency';

function buildReviewQueryParams(query?: ReviewQuery): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: query?.page ?? 1,
    page_size: query?.page_size ?? 10,
    sort_order: query?.sort_order ?? 'desc',
  };

  if (query?.status) {
    params['status'] = query.status;
  }
  if (query?.property_id?.trim()) {
    params['property_id'] = query.property_id.trim();
  }
  if (query?.search?.trim()) {
    params['search'] = query.search.trim();
  }

  return params;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private readonly apiService = inject(ApiService);

  public extractApiErrorMessage(error: any): string | null {
    return this.apiService.extractApiErrorMessage(error);
  }

  // ================= 1. PUBLIC REVIEWS =================
  public readonly public = {
    /**
     * Get reviews and rating breakdown for a specific property by ID or slug
     */
    getPropertyReviews: (
      propertyIdOrSlug: string,
      page = 1,
      pageSize = 10
    ): Observable<ApiResponse<ReviewData[]>> => {
      const endpoint = `/public/reviews/property/${encodeURIComponent(propertyIdOrSlug)}`;
      return this.apiService.get<ReviewData[]>(endpoint, {
        params: { page, page_size: pageSize },
      });
    },

    /**
     * Get rating summary only (average rating, total counts, rating breakdown)
     */
    getPropertyRatingSummary: (
      propertyIdOrSlug: string
    ): Observable<ApiResponse<ReviewSummary>> => {
      const endpoint = `/public/reviews/property/${encodeURIComponent(propertyIdOrSlug)}/summary`;
      return this.apiService.get<ReviewSummary>(endpoint);
    },
  };

  // ================= 2. USER REVIEWS =================
  public readonly user = {
    /**
     * Submit a review for a completed booking
     */
    submitReview: (
      data: SubmitReviewRequest,
      idempotencyKey?: string
    ): Observable<ApiResponse<ReviewData>> => {
      const key = idempotencyKey || generateIdempotencyKey();
      return this.apiService.protectedPost<ReviewData>('/user/reviews/', data, {
        idempotencyKey: key,
      });
    },

    /**
     * Get list of reviews submitted by the logged-in user
     */
    getReviews: (query?: ReviewQuery): Observable<ApiResponse<ReviewData[]>> => {
      const params = buildReviewQueryParams(query);
      return this.apiService.protectedGet<ReviewData[]>('/user/reviews/', { params });
    },

    /**
     * Update an existing review submitted by the user
     */
    updateReview: (
      reviewId: string,
      data: UpdateReviewRequest
    ): Observable<ApiResponse<ReviewData>> => {
      return this.apiService.protectedPut<ReviewData>(`/user/reviews/${encodeURIComponent(reviewId)}`, data);
    },

    /**
     * Delete a review submitted by the user
     */
    deleteReview: (reviewId: string): Observable<ApiResponse<void>> => {
      return this.apiService.protectedDelete<void>(`/user/reviews/${encodeURIComponent(reviewId)}`);
    },
  };

  // ================= 3. VENDOR REVIEWS =================
  public readonly vendor = {
    /**
     * Get all reviews left on the vendor's properties
     */
    getReviews: (query?: ReviewQuery): Observable<ApiResponse<ReviewData[]>> => {
      const params = buildReviewQueryParams(query);
      return this.apiService.protectedGet<ReviewData[]>('/vendor/reviews', { params });
    },

    /**
     * Reply to a review left by a guest
     */
    replyToReview: (
      reviewId: string,
      hostReply: string
    ): Observable<ApiResponse<ReviewData>> => {
      const data: HostReplyRequest = { host_reply: hostReply };
      return this.apiService.protectedPost<ReviewData>(
        `/vendor/reviews/${encodeURIComponent(reviewId)}/reply`,
        data
      );
    },
  };

  // ================= 4. ADMIN REVIEWS =================
  public readonly admin = {
    /**
     * List all reviews with search and moderation filters
     */
    getReviews: (query?: ReviewQuery): Observable<ApiResponse<ReviewData[]>> => {
      const params = buildReviewQueryParams(query);
      return this.apiService.protectedGet<ReviewData[]>('/admin/reviews/', { params });
    },

    /**
     * Approve a pending review
     */
    approveReview: (reviewId: string): Observable<ApiResponse<ReviewData>> => {
      return this.apiService.protectedPost<ReviewData>(
        `/admin/reviews/${encodeURIComponent(reviewId)}/approve`,
        {}
      );
    },

    /**
     * Reject a pending review
     */
    rejectReview: (reviewId: string): Observable<ApiResponse<ReviewData>> => {
      return this.apiService.protectedPost<ReviewData>(
        `/admin/reviews/${encodeURIComponent(reviewId)}/reject`,
        {}
      );
    },

    /**
     * Update status of a review (e.g. 'flagged', 'hidden', etc.)
     */
    updateStatus: (
      reviewId: string,
      status: ReviewStatus
    ): Observable<ApiResponse<ReviewData>> => {
      const data: AdminReviewStatusRequest = { status };
      return this.apiService.protectedPatch<ReviewData>(
        `/admin/reviews/${encodeURIComponent(reviewId)}/status`,
        data
      );
    },

    /**
     * Delete a review permanently
     */
    deleteReview: (reviewId: string): Observable<ApiResponse<void>> => {
      return this.apiService.protectedDelete<void>(
        `/admin/reviews/${encodeURIComponent(reviewId)}`
      );
    },
  };
}

