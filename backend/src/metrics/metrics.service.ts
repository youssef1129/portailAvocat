/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/require-await */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Counter, Registry, collectDefaultMetrics } from 'prom-client';

/**
 * Single source of truth for application-defined Prometheus metrics.
 *
 * Exposes three custom Counters chosen because they map to real, high-value
 * failure modes of this product:
 *
 *  - storage_upload_successes_total / storage_upload_failures_total:
 *    MinIO upload failures. This is the single most critical failure point
 *    of the deposit flow: if uploads silently fail, lawyers lose pieces.
 *
 *  - pin_verification_failures_total: a spike in wrong-PIN attempts against
 *    a valid, non-expired deposit request signals a brute-force attempt
 *    against a public deposit link. Unknown-token / expired-token cases are
 *    intentionally NOT counted here, because they only indicate scanning
 *    of random UUIDs, not an attack on a real link.
 *
 *  - http_requests_total: labelled by method/route/status_code, populated
 *    automatically by the global HttpMetricsInterceptor so we get uniform
 *    coverage across every controller without per-method instrumentation.
 *
 * Plus the free default Node.js process metrics (memory, GC, event loop lag,
 * etc.) via prom-client's collectDefaultMetrics().
 */
@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry: Registry;

  readonly storageUploadSuccesses: Counter<string>;
  readonly storageUploadFailures: Counter<string>;
  readonly pinVerificationFailures: Counter<string>;
  readonly httpRequests: Counter<string>;

  constructor() {
    this.registry = new Registry();

    this.storageUploadSuccesses = new Counter({
      name: 'storage_upload_successes_total',
      help: 'Total successful uploads to the MinIO storage backend.',
      registers: [this.registry],
    });

    this.storageUploadFailures = new Counter({
      name: 'storage_upload_failures_total',
      help: 'Total failed uploads to the MinIO storage backend.',
      registers: [this.registry],
    });

    this.pinVerificationFailures = new Counter({
      name: 'pin_verification_failures_total',
      help: 'Total wrong-PIN attempts against a valid, non-expired deposit request.',
      registers: [this.registry],
    });

    this.httpRequests = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests handled, labelled by method, route and status_code.',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });
  }

  onModuleInit(): void {
    // Free signal: Node.js process metrics (memory, GC, event loop lag, etc.).
    collectDefaultMetrics({ register: this.registry });
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
