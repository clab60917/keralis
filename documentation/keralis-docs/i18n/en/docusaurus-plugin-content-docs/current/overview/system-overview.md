---
sidebar_position: 1
---

# System Overview

Keralis is a distributed system for monitoring log file integrity, using the Hedera blockchain to ensure immutability and constant monitoring of sensitive data.

## General Architecture

<div className="screenshot-container">
  <img src="/img/mesimages/dat.png" alt="Keralis system architecture" width="1000" />
  <p className="caption">**Global diagram of Keralis architecture**</p>
</div>

The Keralis system consists of two main servers that interact with the Hedera blockchain to ensure the integrity of log files and detect any modification or deletion of them.

## System Components

### Sender/Client Server

This server manages log production, their initial processing, and their secure transfer to the blockchain server.

#### Main Features:
- Automatic detection of new log files
- SHA-256 hash generation for each file
- Asymmetric encryption of logs for secure transmission
- Exposure of a REST API for hash verification
- SFTP transfer of files to the blockchain server

#### Processing Flow:
1. Log files are generated in `/root/keralis/logs/`
2. The `senderV1.py` script continuously monitors this directory
3. For each newly detected file:
   - A SHA-256 hash is calculated (file .hash)
   - An encrypted version is generated (file .log.enc)
   - Both files are sent via SFTP to the blockchain server
4. The REST API exposes endpoints allowing other components to verify file hashes

### Blockchain Server

This server forms the core of the security system, ensuring verification, storage, and monitoring of logs.

#### Main Features:
- Reception and storage of files from the client server in a database
- Publication of hashes on the Hedera blockchain via a dedicated TopicID
- Periodic verification of file integrity
- Alert generation in case of detected modification/deletion
- Monitoring dashboard accessible via web interface

#### Processing Flow:
1. The `auto3.js` script receives files sent by SFTP
2. The .hash and .log.enc files are stored in dedicated MongoDB collections
3. Each hash is published on the Hedera blockchain as an immutable message in the topic
4. The `file-integrity-checker.js` service periodically monitors integrity:
   - It queries the client server API to get current hashes
   - It compares these values with those stored in MongoDB and on the blockchain
   - In case of difference, it generates an email alert
5. The `dashboard.js` provides a web interface to visualize the system status

### Hedera Blockchain

The Hedera blockchain is used as an immutable and public register for log file hashes, offering:

- Hash storage via the HCS service (Hedera Consensus Service)
- A dedicated TopicID for message publication
- Public verifiability of hashes via hashscan.io
- Timestamped proof of anteriority for each entry

## Complete Workflow

1. **Log Generation**: Applications produce log files on the client server
2. **Initial Processing**: The sender system calculates the SHA-256 hash and encrypts the content
3. **Secure Transfer**: Files are transferred via SFTP to the blockchain server
4. **Structured Storage**: Files and their metadata are stored in MongoDB
5. **Blockchain Publication**: Hashes are published on the Hedera blockchain
6. **Continuous Verification**: The integrity checker constantly monitors for modifications
7. **Instant Alerts**: Email alerts are sent in case of detected alteration
8. **Visualization**: The web dashboard allows monitoring of the entire system

This distributed architecture ensures that even if one component is compromised, the overall integrity of the system remains verifiable and intrusions are immediately detected.