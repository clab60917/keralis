---
sidebar_position: 1
---

# Security Best Practices

This section covers security best practices for the Keralis system.

## Key and Password Management

1. **API Key Rotation**
   - Regularly change the hash server API key
   - Schedule rotation every 90 days

2. **Strong Passwords**
   - Use strong passwords for the dashboard
   - Minimum 12 characters with uppercase, lowercase, numbers, and special characters

3. **Secure Storage**
   - Back up `.env` files in a secure location
   - Add a .gitignore to avoid pushing your credentials
   - Never share Hedera private keys

## Network Security

1. **Firewall Configuration**
   - Limit access to necessary ports only
   - Client Server: Port 3001 (API)
   - Blockchain Server: Port 3000 (Dashboard)

2. **HTTPS**
   - Configure HTTPS for the dashboard and API
   - Use Let's Encrypt to obtain free certificates

## Updates and Maintenance

1. **Dependencies**
   - Regularly update dependencies
   - Use `npm audit` to identify vulnerabilities

2. **Operating System**
   - Apply security updates regularly
   - Configure automatic updates

## Monitoring and Audits

1. **Access Logs**
   - Monitor access logs for the dashboard and API
   - Configure alerts for suspicious access attempts

2. **Regular Audit**
   - Perform a security audit every 6 months
   - Verify configuration and permissions