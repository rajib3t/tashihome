import { Service, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient, HttpErrorResponse, HttpEvent, HttpEventType, HttpHeaders, HttpResponse } from '@angular/common/http';
import { catchError, filter, map, Observable, throwError } from 'rxjs';
import { ApiErrorPayload, ApiResponse, QueryFilter } from './api-response.model';
import { REFRESH_ENDPOINT } from '../auth/auth-service';
@Service()
export class ApiService {
  readonly apiUrl = environment.apiUrl;
  readonly apiVersion = 'v1';
  readonly apiBaseUrl = this.buildApiBaseUrl(this.apiUrl, this.apiVersion);

  private http = inject(HttpClient);
  constructor() {}
  private getCookie(name: string): string | undefined {
    if (typeof document === 'undefined') {
      return undefined;
    }

    return document.cookie
      .split('; ')
      .find(row => row.startsWith(`${name}=`))
      ?.split('=')
      .slice(1)
      .join('=');
  }

  private getCsrfToken(): string | undefined {
    const cookieNames = ['csrf_token', 'CSRF-TOKEN', 'XSRF-TOKEN', 'csrfToken'];

    for (const name of cookieNames) {
      const token = this.getCookie(name);
      if (token) {
        
        try {
          return decodeURIComponent(token);
        } catch {
          return token;
        }
      }
    }

    console.warn('CSRF token cookie not found. Please ensure the server sets a CSRF token cookie.');

    return undefined;
  }

  private buildApiBaseUrl(apiUrl: string, apiVersion: string): string {
    const normalizedApiUrl = apiUrl.replace(/\/$/, '');
    const hasApiPrefix = /\/api$/i.test(normalizedApiUrl);
    const baseUrl = hasApiPrefix ? normalizedApiUrl : `${normalizedApiUrl}/api`;

    return `${baseUrl}/${apiVersion}`;
  }

  private makeRequest<T>(method: string, endpoint: string, body?: any, isProtected: boolean = false, options?: any): Observable<ApiResponse<T>> {
    const url = `${this.apiBaseUrl}${endpoint}`;
    
    const headers = this.createHeaders(isProtected, body, method, endpoint, options);
    const { headers: _overrideHeaders, idempotencyKey: _idemKey, ...remainingOptions } = options || {};
    const requestOptions = {
      ...remainingOptions,
      headers,
      observe: 'response' as 'response',
      withCredentials: true,
    };
    let request$: Observable<HttpEvent<T>>;
    switch (method.toLowerCase()) {
      case 'get':
        request$ = this.http.get<T>(url, requestOptions);
        break;
      case 'post':
        request$ = this.http.post<T>(url, body, requestOptions);
        break;
      case 'put':
        request$ = this.http.put<T>(url, body, requestOptions);
        break;
      case 'patch':
        request$ = this.http.patch<T>(url, body, requestOptions);
        break;
      case 'delete':
        if (body) {
          // For DELETE requests with body, we need to add the body to requestOptions
          request$ = this.http.delete<T>(url, { ...requestOptions, body });
        } else {
          request$ = this.http.delete<T>(url, requestOptions);
        }
        break;
      default:
        return throwError(() => new Error(`Unsupported request method: ${method}`));
    }
    return request$.pipe(
      filter((event): event is HttpResponse<T> => event.type === HttpEventType.Response),
      map(response => this.handleResponse<T>(response)),
      catchError(this.handleError)
    );
  }


  private createHeaders(
    isProtected: boolean = false,
    body?: any,
    method?: string,
    endpoint?: string,
    options?: any
  ): HttpHeaders {
    // Let the interceptor handle all headers including Content-Type, Accept, etc.
    let headers = new HttpHeaders();

    const csrfToken = this.getCsrfToken();

    if (csrfToken) {
      headers = headers.set('X-CSRF-Token', csrfToken);
      headers = headers.set('X-XSRF-TOKEN', csrfToken);
    } else {
      console.warn('CSRF token cookie was not readable in this runtime. Request will be sent without CSRF header.');
    }

    const isRefreshTokenPost = !isProtected && method?.toLowerCase() === 'post' && endpoint === REFRESH_ENDPOINT;

    if (isProtected || isRefreshTokenPost) {
      headers = headers.set('X-Is-Protected', 'true');
    }

    // Merge custom headers from options if provided
    if (options?.headers) {
      if (options.headers instanceof HttpHeaders) {
        options.headers.keys().forEach((key: string) => {
          const val = options.headers.get(key);
          if (val !== null && val !== undefined) {
            headers = headers.set(key, val);
          }
        });
      } else if (typeof options.headers === 'object') {
        Object.entries(options.headers).forEach(([key, val]) => {
          if (val !== null && val !== undefined) {
            headers = headers.set(key, String(val));
          }
        });
      }
    }

    // Attach Idempotency-Key if provided in options
    if (options?.idempotencyKey) {
      headers = headers.set('Idempotency-Key', options.idempotencyKey);
      headers = headers.set('X-Idempotency-Key', options.idempotencyKey);
    }

    // Don't set Content-Type for FormData - let Angular auto-set with boundary
    if (body instanceof FormData) {
      headers = headers.delete('Content-Type');
    }
    
    return headers;
  }

