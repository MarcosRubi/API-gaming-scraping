import { Module } from '@nestjs/common';
import { CacheModule } from '../cache/cache.module';
import { CategoriesModule } from '../categories/categories.module';
import { ScrapersModule } from '../scrapers/scrapers.module';
import { GamesController } from './games.controller';

@Module({
    imports: [ScrapersModule, CacheModule, CategoriesModule],
    controllers: [GamesController],
})
export class GamesModule {}
