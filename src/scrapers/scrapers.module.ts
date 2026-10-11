import { Module } from '@nestjs/common';
import { SelectorsModule } from '../selectors/selectors.module';
import { SelfHealModule } from '../self-heal/self-heal.module';
import { ScraperEngineService } from './scraper-engine.service';
import { ScreenshotsService } from './screenshots.service';
import { StoreScrapersService } from './store-scrapers.service';

@Module({
    imports: [SelectorsModule, SelfHealModule],
    providers: [ScraperEngineService, ScreenshotsService, StoreScrapersService],
    exports: [StoreScrapersService],
})
export class ScrapersModule {}
