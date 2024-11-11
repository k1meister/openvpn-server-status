// src/routes/serverRoutes.js
const express = require('express');
const router = express.Router();
const serverController = require('../controllers/serverController');
const { ipWhitelist, apiKeyAuth } = require('../middleware/auth');
const validateServer = require('../middleware/validateServer');

// Public routes (no authentication required)
router.get('/status', serverController.getServerStatus);
router.get('/locations', serverController.getServerLocations);

// Protected routes - need API key and IP whitelist
const protectedRoutes = express.Router();
protectedRoutes.use(ipWhitelist);
protectedRoutes.use(apiKeyAuth);

// Server management routes
protectedRoutes.get('/', serverController.getAllServers);
protectedRoutes.get('/stats/summary', serverController.getStatsSummary);
protectedRoutes.get('/:hostname', serverController.getServerByHostname);
protectedRoutes.post('/', validateServer, serverController.addServer);
protectedRoutes.put('/:hostname', validateServer, serverController.updateServer);
protectedRoutes.delete('/:hostname', serverController.deleteServer);

// Use protected routes
router.use('/', protectedRoutes);

module.exports = router;