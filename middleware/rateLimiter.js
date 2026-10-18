// Supplementary Problem 2: In-memory sliding window rate limiter for AI requests
const requestLogs = new Map();

const WINDOW_MS = parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS, 10) || 60000; // 1 minute window
const MAX_REQUESTS = parseInt(process.env.AI_RATE_LIMIT_MAX, 10) || 5;         // Max 5 requests/minute

function aiRateLimiter(req, res, next) {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || 'client-default';
    const now = Date.now();

    let clientHistory = requestLogs.get(clientIp) || [];
    // Filter out timestamps outside current sliding window
    clientHistory = clientHistory.filter(timestamp => now - timestamp < WINDOW_MS);

    if (clientHistory.length >= MAX_REQUESTS) {
        const resetSeconds = Math.ceil((WINDOW_MS - (now - clientHistory[0])) / 1000);
        return res.status(429).json({
            success: false,
            fallback: true,
            message: `AI Rate limit reached (${MAX_REQUESTS} requests/min). Please wait ${resetSeconds}s before requesting again.`,
            description: ''
        });
    }

    clientHistory.push(now);
    requestLogs.set(clientIp, clientHistory);
    next();
}

module.exports = aiRateLimiter;