  private handleError(error: ApiErrorPayload) {
    // If the error is already standardized by the auth interceptor, pass it through
    if (error && error.error && typeof error.error === 'object' && 'success' in error.error) {
      console.log('ApiService: Passing through standardized error from interceptor:', error);
      return throwError(() => error);
    }
    
    // Handle raw HttpErrorResponse (fallback for non-intercepted errors)
    if (error instanceof HttpErrorResponse) {
      const serverError = error.error;
      const serverMessage = serverError?.detail?.message || serverError?.message;
     
      if (serverError?.message == 'Validation failed') {
        // Parse validation errors and create field-specific error messages
        const validationErrors: { [key: string]: string } = {};
        
        if (serverError?.error && Array.isArray(serverError.error)) {
          serverError.error.forEach((errorMessage: string) => {
            // Split by colon to get field name and error message
            const colonIndex = errorMessage.indexOf(':');
            if (colonIndex !== -1) {
              const fieldName = errorMessage.substring(0, colonIndex).trim();
              const fieldError = errorMessage.substring(colonIndex + 1).trim();
              validationErrors[fieldName] = fieldError;
            }
          });
        }
        
        const standardizedError = {
          status: error.status || 0,
          error: {
            success: false,
            message: 'Validation failed',
            data: null,
            error: 'Validation Error',
            validationErrors: validationErrors
          }
        };
        console.log('ApiService: Handling validation errors:', standardizedError);
        return throwError(() => standardizedError);
      }
      
      const standardizedError = {
        status: error.status || 0,
        error: {
          success: false,
          message: serverMessage || error.message || 'An unknown error occurred!',
          data: null,
          error: serverError || error.message || 'HTTP Error'
        }
      };
      console.log('ApiService: Standardizing raw HttpErrorResponse:', standardizedError);
      return throwError(() => standardizedError);
    }
    
    // Handle other error types
    const standardizedError = {
      status: 0,
      error: {
        success: false,
        message: error?.message || 'An unknown error occurred!',
        data: null,
        error: error || 'Unknown Error'
      }
    };
    console.log('ApiService: Standardizing unknown error type:', standardizedError);
    return throwError(() => standardizedError);
  }
  
  // Utility: handle API response
  private handleResponse<T>(response: HttpResponse<T>): ApiResponse<T> {
    const isReplay =
      response.headers.get('Idempotent-Replay') === 'true' ||
      response.headers.get('idempotent-replay') === 'true';
    if (isReplay) {
      const key =
        response.headers.get('X-Idempotency-Key') ||
        response.headers.get('x-idempotency-key');
      console.info(`[ApiService] Response replayed from idempotent cache (Key: ${key})`);
    }

    return {
      data: response.body as T,
      status: response.status,
      headers: response.headers,
      message: response.body && (response.body as any).message ? (response.body as any).message : ''
    };
  }


  // Unified API methods
  public get<T>(endpoint: string, options?: any): Observable<ApiResponse<T>> {
    return this.makeRequest<T>('GET', endpoint, undefined, false, options);
  }

  public post<T>(endpoint: string, data: any, options?: any): Observable<ApiResponse<T>> {
    return this.makeRequest<T>('POST', endpoint, data, false, options);
  }

  public put<T>(endpoint: string, data: any, options?: any): Observable<ApiResponse<T>> {
    return this.makeRequest<T>('PUT', endpoint, data, false, options);
  }

  public patch<T>(endpoint: string, data: any, options?: any): Observable<ApiResponse<T>> {
    return this.makeRequest<T>('PATCH', endpoint, data, false, options);
  }

  public delete<T>(endpoint: string, options?: any): Observable<ApiResponse<T>> {
    return this.makeRequest<T>('DELETE', endpoint, undefined, false, options);
  }

