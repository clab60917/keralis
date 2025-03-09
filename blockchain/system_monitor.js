const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class SystemMonitor {
    async getSystemStats() {
        try {
            const stats = {
                cpu: {
                    loadAverage: os.loadavg(),
                    cpuCount: os.cpus().length,
                    uptime: os.uptime()
                },
                memory: {
                    total: os.totalmem(),
                    free: os.freemem(),
                    usedPercentage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
                },
                platform: os.platform(),
                hostname: os.hostname(),
                timestamp: new Date().toISOString()
            };

            // Ajouter l'état du service SFTP
            const sftpStatus = await this.checkSFTPStatus();
            stats.sftp = sftpStatus;

            const blockchainStatus = await this.checkBlockchainStatus();
            stats.blockchain = blockchainStatus;

            // Ajouter l'utilisation du disque
            const diskUsage = await this.getDiskUsage();
            stats.disk = diskUsage;

            return stats;
        } catch (error) {
            console.error('Erreur lors de la récupération des stats système:', error);
            return null;
        }
    }

    async checkSFTPStatus() {
        try {
            // Vérifier le statut du service SFTP (adapté pour macOS/Linux)
            const { stdout } = await execAsync('ps aux | grep "sftp"');
            return {
                running: stdout.length > 0,
                processInfo: stdout.trim()
            };
        } catch (error) {
            return {
                running: false,
                error: error.message
            };
        }
    }

    async checkBlockchainStatus() {
        try {
            // Vérifier si le processus auto3.js est en cours d'exécution
            // const { stdout } = await execAsync('pm2 show blockchain-app | grep status');
            
            // const match = stdout.match(/status:\s+(\w+)/);
            // const status = match ? match[1] : "unknown";

            // const isRunning = status === "online";
            const { stdout } = await exec("pm2 pid blockchain-app");
            const isRunning = stdout.trim().length > 0; // Si un PID est retourné, l'application tourne
    
            return {
                running: isRunning,
                processInfo: isRunning ? stdout.trim() : 'Processus  blockchain-app non trouvé',
                lastChecked: new Date().toISOString()
            };
        } catch (error) {
            return {
                running: false,
                error: error.message,
                lastChecked: new Date().toISOString()
            };
        }
    }

    async getDiskUsage() {
        try {
            // Obtenir l'utilisation du disque (adapté pour macOS/Linux)
            const { stdout } = await execAsync('df -h /');
            const lines = stdout.trim().split('\n');
            const [, usage] = lines;
            const [filesystem, size, used, available, percentage, mountpoint] = usage.split(/\s+/);
            
            return {
                filesystem,
                size,
                used,
                available,
                percentage,
                mountpoint
            };
        } catch (error) {
            return {
                error: error.message
            };
        }
    }
}

module.exports = new SystemMonitor(); 