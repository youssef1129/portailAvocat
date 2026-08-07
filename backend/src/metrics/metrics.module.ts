import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { HttpMetricsInterceptor } from './http-metrics.interceptor';

/**
 * Global so any provider that injects MetricsService (StorageService,
 * PublicService, the HTTP interceptor) can resolve it without every
 * module having to import MetricsModule explicitly. NestJS best practice
 * for cross-cutting infrastructure (metrics, logging, tracing).
 *
 * The /metrics scrape endpoint is still NOT exposed to the public
 * internet because nginx does not proxy it — only Prometheus inside
 * the Docker network can reach it.
 *
 * APP_INTERCEPTOR is registered here (rather than in AppModule) so that
 * Nest can resolve HttpMetricsInterceptor through this module's providers.
 * Nest picks up APP_INTERCEPTOR tokens declared in any module's providers.
 */
@Global()
@Module({
  controllers: [MetricsController],
  providers: [
    MetricsService,
    HttpMetricsInterceptor,
    {
      provide: APP_INTERCEPTOR,
      useExisting: HttpMetricsInterceptor,
    },
  ],
  exports: [MetricsService, HttpMetricsInterceptor],
})
export class MetricsModule {}