  public protectedGet<T>(endpoint: string, options?: any): Observable<ApiResponse<T>> {
    return this.makeRequest<T>('GET', endpoint, undefined, true, options);
  }

  public protectedPost<T>(endpoint: string, data: any, options?: any): Observable<ApiResponse<T>> {
    return this.makeRequest<T>('POST', endpoint, data, true, options);
  }

  public protectedUpload<T>(endpoint: string, formData: FormData, options?: any): Observable<ApiResponse<T>> {
    const url = `${this.apiBaseUrl}/${endpoint.replace(/^\/+/, '')}`;
    const headers = this.createHeaders(true, formData);
    
    // Merge headers from options with our headers, ensuring FormData headers take precedence
    const mergedHeaders = options?.headers 
      ? headers.set('Accept', options.headers['Accept'] || options.headers.get?.('Accept') || 'application/json')
      : headers;
    
    const requestOptions = {
      headers: mergedHeaders,
      observe: 'response' as 'response',
      withCredentials: true,
      ...(options ? { ...options, headers: mergedHeaders } : {})
    };

    return this.http.post<T>(url, formData, requestOptions).pipe(
      filter((event): event is HttpResponse<T> => event.type === HttpEventType.Response),
      map(response => this.handleResponse<T>(response)),
      catchError(this.handleError)
    );
  }

  public protectedUploadPatch<T>(endpoint: string, formData: FormData, options?: any): Observable<ApiResponse<T>> {
    const url = `${this.apiBaseUrl}/${endpoint.replace(/^\/+/, '')}`;
    const headers = this.createHeaders(true, formData);
    
    // Merge headers from options with our headers, ensuring FormData headers take precedence
    const mergedHeaders = options?.headers 
      ? headers.set('Accept', options.headers['Accept'] || options.headers.get?.('Accept') || 'application/json')
      : headers;
    
    const requestOptions = {
      headers: mergedHeaders,
      observe: 'response' as 'response',
      withCredentials: true,
      ...(options ? { ...options, headers: mergedHeaders } : {})
    };

    return this.http.patch<T>(url, formData, requestOptions).pipe(
      filter((event): event is HttpResponse<T> => event.type === HttpEventType.Response),
      map(response => this.handleResponse<T>(response)),
      catchError(this.handleError)
    );
  }

  public protectedPut<T>(endpoint: string, data: any, options?: any): Observable<ApiResponse<T>> {
    return this.makeRequest<T>('PUT', endpoint, data, true, options);
  }

  public protectedPatch<T>(endpoint: string, data: any, options?: any): Observable<ApiResponse<T>> {
    return this.makeRequest<T>('PATCH', endpoint, data, true, options);
  }

  public protectedDelete<T>(endpoint: string, data?: any, options?: any): Observable<ApiResponse<T>> {
    return this.makeRequest<T>('DELETE', endpoint, data, true, options);
  }


  public buildFilter(filter: QueryFilter): string {
    const filterParams = Object.entries(filter)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    return filterParams ? `&${filterParams}` : '';
  }

  public extractApiErrorMessage(error: any): string | null {
    const visited = new Set<object>();

    const findMessage = (value: any): string | null => {
      if (value == null) {
        return null;
      }

      if (typeof value === 'string') {
        return value.trim().length > 0 ? value : null;
      }

      if (typeof value !== 'object') {
        return null;
      }

      if (visited.has(value)) {
        return null;
      }
      visited.add(value);

      if (Array.isArray(value)) {
        for (const entry of value) {
          const message = findMessage(entry);
          if (message) {
            return message;
          }
        }
        return null;
      }

      if (typeof value.message === 'string' && value.message.trim().length > 0) {
        return value.message;
      }

      if (typeof value.detail === 'string' && value.detail.trim().length > 0) {
        return value.detail;
      }

      if (value.detail && typeof value.detail === 'object') {
        const detailMessage = findMessage(value.detail);
        if (detailMessage) {
          return detailMessage;
        }
      }

      if (Array.isArray(value.errors)) {
        for (const entry of value.errors) {
          const message = findMessage(entry?.message);
          if (message) {
            return message;
          }
        }
      }

      for (const nestedValue of Object.values(value)) {
        const message = findMessage(nestedValue);
        if (message) {
          return message;
        }
      }

      return null;
    };

    return findMessage(error);
  }
  
  public passthroughError = (error: unknown) => throwError(() => error);
}
