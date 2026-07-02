import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../database/prisma.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body } = request;

    // Only log mutating requests
    const mutatingMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];
    if (!mutatingMethods.includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(() => {
        const jwtPayload = user as JwtPayload | undefined;
        const entityType = url.split('/')[2] || 'unknown';
        const action = `${method} ${url}`;

        this.prisma.auditLog
          .create({
            data: {
              userId: jwtPayload?.sub || null,
              action,
              entityType,
              entityId: (url.split('/')[3] as string) || 'new',
              newValues: body ? JSON.parse(JSON.stringify(body)) : null,
              ipAddress: request.ip,
              userAgent: request.headers['user-agent'] || null,
            },
          })
          .catch((err) => console.error('Audit log failed:', err));
      }),
    );
  }
}
