# Keralis Deployment Guide (Docker)

This guide explains how to deploy the Keralis infrastructure using Docker images.

## Architecture
- **Server (Backend)**: Receives logs, stores them, and anchors hashes on Hedera.
- **Client (Sender)**: Installed on the source machine, encrypts and sends logs to the server.

---

## 1. Server Installation (Backend)

On the machine acting as the central server:

### Prerequisites
- Docker and Docker Compose installed.
- A `.env` file with your Hedera keys.

### Start
1. Create a directory for Keralis.
2. Copy the `docker-compose.yml` file into it.
3. Create a `.env` file alongside it:
   ```bash
   HEDERA_ACCOUNT_ID=0.0.xxxx
   HEDERA_PRIVATE_KEY=302...
   HEDERA_NETWORK=testnet
   ```
4. Start the stack:
   ```bash
   docker compose up -d
   ```

This will start:
- **MongoDB** (Database)
- **SFTP** (Port 2222 - To receive files)
- **Keralis Server** (Node.js Backend)

---

## 2. Client Installation (Sender)

On the source machine (the one generating logs to secure):

### Start
Use the `docker run` command to launch the agent. You must mount the log directory to monitor.

```bash
docker run -d \
  --name keralis-sender \
  --restart always \
  # Mount host log directory to container
  -v /var/log/nginx:/app/logs_mount \
  # SFTP Configuration (to your Keralis Server)
  -e SFTP_HOST=your_server_ip \
  -e SFTP_PORT=2222 \
  -e SFTP_USERNAME=keralis \
  -e SFTP_PASSWORD=keralissecurepass \
  # Image name on Hub
  clemarz/keralis-sender:latest
```

### Verification
The client will start monitoring `/var/log/nginx` (or any other mounted directory). As soon as a `.log` file is created or modified (depending on script logic), it will be encrypted and sent to the server.
