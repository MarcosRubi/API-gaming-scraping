import { Module } from '@nestjs/common';
import { CategoriesCacheService } from './categories-cache.service';
import { CategoriesService } from './categories.service';

@Module({
    providers: [CategoriesCacheService, CategoriesService],
    exports: [CategoriesService],
})
export class CategoriesModule {}
