import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseDto } from '../dto/api-response.dto';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponseDto<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponseDto<T>> {
    return next.handle().pipe(
      map((data) => {
        if (!data) {
          return ApiResponseDto.success(null as T);
        }

        const response = data as Record<string, unknown>;

        // Check if response has the structure { data, meta }
        if (response?.data !== undefined && response?.meta !== undefined) {
          const meta = response.meta as { page: number; limit: number; total: number; totalPages: number };
          return ApiResponseDto.success(response.data as T, 'Success', meta);
        }

        return ApiResponseDto.success(data);
      }),
    );
  }
}
