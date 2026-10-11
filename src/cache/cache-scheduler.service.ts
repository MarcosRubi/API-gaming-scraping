import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ListingsService } from './listings.service';

const DEFAULT_CRON = '0 * * * *';

// Al arrancar dispara un warm-up de toda la caché (sin bloquear el boot) y
// programa el refresco periódico. El cron se registra a mano (en vez de
// @Cron) porque la expresión viene de CACHE_REFRESH_CRON.
@Injectable()
export class CacheSchedulerService implements OnApplicationBootstrap {
    private readonly logger = new Logger(CacheSchedulerService.name);

    constructor(
        private readonly config: ConfigService,
        private readonly registry: SchedulerRegistry,
        private readonly listings: ListingsService,
    ) {}

    onApplicationBootstrap() {
        void this.listings.refreshAll().catch((err) => this.logger.error('warm-up inicial de caché falló', err));

        const schedule = this.config.get<string>('CACHE_REFRESH_CRON') || DEFAULT_CRON;
        const job = CronJob.from({
            cronTime: schedule,
            onTick: () => {
                this.listings.refreshAll().catch((err) => this.logger.error('refreshAll falló', err));
            },
        });
        this.registry.addCronJob('cache-refresh', job);
        job.start();
        this.logger.log(`cron programado: ${schedule}`);
    }
}
