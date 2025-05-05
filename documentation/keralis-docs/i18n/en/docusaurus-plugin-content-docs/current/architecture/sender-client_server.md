---
sidebar_position: 2
---

# Sender / Client Server

The client server is responsible for managing log files and calculating hashes.

## Location

Logs are stored in `/root/keralis/logs/`.

## File Structure

```bash 
/root/keralis/
├── sender/
│   ├── setup.sh       # Installation script for the sender server
│   ├── senderV1.py    # Program for sending .hash and .log.enc files via SFTP to the blockchain server
│   └── .env           # Environment variables (defined via ./setup.sh)
```

<div className="screenshot-container">
  <img src="/img/mesimages/schema-SFTP.png" alt="Image description" width="600" />
  <p className="caption">SFTP transfer diagram</p>
</div>

## Code Operation
### setup.sh

Script that generates the .env file and completes it with the provided information.

### senderV1.py and PM2

The script executes an automated set of steps as soon as a new log file is detected:
1. Detection of a new log file
2. Generation of a file hash using SHA256
3. Generation of an encrypted copy of the file (.log.enc)
4. Sending of both files to the blockchain server via SFTP
5. Storage in MongoDB on the blockchain server

<div className="screenshot-container">
  <img src="/img/mesimages/senderV1-log.png" alt="Image description" width="1000" />
  <p className="caption">PM2 logs for senderV1.py</p>
</div>

## Hash API Server

The `client-hash-server.js` file implements a REST API server with the following features:

- SHA-256 hash calculation for files
- Hash caching for performance optimization
- API secured by key
- Management of test modifications

<div className="screenshot-container">
  <img src="/img/mesimages/pm2-log-api.png" alt="Image description" width="1000" />
  <p className="caption">PM2 logs for API server</p>
</div>

## API Endpoints

The server exposes the following endpoints:

- `GET /api/logs` - List of available log files
- `GET /api/hash/:fileName` - Hash of a specific file
- `POST /api/modify/:fileName` - Test modification (for development)
- `POST /api/restore/:fileName` - Restoration of a modified file

## PM2 summary

<div className="screenshot-container">
  <img src="/img/mesimages/pm2-list-client.png" alt="Image description" width="1100" />
  <p className="caption">pm2 list on client server</p>
</div>

- id 1 => Sender: senderV1.py (SFTP sending)
- id 3 => Hash-server: client-hash-server.js (API server)