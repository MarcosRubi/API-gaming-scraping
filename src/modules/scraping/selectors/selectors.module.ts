import { Module } from '@nestjs/common';
import { SelectorStoreService } from './selector-store.service';

@Module({
    providers: [SelectorStoreService],
    exports: [SelectorStoreService],
})
export class SelectorsModule {}
