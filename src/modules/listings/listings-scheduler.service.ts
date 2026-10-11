import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { AppConfigService } from '../../config/app-config.service';
import { ListingsService } from './listings.service';

// Al arrancar dispara un warm-up de toda la caché (sin bloquear el boot) y
// programa el refresco periódico. El cron se registra a mano (en vez de
// @Cron) porque la expresión viene de la configuración.
@Injectable()
export class ListingsSchedulerService implements OnApplicationBootstrap {
    private readonly logger = new Logger(ListingsSchedulerService.name);

    constructor(
        private readonly config: AppConfigService,
        private readonly registry: SchedulerRegistry,
        private readonly listings: ListingsService,
    ) {}

    onApplicationBootstrap() {
        void this.listings.refreshAll().catch((err) => this.logger.error('warm-up inicial de caché falló', err));

        const schedule = this.config.get('CACHE_REFRESH_CRON');
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
