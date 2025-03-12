// Script principal du dashboard Keralis

// Variables globales pour le graphique
let activityChart = null;
let chartData = {
    labels: [],
    hashesData: [],
    encryptedData: [],
    messagesData: [],
    timestamps: []  // Ajout d'un tableau pour stocker les timestamps
};
const MAX_DATA_POINTS = 20; // Nombre maximum de points de données à afficher

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM chargé, initialisation de Socket.IO');
    
    // Initialiser le graphique d'activité
    initActivityChart();
    
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
            
            // Mettre à jour le graphique avec les nouvelles données
            updateActivityChart(stats);
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

// Fonction pour initialiser le graphique d'activité
function initActivityChart() {
    const ctx = document.getElementById('activityChart');
    if (!ctx) {
        console.warn('Élément canvas pour le graphique non trouvé');
        return;
    }
    
    activityChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Hash',
                    data: [],
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'Encrypted',
                    data: [],
                    borderColor: 'rgba(153, 102, 255, 1)',
                    backgroundColor: 'rgba(153, 102, 255, 0.2)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6
                },
                {
                    label: 'Messages',
                    data: [],
                    borderColor: 'rgba(255, 159, 64, 1)',
                    backgroundColor: 'rgba(255, 159, 64, 0.2)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Nombre de fichiers'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Heure (20 derniers envois)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Activité des 20 derniers envois',
                    font: {
                        size: 16
                    },
                    padding: {
                        top: 10,
                        bottom: 20
                    }
                },
                legend: {
                    position: 'top',
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: function(tooltipItems) {
                            return tooltipItems[0].label;
                        },
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y;
                            }
                            return label;
                        }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            },
            animation: {
                duration: 500
            }
        }
    });
    
    console.log('Graphique d\'activité initialisé');
}

// Fonction pour mettre à jour le graphique d'activité
function updateActivityChart(stats) {
    if (!activityChart) {
        console.warn('Graphique d\'activité non initialisé');
        return;
    }
    
    // Obtenir le timestamp actuel
    const now = new Date();
    const timeLabel = now.toLocaleTimeString();
    
    // Vérifier si nous avons de nouvelles données à ajouter
    const hasNewData = 
        (stats.totalHashes !== chartData.hashesData[chartData.hashesData.length - 1]) ||
        (stats.totalEncrypted !== chartData.encryptedData[chartData.encryptedData.length - 1]) ||
        (stats.totalMessages !== chartData.messagesData[chartData.messagesData.length - 1]);
    
    // N'ajouter des données que si elles sont différentes des dernières données
    if (hasNewData || chartData.labels.length === 0) {
        // Ajouter les nouvelles données
        chartData.labels.push(timeLabel);
        chartData.timestamps.push(now.getTime());
        chartData.hashesData.push(stats.totalHashes || 0);
        chartData.encryptedData.push(stats.totalEncrypted || 0);
        chartData.messagesData.push(stats.totalMessages || 0);
        
        // Limiter le nombre de points de données
        if (chartData.labels.length > MAX_DATA_POINTS) {
            chartData.labels.shift();
            chartData.timestamps.shift();
            chartData.hashesData.shift();
            chartData.encryptedData.shift();
            chartData.messagesData.shift();
        }
        
        // Mettre à jour le graphique
        activityChart.data.labels = chartData.labels;
        activityChart.data.datasets[0].data = chartData.hashesData;
        activityChart.data.datasets[1].data = chartData.encryptedData;
        activityChart.data.datasets[2].data = chartData.messagesData;
        
        // Redessiner le graphique
        activityChart.update();
        
        console.log('Graphique d\'activité mis à jour avec de nouvelles données');
    } else {
        console.log('Pas de nouvelles données pour le graphique d\'activité');
    }
}

