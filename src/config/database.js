// src/config/database.js
const { createClient } = require('@libsql/client');
const logger = require('../utils/logger');

const client = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_TOKEN
});

const initDatabase = async () => {
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS vpn_servers (
        id TEXT PRIMARY KEY,
        hostname TEXT NOT NULL UNIQUE,
        ip TEXT NOT NULL,
        country TEXT NOT NULL,
        city TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        clients INTEGER DEFAULT 0,
        last_updated DATETIME,
        username TEXT NOT NULL,
        password TEXT NOT NULL
      )
    `);
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
};

// Add connection health check
const checkConnection = async () => {
  try {
    await client.execute('SELECT 1');
    return true;
  } catch (error) {
    logger.error('Database connection check failed:', error);
    return false;
  }
};

module.exports = { client, initDatabase, checkConnection };