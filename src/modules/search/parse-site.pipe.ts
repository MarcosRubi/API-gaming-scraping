import { NotFoundException, PipeTransform } from '@nestjs/common';
import { isSite, type Site } from '../../common/types/game.types';

// Solo tiendas conocidas; el resto es 404.
export class ParseSitePipe implements PipeTransform<string, Site> {
    transform(value: string): Site {
        if (!isSite(value)) throw new NotFoundException(`Tienda desconocida: ${value}`);
        return value;
    }
}
