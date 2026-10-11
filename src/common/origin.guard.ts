import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { allowedOrigins, isProduction } from './allowed-origins';

// CORS solo lo aplica el navegador; esto además corta requests de otros
// orígenes del lado del servidor. Sin cabecera Origin/Referer (curl,
// navegador directo): permitido en dev, bloqueado en producción.
@Injectable()
export class OriginGuard implements CanActivate {
    private readonly origins = allowedOrigins();

    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest<Request>();
        const origin = req.headers.origin || req.headers.referer;
        if (!origin) {
            if (isProduction()) throw new ForbiddenException({ error: 'Forbidden: invalid origin' });
            return true;
        }
        if (!this.origins.some((allowed) => origin.startsWith(allowed))) {
            throw new ForbiddenException({ error: 'Forbidden: invalid origin' });
        }
        return true;
    }
}
