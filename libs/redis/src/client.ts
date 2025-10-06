// Auto-generated scaffold. Replace with real implementation.

import { createClient } from 'redis';

const url = process.env.REDIS_URL || 'redis://localhost:6379';
export const redis = createClient({ url });

redis.on('error', (err) => console.error('Redis Client Error', err));
redis.connect();
