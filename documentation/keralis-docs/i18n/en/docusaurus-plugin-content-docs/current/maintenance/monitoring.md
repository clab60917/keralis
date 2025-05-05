---
sidebar_position: 1
---

# Monitoring and Maintenance

This section covers the monitoring and maintenance aspects of the Keralis system.

## System Logs

Here's where to find logs for different components:

- **Sender**: `/root/keralis/sender/logs/`
- **Hash Server**: `/root/keralis/logs/hash-server.log`
- **PM2**: `pm2 logs`
- **Application**: `/root/keralis/logs/`

## PM2 Service Monitoring

### Service List

To see the status of all services:

```bash
pm2 list
```

### Specific Logs
To view logs for a specific service:
```
pm2 logs auto-sender    # Sender logs
pm2 logs hash-server    # Hash server logs
pm2 logs dashboard      # Dashboard logs
```

### Real-Time Monitoring
For real-time monitoring:

```
pm2 monit
```

## Restart and Updates

### Service Restart
To restart all services:

```
pm2 restart all
```

To restart a specific service:

```
pm2 restart auto-sender
```

### Code Update
To update code from the Git repository:
```
cd /root/keralis
git pull
pm2 reload all
```

### Cache Cleaning
To clean the PM2 cache:
```
pm2 flush
```

## Monitoring Interfaces
```
Dashboard: http://`blockchain_ip`:3000
PM2 Monitoring: pm2 monit
```