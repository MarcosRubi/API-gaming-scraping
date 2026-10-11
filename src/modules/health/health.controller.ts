import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
    // Para healthchecks del contenedor / balanceador.
    @Get()
    health() {
        return { status: 'ok' };
    }
}
