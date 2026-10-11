import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppEnv } from './env.validation';

// Acceso tipado a la configuración validada: los servicios piden
// `config.get('PORT')` y reciben un number, sin strings sueltos ni parseos.
@Injectable()
export class AppConfigService {
    constructor(private readonly config: ConfigService<AppEnv, true>) {}

    get<K extends keyof AppEnv>(key: K): AppEnv[K] {
        return this.config.get(key, { infer: true });
    }
}
