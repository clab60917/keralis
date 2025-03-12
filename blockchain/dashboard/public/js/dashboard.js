// Script principal du dashboard Keralis

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM chargé, initialisation de Socket.IO');
    
    // Vérifier que Socket.IO est disponible
    if (typeof io === 'undefined') {
        console.error('ERREUR: Socket.IO n\'est pas chargé');
        document.body.innerHTML += '<div class="alert alert-danger">Erreur: Socket.IO n\'est pas chargé</div>';
    } else {
        console.log('Socket.IO est disponible');
        
        // Initialisation de Socket.IO
        const socket = io();
        
        socket.on('connect', function() {
            console.log('Connecté au serveur Socket.IO - ID:', socket.id);
            document.getElementById('lastUpdated').textContent = 'Connecté';
            
            // Demander immédiatement les statistiques au serveur
            socket.emit('requestStats');
        });
        
        socket.on('connect_error', function(error) {
            console.error('Erreur de connexion Socket.IO:', error);
            document.getElementById('lastUpdated').textContent = 'Erreur de connexion';
        });
        
        socket.on('stats', function(stats) {
            console.log('Stats reçues:', stats);
            updateStats(stats);
        });
        
        socket.on('disconnect', function() {
            console.log('Déconnecté du serveur Socket.IO');
            document.getElementById('lastUpdated').textContent = 'Déconnecté';
        });
        
        // Demande de mise à jour toutes les 5 secondes
        setInterval(() => {
            console.log('Demande de mise à jour des stats');
            socket.emit('requestStats');
        }, 5000);
    }
});

// Fonction pour mettre à jour les statistiques
function updateStats(stats) {
    if (!stats) {
        console.warn("Aucune statistique reçue");
        return;
    }
    
    console.log("Mise à jour des statistiques:", stats);
    
    try {
        // Mise à jour des compteurs
        updateElementSafely('totalHashesCount', stats.totalHashes || '0');
        updateElementSafely('totalEncryptedCount', stats.totalEncrypted || '0');
        updateElementSafely('totalMessagesCount', stats.totalMessages || '0');
        
        // Mise à jour des taux par heure (au lieu de par minute)
        updateElementSafely('hashesPerHour', stats.hashesPerMinute ? (stats.hashesPerMinute * 60).toFixed(0) : '0');
        updateElementSafely('encryptedPerHour', stats.encryptedPerMinute ? (stats.encryptedPerMinute * 60).toFixed(0) : '0');
        updateElementSafely('messagesPerHour', stats.messagesPerMinute ? (stats.messagesPerMinute * 60).toFixed(0) : '0');
        
        // Mise à jour du badge d'alertes dans la barre de navigation
        const alertsBadge = document.querySelector('.nav-link[href="/alerts"] .badge');
        if (alertsBadge && stats.totalAlerts) {
            alertsBadge.textContent = stats.totalAlerts;
            alertsBadge.style.display = stats.totalAlerts > 0 ? 'inline' : 'none';
        }
        
        // Mise à jour des statuts des services
        updateServiceStatus('sftpStatusBadge', stats.sftpStatus);
        updateServiceStatus('blockchainStatusBadge', stats.blockchainStatus);
        updateServiceStatus('serverStatusBadge', stats.serverStatus || stats.server);
        
        // Mise à jour des tableaux récents
        if (stats.recentHashList && Array.isArray(stats.recentHashList)) {
            console.log('Mise à jour du tableau des hash récents:', stats.recentHashList);
            updateRecentTable('recentHashTableBody', stats.recentHashList);
        } else {
            console.warn('Aucune donnée de hash récente disponible');
        }
        
        if (stats.recentEncryptedList && Array.isArray(stats.recentEncryptedList)) {
            console.log('Mise à jour du tableau des encrypted récents:', stats.recentEncryptedList);
            updateRecentTable('recentEncryptedTableBody', stats.recentEncryptedList);
        } else {
            console.warn('Aucune donnée encrypted récente disponible');
        }
        
        if (stats.recentMessages && Array.isArray(stats.recentMessages)) {
            console.log('Mise à jour du tableau des messages récents:', stats.recentMessages);
            updateRecentTable('recentMessagesTableBody', stats.recentMessages);
        } else {
            console.warn('Aucun message récent disponible');
        }
        
        // Mise à jour des alertes
        if (stats.alerts && Array.isArray(stats.alerts)) {
            updateAlertsTable('alertsTableBody', stats.alerts);
        }
        
        // Extraire les valeurs système avec des valeurs par défaut
        const cpuUsage = typeof stats.cpuUsage === 'number' ? stats.cpuUsage : 0;
        const memoryUsage = typeof stats.memoryUsage === 'number' ? stats.memoryUsage : 0;
        const diskUsage = typeof stats.diskUsage === 'number' ? stats.diskUsage : 0;
        
        console.log("Valeurs système à afficher:", { cpuUsage, memoryUsage, diskUsage });
        
        // Mise à jour des barres de progression
        updateSystemStatus('cpuStatus', cpuUsage);
        updateSystemStatus('memoryStatus', memoryUsage);
        updateSystemStatus('diskStatus', diskUsage);
        
        // Mise à jour des valeurs numériques
        updateElementSafely('cpuValue', typeof cpuUsage === 'number' ? `${cpuUsage.toFixed(2)}%` : 'N/A');
        updateElementSafely('memoryValue', typeof memoryUsage === 'number' ? `${memoryUsage.toFixed(2)}%` : 'N/A');
        updateElementSafely('diskValue', typeof diskUsage === 'number' ? `${diskUsage.toFixed(2)}%` : 'N/A');
        
        // Mise à jour de l'horodatage (si l'élément existe)
        updateElementSafely('lastUpdated', new Date().toLocaleTimeString());
    } catch (error) {
        console.error("Erreur lors de la mise à jour des statistiques:", error);
    }
}

