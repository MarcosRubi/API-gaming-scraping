// Corre dentro del navegador (page.evaluate): si el container todavía
// matchea algo, manda solo esos items (barato y apuntado); si no, manda el
// body completo sin scripts/estilos, truncado.
async function sampleHtml(page, config) {
    return page.evaluate((cfg) => {
        const items = Array.from(document.querySelectorAll(cfg.container)).slice(0, 3);
        if (items.length > 0) {
            return items.map((el) => el.outerHTML).join("\n");
        }
        const clone = document.body.cloneNode(true);
        clone.querySelectorAll("script, style").forEach((el) => el.remove());
        return clone.innerHTML.slice(0, 60000);
    }, config);
}

module.exports = { sampleHtml };
