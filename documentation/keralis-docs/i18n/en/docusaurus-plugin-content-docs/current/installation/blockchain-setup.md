---
sidebar_position: 4
---

# Blockchain Server Installation

This section covers the installation and configuration of the blockchain server that verifies log integrity and records hashes on the Hedera blockchain.

## Preparation

Start by creating the necessary folder structure:

```bash
mkdir -p /root/keralis
cd /root/keralis
git clone <repo_url> .
cd blockchain
```

## Installing Dependencies

Install Node.js dependencies:

```bash
npm install
```

## MongoDB Configuration

Ensure that MongoDB is installed and running:

```bash
# MongoDB installation (if necessary)
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```
<div className="screenshot-container">
  <img src="/img/mesimages/mongo.png" alt="List of alerts received by email" width="600" />
  <p className="caption">**MongoDB database architecture diagram**</p>
</div>


## Configuration

### Environment Variables

Create a `.env` file in the `/root/keralis/blockchain/` folder:

```bash
cat > .env << EOL
# Hedera
MY_ACCOUNT_ID=<your_account_id>
MY_PRIVATE_KEY=<your_private_key>
MY_PUBLIC_KEY=<your_public_key>

# MongoDB
MONGODB_USER=<db_user>
MONGODB_PASSWORD=<db_password>
MONGODB_HOST=<db_host>
MONGODB_PORT=27017 
MONGODB_DB_NAME=Blockchain
MONGODB_COLLECTION=messages
MONGODB_AUTH_SOURCE=admin

# Application
HASH_SERVER_URL=http://<client_ip>:3001
HASH_SERVER_API_KEY=<same_as_client>
CHECK_INTERVAL=900000

# Dashboard
DASHBOARD_PORT=3000
DASHBOARD_USER=<admin_user>
DASHBOARD_PASSWORD=<strong_password>

# Email
SMTP_HOST=<smtp_host>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<email_user>
SMTP_PASS=<email_password>
ALERT_EMAIL_FROM=<sender_email>
ALERT_EMAIL_TO=<recipient_email>
EOL
```

### PM2 Configuration

Create an `ecosystem.config.js` file to manage services with PM2:

```javascript
cat > ecosystem.config.js << EOL
module.exports = {
  apps: [{
    name: 'blockchain-checker',
    script: 'blockchain-integrity-checker.js',
    watch: true,
    env: {
      NODE_ENV: 'production'
    }
  }, {
    name: 'dashboard',
    script: 'dashboard.js',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
EOL
```

## Starting Services

Start the services with PM2 and configure them to start automatically:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## System Testing

Test the complete system:

```bash
node test-integrity-system.js
```

## Dashboard Access

The dashboard should be accessible at the following address:

```
http://<blockchain_server_ip>:3000
```

Use the credentials defined in the `.env` file to log in.

## Blockchain-api Server Installation

This section covers the installation and configuration of the client server that manages log files and calculates their hashes.

### Preparation

Start by creating the necessary folder structure:

```bash
mkdir -p /root/keralis/logs
cd /root/keralis
git clone <repo_url> .
cd blockchain
```

### Installing Dependencies

Install Node.js dependencies:

```bash
npm install
```

### Configuration

#### Environment Variables

Create a `.env` file in the `/root/keralis/blockchain/` folder:

```bash
cat > .env << EOL
HASH_SERVER_PORT=3001
HASH_SERVER_API_KEY=<generate_strong_key>
EOL
```

:::tip
Use a command like `openssl rand -hex 32` to generate a strong API key.
:::

#### PM2 Configuration

Create an `ecosystem.config.js` file to manage the service with PM2:

```javascript
cat > ecosystem.config.js << EOL
module.exports = {
  apps: [{
    name: 'hash-server',
    script: 'client-hash-server.js',
    watch: true,
    env: {
      NODE_ENV: 'production'
    }
  }]
}
EOL
```

### Starting the Server

Start the server with PM2 and configure it to start automatically:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### API Testing

Verify that the API is working correctly:

```bash
curl -H "x-api-key: <your_api_key>" http://localhost:3001/api/logs
```

If everything is configured correctly, you should get a list of available log files in JSON format.