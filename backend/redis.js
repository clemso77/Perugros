const { createClient } = require('redis');

// Redis is enabled by default. Set USE_REDIS=false to fall back to MemoryStore (dev only).
const USE_REDIS = process.env.USE_REDIS !== 'false';

function exitOnProductionError(err, context) {
    console.error(`Redis ${context}:`, err);
    if (process.env.NODE_ENV === 'production') {
        console.error('Fatal Redis error in production, terminating process.');
        process.exit(1);
    }
}

let redisClient = null;

if (USE_REDIS) {
    redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redisClient.on('error', (err) => {
        exitOnProductionError(err, 'client error');
    });

    redisClient.on('connect', () => {
        console.log('Redis client connected');
    });

    // connect() is called asynchronously; connect-redis queues commands until the
    // connection is ready, so the store is safe to use before connect() resolves.
    redisClient.connect().catch((err) => {
        exitOnProductionError(err, 'connection failed');
    });
}

module.exports = redisClient;
