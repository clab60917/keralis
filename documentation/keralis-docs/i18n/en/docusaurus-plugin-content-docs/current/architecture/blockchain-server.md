---
sidebar_position: 3
---

# Blockchain Server

The blockchain server is responsible for verifying log integrity and recording hashes on the Hedera blockchain. It also writes all messages, hashes, encrypted files, and alerts to MongoDB.

## File Structure
```bash 
/root/keralis/
├── blockchain/
│   ├── test-integrity-system.js     # Integrity tests
│   ├── auto3.js                     # Script for sending messages to the blockchain + 
│   ├── file-integrity-checker.js    # Main verifier
│   ├── dashboard.js                 # Web interface
│   ├── ecosystem.config.js          # PM2 configuration
│   └── .env                         # Environment variables
├── public/                          # Dashboard assets
└── logs/                            # System logs
```
## Main Components

### auto3.js

The main program that processes hashes, encrypted log files, and blockchain messages.
- Records the hash received from the sender server in the MongoDB database
- Sends the hash directly to the Hedera topic
- Records the message sent to the blockchain (in this case the hash) in the database
- Records the .log.enc file in the database

<div className="screenshot-container">
  <img src="/img/mesimages/auto3.png" alt="Activity log of auto3.js" width="800" />
  <p className="caption">Activity log of auto3.js</p>
</div>

### file-integrity-checker.js

Monitoring service that:
- Periodically monitors log files
- Recalculates and compares hashes from the Sender server with hashes recorded on the blockchain
- Generates email alerts in case of modifications

<div className="screenshot-container">
  <img src="/img/mesimages/check.png" alt="Activity log of file-integrity-checker.js" width="600" />
  <p className="caption">Activity log of file-integrity-checker.js for log verification</p>
</div>

### test-integrity-system.js

Test utility that allows:
- Testing the connection to the client server API
- Simulating file modifications
- Verifying alert functionality
- Testing email configuration

:::tip
Running `node test-integrity-system.js` can be very useful!
:::

### dashboard.js

Web monitoring interface that offers:
- Visualization of monitored logs
- Real-time system status
- History of detected modifications
- Monitoring statistics

Run: `node dashboard.js` or use the pm2 config below.

### ecosystem.config.js - 1

PM2 configuration for blockchain sending with auto3.js:

```javascript
module.exports = {
  apps: [{
    name: 'blockchain-app',
    script: 'auto3.js',
    watch: true,
    env: {
      NODE_ENV: 'production'
    }
  }]
}
```

### ecosystem.config.js - 2

PM2 configuration for integrity checking:

```javascript
module.exports = {
  apps: [{
    name: 'integrity-checker',
    script: 'auto3.js',
    watch: true,
    env: {
      NODE_ENV: 'production'
    }
  }]
}
```
:::tip
Remember to run `pm2 save` to save the pm2 configurations!
:::