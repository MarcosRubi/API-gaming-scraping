import { Module } from '@nestjs/common';
import { CategoriesModule } from '../categories/categories.module';
import { ScrapingModule } from '../scraping/scraping.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
    imports: [ScrapingModule, CategoriesModule],
    controllers: [SearchController],
    providers: [SearchService],
})
export class SearchModule {}
