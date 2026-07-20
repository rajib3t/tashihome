export interface ApiResponse<T> {
  data: T;
  status: number | string;
  headers?: any;
  message: string;
}


export interface ApiError {
  message: string;
  status: number;
  code?: string;
}

export interface ApiErrorPayload {
  success: boolean;
  message: string;
  data?: any | null;
  error?: {
    detail?: ErrorDetail;
    [key: string]: any;
  };
}

export interface ApiErrorResponse {
  status: number;
  error: ApiErrorPayload;
}

export interface ErrorDetail {
  status: string;
  message: string;
  error_code: string;
  errors?: Array<{ field: string; message: string }>;
}

export interface ErrorResponse {
  status?: string;
  message?: string;
  error_code?: string;
  code?: string;
  error?: string;
  detail?: ErrorDetail;
  validationErrors?: { [key: string]: string };
}

export interface ParsedCookie {
  name: string;
  value: string;
  options: string[];
}


export interface AuthToken {
  userId: string;
  exp?: number;
  [key: string]: any;
}

export interface PaginationMeta {
  total: number;
  page: number;
  size: number;
}

export interface PaginatedResponse<T> {
  status: string;
  message: string;
  meta: PaginationMeta;
  data: T[];
}

export interface QueryFilter {
  [key: string]: any
}


export interface CreatedBy{
  id: string;
  name: string;
  
}

export interface UpdatedBy{
  id: string;
  name: string;
  
}