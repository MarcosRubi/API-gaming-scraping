import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import type { Response } from 'express';

// Las HttpException (404, 403...) salen tal cual. Cualquier otro error viene
// de un scrape que falló contra la tienda: se responde 502 con el mensaje en
// vez de un 500 genérico.
@Catch()
export class UpstreamErrorFilter implements ExceptionFilter {
    private readonly logger = new Logger('UpstreamError');

    catch(exception: unknown, host: ArgumentsHost) {
        const res = host.switchToHttp().getResponse<Response>();
        if (res.headersSent) return;

        if (exception instanceof HttpException) {
            res.status(exception.getStatus()).json(exception.getResponse());
            return;
        }

        const error = exception instanceof Error ? exception : new Error(String(exception));
        this.logger.error(error.message, error.stack);
        res.status(502).json({ error: 'Upstream scrape failed', message: error.message });
    }
}
