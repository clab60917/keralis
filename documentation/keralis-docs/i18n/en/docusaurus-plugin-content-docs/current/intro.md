---
sidebar_position: 1
---

# Introduction

Welcome to the documentation of Project Keralis, a distributed system for monitoring log file integrity using the Hedera blockchain to ensure the immutability and traceability of system logs.

## The security issue with logs

In today's cybersecurity landscape, log files represent critical elements for incident detection and security investigations. However, these files are also a prime target during cyber attacks.

### External threats

External attackers who manage to compromise a system generally try to erase their tracks to:
- Conceal their presence on the network
- Hide malicious actions performed
- Extend the detection time of the intrusion
- Complicate post-incident forensic analysis

Modifying or deleting log files is often one of the first actions taken after obtaining elevated privileges on a system.

### Internal threats

Internal threats represent an equally important risk:
- System administrators with high access rights
- Malicious employees seeking to hide unauthorized actions
- Technical staff who may modify logs to hide errors or negligence

### Common incident scenarios

- **Sensitive data theft**: An attacker exfiltrates confidential data then erases connection logs
- **Internal fraud**: An employee manipulates critical systems then alters audit logs
- **Intellectual property theft**: Unusual access to code repositories is masked by log deletion
- **Sabotage**: Critical modifications are made then concealed by log alteration

Most security frameworks (NIST, ISO27001, PCI-DSS) require protecting log integrity, but traditional solutions often have exploitable flaws.

## What is Keralis?

Keralis is a comprehensive and innovative solution that specifically addresses these security issues. The system integrates several advanced technologies to create a highly secure distributed architecture.

### Main features

- **Real-time monitoring** of log file integrity
- **Immutability guarantee** via hash anchoring on the Hedera blockchain
- **Instant detection** of any modification or deletion
- **Automated alerts** by email in case of detected incident
- **Public verifiability** of integrity proofs via the blockchain
- **Centralized dashboard** for monitoring and analyzing events

### Secure architecture

Keralis uses a distributed architecture where:
- Logs are processed on a dedicated secure server
- Hashes and encrypted files are stored separately
- Cryptographic fingerprints are anchored on the Hedera blockchain
- Monitoring is performed by an independent system

This separation of responsibilities ensures that an attacker would have to compromise multiple independent systems to hide their actions, significantly increasing the overall security level.

### Unique advantages

- **Proof of anteriority**: Indisputable blockchain timestamping
- **Non-repudiation**: Modifications are always detected and reported
- **Regulatory compliance**: Meets security standards requirements (NIST, ISO27001, PCI-DSS)
- **Transparency and auditability**: Independent verification possible via the public blockchain

This documentation will guide you through the installation, configuration, and use of the Keralis system to secure your critical infrastructures.