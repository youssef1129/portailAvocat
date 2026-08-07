import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from './metrics.service';

/**
 * Prometheus scrape endpoint.
 *
 * Deliberately NOT behind any auth guard: Prometheus needs to scrape this
 * directly inside the Docker network. It is also not proxied by nginx (see
 * infra/nginx templates), so it is unreachable from the public internet.
 *
 * The global Nest prefix in main.ts excludes /metrics from /api/v1.
 */
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }
}
