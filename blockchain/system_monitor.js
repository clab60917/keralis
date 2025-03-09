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
            // Utiliser une commande plus précise pour obtenir le statut
            const { stdout, stderr } = await execAsync('pm2 jlist');
            
            // Analyser le JSON renvoyé par pm2 jlist
            const processList = JSON.parse(stdout);
            
            // Chercher l'application blockchain-app
            const blockchainApp = processList.find(process => process.name === 'blockchain-app');
            
            if (blockchainApp) {
                const isRunning = blockchainApp.pm2_env.status === 'online';
                
                return {
                    running: isRunning,
                    status: blockchainApp.pm2_env.status,
                    uptime: isRunning ? blockchainApp.pm2_env.pm_uptime : null,
                    restarts: blockchainApp.pm2_env.restart_time,
                    memory: blockchainApp.monit ? `${Math.round(blockchainApp.monit.memory / 1024 / 1024)}MB` : 'N/A',
                    cpu: blockchainApp.monit ? `${blockchainApp.monit.cpu}%` : 'N/A',
                    lastChecked: new Date().toISOString()
                };
            } else {
                return {
                    running: false,
                    status: 'not-found',
                    error: 'Processus blockchain-app non trouvé dans la liste PM2',
                    lastChecked: new Date().toISOString()
                };
            }
        } catch (error) {
            // Gérer spécifiquement l'erreur si PM2 n'est pas installé ou accessible
            if (error.message.includes('pm2: command not found')) {
                return {
                    running: false,
                    status: 'error',
                    error: 'PM2 n\'est pas installé ou n\'est pas accessible',
                    lastChecked: new Date().toISOString()
                };
            }
            
            return {
                running: false,
                status: 'error',
                error: error.message,
                stack: error.stack,
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