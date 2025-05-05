---
sidebar_position: 1
---

# Prerequisites

Before installing Keralis, make sure your system meets the following requirements:

## Required Environment

- Node.js v18 or higher
- PM2 (global): `npm install -g pm2`
- MongoDB v5 or higher
- Hedera Testnet Account
- Linux Servers (Ubuntu 20.04 or higher recommended)

## NPM Dependencies

The main dependencies of the project are:

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "@hashgraph/sdk": "^2.x",
    "mongodb": "^5.x",
    "nodemailer": "^6.x",
    "winston": "^3.x",
    "axios": "^1.x",
    "cors": "^2.x"
  }
}
```

## Network Configuration

Make sure the following ports are accessible:

- Client Server: Port 3001 (API)
- Blockchain Server: Port 3000 (Dashboard)

## Server Preparation

:::tip
It is possible to place both servers in the same VLAN for simplicity in network management.
:::

**It is necessary to use two distinct servers:**

- Client Server: For log management and hash calculation
- Blockchain Server: For integrity verification and dashboard