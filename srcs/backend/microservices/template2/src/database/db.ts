import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import { config } from '../config';

export const initializeDB = async () => {
  return open({
    filename: config.DB_PATH,
    driver: sqlite3.Database
  });
};