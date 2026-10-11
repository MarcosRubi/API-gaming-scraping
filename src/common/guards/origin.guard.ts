import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { AppConfigService } from '../../config/app-config.service';

// CORS solo lo aplica el navegador; esto además corta requests de otros
// orígenes del lado del servidor. Sin cabecera Origin/Referer (curl,
// navegador directo) se permite salvo que REQUIRE_ORIGIN=true.
@Injectable()
export class OriginGuard implements CanActivate {
    constructor(private readonly config: AppConfigService) {}

    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest<Request>();
        const origin = req.headers.origin || req.headers.referer;
        if (!origin) {
            if (this.config.get('REQUIRE_ORIGIN')) throw new ForbiddenException({ error: 'Forbidden: invalid origin' });
            return true;
        }
        if (!this.config.get('ALLOWED_ORIGINS').some((allowed) => origin.startsWith(allowed))) {
            throw new ForbiddenException({ error: 'Forbidden: invalid origin' });
        }
        return true;
    }
}
