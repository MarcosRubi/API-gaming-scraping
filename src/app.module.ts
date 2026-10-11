import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { UpstreamErrorFilter } from './common/filters/upstream-error.filter';
import { OriginGuard } from './common/guards/origin.guard';
import { AppConfigModule } from './config/config.module';
import { BrowserModule } from './infrastructure/browser/browser.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { HealthController } from './modules/health/health.controller';
import { ListingsModule } from './modules/listings/listings.module';
import { SearchModule } from './modules/search/search.module';

@Module({
    imports: [AppConfigModule, ScheduleModule.forRoot(), BrowserModule, ListingsModule, CatalogModule, SearchModule],
    controllers: [HealthController],
    providers: [
        { provide: APP_GUARD, useClass: OriginGuard },
        { provide: APP_FILTER, useClass: UpstreamErrorFilter },
    ],
})
export class AppModule {}
