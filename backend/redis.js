const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

if (process.env.USE_REDIS === 'true' && !process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
    console.warn('WARNING: REDIS_URL is not set; using default localhost URL without authentication. Set REDIS_URL in production.');
}

let redisReady;

if (process.env.USE_REDIS === 'true') {
    const client = createClient({ url: REDIS_URL });

    client.on('error', (err) => {
        console.error('Redis client error:', err);
    });

    client.on('connect', () => {
        console.log('Connected to Redis');
    });

    redisReady = client.connect()
        .then(() => client)
        .catch((err) => {
            console.error('Failed to connect to Redis:', err);
            if (process.env.NODE_ENV === 'production') {
                process.exit(1);
            }
            console.warn('Redis unavailable — falling back to in-memory sessions (dev only)');
            return null;
        });
} else {
    redisReady = Promise.resolve(null);
}

module.exports = { redisReady };
