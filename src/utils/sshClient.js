// src/utils/sshClient.js
const { NodeSSH } = require('node-ssh');
const logger = require('./logger');

async function getClientCount(server, retryCount = 3) {
  const ssh = new NodeSSH();
  
  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      await ssh.connect({
        host: server.ip,
        username: server.username,
        password: server.password,
        tryKeyboard: true,
        timeout: 10000,
        readyTimeout: 20000
      });

      logger.info(`SSH connection successful to ${server.ip} (attempt ${attempt})`);

      const result = await ssh.execCommand('/usr/local/openvpn_as/scripts/sacli VPNSummary');
      
      if (result.stderr) {
        throw new Error(`SSH command error: ${result.stderr}`);
      }

      const summary = JSON.parse(result.stdout);
      const clients = summary.n_clients || 0;

      logger.info(`Successfully got client count for ${server.ip}: ${clients}`);
      return clients;

    } catch (error) {
      logger.error(`SSH attempt ${attempt} failed for ${server.ip}: ${error.message}`);
      
      if (attempt === retryCount) {
        throw new Error(`Failed to get client count after ${retryCount} attempts: ${error.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    
    } finally {
      ssh.dispose();
    }
  }
}

module.exports = { getClientCount };