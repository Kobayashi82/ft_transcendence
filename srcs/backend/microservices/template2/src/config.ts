import dotenv from 'dotenv';
dotenv.config();

export const config = {
  PORT: process.env.PORT || 3000,
  REDIS_URL: process.env.REDIS_URL || 'redis://redis:6379',
  DB_PATH: process.env.DB_PATH || '/data/microservicio.db'
};