import { createClient } from 'redis';
import { config } from '../config';

export const redisClient = createClient({ url: config.REDIS_URL });

redisClient.on('error', (err) => console.error('Redis Client Error', err));

export const connectRedis = async () => {
  await redisClient.connect();
  console.log('Conectado a Redis');
};