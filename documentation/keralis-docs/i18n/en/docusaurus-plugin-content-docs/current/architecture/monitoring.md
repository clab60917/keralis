---
sidebar_position: 2
---

# Monitoring

The monitoring system is an essential element of our log security architecture. It allows real-time surveillance of log file integrity, detection of any unauthorized modifications, and alerts administrators in case of an incident.

## Surveillance Dashboard

Our platform features a secure dashboard with individual authentication. Each user has their own credentials to access monitoring information.

<div className="screenshot-container">
  <img src="/img/mesimages/dashboard1.png" alt="Main view of Keralis dashboard" width="1000" />
  <p className="caption">**Overview of the dashboard showing recent alerts and system status**</p>
</div>

### Statistics and Performance

The dashboard provides detailed statistics on the overall system status, including:

- **General statistics**: Number of hashes, encrypted files, and processed messages
- **System performance**: CPU, memory, and disk usage
- **Service status**: Real-time monitoring of critical components (SFTP, Blockchain, Server)
- **Hedera TopicID**: Tracking of blockchain topic ID.0.XXXXXX where hashes are published


### Alert History

The monitoring system maintains a complete history of raised alerts:

<div className="screenshot-container">
  <img src="/img/mesimages/KeralisAlertes.png" alt="List of modification alerts" width="1000" />
  <p className="caption">**Table of all alerts**</p>
</div>

### Alert Details

For each alert, the system preserves detailed information enabling forensic analysis:
- Name of the concerned log file
- Date and time of detection
- Status: restored (in case of an integrity test) / unrestored
- Original hash
- New hash / deleted hash
- Email sent to administrator: yes / no
- IP address of the server concerned by the alert

<div className="screenshot-container">
  <img src="/img/mesimages/dashboard3.png" alt="Details of a modification alert" width="1000" />
  <p className="caption">**Details of an alert showing the modified file, the original hash and the new hash**</p>
</div>

<div className="screenshot-container">
  <img src="/img/mesimages/dashboard4.png" alt="System statistics and recent activity" width="1000" />
  <p className="caption">**Details of an alert showing the modified file, the original hash and its deletion**</p>
</div>


## Blockchain Verification via Hashscan.io

Our system publishes all hashes on the Hedera blockchain to guarantee their immutability. These entries can be independently verified via the Hashscan.io blockchain explorer using the TopicID.

<div className="screenshot-container">
  <img src="/img/mesimages/screen_hashscan.png" alt="Hedera Topic on Hashscan.io" width="1000" />
  <p className="caption">**View of Topic ID.0.5643349 on Hashscan.io showing timestamped messages containing hashes**</p>
</div>

This public verifiability confirms that the hashes have not been altered in our own storage system with MongoDB and offers an additional layer of security and transparency.

## Email Alert System

In case of anomaly detection (file modification or deletion), the system automatically sends an alert email to administrators.

:::tip
Connect to `https://app.elasticemail.com` to obtain a free encrypted SMTP mail server.
:::

### Alert List

Administrators instantly receive an alert by email:
- Modification alert
- Deletion alert

<div className="screenshot-container">
  <img src="/img/mesimages/email1.png" alt="List of alerts received by email" width="1000" />
  <p className="caption">**Outbox showing different alerts sent by the system**</p>
</div>

### Modification Alert


<div className="screenshot-container">
  <img src="/img/mesimages/email2.png" alt="Detail of a modification alert" width="800" />
  <p className="caption">**Alert email detailing a detected modification in a log file**</p>
</div>

### Deletion Alert



<div className="screenshot-container">
  <img src="/img/mesimages/email3.png" alt="Detail of a deletion alert" width="800" />
  <p className="caption">**Alert email signaling the deletion of a log file**</p>
</div>

Emails are sent from the alerting email address `alert@keralis.org` via the Elastice Mail platform.