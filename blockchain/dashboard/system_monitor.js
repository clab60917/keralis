const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class SystemMonitor {
    async getSystemStats() {
        try {
            // Désactiver la simulation des valeurs
            const simulateRealisticValues = false;
            
            let cpuLoad, memUsage, diskUsage;
            
            if (simulateRealisticValues) {
                // Simuler des valeurs CPU entre 10% et 60%
                cpuLoad = [
                    Math.random() * 5 + 5, // 5-10%
                    Math.random() * 3 + 2, // 2-5%
                    Math.random() * 2 + 1  // 1-3%
                ];
                
                // Simuler une utilisation mémoire entre 40% et 80%
                memUsage = Math.random() * 40 + 40;
                
                // Simuler une utilisation disque entre 30% et 70%
                diskUsage = Math.random() * 40 + 30;
            } else {
                cpuLoad = os.loadavg();
                memUsage = ((os.totalmem() - os.freemem()) / os.totalmem() * 100);
                // diskUsage sera récupéré plus tard
            }
            
            const stats = {
                cpu: {
                    loadAverage: cpuLoad,
                    cpuCount: os.cpus().length,
                    uptime: os.uptime()
                },
                memory: {
                    total: os.totalmem(),
                    free: os.freemem(),
                    usedPercentage: simulateRealisticValues ? memUsage.toFixed(2) : ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
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
                // Ajouter l'état du serveur
                const serverStatus = await this.checkServerStatus();
                console.log('État serveur:', JSON.stringify(serverStatus, null, 2));
                stats.server = serverStatus;
            } catch (serverError) {
                console.error('Erreur lors de la vérification du statut serveur:', serverError);
                stats.server = { running: true, error: serverError.message };
            }

            try {
                // Ajouter l'utilisation du disque
                if (simulateRealisticValues) {
                    stats.disk = {
                        filesystem: '/dev/disk1s1',
                        size: '500G',
                        used: `${Math.round(diskUsage * 5)}G`,
                        available: `${Math.round((100 - diskUsage) * 5)}G`,
                        percentage: `${Math.round(diskUsage)}%`,
                        mountpoint: '/',
                        usedPercentage: diskUsage
                    };
                } else {
                    const diskUsage = await this.getDiskUsage();
                    console.log('Utilisation du disque:', JSON.stringify(diskUsage, null, 2));
                    stats.disk = diskUsage;
                }
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
            // Exclure les processus grep pour éviter les faux positifs
            const { stdout } = await execAsync('ps aux | grep -v grep | grep -E "sftp|sshd.*sftp"');
            
            // Vérifier si la sortie contient des lignes non vides
            const lines = stdout.trim().split('\n').filter(line => line.trim().length > 0);
            
            if (lines.length > 0) {
                return {
                    running: true,
                    processCount: lines.length,
                    processInfo: stdout.trim()
                };
            } else {
                return {
                    running: false,
                    processCount: 0,
                    message: 'Aucun processus SFTP trouvé'
                };
            }
        } catch (error) {
            // Si la commande échoue, c'est probablement parce qu'aucun processus SFTP n'a été trouvé
            return {
                running: false,
                error: error.message,
                message: 'Erreur lors de la vérification du service SFTP'
            };
        }
    }

    async checkBlockchainStatus() {
        try {
            // Utiliser une commande plus précise pour obtenir le statut
            const { stdout, stderr } = await execAsync('pm2 jlist');
            
            // Analyser le JSON renvoyé par pm2 jlist
            const processList = JSON.parse(stdout);
            
            // Chercher l'application blockchain-app ou blockchain-new
            const blockchainApp = processList.find(process => 
                process.name === 'blockchain-app' || 
                process.name === 'blockchain-new' || 
                process.name === 'blockchain'
            );
            
            if (blockchainApp) {
                const isRunning = blockchainApp.pm2_env.status === 'online';
                
                return {
                    running: isRunning,
                    status: blockchainApp.pm2_env.status,
                    name: blockchainApp.name,
                    uptime: isRunning ? blockchainApp.pm2_env.pm_uptime : null,
                    restarts: blockchainApp.pm2_env.restart_time,
                    memory: blockchainApp.monit ? `${Math.round(blockchainApp.monit.memory / 1024 / 1024)}MB` : 'N/A',
                    cpu: blockchainApp.monit ? `${blockchainApp.monit.cpu}%` : 'N/A',
                    lastChecked: new Date().toISOString()
                };
            } else {
                // Si aucun processus blockchain n'est trouvé, essayer de vérifier avec ps
                try {
                    const { stdout: psOutput } = await execAsync('ps aux | grep -v grep | grep -E "blockchain-app|blockchain-new|blockchain"');
                    if (psOutput && psOutput.trim().length > 0) {
                        return {
                            running: true,
                            status: 'running-outside-pm2',
                            processInfo: psOutput.trim(),
                            lastChecked: new Date().toISOString()
                        };
                    }
                } catch (psError) {
                    console.error('Erreur lors de la vérification du processus blockchain avec ps:', psError);
                }
                
                return {
                    running: false,
                    status: 'not-found',
                    error: 'Processus blockchain non trouvé',
                    lastChecked: new Date().toISOString()
                };
            }
        } catch (error) {
            // Gérer spécifiquement l'erreur si PM2 n'est pas installé ou accessible
            if (error.message.includes('pm2: command not found')) {
                // Essayer de vérifier avec ps
                try {
                    const { stdout: psOutput } = await execAsync('ps aux | grep -v grep | grep -E "blockchain-app|blockchain-new|blockchain"');
                    if (psOutput && psOutput.trim().length > 0) {
                        return {
                            running: true,
                            status: 'running-without-pm2',
                            processInfo: psOutput.trim(),
                            lastChecked: new Date().toISOString()
                        };
                    }
                } catch (psError) {
                    console.error('Erreur lors de la vérification du processus blockchain avec ps:', psError);
                }
                
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

    async checkServerStatus() {
        try {
            // Récupérer les informations système de base
            const uptime = os.uptime();
            const loadAvg = os.loadavg();
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const memUsage = ((totalMem - freeMem) / totalMem * 100).toFixed(2);
            
            // Vérifier si le serveur est surchargé
            const isOverloaded = loadAvg[0] > os.cpus().length * 2; // Charge > 2x le nombre de CPU
            const isLowMemory = freeMem < totalMem * 0.1; // Moins de 10% de mémoire libre
            
            // Déterminer le statut global
            let status = 'normal';
            if (isOverloaded && isLowMemory) {
                status = 'critical';
            } else if (isOverloaded || isLowMemory) {
                status = 'warning';
            }
            
            return {
                running: true,
                status: status,
                uptime: uptime,
                uptimeFormatted: this.formatUptime(uptime),
                loadAverage: loadAvg,
                memoryUsage: parseFloat(memUsage),
                hostname: os.hostname(),
                platform: os.platform(),
                cpuCount: os.cpus().length,
                lastChecked: new Date().toISOString()
            };
        } catch (error) {
            console.error('Erreur lors de la vérification du statut serveur:', error);
            return {
                running: true, // On suppose que le serveur fonctionne puisque ce code s'exécute
                status: 'error',
                error: error.message,
                lastChecked: new Date().toISOString()
            };
        }
    }

    // Fonction utilitaire pour formater le temps d'activité
    formatUptime(uptime) {
        const days = Math.floor(uptime / 86400);
        const hours = Math.floor((uptime % 86400) / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        
        let result = '';
        if (days > 0) result += `${days}j `;
        if (hours > 0 || days > 0) result += `${hours}h `;
        result += `${minutes}m`;
        
        return result;
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