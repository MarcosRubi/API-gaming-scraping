import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { ScrapersModule } from '../scrapers/scrapers.module';
import { CacheSchedulerService } from './cache-scheduler.service';
import { CacheStoreService } from './cache-store.service';
import { ListingsService } from './listings.service';

@Module({
    imports: [ScrapersModule, CategoriesModule],
    providers: [CacheStoreService, ListingsService, CacheSchedulerService],
    exports: [ListingsService],
})
export class CacheModule {}
