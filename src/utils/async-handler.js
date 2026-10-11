// Envuelve un handler async de Express: si la promesa rechaza, responde con
// un error en vez de dejar el request colgado (bug original: los catch solo
// hacían console.error y nunca respondían al cliente).
const wrapAsync = (fn) => (req, res) => {
    Promise.resolve(fn(req, res)).catch((err) => {
        console.error(err);
        if (!res.headersSent) {
            res.status(502).json({ error: "Upstream scrape failed", message: err.message });
        }
    });
};

module.exports = wrapAsync;
