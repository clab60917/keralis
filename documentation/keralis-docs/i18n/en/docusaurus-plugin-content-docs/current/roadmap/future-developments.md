---
sidebar_position: 1
---

# Next Steps and Viability

Following the complete development of Keralis version 1.0, we conducted an in-depth analysis of the technical and financial viability of the solution. This evaluation is essential to ensure that the platform can effectively meet business needs under real-world conditions.

## Technical Feasibility

### Load Testing and Optimization

We performed several load tests to determine the limits and capabilities of our system:

#### Optimal File Volume

An important question concerned the optimal size of log files to process. Our tests show that:

- **Recommended size**: 10,000 log lines per file
- **Maximum capacity**: The system can easily process more than 100,000 lines per file for SHA-256 hash calculation.
To verify this, we ran hash calculations for variable log file sizes; the differences in terms of time allow us to process up to 100,000 log lines without issues.


##### Comparison Table

| Number of lines | Real time (s) | User time (s) | System time (s) |
|-----------------|---------------|---------------|-----------------|
| 10              | 0.003         | 0.002         | 0.000           |
| 100             | 0.001         | 0.000         | 0.001           |
| 1,000           | 0.002         | 0.000         | 0.001           |
| 8,465           | 0.002         | 0.001         | 0.001           |
| 101,580         | 0.006         | 0.004         | 0.002           |

##### Performance Graph

```
Real time (seconds)
0.006 |                                                      *
      |                                                      
      |                                                      
0.005 |                                                      
      |                                                      
      |                                                      
0.004 |                                                      
      |                                                      
      |                                                      
0.003 |  *                                                   
      |                                                      
      |                                                      
0.002 |              *                   *                   
      |                                                      
      |                                                      
0.001 |         *                                            
      |                                                      
      +------------------------------------------------------
         10       100      1K       10K      100K     1000K
                          Number of lines (log scale)
```

- **Evolution perspective**: For older logs, we plan to implement a pooling system to optimize storage and performance

#### Real Scenario for an SME

For a typical SME with standard infrastructure (web server and associated services), we measured the average log production over 24 hours with standardized files of 10,000 lines:

| Log Type    | Number of Files / 24h |
|-------------|------------------------|
| Syslogs     | 72 files               |
| Auth.log    | 8 files                |
| Cron.log    | 2 files                |
| Audit.log   | 29 files               |
| **Total**   | **111 files**          |

#### Actual Processing Capacity

For an infrastructure composed of 5 servers:

- **Daily volume**: 555 files (5 × 111)
- **Average frequency**: 1 file every 2.4 minutes
- **Current processing time**: 6 seconds per file (from detection to blockchain anchoring)
- **Safety margin**: Even with an allocation of 1 minute per file, the system operates well within its capabilities

### Scalable Architecture

For extending the solution to multiple clients, we designed a distributed architecture:

<div className="screenshot-container">
  <img src="/img/mesimages/road.svg" alt="Architecture for multiple clients" width="1000" />
  <p className="caption">Scalable architecture supporting multiple clients</p>
</div>

This architecture provides for:
- Separate VPS instances per client
- Isolated databases
- A centralized monitoring system
- Optimized blockchain request management

## Cost Analysis

### Blockchain Costs

Transaction fees on the Hedera blockchain constitute an important element of the economic model:

- **Cost per message**: $0.0001 (official Hedera rate)
- **Empirical validation**: After more than 4,000 messages sent in our tests, we confirm this average unit cost
- **Daily cost for an SME with 5 servers**: Approximately $0.60 per day (555 files × $0.0001)

### Infrastructure Costs

The hardware requirements of the solution are remarkably modest:

- **Resource usage**: The system operates at 70% of its capacity on a server with only 1 GB of RAM
- **Storage**: Main expansion need depending on log retention duration
- **VPS with backup**: Approximately $10 per month
- **MongoDB database**: Approximately $10 per month for a standard deployment

### Total Monthly Cost

For a typical SME with 5 servers:

| Component | Monthly Cost |
|-----------|--------------|
| VPS + Backups | $10 |
| MongoDB | $10 |
| Hedera Transactions | $18 ($0.60 × 30 days) |
| **Total** | **$38** |

This extremely competitive cost, less than $40 per month for a standard SME, demonstrates the economic viability of Keralis as a security solution for organizations of all sizes.

## Development Roadmap

For the next steps of the project, we plan:

1. **Development of a multi-client administration interface**
2. **Optimization of hash calculations during monitoring by pool to reduce load**
3. **Creation of a CLI tool for automated deployment on any type of Linux server**

More to come!