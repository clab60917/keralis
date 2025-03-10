# Keralis

![Keralis Logo](https://docs.keralis.org/img/logo.svg)

## Distributed Log Integrity Monitoring System

Keralis is a distributed log integrity monitoring system that leverages Hedera blockchain technology to guarantee log file immutability. It provides real-time alerts for unauthorized modifications, ensuring the integrity and security of your critical log data.

[![Documentation Status](https://img.shields.io/badge/docs-online-brightgreen)](https://docs.keralis.org)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

## Overview

Keralis consists of three primary components working together to maintain log integrity:

1. **Log Sender Service** - Automatically generates and dispatches log files
2. **Client Hash Server** - Manages log files and calculates secure hashes
3. **Blockchain Server** - Verifies log integrity and records hashes on the Hedera blockchain

## Key Features

- **Blockchain-Verified Integrity** - Secures log data with immutable blockchain records
- **Real-Time Detection** - Immediately identifies unauthorized modifications
- **Email Alerts** - Sends notifications when integrity violations are detected
- **Web Dashboard** - Provides visual monitoring and system status
- **Modular Architecture** - Enables flexible deployment across distributed systems
- **Comprehensive Logging** - Maintains detailed audit trails of all system activities

## Documentation

For complete documentation, including installation guides, configuration details, and maintenance instructions, please visit:

📚 [**docs.keralis.org**](https://docs.keralis.org)

## Quick Installation

Basic installation commands to get started (see full documentation for detailed instructions):

```bash
# Clone the repository
git clone https://github.com/clab60917/keralis.git
cd keralis

# Install sender service
cd sender
npm install
cp .env.example .env
# Configure your .env file

# Install client hash server
cd ../blockchain
npm install
cp .env.example .env
# Configure your .env file

# Start services with PM2
pm2 start ecosystem.config.js
```

## System Requirements

- Node.js v18+
- PM2 (global): `npm install -g pm2`
- MongoDB v5+
- Hedera Testnet account
- Linux server (Ubuntu 20.04+ recommended)

## Project Structure

```
keralis/
├── sender/                # Log sender service
│   ├── auto3.js           # Automatic log generation
│   └── ecosystem.config.js # PM2 configuration
├── logs/                  # Log storage directory
├── blockchain/            # Blockchain and client components
│   ├── client-hash-server.js   # Hash calculation API
│   ├── blockchain-integrity-checker.js  # Verification service
│   └── dashboard.js       # Web monitoring interface
└── public/                # Dashboard web assets
```

## Security

Keralis implements several security best practices:

- API key authentication for all service communications
- Secure hash algorithms (SHA-256) for integrity verification
- Immutable blockchain recording of integrity data
- Configurable email alerts for immediate notification

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

Project maintained by [Clement](https://github.com/clab60917)

---

<p align="center">
  <a href="https://docs.keralis.org">Documentation</a> •
  <a href="https://github.com/clab60917/keralis/issues">Report Bug</a> •
  <a href="https://github.com/clab60917/keralis/issues">Request Feature</a>
</p>