import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ApiService } from '../api/api-service';
import { ApiResponse, PaginatedResponse } from '../api/api-response.model';
import {
  RoomBlock,
  RoomBlockCreatePayload,
  RoomBlockQueryParams,
  RoomBlockUpdatePayload,
} from './room-block.model';

function buildRoomBlockQueryParams(query?: RoomBlockQueryParams): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: query?.page ?? 1,
    size: query?.size ?? 10,
    sort_by: query?.sort_by ?? 'created_at',
    sort_order: query?.sort_order ?? 'desc',
  };

  if (query?.property_id?.trim()) {
    params['property_id'] = query.property_id.trim();
  }
  if (query?.room_type_id?.trim()) {
    params['room_type_id'] = query.room_type_id.trim();
  }
  if (query?.start_date?.trim()) {
    params['start_date'] = query.start_date.trim();
  }
  if (query?.end_date?.trim()) {
    params['end_date'] = query.end_date.trim();
  }
  if (query?.search?.trim()) {
    params['search'] = query.search.trim();
  }

  return params;
}

const ERROR_MESSAGE_MAP: Record<string, string> = {
  FIELD_REQUIRED: 'Property ID and Room Type ID are required.',
  INVALID_START_DATE: 'Start date cannot be in the past.',
  INVALID_END_DATE: 'End date must be after the start date.',
  INVALID_DATES: 'End date must be after the start date.',
  PROPERTY_ACCESS_DENIED: 'You do not have permission to block rooms for this property.',
  ROOM_TYPE_NOT_ON_PROPERTY: 'The selected room type is not configured on this property.',
  UNITS_EXCEED_TOTAL: 'You cannot block more units than the total room inventory.',
  INSUFFICIENT_UNITS_AVAILABLE: 'Cannot block units because rooms are already booked by guests for these dates.',
  ROOM_BLOCK_NOT_FOUND: 'Room block record not found.',
  ROOM_BLOCK_ACCESS_DENIED: 'You do not have access to manage this room block.',
};

@Injectable({ providedIn: 'root' })
export class RoomBlockService {
  private readonly apiService = inject(ApiService);

  /**
   * Translates backend error codes / messages into clean user-friendly descriptions.
   */
  public extractFriendlyErrorMessage(error: any, fallback = 'Operation failed. Please try again.'): string {
    const rawCode =
      error?.error?.error?.detail?.error_code ||
      error?.error?.detail?.error_code ||
      error?.error?.error_code ||
      error?.error_code;

    if (rawCode && ERROR_MESSAGE_MAP[rawCode]) {
      return ERROR_MESSAGE_MAP[rawCode];
    }

    const apiMsg = this.apiService.extractApiErrorMessage(error);
    if (apiMsg) {
      // Check if message itself mentions known error code keywords
      for (const [code, msg] of Object.entries(ERROR_MESSAGE_MAP)) {
        if (apiMsg.includes(code)) {
          return msg;
        }
      }
      return apiMsg;
    }

    return fallback;
  }

