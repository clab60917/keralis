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

            console.log('Stats système de base:', JSON.stringify(stats, null, 2));

            try {
                // Ajouter l'état du service SFTP
                const sftpStatus = await this.checkSFTPStatus();
                console.log('État SFTP:', JSON.stringify(sftpStatus, null, 2));
                stats.sftp = sftpStatus;
            } catch (sftpError) {
                console.error('Erreur lors de la vérification du statut SFTP:', sftpError);
                stats.sftp = { running: false, error: sftpError.message };
            }

            try {
                // Ajouter l'état du service blockchain
                const blockchainStatus = await this.checkBlockchainStatus();
                console.log('État blockchain:', JSON.stringify(blockchainStatus, null, 2));
                stats.blockchain = blockchainStatus;
            } catch (blockchainError) {
                console.error('Erreur lors de la vérification du statut blockchain:', blockchainError);
                stats.blockchain = { running: false, error: blockchainError.message };
            }

            try {
                // Ajouter l'utilisation du disque
                const diskUsage = await this.getDiskUsage();
                console.log('Utilisation du disque:', JSON.stringify(diskUsage, null, 2));
                stats.disk = diskUsage;
            } catch (diskError) {
                console.error('Erreur lors de la récupération de l\'utilisation du disque:', diskError);
                stats.disk = { usedPercentage: 0, error: diskError.message };
            }

            return stats;
        } catch (error) {
            console.error('Erreur lors de la récupération des stats système:', error);
            // Renvoyer un objet avec des valeurs par défaut en cas d'erreur
            return {
                cpu: { loadAverage: [0, 0, 0], cpuCount: 0, uptime: 0 },
                memory: { total: 0, free: 0, usedPercentage: 0 },
                disk: { usedPercentage: 0 },
                error: error.message,
                timestamp: new Date().toISOString()
            };
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
            console.log('Résultat de df -h /:', stdout);
            
            const lines = stdout.trim().split('\n');
            if (lines.length < 2) {
                console.error('Format de sortie df inattendu:', stdout);
                return {
                    error: 'Format de sortie df inattendu',
                    usedPercentage: 0
                };
            }
            
            const [, usage] = lines;
            const parts = usage.split(/\s+/);
            
            if (parts.length < 5) {
                console.error('Format de ligne df inattendu:', usage);
                return {
                    error: 'Format de ligne df inattendu',
                    usedPercentage: 0
                };
            }
            
            const [filesystem, size, used, available, percentage, mountpoint] = parts;
            
            // Extraire la valeur numérique du pourcentage (enlever le %)
            const usedPercentage = percentage ? parseFloat(percentage.replace('%', '')) : 0;
            
            console.log('Pourcentage d\'utilisation du disque extrait:', usedPercentage);
            
            return {
                filesystem,
                size,
                used,
                available,
                percentage,
                mountpoint,
                usedPercentage: isNaN(usedPercentage) ? 0 : usedPercentage
            };
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'utilisation du disque:', error);
            return {
                error: error.message,
                usedPercentage: 0
            };
        }
    }
}

module.exports = new SystemMonitor(); 