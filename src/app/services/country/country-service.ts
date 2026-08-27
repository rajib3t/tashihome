import { inject, Service } from '@angular/core';
import { ApiService } from '../api/api-service';
import { Country, CountryQuery, CountryRequest } from './country-model';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiResponse, PaginatedResponse } from '../api/api-response.model';

@Service()
export class CountryService {
    public readonly apiService = inject(ApiService);

    getCountries(params: CountryQuery): Observable<PaginatedResponse<Country>> {
        const search = params.search ?? {};
        const queryParams: Record<string, string | number> = {
            page: params.page ?? 1,
            size: params.size ?? 10,
        };

        const name = search.name?.trim();
        const code = search.code?.trim();
        const status = search.status?.trim();

        if (name) {
            queryParams['name'] = name;
        }

        if (code) {
            queryParams['code'] = code;
        }

        if (status) {
            queryParams['status'] = status;
        }

        if (params.sortBy?.trim()) {
            queryParams['sortBy'] = params.sortBy.trim();
        }

        if (params.sortOrder) {
            queryParams['sortOrder'] = params.sortOrder;
        }

        return this.apiService.protectedGet<PaginatedResponse<Country>>('/admin/countries/', { params: queryParams }).pipe(
            map(response => response.data),
            catchError(this.apiService.passthroughError)
        );
    }

    createCountry(country: CountryRequest): Observable<ApiResponse<Country>> {
        return this.apiService.protectedPost<ApiResponse<Country>>('/admin/countries/', country).pipe(
            map(response => response.data)
        );
    }

    updateCountry(id: string, country: Partial<CountryRequest>): Observable<ApiResponse<Country>> {
        return this.apiService.protectedPut<ApiResponse<Country>>(`/admin/countries/${id}`, country).pipe(
            map(response => response.data),
            catchError(this.apiService.passthroughError)
        );
    }

    statusUpdate(id: string, status: string): Observable<ApiResponse<Country>> {
        return this.apiService.protectedPatch<ApiResponse<Country>>(`/admin/countries/${id}/${status}`, { status }).pipe(
            map(response => response.data),
            catchError(this.apiService.passthroughError)
        );
    }

    deleteCountry(id: string): Observable<void> {
        return this.apiService.protectedDelete<void>(`/admin/countries/${id}/`).pipe(
            map(() => undefined)
        );
    }
}
