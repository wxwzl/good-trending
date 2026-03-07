import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * 统一响应数据格式
 * NestJS 特定的包装格式（仅包含 data 字段）
 */
export interface ResponseWrapper<T> {
  data: T;
}

/**
 * 统一响应拦截器
 * 将所有成功响应包装为 { data: ... } 格式
 *
 * 注意：这里使用 ResponseWrapper 而非 @good-trending/dto 的 ApiResponse
 * 因为 NestJS 的响应格式是 { data: T }，而共享包的是 { success: boolean, data?: T }
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ResponseWrapper<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseWrapper<T>> {
    return next.handle().pipe(map((data) => ({ data })));
  }
}