  // ── Vendor APIs ──────────────────────────────────────────────────────────
  public readonly vendor = {
    /**
     * List room blocks for host's properties
     * Endpoint: GET /api/v1/vendor/room-blocks
     */
    getRoomBlocks: (query?: RoomBlockQueryParams): Observable<PaginatedResponse<RoomBlock>> => {
      const params = buildRoomBlockQueryParams(query);
      return this.apiService
        .protectedGet<PaginatedResponse<RoomBlock>>('/vendor/room-blocks/', { params })
        .pipe(
          map((res) => res.data),
          catchError(this.apiService.passthroughError)
        );
    },

    /**
     * Create a new room block
     * Endpoint: POST /api/v1/vendor/room-blocks
     */
    createRoomBlock: (payload: RoomBlockCreatePayload): Observable<ApiResponse<RoomBlock>> => {
      return this.apiService
        .protectedPost<ApiResponse<RoomBlock>>('/vendor/room-blocks/', payload)
        .pipe(
          map((res) => res.data),
          catchError(this.apiService.passthroughError)
        );
    },

    /**
     * Get room block details
     * Endpoint: GET /api/v1/vendor/room-blocks/{room_block_id}
     */
    getRoomBlockById: (id: string): Observable<ApiResponse<RoomBlock>> => {
      return this.apiService
        .protectedGet<ApiResponse<RoomBlock>>(`/vendor/room-blocks/${encodeURIComponent(id)}`)
        .pipe(
          map((res) => res.data),
          catchError(this.apiService.passthroughError)
        );
    },

    /**
     * Update dates, units, or reason
     * Endpoint: PUT /api/v1/vendor/room-blocks/{room_block_id}
     */
    updateRoomBlock: (
      id: string,
      payload: RoomBlockUpdatePayload
    ): Observable<ApiResponse<RoomBlock>> => {
      return this.apiService
        .protectedPut<ApiResponse<RoomBlock>>(`/vendor/room-blocks/${encodeURIComponent(id)}`, payload)
        .pipe(
          map((res) => res.data),
          catchError(this.apiService.passthroughError)
        );
    },

    /**
     * Remove / release room block
     * Endpoint: DELETE /api/v1/vendor/room-blocks/{room_block_id}
     */
    deleteRoomBlock: (id: string): Observable<ApiResponse<void>> => {
      return this.apiService
        .protectedDelete<ApiResponse<void>>(`/vendor/room-blocks/${encodeURIComponent(id)}`)
        .pipe(
          map((res) => res.data),
          catchError(this.apiService.passthroughError)
        );
    },
  };

  // ── Admin APIs ───────────────────────────────────────────────────────────
  public readonly admin = {
    /**
     * List all room blocks across all properties
     * Endpoint: GET /api/v1/admin/room-blocks
     */
    getRoomBlocks: (query?: RoomBlockQueryParams): Observable<PaginatedResponse<RoomBlock>> => {
      const params = buildRoomBlockQueryParams(query);
      return this.apiService
        .protectedGet<PaginatedResponse<RoomBlock>>('/admin/room-blocks/', { params })
        .pipe(
          map((res) => res.data),
          catchError(this.apiService.passthroughError)
        );
    },

    /**
     * Create room block on any property
     * Endpoint: POST /api/v1/admin/room-blocks
     */
    createRoomBlock: (payload: RoomBlockCreatePayload): Observable<ApiResponse<RoomBlock>> => {
      return this.apiService
        .protectedPost<ApiResponse<RoomBlock>>('/admin/room-blocks/', payload)
        .pipe(
          map((res) => res.data),
          catchError(this.apiService.passthroughError)
        );
    },

    /**
     * Get room block details
     * Endpoint: GET /api/v1/admin/room-blocks/{room_block_id}
     */
    getRoomBlockById: (id: string): Observable<ApiResponse<RoomBlock>> => {
      return this.apiService
        .protectedGet<ApiResponse<RoomBlock>>(`/admin/room-blocks/${encodeURIComponent(id)}`)
        .pipe(
          map((res) => res.data),
          catchError(this.apiService.passthroughError)
        );
    },

    /**
     * Update room block
     * Endpoint: PUT /api/v1/admin/room-blocks/{room_block_id}
     */
    updateRoomBlock: (
      id: string,
      payload: RoomBlockUpdatePayload
    ): Observable<ApiResponse<RoomBlock>> => {
      return this.apiService
        .protectedPut<ApiResponse<RoomBlock>>(`/admin/room-blocks/${encodeURIComponent(id)}`, payload)
        .pipe(
          map((res) => res.data),
          catchError(this.apiService.passthroughError)
        );
    },

    /**
     * Remove / release room block
     * Endpoint: DELETE /api/v1/admin/room-blocks/{room_block_id}
     */
    deleteRoomBlock: (id: string): Observable<ApiResponse<void>> => {
      return this.apiService
        .protectedDelete<ApiResponse<void>>(`/admin/room-blocks/${encodeURIComponent(id)}`)
        .pipe(
          map((res) => res.data),
          catchError(this.apiService.passthroughError)
        );
    },
  };
}

