// Auto-generated scaffold. Replace with real implementation.

// Redis Pub/Sub для real-time
import { redis } from './client';
import type { createClient } from 'redis';

export const pub: ReturnType<typeof createClient> = redis.duplicate();
export const sub: ReturnType<typeof createClient> = redis.duplicate();

Promise.all([pub.connect(), sub.connect()]).catch(console.error);
