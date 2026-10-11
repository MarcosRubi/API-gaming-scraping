import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { BrowserModule } from './browser/browser.module';
import { OriginGuard } from './common/origin.guard';
import { UpstreamErrorFilter } from './common/upstream-error.filter';
import { GamesModule } from './games/games.module';

@Module({
    imports: [ConfigModule.forRoot({ isGlobal: true }), ScheduleModule.forRoot(), BrowserModule, GamesModule],
    providers: [
        { provide: APP_GUARD, useClass: OriginGuard },
        { provide: APP_FILTER, useClass: UpstreamErrorFilter },
    ],
})
export class AppModule {}
