import { ApiResponse, PaginationMeta } from '../interfaces/api-response.interface';

export class ApiResponseDto<T = unknown> implements ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
  timestamp: string;

  static success<T>(data: T, message = 'Success', meta?: PaginationMeta): ApiResponseDto<T> {
    return {
      success: true,
      message,
      data,
      meta,
      timestamp: new Date().toISOString(),
    };
  }

  static error<T>(message: string, data: T | null = null): ApiResponseDto<T | null> {
    return {
      success: false,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}
