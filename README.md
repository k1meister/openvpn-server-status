# OpenVPN Server Management API

[![CI](https://github.com/k1meister/openvpn-server-status/actions/workflows/ci.yml/badge.svg)](https://github.com/k1meister/openvpn-server-status/actions/workflows/ci.yml)
[![CodeQL](https://github.com/k1meister/openvpn-server-status/actions/workflows/codeql.yml/badge.svg)](https://github.com/k1meister/openvpn-server-status/actions/workflows/codeql.yml)
![Node Version](https://img.shields.io/node/v/your-package-name)
[![License](https://img.shields.io/github/license/k1meister/openvpn-server-status)](https://github.com/k1meister/openvpn-server-status/blob/main/LICENSE)
[![Dependencies](https://img.shields.io/librariesio/github/k1meister/openvpn-server-status)](https://libraries.io/github/k1meister/openvpn-server-status)
[![Last Commit](https://img.shields.io/github/last-commit/k1meister/openvpn-server-status)](https://github.com/k1meister/openvpn-server-status/commits/main)
[![Issues](https://img.shields.io/github/issues/k1meister/openvpn-server-status)](https://github.com/k1meister/openvpn-server-status/issues)
[![Security Headers](https://img.shields.io/security-headers?url=your-api-url)](https://securityheaders.com/?q=your-api-url)

Overview
--------

This API provides a secure interface for managing and monitoring OpenVPN servers. It includes real-time status updates, client counting, and server health monitoring.

Features
--------

*   Authentication with API Key and IP Whitelist
*   Rate limiting to prevent abuse
*   Automatic server status updates every minute
*   SSH-based client count verification
*   Secure database storage using Turso
    

Security Measures
-----------------

1.  **Authentication**: API Key and IP whitelist for secure auth
2.  **Rate Limiting**: 100 requests per 15 minutes per IP
3.  **CORS**: Restricted to specified frontend origin
4.  **Headers Security**: Helmet.js implementation for security headers
5.  **Database Security**: Encrypted connection to Turso database
6.  **Password Security**: Sensitive data encryption in transit and at rest
    

API Endpoints
-------------

### Example GET /api/servers
Returns a list of all VPN servers with their current status.

**Response Format:**

```json
[
   {
      "hostname": "vpn1.domain.com",
      "ip": "123.123.123.123",
      "country": "Turkey",
      "city": "Istanbul",
      "status": "operational",
      "clients": 290,
      "last_updated": "2024-01-01T12:00:00Z"
   }
]
```

### Public Endpoints (no authentication required):

**GET /api/servers/status** - Get operational servers status
**GET /api/servers/locations** - Get available server locations

### Protected Endpoints

**GET /api/servers** - Get all servers
**GET /api/servers/:hostname** - Get specific server details
**POST /api/servers** - Add new server
**PUT /api/servers/:hostname** - Update server
**DELETE /api/servers/:hostname** - Delete server
**GET /api/servers/stats/summary** - Get statistics summary

Setup Instructions
------------------

1.  Clone the repository
2.  Create a .env file based on .env.example:

```js   
TURSO_URL=libsql://your-domain.com
TURSO_TOKEN=your-turso-token
API_KEY=generate-random-api-key
ALLOWED_IPS=127.0.0.1,::1,YOUR_IP_HERE
FRONTEND_URL=http://localhost:3000
PORT=4000
NODE_ENV=development
UPDATE_INTERVAL=60000
AUTO_UPDATE_ENABLED=true
UPDATE_RETRIES=3
```

3.  Install dependencies:
```bash
npm install 
```

4.  Start the server:  
```bash
npm start
```

Database Schema
---------------

```sql
CREATE TABLE vpn_servers (
  id TEXT PRIMARY KEY, hostname TEXT NOT NULL, 
  ip TEXT NOT NULL, country TEXT NOT NULL, 
  city TEXT NOT NULL, status TEXT NOT NULL, 
  clients INTEGER DEFAULT 0, last_updated DATETIME, 
  username TEXT NOT NULL, password TEXT NOT NULL
);
```

Error Handling
--------------

The API uses standard HTTP status codes:

*   200: Success
*   401: Unauthorized
*   403: Forbidden
*   429: Too Many Requests
*   500: Internal Server Error
    
Monitoring
----------

The API includes Winston logger for monitoring and debugging:

*   Error logging
*   Access logging
*   Performance monitoring 