// Fonction pour mettre à jour un élément du DOM en toute sécurité
function updateElementSafely(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    } else {
        console.warn(`Élément avec ID '${id}' non trouvé dans le DOM`);
    }
}

// Fonction pour mettre à jour un élément du DOM
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    } else {
        console.warn(`Élément avec ID '${id}' non trouvé dans le DOM`);
    }
}

// Fonction pour mettre à jour les tableaux récents
function updateRecentTable(tableId, items) {
    const tbody = document.getElementById(tableId);
    if (!tbody) {
        console.warn(`Élément avec ID '${tableId}' non trouvé dans le DOM`);
        return;
    }
    
    if (!items || !Array.isArray(items) || items.length === 0) {
        console.warn(`Aucune donnée valide pour le tableau ${tableId}`);
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">Aucune donnée disponible</td></tr>';
        return;
    }
    
    console.log(`Mise à jour du tableau ${tableId} avec ${items.length} éléments:`, items);
    
    try {
        tbody.innerHTML = '';
        
        items.forEach((item, index) => {
            if (!item) return; // Ignorer les éléments null ou undefined
            
            const tr = document.createElement('tr');
            
            // Formater la date si elle existe
            let formattedTime = 'N/A';
            try {
                if (item.timestamp) {
                    const date = new Date(item.timestamp);
                    if (!isNaN(date.getTime())) {
                        formattedTime = date.toLocaleTimeString();
                    }
                }
            } catch (error) {
                console.error('Erreur lors du formatage de la date:', error);
            }
            
            if (tableId === 'recentHashTableBody') {
                // Extraire le nom du fichier à partir du chemin si disponible
                let fileName = 'N/A';
                if (item.fileName) fileName = item.fileName;
                else if (item.file) fileName = item.file;
                else if (item.name) fileName = item.name;
                else if (item.filename) fileName = item.filename;
                else if (item.filePath) {
                    // Extraire le nom du fichier à partir du chemin
                    const pathParts = item.filePath.split(/[\/\\]/);
                    fileName = pathParts[pathParts.length - 1];
                }
                else if (item.path) {
                    // Extraire le nom du fichier à partir du chemin
                    const pathParts = item.path.split(/[\/\\]/);
                    fileName = pathParts[pathParts.length - 1];
                }
                
                // S'assurer que le nom du fichier a l'extension .hash si ce n'est pas déjà le cas
                if (fileName !== 'N/A' && !fileName.toLowerCase().endsWith('.hash')) {
                    fileName = fileName + '.hash';
                }
                
                // Extraire le hash
                let hash = 'N/A';
                if (item.hash) hash = item.hash;
                else if (item.hashValue) hash = item.hashValue;
                else if (item.value) hash = item.value;
                else if (item.digest) hash = item.digest;
                else if (item.content) hash = item.content;
                
                // Afficher le hash complet ou tronqué selon sa longueur
                const displayHash = hash.length > 20 ? hash.substring(0, 20) + '...' : hash;
                
                // Tronquer le nom du fichier s'il est trop long
                const displayFileName = fileName.length > 20 ? fileName.substring(0, 17) + '...' : fileName;
                
                tr.innerHTML = `
                    <td title="${fileName}">${displayFileName}</td>
                    <td><small title="${hash}">${displayHash}</small></td>
                    <td>${formattedTime}</td>
                `;
            } else if (tableId === 'recentEncryptedTableBody') {
                // Extraire le nom du fichier à partir du chemin si disponible
                let fileName = 'N/A';
                if (item.fileName) fileName = item.fileName;
                else if (item.file) fileName = item.file;
                else if (item.name) fileName = item.name;
                else if (item.filename) fileName = item.filename;
                else if (item.filePath) {
                    // Extraire le nom du fichier à partir du chemin
                    const pathParts = item.filePath.split(/[\/\\]/);
                    fileName = pathParts[pathParts.length - 1];
                }
                else if (item.path) {
                    // Extraire le nom du fichier à partir du chemin
                    const pathParts = item.path.split(/[\/\\]/);
                    fileName = pathParts[pathParts.length - 1];
                }
                
                // S'assurer que le nom du fichier a l'extension .enc si ce n'est pas déjà le cas
                if (fileName !== 'N/A' && !fileName.toLowerCase().endsWith('.enc')) {
                    fileName = fileName + '.enc';
                }
                
                // Extraire le statut
                let status = 'N/A';
                if (item.status) status = item.status;
                else if (item.state) status = item.state;
                else if (item.result) status = item.result;
                
                // Ajouter une classe de couleur en fonction du statut
                let statusClass = 'secondary';
                if (status.toLowerCase() === 'encrypted' || status.toLowerCase() === 'success') {
                    statusClass = 'success';
                } else if (status.toLowerCase() === 'failed' || status.toLowerCase() === 'error') {
                    statusClass = 'danger';
                } else if (status.toLowerCase() === 'pending' || status.toLowerCase() === 'processing') {
                    statusClass = 'warning';
                }
                
                // Tronquer le nom du fichier s'il est trop long
                const displayFileName = fileName.length > 20 ? fileName.substring(0, 17) + '...' : fileName;
                
                tr.innerHTML = `
                    <td title="${fileName}">${displayFileName}</td>
                    <td><span class="badge bg-${statusClass}">${status}</span></td>
                    <td>${formattedTime}</td>
                `;
            } else if (tableId === 'recentMessagesTableBody') {
                // Extraire le type
                let type = 'Info';
                if (item.type) type = item.type;
                else if (item.category) type = item.category;
                else if (item.level) type = item.level;
                else if (item.status) type = item.status;
                
                // Ajouter une classe en fonction du type de message
                const typeClass = type.toLowerCase() === 'error' ? 'danger' :
                                 type.toLowerCase() === 'warning' ? 'warning' :
                                 type.toLowerCase() === 'success' ? 'success' :
                                 'info';
                
                tr.classList.add(`table-${typeClass}`);
                
                // Extraire le message
                let message = 'N/A';
                if (item.message) message = item.message;
                else if (item.content) message = item.content;
                else if (item.text) message = item.text;
                else if (item.data) {
                    if (typeof item.data === 'string') message = item.data;
                    else if (typeof item.data === 'object') message = JSON.stringify(item.data);
                }
                else if (item.filePath) {
                    // Si nous avons un chemin de fichier, utiliser cela comme message
                    message = `Fichier traité: ${item.filePath}`;
                }
                
                // Si le message ressemble à un hash (longue chaîne sans espaces), le remplacer par un message lisible
                if (typeof message === 'string' && message.length > 30 && !message.includes(' ')) {
                    // Remplacer par un message plus descriptif basé sur le type
                    if (type.toLowerCase() === 'error') {
                        message = 'Erreur détectée lors du traitement du fichier';
                    } else if (type.toLowerCase() === 'warning') {
                        message = 'Avertissement: vérification de l\'intégrité recommandée';
                    } else if (type.toLowerCase() === 'success') {
                        message = 'Opération terminée avec succès';
                    } else {
                        message = 'Message système: traitement en cours';
                    }
                }
                
                // Tronquer le message s'il est trop long
                const displayMessage = message.length > 30 ? message.substring(0, 27) + '...' : message;
                
                tr.innerHTML = `
                    <td><span class="badge bg-${typeClass}">${type}</span></td>
                    <td title="${message}">${displayMessage}</td>
                    <td>${formattedTime}</td>
                `;
            } else {
                console.warn(`Type de tableau non reconnu: ${tableId}`);
                return;
            }
            
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error(`Erreur lors de la mise à jour du tableau ${tableId}:`, error);
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">Erreur lors de la mise à jour</td></tr>';
    }
}

// Fonction pour mettre à jour le tableau des alertes
function updateAlertsTable(tableId, alerts) {
    const tbody = document.getElementById(tableId);
    if (!tbody) {
        console.warn(`Élément avec ID '${tableId}' non trouvé dans le DOM`);
        return;
    }
    
    if (!alerts || !Array.isArray(alerts) || alerts.length === 0) {
        console.warn(`Aucune alerte disponible pour le tableau ${tableId}`);
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">Aucune alerte disponible</td></tr>';
        return;
    }
    
    console.log(`Mise à jour du tableau d'alertes avec ${alerts.length} éléments:`, alerts);
    
    try {
        tbody.innerHTML = '';
        
        alerts.forEach(alert => {
            if (!alert) return; // Ignorer les éléments null ou undefined
            
            const tr = document.createElement('tr');
            
            // Formater la date si elle existe
            let formattedTime = 'N/A';
            try {
                const timestamp = alert.timestamp || alert.date || alert.time || alert.createdAt;
                if (timestamp) {
                    const date = new Date(timestamp);
                    if (!isNaN(date.getTime())) {
                        formattedTime = date.toLocaleTimeString();
                    }
                }
            } catch (error) {
                console.error('Erreur lors du formatage de la date d\'alerte:', error);
            }
            
            // Extraire le nom du fichier
            let fileName = 'N/A';
            if (alert.file) fileName = alert.file;
            else if (alert.fileName) fileName = alert.fileName;
            else if (alert.name) fileName = alert.name;
            else if (alert.filename) fileName = alert.filename;
            else if (alert.filePath) {
                // Extraire le nom du fichier à partir du chemin
                const pathParts = alert.filePath.split(/[\/\\]/);
                fileName = pathParts[pathParts.length - 1];
            }
            else if (alert.path) {
                // Extraire le nom du fichier à partir du chemin
                const pathParts = alert.path.split(/[\/\\]/);
                fileName = pathParts[pathParts.length - 1];
            }
            
            // Extraire le statut
            let status = 'N/A';
            if (alert.status) status = alert.status;
            else if (alert.state) status = alert.state;
            else if (alert.result) status = alert.result;
            else if (alert.type) status = alert.type;
            
            // Déterminer la classe de statut
            let statusClass = 'secondary';
            const statusLower = status.toLowerCase();
            
            if (statusLower === 'error' || statusLower === 'danger' || statusLower === 'failed') {
                statusClass = 'danger';
                tr.classList.add('table-danger');
            } else if (statusLower === 'warning') {
                statusClass = 'warning';
                tr.classList.add('table-warning');
            } else if (statusLower === 'success' || statusLower === 'restored' || statusLower === 'encrypted') {
                statusClass = 'success';
                tr.classList.add('table-success');
            } else if (statusLower === 'info') {
                statusClass = 'info';
                tr.classList.add('table-info');
            }
            
            tr.innerHTML = `
                <td>${formattedTime}</td>
                <td>${fileName}</td>
                <td><span class="badge bg-${statusClass}">${status}</span></td>
            `;
            
            tbody.appendChild(tr);
        });
    } catch (error) {
        console.error(`Erreur lors de la mise à jour du tableau d'alertes:`, error);
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">Erreur lors de la mise à jour</td></tr>';
    }
}

// Gestion des modals pour les détails d'alerte
document.querySelectorAll('.view-alert-details').forEach(button => {
    button.addEventListener('click', function() {
        const alertId = this.getAttribute('data-alert-id');
        // Ici, vous pourriez charger les détails de l'alerte via une requête AJAX
        // Pour l'exemple, nous utilisons simplement les attributs data-*
        document.getElementById('alertDetailsTitle').textContent = this.getAttribute('data-alert-file');
        document.getElementById('alertDetailsOriginalHash').textContent = this.getAttribute('data-alert-original-hash');
        document.getElementById('alertDetailsNewHash').textContent = this.getAttribute('data-alert-new-hash');
        document.getElementById('alertDetailsDate').textContent = this.getAttribute('data-alert-date');
        document.getElementById('alertDetailsStatus').textContent = this.getAttribute('data-alert-status');
        
        // Afficher le modal
        const modal = new bootstrap.Modal(document.getElementById('alertDetailsModal'));
        modal.show();
    });
});

// Fonction pour mettre à jour les indicateurs de statut système
function updateSystemStatus(elementId, value) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`Élément avec ID '${elementId}' non trouvé`);
        return;
    }
    
    // Valeur par défaut si non définie ou non numérique
    const numericValue = typeof value === 'number' && !isNaN(value) ? value : 0;
    
    // Définir la largeur de la barre de progression (minimum 5% pour la visibilité)
    const displayWidth = Math.max(5, numericValue);
    element.style.width = `${displayWidth}%`;
    
    // Supprimer les classes existantes
    element.classList.remove('bg-success', 'bg-warning', 'bg-danger', 'bg-secondary');
    
    // Ajouter la classe appropriée en fonction de la valeur
    if (typeof value !== 'number' || isNaN(value)) {
        element.classList.add('bg-secondary');
    } else if (value < 70) {
        element.classList.add('bg-success');
    } else if (value < 90) {
        element.classList.add('bg-warning');
    } else {
        element.classList.add('bg-danger');
    }
    
    console.log(`Mise à jour de ${elementId} avec la valeur ${numericValue}%, affichage: ${displayWidth}%, classe: ${element.className}`);
}

