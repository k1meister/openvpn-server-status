// src/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config/config');
const { ipWhitelist, apiKeyAuth } = require('./middleware/auth');
const limiters = require('./middleware/rateLimiter');
const { client, initDatabase } = require('./config/database');
const serverRoutes = require('./routes/serverRoutes');
const serverController = require('./controllers/serverController');
const logger = require('./utils/logger');

const app = express();

// Basic middleware
app.use(express.json());
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

// Apply global rate limiting
app.use('/api', limiters.api);

// Auto-update function
async function updateAllServers() {
  try {
    const result = await client.execute('SELECT * FROM vpn_servers');
    logger.info(`Starting auto-update for ${result.rows.length} servers at ${new Date().toISOString()}`);
    
    for (const server of result.rows) {
      try {
        await serverController.updateServerStatus(server);
        logger.info(`Auto-update successful for ${server.hostname}`);
      } catch (error) {
        logger.error(`Auto-update failed for ${server.hostname}:`, error);
      }
    }
    
    logger.info('Auto-update cycle completed');
  } catch (error) {
    logger.error('Auto-update cycle failed:', error);
  }
}

// Initialize auto-updates
function initializeAutoUpdate() {
  if (!config.autoUpdate.enabled) {
    logger.info('Auto-update is disabled');
    return;
  }

  const interval = config.autoUpdate.interval;
  logger.info(`Initializing auto-update system with ${interval}ms interval`);
  
  if (global.updateInterval) {
    clearInterval(global.updateInterval);
  }

  global.updateInterval = setInterval(updateAllServers, interval);
  
  // Run initial update
  updateAllServers().catch(error => {
    logger.error('Initial update failed:', error);
  });
}

// Mount server routes
app.use('/api/servers', serverRoutes);

// Auto-update control endpoint with protection
app.post('/api/admin/auto-update/control', 
  ipWhitelist, 
  apiKeyAuth,
  async (req, res) => {
    const { action } = req.body;
    
    switch(action) {
      case 'start':
        if (global.updateInterval) {
          return res.status(400).json({ error: 'Auto-update is already running' });
        }
        initializeAutoUpdate();
        res.json({ message: 'Auto-update started' });
        break;
        
      case 'stop':
        if (!global.updateInterval) {
          return res.status(400).json({ error: 'Auto-update is not running' });
        }
        clearInterval(global.updateInterval);
        global.updateInterval = null;
        res.json({ message: 'Auto-update stopped' });
        break;
        
      case 'status':
        res.json({
          running: !!global.updateInterval,
          interval: config.autoUpdate.interval,
          enabled: config.autoUpdate.enabled,
          nextUpdate: global.updateInterval ? 
            new Date(Date.now() + config.autoUpdate.interval).toISOString() : null
        });
        break;
        
      case 'force':
        await updateAllServers();
        res.json({ message: 'Force update completed' });
        break;
        
      default:
        res.status(400).json({ error: 'Invalid action' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Something went wrong!',
    details: config.server.env === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = config.server.port;

// Initialize database and start server
async function startServer() {
  try {
    await initDatabase();
    
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${config.server.env} mode`);
      
      // Start auto-update system after server is running
      initializeAutoUpdate();
      logger.info('Auto-update system initialized');
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
startServer();

module.exports = app;
