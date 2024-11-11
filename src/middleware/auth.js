// src/middleware/auth.js
const config = require('../config/config');
const logger = require('../utils/logger');

const ipWhitelist = (req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // Allow public endpoints without IP check
  if (config.security.publicEndpoints.includes(req.path)) {
    return next();
  }

  if (!config.security.allowedIPs.includes(clientIP)) {
    logger.warn(`Unauthorized IP access attempt from ${clientIP}`);
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'Your IP is not whitelisted'
    });
  }
  next();
};

const apiKeyAuth = (req, res, next) => {
  // Allow public endpoints without API key
  if (config.security.publicEndpoints.includes(req.path)) {
    return next();
  }

  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== config.security.apiKey) {
    logger.warn(`Invalid API key attempt from IP ${req.ip}`);
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid or missing API key'
    });
  }
  next();
};

module.exports = { ipWhitelist, apiKeyAuth };
