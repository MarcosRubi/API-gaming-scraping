import { Module } from '@nestjs/common';
import { SelectorsModule } from '../selectors/selectors.module';
import { OpenAiSelectorClient } from './openai-selector.client';
import { SelfHealService } from './self-heal.service';

@Module({
    imports: [SelectorsModule],
    providers: [OpenAiSelectorClient, SelfHealService],
    exports: [SelfHealService],
})
export class SelfHealModule {}
