import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from './app-config.service';
import { validateEnv } from './env.validation';

const appEnv = process.env.APP_ENV || 'development';

// Carga .env.<APP_ENV>.local (overrides personales) y luego .env.<APP_ENV>.
// En Docker/VPS las variables llegan por el entorno del contenedor y los
// archivos simplemente no existen.
@Global()
@Module({
    imports: [
        ConfigModule.forRoot({
            envFilePath: [`.env.${appEnv}.local`, `.env.${appEnv}`],
            validate: validateEnv,
            cache: true,
        }),
    ],
    providers: [AppConfigService],
    exports: [AppConfigService],
})
export class AppConfigModule {}
