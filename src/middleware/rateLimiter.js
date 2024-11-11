// src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

const createLimiter = (options) => rateLimit({
  windowMs: options.windowMs || 15 * 60 * 1000, // Default 15 minutes
  max: options.max || 100, // Default 100 requests per window
  message: {
    error: 'Too many requests from this IP, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const limiters = {
  api: createLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  })
};

module.exports = limiters;