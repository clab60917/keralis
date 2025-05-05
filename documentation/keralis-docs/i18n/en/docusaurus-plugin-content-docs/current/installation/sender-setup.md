---
sidebar_position: 2
---

# Sender Service Installation

This section covers the installation and configuration of the log sending service (Sender).

## Preparation

Start by creating the necessary folder structure:

```bash
mkdir -p /root/keralis/sender/hash
cd /root/keralis/sender
```

## Installing Dependencies

Install Node.js dependencies:

```bash
npm install
```

## Configuration

### Environment Variables

Create a `.env` file in the `/root/keralis/sender/` folder (automatically created via automated script):

```bash
./setup.sh
```

### PM2 Configuration

Create an `ecosystem.config.js` file to manage the service with PM2:

```javascript
cat > ecosystem.config.js << EOL
module.exports = {
  apps: [{
    name: 'senderV1.py',
    script: 'auto3.js',
    watch: true,
    env: {
      NODE_ENV: 'production'
    }
  }]
}
EOL
```

## Starting the Service

Start the service with PM2 and configure it to start automatically:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Verification

Verify that the service is working correctly:

```bash
pm2 status
pm2 logs auto-sender
```

After a few minutes, you should see new log files appear in the `/root/keralis/logs/` directory.