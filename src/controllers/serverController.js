// src/controllers/serverController.js
const { client } = require('../config/database');
const { getClientCount } = require('../utils/sshClient');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

const serverController = {
  // Get all servers (protected)
  async getAllServers(req, res) {
    try {
      const result = await client.execute(`
        SELECT hostname, ip, country, city, status, 
               clients, last_updated 
        FROM vpn_servers
      `);
      res.json(result.rows);
    } catch (error) {
      logger.error('Error fetching servers:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get server by hostname (protected)
  async getServerByHostname(req, res) {
    try {
      const { hostname } = req.params;
      const result = await client.execute({
        sql: `SELECT hostname, ip, country, city, status, 
                     clients, last_updated 
              FROM vpn_servers 
              WHERE hostname = ?`,
        args: [hostname]
      });
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Server not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      logger.error('Error fetching server:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get public server status
  async getServerStatus(req, res) {
    try {
      const result = await client.execute(`
        SELECT s.hostname, s.country, s.city, s.status, 
               s.last_updated, s.clients 
        FROM vpn_servers s
        WHERE s.status = 'operational'
      `);
      res.json(result.rows);
    } catch (error) {
      logger.error('Error fetching server status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get server locations (public)
  async getServerLocations(req, res) {
    try {
      const result = await client.execute(`
        SELECT DISTINCT s.country, s.city, COUNT(*) as server_count
        FROM vpn_servers s
        WHERE s.status = 'operational'
        GROUP BY s.country, s.city
      `);
      res.json(result.rows);
    } catch (error) {
      logger.error('Error fetching locations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Add new server (protected)
  async addServer(req, res) {
    try {
      const { hostname, ip, country, city, username, password } = req.body;
      const id = uuidv4();
      
      // Check if hostname already exists
      const existing = await client.execute({
        sql: 'SELECT hostname FROM vpn_servers WHERE hostname = ?',
        args: [hostname]
      });

      if (existing.rows.length > 0) {
        return res.status(400).json({ error: 'Server with this hostname already exists' });
      }

      // Insert new server
      await client.execute({
        sql: `INSERT INTO vpn_servers (
                id, hostname, ip, country, city, status, 
                username, password, last_updated, clients
              ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, DATETIME('now'), 0)`,
        args: [id, hostname, ip, country, city, username, password]
      });

      // Immediately try to get client count
      try {
        const clients = await getClientCount({ ip, username, password });
        await client.execute({
          sql: `UPDATE vpn_servers 
                SET clients = ?, status = 'operational'
                WHERE id = ?`,
          args: [clients, id]
        });
      } catch (error) {
        logger.error(`Failed to get initial client count for ${hostname}:`, error);
      }
      
      res.status(201).json({ 
        message: 'Server added successfully',
        serverId: id 
      });
    } catch (error) {
      logger.error('Error adding server:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update server (protected)
  async updateServer(req, res) {
    try {
      const { hostname } = req.params;
      const { ip, country, city, username, password } = req.body;
      
      const result = await client.execute({
        sql: `UPDATE vpn_servers 
              SET ip = ?, country = ?, city = ?, 
                  username = ?, password = ?, 
                  last_updated = DATETIME('now')
              WHERE hostname = ?`,
        args: [ip, country, city, username, password, hostname]
      });
      
      if (result.rowsAffected === 0) {
        return res.status(404).json({ error: 'Server not found' });
      }
      
      // Try to update client count after server update
      try {
        await serverController.updateServerStatus({
          hostname,
          ip,
          username,
          password
        });
      } catch (error) {
        logger.error(`Failed to update client count for ${hostname}:`, error);
      }
      
      res.json({ message: 'Server updated successfully' });
    } catch (error) {
      logger.error('Error updating server:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Delete server (protected)
  async deleteServer(req, res) {
    try {
      const { hostname } = req.params;
      
      const result = await client.execute({
        sql: 'DELETE FROM vpn_servers WHERE hostname = ?',
        args: [hostname]
      });
      
      if (result.rowsAffected === 0) {
        return res.status(404).json({ error: 'Server not found' });
      }
      
      res.json({ message: 'Server deleted successfully' });
    } catch (error) {
      logger.error('Error deleting server:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Get stats summary (protected)
  async getStatsSummary(req, res) {
    try {
      const result = await client.execute(`
        SELECT 
          COUNT(*) as total_servers,
          SUM(CASE WHEN status = 'operational' THEN 1 ELSE 0 END) as operational_servers,
          SUM(clients) as total_clients,
          AVG(clients) as average_clients_per_server
        FROM vpn_servers
      `);
      
      res.json(result.rows[0]);
    } catch (error) {
      logger.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },

  // Update server status (internal method)
  async updateServerStatus(server) {
    try {
      const clients = await getClientCount(server);
      logger.info(`Updated clients for ${server.hostname}: ${clients}`);
      
      await client.execute({
        sql: `UPDATE vpn_servers 
              SET clients = ?, 
                  status = 'operational',
                  last_updated = DATETIME('now')
              WHERE hostname = ?`,
        args: [clients, server.hostname]
      });
      return true;
    } catch (error) {
      logger.error(`Error updating server ${server.hostname}:`, error);
      await client.execute({
        sql: `UPDATE vpn_servers 
              SET status = 'error',
                  last_updated = DATETIME('now')
              WHERE hostname = ?`,
        args: [server.hostname]
      });
      return false;
    }
  },

 // Force update all servers
 async forceUpdateAllServers(req, res) {
  try {
    // Get all servers
    const servers = await client.execute('SELECT * FROM vpn_servers');
    const results = [];

    // Update each server
    for (const server of servers.rows) {
      try {
        const clients = await getClientCount(server);
        await client.execute({
          sql: `UPDATE vpn_servers 
                SET clients = ?, 
                    status = 'operational',
                    last_updated = DATETIME('now')
                WHERE hostname = ?`,
          args: [clients, server.hostname]
        });

        results.push({
          hostname: server.hostname,
          status: 'updated',
          clients: clients
        });

        logger.info(`Forced update success for ${server.hostname}: ${clients} clients`);
      } catch (error) {
        await client.execute({
          sql: `UPDATE vpn_servers 
                SET status = 'error',
                    last_updated = DATETIME('now')
                WHERE hostname = ?`,
          args: [server.hostname]
        });

        results.push({
          hostname: server.hostname,
          status: 'error',
          error: error.message
        });

        logger.error(`Force update failed for ${server.hostname}: ${error.message}`);
      }
    }

    res.json({
      message: 'Force update completed',
      results: results
    });
  } catch (error) {
    logger.error('Error during force update:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
},

// Force update specific server
async forceUpdateServer(req, res) {
  try {
    const { hostname } = req.params;
    
    // Get server details
    const serverResult = await client.execute({
      sql: 'SELECT * FROM vpn_servers WHERE hostname = ?',
      args: [hostname]
    });

    if (serverResult.rows.length === 0) {
      return res.status(404).json({ error: 'Server not found' });
    }

    const server = serverResult.rows[0];

    try {
      const clients = await getClientCount(server);
      await client.execute({
        sql: `UPDATE vpn_servers 
              SET clients = ?, 
                  status = 'operational',
                  last_updated = DATETIME('now')
              WHERE hostname = ?`,
        args: [clients, hostname]
      });

      res.json({
        message: 'Server updated successfully',
        hostname: hostname,
        clients: clients,
        status: 'operational'
      });

      logger.info(`Forced update success for ${hostname}: ${clients} clients`);
    } catch (error) {
      await client.execute({
        sql: `UPDATE vpn_servers 
              SET status = 'error',
                  last_updated = DATETIME('now')
              WHERE hostname = ?`,
        args: [hostname]
      });

      logger.error(`Force update failed for ${hostname}: ${error.message}`);
      res.status(500).json({
        error: 'Failed to update server',
        details: error.message
      });
    }
  } catch (error) {
    logger.error('Error during force update:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
};

module.exports = serverController;