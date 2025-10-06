// Auto-generated scaffold. Replace with real implementation.

// Redis Pub/Sub для real-time
import { redis } from './client';
export const pub = redis.duplicate();
export const sub = redis.duplicate();

Promise.all([pub.connect(), sub.connect()]).catch(console.error);