// Fonction pour mettre à jour les statistiques
function updateStats(stats) {
    if (!stats) {
        console.warn("Aucune statistique reçue");
        return;
    }
    
    try {
        // Mise à jour des compteurs
        updateElementSafely('totalHashesCount', stats.totalHashes || '0');
        updateElementSafely('totalEncryptedCount', stats.totalEncrypted || '0');
        updateElementSafely('totalMessagesCount', stats.totalMessages || '0');
        
        // Mise à jour du Topic ID
        updateElementSafely('topicIdValue', stats.topicId || 'Non disponible');
        
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
            updateRecentTable('recentHashTableBody', stats.recentHashList);
        }
        
        if (stats.recentEncryptedList && Array.isArray(stats.recentEncryptedList)) {
            updateRecentTable('recentEncryptedTableBody', stats.recentEncryptedList);
        }
        
        if (stats.recentMessages && Array.isArray(stats.recentMessages)) {
            updateRecentTable('recentMessagesTableBody', stats.recentMessages);
        }
        
        // Mise à jour des alertes
        if (stats.alerts && Array.isArray(stats.alerts)) {
            updateAlertsTable('alertsTableBody', stats.alerts);
        }
        
        // Extraire les valeurs système avec des valeurs par défaut
        const cpuUsage = typeof stats.cpuUsage === 'number' ? stats.cpuUsage : 0;
        const memoryUsage = typeof stats.memoryUsage === 'number' ? stats.memoryUsage : 0;
        const diskUsage = typeof stats.diskUsage === 'number' ? stats.diskUsage : 0;
        
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

// Fonction pour mettre à jour un élément en toute sécurité
function updateElementSafely(id, value) {
    try {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Élément avec ID '${id}' non trouvé dans le DOM`);
            return;
        }

        // Si l'élément est le Topic ID, traitement spécial
        if (id === 'topicId' || id === 'topicIdValue') {
            // Mettre à jour le texte de l'élément
            element.textContent = value || 'N/A';
            
            // Mettre à jour le lien parent
            const link = document.getElementById('topicIdLink');
            if (link) {
                // Vérifier si le Topic ID est au format valide (0.0.XXXXXXX)
                if (value && /^0\.0\.\d+$/.test(value)) {
                    link.href = `https://hashscan.io/testnet/topic/${value}`;
                    link.title = `Voir le Topic ${value} sur HashScan`;
                    link.classList.remove('disabled');
                    link.target = '_blank';
                    link.rel = 'noopener noreferrer';
                    console.log(`Topic ID link updated: ${value}`);
                } else {
                    link.removeAttribute('href');
                    link.title = 'Topic ID non disponible';
                    link.classList.add('disabled');
                    console.log(`Invalid Topic ID format or value not available: ${value}`);
                }
                
                // S'assurer que l'icône est présente
                if (!link.querySelector('.bi')) {
                    const icon = document.createElement('i');
                    icon.className = 'bi bi-box-arrow-up-right ms-1';
                    icon.style.fontSize = '0.8rem';
                    icon.style.opacity = '0.7';
                    link.appendChild(icon);
                }
            } else {
                console.warn('Topic ID link element not found');
            }
        } else {
            // Pour tous les autres éléments, mise à jour simple du texte
            element.textContent = value || 'N/A';
        }
    } catch (error) {
        console.error(`Error updating element ${id}:`, error);
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
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">Aucune donnée disponible</td></tr>';
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
            // Pour SFTP, toujours afficher "En ligne"
            if (elementId === 'sftpStatusBadge') {
                statusText = 'En ligne';
                statusClass = 'success';
            }
            // Pour Blockchain, afficher le statut simplifié
            else if (elementId === 'blockchainStatusBadge') {
                if (statusData.status === 'online') {
                    statusText = 'En ligne';
                    statusClass = 'success';
                } else if (statusData.status === 'stopping' || statusData.status === 'stopped') {
                    statusText = 'Arrêté';
                    statusClass = 'warning';
                } else if (statusData.status === 'errored') {
                    statusText = 'Erreur';
                    statusClass = 'danger';
                } else {
                    statusText = 'En ligne';
                    statusClass = 'success';
                }
            }
            // Pour Serveur, afficher le statut avec le temps d'activité
            else if (elementId === 'serverStatusBadge') {
                if (statusData.status === 'normal' || !statusData.status) {
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
            // Pour tout autre service
            else {
                statusText = 'En ligne';
                statusClass = 'success';
            }
        } else {
            // Si le service n'est pas en cours d'exécution
            if (elementId === 'sftpStatusBadge') {
                // Pour SFTP, considérer toujours comme en ligne
                statusText = 'En ligne';
                statusClass = 'success';
            } else {
                statusText = 'Hors ligne';
                statusClass = 'danger';
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