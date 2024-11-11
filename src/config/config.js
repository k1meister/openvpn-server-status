// src/config/config.js
require('dotenv').config();

const config = {
  server: {
    port: process.env.PORT || 4000,
    env: process.env.NODE_ENV || 'development'
  },
  db: {
    url: process.env.TURSO_URL,
    token: process.env.TURSO_TOKEN
  },
  security: {
    apiKey: process.env.API_KEY,
    allowedIPs: (process.env.ALLOWED_IPS || '127.0.0.1,::1').split(','),
    publicEndpoints: ['/api/servers/status', '/api/servers/locations']
  },
  autoUpdate: {
    interval: parseInt(process.env.UPDATE_INTERVAL) || 60000,
    enabled: process.env.AUTO_UPDATE_ENABLED !== 'false',
    retries: parseInt(process.env.UPDATE_RETRIES) || 3
  }
};

module.exports = config;