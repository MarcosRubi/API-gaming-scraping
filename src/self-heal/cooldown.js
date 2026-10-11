const lastAttempt = new Map();

function canAttempt(id, cooldownMs) {
    const last = lastAttempt.get(id);
    if (!last) return true;
    return Date.now() - last >= cooldownMs;
}

function recordAttempt(id) {
    lastAttempt.set(id, Date.now());
}

module.exports = { canAttempt, recordAttempt };
