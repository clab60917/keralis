---
sidebar_position: 1
---

# Common Problems

This section covers common problems and their solutions for the Keralis system.

## Inaccessible API

If the hash server API is inaccessible:

1. Check that the service is running:
   ```bash
   pm2 status hash-server
   ```

2. Restart the service:
   ```bash
   pm2 restart hash-server
   ```

3. Check the logs and identify the problem:
   ```bash
   pm2 logs hash-server
   ```

4. Check port and firewall configuration:
   ```bash
   netstat -tulpn | grep 3001
   sudo ufw status
   ```

## Emails Not Received

If email alerts are not being received:

1. Check the SMTP configuration in the `.env` file

2. Test email sending with the test script:
   ```bash
   cd /root/keralis/blockchain
   node test-integrity-system.js
   ```

3. Check logs for SMTP errors:
   ```bash
   pm2 logs blockchain-checker
   ```

4. Make sure your SMTP server allows connections from the blockchain server's IP address

## Inaccessible Dashboard

If the dashboard is inaccessible:

1. Check that the service is running:
   ```bash
   pm2 status dashboard
   ```

2. Restart the service:
   ```bash
   pm2 restart dashboard
   ```

3. Check logs to identify the problem:
   ```bash
   pm2 logs dashboard
   ```

4. Check firewall configuration (see Inaccessible API section)

## MongoDB Connection Problems

If you encounter problems with MongoDB:

1. Check that MongoDB is running:
   ```bash
   sudo systemctl status mongod
   ```

2. Restart MongoDB:
   ```bash
   sudo systemctl restart mongod
   ```

3. Check MongoDB logs:
   ```bash
   sudo tail -f /var/log/mongodb/mongod.log
   ```

4. Check connection configuration in the `.env` file