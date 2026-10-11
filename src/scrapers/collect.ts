import type { FieldConfig, RawExtraction, RawItem, SelectorConfig } from '../common/types';

// Función pura y serializable: se pasa tal cual a page.evaluate(), así que no
// puede depender de nada fuera de su propio cuerpo (Puppeteer la ejecuta
// dentro del contexto del navegador, re-parseando su código fuente). Los
// tipos se borran al compilar, así que no afectan lo que llega al navegador.
export function collectListItems(config: SelectorConfig): RawExtraction {
    // Resuelve la raíz de búsqueda: todo el documento, o -si containerScope
    // está definido- la sección más cercana (subiendo desde un heading que
    // matchea headingText) que efectivamente contiene `config.container`.
    // Esto evita depender de índices numéricos frágiles como
    // `.custom-section-collection[5]`, que dejan de servir en cuanto el
    // sitio reordena o agrega secciones.
    function resolveRoot(): ParentNode {
        if (!config.containerScope) return document;
        const { sectionSelector, headingSelector, headingText, maxAncestorHops } = config.containerScope;
        const needle = headingText.toLowerCase();
        const headings = Array.from(document.querySelectorAll(headingSelector)).filter((h) =>
            (h.textContent || '').toLowerCase().includes(needle),
        );
        if (headings.length === 0) return document;
        const heading = headings[0];

        if (sectionSelector) {
            const sections = Array.from(document.querySelectorAll(sectionSelector));
            const match = sections.find((s) => s.contains(heading));
            if (match) return match;
        }

        let node: Element = heading;
        const hops = maxAncestorHops || 6;
        for (let i = 0; i < hops && node && node.parentElement; i++) {
            node = node.parentElement;
            if (node.querySelectorAll(config.container).length > 0) return node;
        }
        return document;
    }

    function readField(item: Element, field: FieldConfig | undefined): string | null {
        if (!field) return null;

        // Extracción por patrón de texto: para sitios con clases CSS hasheadas
        // que cambian en cada build (ej. la página de ofertas de Steam), donde
        // no hay selector estable pero el texto sí tiene forma fija
        // (descuento "-90%", precios "$X.XX" en orden viejo->nuevo).
        // patternIndex admite negativos (desde el final); patternMinCount
        // exige un mínimo de coincidencias (ej. priceOld solo existe si hay 2 precios).
        if (field.textPattern) {
            const regex = new RegExp(field.textPattern);
            const matches = Array.from(item.querySelectorAll('*'))
                .filter((el) => el.children.length === 0)
                .map((el) => (el.textContent || '').trim())
                .filter((text) => text && regex.test(text));
            if (field.patternMinCount && matches.length < field.patternMinCount) return null;
            let idx = field.patternIndex || 0;
            if (idx < 0) idx = matches.length + idx;
            return matches[idx] != null ? matches[idx] : null;
        }

        const el = field.selector ? item.querySelector(field.selector) : item;
        if (!el) return null;

        // Muchos sitios usan lazy-load: el atributo "real" (data-src,
        // data-delayed-image, etc.) puede existir aunque el navegador todavía
        // no haya resuelto `src`/`.src` a la imagen final.
        let value: string | null = field.preferAttr ? el.getAttribute(field.preferAttr) : null;
        if (value == null) {
            if (field.attr === 'text') value = el.textContent;
            else if (field.attr === 'href') value = (el as HTMLAnchorElement).href;
            else if (field.attr === 'src') value = (el as HTMLImageElement).src;
            else value = el.getAttribute(field.attr || '');
        }

        if (value == null) return null;
        value = String(value).trim();
        if (field.splitOn) value = (value.split(field.splitOn)[field.index || 0] || '').trim();
        return value;
    }

    const root = resolveRoot();
    const items = Array.from(root.querySelectorAll(config.container)).slice(0, config.limit || 8);

    const results = items.map((item) => {
        const out: RawItem = {};
        Object.keys(config.fields || {}).forEach((fieldKey) => {
            out[fieldKey] = readField(item, config.fields[fieldKey]);
        });
        return out;
    });

    return { matchedCount: items.length, items: results };
}