// Fonction pour mettre à jour le statut d'un service
function updateServiceStatus(elementId, statusData) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`Élément avec ID '${elementId}' non trouvé dans le DOM`);
        return;
    }
    
    // Valeurs par défaut
    let statusText = 'Inconnu';
    let statusClass = 'secondary';
    
    if (statusData) {
        // Déterminer le texte et la classe en fonction du statut
        if (statusData.running === true) {
            statusText = 'En ligne';
            statusClass = 'success';
            
            // Ajouter des détails supplémentaires pour le statut blockchain
            if (elementId === 'blockchainStatusBadge' && statusData.status) {
                if (statusData.status === 'online') {
                    statusText = 'En ligne';
                } else if (statusData.status === 'stopping' || statusData.status === 'stopped') {
                    statusText = 'Arrêté';
                    statusClass = 'warning';
                } else if (statusData.status === 'errored') {
                    statusText = 'Erreur';
                    statusClass = 'danger';
                }
                
                // Ajouter des informations sur les redémarrages si disponibles
                if (statusData.restarts && statusData.restarts > 0) {
                    statusText += ` (${statusData.restarts} redémarrages)`;
                }
            }
            
            // Ajouter des détails supplémentaires pour le statut serveur
            if (elementId === 'serverStatusBadge' && statusData.status) {
                if (statusData.status === 'normal') {
                    statusText = 'Normal';
                    statusClass = 'success';
                } else if (statusData.status === 'warning') {
                    statusText = 'Attention';
                    statusClass = 'warning';
                } else if (statusData.status === 'critical') {
                    statusText = 'Critique';
                    statusClass = 'danger';
                }
                
                // Ajouter le temps d'activité si disponible
                if (statusData.uptimeFormatted) {
                    statusText += ` (${statusData.uptimeFormatted})`;
                }
            }
        } else {
            statusText = 'Hors ligne';
            statusClass = 'danger';
            
            // Si nous avons une erreur, l'afficher
            if (statusData.error) {
                statusText = 'Erreur';
                console.warn(`Erreur de service ${elementId}:`, statusData.error);
            }
        }
    }
    
    // Mettre à jour le texte et la classe
    element.textContent = statusText;
    
    // Supprimer toutes les classes bg-*
    element.classList.forEach(cls => {
        if (cls.startsWith('bg-')) {
            element.classList.remove(cls);
        }
    });
    
    // Ajouter la nouvelle classe
    element.classList.add(`bg-${statusClass}`);
} 