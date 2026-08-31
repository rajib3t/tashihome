import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable } from 'rxjs';
import { ApiService } from '../api/api-service';
import { ApiResponse, PaginatedResponse } from '../api/api-response.model';
import { CreateStaffDTO, StaffQuery, StaffUser, UpdateStaffDTO, UpdateStaffStatusDTO } from './staff.model';

@Injectable({
  providedIn: 'root',
})
export class StaffService {
  public readonly apiService = inject(ApiService);

  /**
   * List staff and admin accounts (supports ?role=admin or ?role=staff, plus pagination and search filters)
   * GET /api/v1/admin/staffs
   */
  public getStaffs(params: StaffQuery = {}): Observable<PaginatedResponse<StaffUser>> {
    const search = params.search ?? {};
    const queryParams: Record<string, string | number> = {
      page: params.page ?? 1,
      size: params.size ?? 10,
    };

    const name = (search.full_name || search.name)?.trim();
    const email = search.email?.trim();
    const phone = search.phone?.trim();
    const status = search.status?.trim();
    const role = search.role?.trim();

    if (name) {
      queryParams['full_name'] = name;
    }
    if (email) {
      queryParams['email'] = email;
    }
    if (phone) {
      queryParams['phone'] = phone;
    }
    if (status) {
      queryParams['status'] = status;
    }
    if (role) {
      queryParams['role'] = role;
    }
    if (params.sortBy?.trim()) {
      queryParams['sort_by'] = params.sortBy.trim();
    }
    if (params.sortOrder) {
      queryParams['sort_order'] = params.sortOrder;
    }

    return this.apiService.protectedGet<PaginatedResponse<StaffUser>>('/admin/staffs/', { params: queryParams }).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  /**
   * Create staff or admin (specify role in request body: 'admin' | 'staff')
   * POST /api/v1/admin/staffs
   */
  public createStaff(data: CreateStaffDTO): Observable<ApiResponse<StaffUser>> {
    return this.apiService.protectedPost<ApiResponse<StaffUser>>('/admin/staffs/', data).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  /**
   * Get staff/admin detail by UUID
   * GET /api/v1/admin/staffs/{staff_id}
   */
  public getStaffById(staffId: string): Observable<ApiResponse<StaffUser>> {
    return this.apiService.protectedGet<ApiResponse<StaffUser>>(`/admin/staffs/${staffId}`).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  /**
   * Update staff/admin detail & role
   * PUT /api/v1/admin/staffs/{staff_id}
   */
  public updateStaff(staffId: string, data: UpdateStaffDTO): Observable<ApiResponse<StaffUser>> {
    return this.apiService.protectedPut<ApiResponse<StaffUser>>(`/admin/staffs/${staffId}`, data).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  /**
   * Update account status (body)
   * PATCH /api/v1/admin/staffs/{staff_id}/status
   */
  public updateStaffStatus(staffId: string, payload: UpdateStaffStatusDTO): Observable<ApiResponse<StaffUser>> {
    return this.apiService.protectedPatch<ApiResponse<StaffUser>>(`/admin/staffs/${staffId}/status`, payload).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  /**
   * Update account status (path)
   * PATCH /api/v1/admin/staffs/change/{staff_id}/{status}
   */
  public changeStaffStatusByPath(staffId: string, status: string): Observable<ApiResponse<StaffUser>> {
    return this.apiService.protectedPatch<ApiResponse<StaffUser>>(`/admin/staffs/change/${staffId}/${status}`, { status }).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  /**
   * Upload profile image
   * PATCH /api/v1/admin/staffs/{staff_id}/profile-image
   */
  public updateStaffProfileImage(staffId: string, imageFile: File): Observable<ApiResponse<StaffUser>> {
    const formData = new FormData();
    formData.append('profile_image', imageFile);

    return this.apiService.protectedUploadPatch<ApiResponse<StaffUser>>(`/admin/staffs/${staffId}/profile-image`, formData).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }

  /**
   * Send password reset link
   * POST /api/v1/admin/staffs/{staff_id}/password-reset
   */
  public sendStaffPasswordReset(staffId: string, confirm: string = 'CONFIRM'): Observable<ApiResponse<any>> {
    return this.apiService.protectedPost<ApiResponse<any>>(`/admin/staffs/${staffId}/password-reset`, { confirm }).pipe(
      map(response => response.data),
      catchError(this.apiService.passthroughError)
    );
  }
}

