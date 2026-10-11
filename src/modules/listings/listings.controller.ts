import { Controller, Get, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ListingsService } from './listings.service';

@Controller()
export class ListingsController {
    constructor(private readonly listings: ListingsService) {}

    // /listings/top-sellers-steam, /listings/steam-spotlight, /listings/genre-action...
    @Get('listings/:key')
    listing(@Param('key') key: string, @Res({ passthrough: true }) res: Response) {
        return this.serve(key, res);
    }

    // Noticias oficiales de los juegos más vendidos (también cacheadas).
    @Get('news')
    news(@Res({ passthrough: true }) res: Response) {
        return this.serve('news', res);
    }

    private async serve(key: string, res: Response) {
        const { data, updatedAt } = await this.listings.getCached(key);
        res.set('X-Cache-Updated-At', new Date(updatedAt).toISOString());
        return data;
    }
}
