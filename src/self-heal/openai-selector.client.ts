import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import type { SelectorConfig } from '../common/types';
import type { SelectorPatch } from './selector-validator';

const FIELD_DESCRIPTIONS: Record<string, string> = {
    name: 'Nombre del juego',
    imgUrl: 'URL de la imagen de portada/cápsula',
    url: 'URL absoluta a la ficha del juego',
    price: 'Precio actual mostrado (texto tal cual aparece en la página)',
    priceOld: 'Precio original tachado, solo si hay descuento (opcional)',
    discount: 'Porcentaje o texto de descuento (opcional)',
};

const FIELD_SCHEMA = {
    type: 'object',
    properties: {
        selector: {
            type: ['string', 'null'],
            description:
                'Selector CSS relativo al item, o null si el campo es el item mismo (ej. la URL cuando el item ya es el <a>)',
        },
        attr: {
            type: 'string',
            description:
                "'text' para textContent, 'href'/'src' para leer la URL absoluta, o el nombre de un atributo HTML a leer con getAttribute",
        },
    },
    required: ['attr'],
};

const TOOL = {
    type: 'function' as const,
    function: {
        name: 'propose_selector_patch',
        description:
            'Propone selectores CSS actualizados para extraer una lista de juegos de una página de tienda de videojuegos.',
        parameters: {
            type: 'object',
            properties: {
                container: {
                    type: 'string',
                    description: 'Selector CSS que matchea cada item/tarjeta de juego en la lista',
                },
                waitForSelector: {
                    type: 'string',
                    description: 'Selector CSS que indica que el contenido relevante ya cargó',
                },
                fields: {
                    type: 'object',
                    description: 'Solo incluir los campos que realmente se encuentren en el HTML dado. Omitir el resto.',
                    properties: Object.fromEntries(Object.keys(FIELD_DESCRIPTIONS).map((key) => [key, FIELD_SCHEMA])),
                },
            },
            required: ['container', 'fields'],
        },
    },
};

export interface InferPatchInput {
    site: string;
    key: string;
    url: string;
    html: string;
    currentConfig: SelectorConfig;
}

// Le pide a OpenAI selectores nuevos cuando un sitio cambió su HTML.
@Injectable()
export class OpenAiSelectorClient {
    private client: OpenAI | null = null;

    constructor(private readonly config: ConfigService) {}

    get enabled(): boolean {
        return Boolean(this.config.get<string>('OPENAI_API_KEY'));
    }

    private getClient(): OpenAI {
        if (!this.client) this.client = new OpenAI({ apiKey: this.config.get<string>('OPENAI_API_KEY') });
        return this.client;
    }

    async inferSelectorPatch({ site, key, url, html, currentConfig }: InferPatchInput): Promise<SelectorPatch | null> {
        const model = this.config.get<string>('SELF_HEAL_MODEL') || 'gpt-4o-mini';
        const fieldsHelp = Object.entries(FIELD_DESCRIPTIONS)
            .map(([k, v]) => `- ${k}: ${v}`)
            .join('\n');

        const prompt = [
            `Un scraper de "${site}" (clave "${key}", URL ${url}) dejó de encontrar los datos esperados porque el sitio cambió su HTML.`,
            `Necesito selectores CSS actualizados para extraer una lista de juegos con estos campos:`,
            fieldsHelp,
            `Config anterior (probablemente rota, es solo una pista de qué se buscaba, no la copies si no aplica):`,
            JSON.stringify(currentConfig),
            `Reglas: solo referenciá elementos que existan de verdad en el HTML de abajo. Si no encontrás un campo opcional (priceOld, discount, incluso imgUrl), omitilo en vez de inventar un selector que no exista.`,
            `HTML de la página (muestra de los items o del body):`,
            html,
        ].join('\n\n');

        const response = await this.getClient().chat.completions.create({
            model,
            messages: [{ role: 'user', content: prompt }],
            tools: [TOOL],
            tool_choice: { type: 'function', function: { name: TOOL.function.name } },
        });

        const toolCall = response.choices[0].message.tool_calls?.[0];
        if (!toolCall) return null;
        return JSON.parse(toolCall.function.arguments) as SelectorPatch;
    }
}
