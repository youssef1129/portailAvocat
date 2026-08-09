import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request, Response } from 'express';
import { MetricsService } from './metrics.service';

/**
 * Global interceptor that observes every HTTP response and increments
 * http_requests_total with method / route / status_code labels.
 *
 * Why not hand-instrument every controller method? Because this single
 * interceptor covers every route uniformly, including /metrics itself,
 * /health, the swagger UI, and any future controller, with zero
 * per-handler boilerplate.
 *
 * We use req.route.path (the registered route template, e.g.
 * "/api/v1/public/files") rather than req.originalUrl so that
 * high-cardinality paths like "/api/v1/public/abc-uuid-123/unlock"
 * collapse to one labelled bucket instead of exploding Prometheus's
 * label cardinality.
 */
@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();

    return next.handle().pipe(
      tap({
        next: () => this.record(req, res),
        error: () => this.record(req, res),
      }),
    );
  }

  private record(req: Request, res: Response): void {
    // route.path is only populated once Express has matched the route.
    // For unmatched routes (404), fall back to the raw path.
    const routePath =
      (req.route?.path as string | undefined) ?? req.path ?? 'unknown';
    const statusCode = String(res.statusCode ?? 0);

    this.metricsService.httpRequests.inc({
      method: req.method,
      route: routePath,
      status_code: statusCode,
    });
  }
}
