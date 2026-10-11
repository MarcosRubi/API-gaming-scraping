import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { ScrapingModule } from '../scraping/scraping.module';
import { SteamModule } from '../steam/steam.module';
import { CacheStoreService } from './cache-store.service';
import { ListingRegistry } from './listing-registry.service';
import { ListingsSchedulerService } from './listings-scheduler.service';
import { ListingsController } from './listings.controller';
import { ListingsService } from './listings.service';

@Module({
    imports: [ScrapingModule, SteamModule, CategoriesModule],
    controllers: [ListingsController],
    providers: [CacheStoreService, ListingRegistry, ListingsService, ListingsSchedulerService],
})
export class ListingsModule {}
