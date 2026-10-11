import { Module } from '@nestjs/common';
import { SteamApiClient } from './steam-api.client';
import { SteamCatalogService } from './steam-catalog.service';
import { SteamEnrichService } from './steam-enrich.service';

@Module({
    providers: [SteamApiClient, SteamCatalogService, SteamEnrichService],
    exports: [SteamCatalogService, SteamEnrichService],
})
export class SteamModule {}
