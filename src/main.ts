import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import morgan from 'morgan';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

// Orden de arranque: los onModuleInit lanzan el browser persistente y cargan
// las cachés de disco; luego el server escucha y el warm-up de la caché +
// el cron corren en segundo plano (onApplicationBootstrap).
async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    const config = app.get(AppConfigService);

    app.set('json spaces', 2);
    app.use(morgan(config.get('APP_ENV') === 'development' ? 'dev' : 'combined'));
    app.enableCors({
        origin: config.get('ALLOWED_ORIGINS'),
        methods: ['GET', 'OPTIONS'],
        allowedHeaders: ['Content-Type'],
    });
    // SIGINT/SIGTERM → onModuleDestroy: cierra Chrome antes de salir.
    app.enableShutdownHooks();

    const port = config.get('PORT');
    await app.listen(port);
    Logger.log(`Server listening on port ${port} (${config.get('APP_ENV')})`, 'Bootstrap');
}

bootstrap().catch((err) => {
    console.error('Fatal error during bootstrap', err);
    process.exit(1);
});
