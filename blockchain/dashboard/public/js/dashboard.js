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
        document.getElementById('totalHashesCount').textContent = stats.totalHashes || '0';
        document.getElementById('totalEncryptedCount').textContent = stats.totalEncrypted || '0';
        document.getElementById('totalMessagesCount').textContent = stats.totalMessages || '0';
        
        // Mise à jour des taux par heure (au lieu de par minute)
        document.getElementById('hashesPerHour').textContent = stats.hashesPerMinute ? (stats.hashesPerMinute * 60).toFixed(2) : '0';
        document.getElementById('encryptedPerHour').textContent = stats.encryptedPerMinute ? (stats.encryptedPerMinute * 60).toFixed(2) : '0';
        document.getElementById('messagesPerHour').textContent = stats.messagesPerMinute ? (stats.messagesPerMinute * 60).toFixed(2) : '0';
        
        // Mise à jour des tableaux récents
        if (stats.recentHashList && Array.isArray(stats.recentHashList)) {
            updateRecentTable('recentHashTableBody', Object.values(stats.recentHashList));
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
        
        console.log("Valeurs système à afficher:", { cpuUsage, memoryUsage, diskUsage });
        
        // Mise à jour des barres de progression
        updateSystemStatus('cpuStatus', cpuUsage);
        updateSystemStatus('memoryStatus', memoryUsage);
        updateSystemStatus('diskStatus', diskUsage);
        
        // Mise à jour des valeurs numériques
        document.getElementById('cpuValue').textContent = typeof cpuUsage === 'number' ? `${cpuUsage.toFixed(2)}%` : 'N/A';
        document.getElementById('memoryValue').textContent = typeof memoryUsage === 'number' ? `${memoryUsage.toFixed(2)}%` : 'N/A';
        document.getElementById('diskValue').textContent = typeof diskUsage === 'number' ? `${diskUsage.toFixed(2)}%` : 'N/A';
        
        // Mise à jour de l'horodatage
        document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
    } catch (error) {
        console.error("Erreur lors de la mise à jour des statistiques:", error);
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
                    formattedTime = new Date(item.timestamp).toLocaleTimeString();
                }
            } catch (error) {
                console.error('Erreur lors du formatage de la date:', error);
            }
            
            // Ajouter une classe en fonction du type de message (pour les messages uniquement)
            if (tableId === 'recentMessagesTableBody' && item.type) {
                const type = item.type.toLowerCase();
                if (type === 'error') {
                    tr.classList.add('table-danger');
                } else if (type === 'warning') {
                    tr.classList.add('table-warning');
                } else if (type === 'success') {
                    tr.classList.add('table-success');
                } else if (type === 'info') {
                    tr.classList.add('table-info');
                }
            }
            
            if (tableId === 'recentHashTableBody') {
                // Afficher le hash complet ou tronqué selon sa longueur
                const hash = item.content;// || 'N/A';
                const displayHash = hash.length > 20 ? hash.substring(0, 20) + '...' : hash;
                
                // Ajouter une infobulle pour afficher le hash complet au survol
                const hashCell = `<td><small title="${hash}">${displayHash}</small></td>`;
                
                // Ajouter une infobulle pour afficher le nom de fichier complet au survol
                const fileName = item.filePath ? item.filePath.split('/').pop() : 'N/A';
                const displayFileName = fileName.length > 20 ? fileName.substring(0, 17) + '...' : fileName;
                const fileNameCell = `<td title="${fileName}">${displayFileName}</td>`;
                
                tr.innerHTML = `
                    ${fileNameCell}
                    ${hashCell}
                    <td>${formattedTime}</td>
                 `;
              
            } else if (tableId === 'recentEncryptedTableBody') {
                // Ajouter une infobulle pour afficher le nom de fichier complet au survol
                const fileName = item.filePath ? item.filePath.split('/').pop() : 'N/A';
                const displayFileName = fileName.length > 20 ? fileName.substring(0, 17) + '...' : fileName;
                const fileNameCell = `<td title="${fileName}">${displayFileName}</td>`;
                
                // Ajouter une classe de couleur en fonction du statut
                let statusClass = 'secondary';
                const status = item.status || 'N/A';
                if (status.toLowerCase() === 'encrypted' || status.toLowerCase() === 'success') {
                    statusClass = 'success';
                } else if (status.toLowerCase() === 'failed' || status.toLowerCase() === 'error') {
                    statusClass = 'danger';
                } else if (status.toLowerCase() === 'pending' || status.toLowerCase() === 'processing') {
                    statusClass = 'warning';
                }
                
                tr.innerHTML = `
                    ${fileNameCell}
                    <td><span class="badge bg-${statusClass}">${status}</span></td>
                    <td>${formattedTime}</td>
                `;
            } else if (tableId === 'recentMessagesTableBody') {
                // Afficher le type de message avec un badge coloré
                let typeClass = 'secondary';
                if (item.type) {
                    const type = item.type.toLowerCase();
                    if (type === 'error') typeClass = 'danger';
                    else if (type === 'warning') typeClass = 'warning';
                    else if (type === 'success') typeClass = 'success';
                    else if (type === 'info') typeClass = 'info';
                }
                
                tr.innerHTML = `
                    <td><span class="badge bg-${typeClass}">${item.type || 'N/A'}</span></td>
                    <td>${item.message || 'N/A'}</td>
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
                if (alert.date || alert.timestamp) {
                    const date = alert.date ? alert.date : alert.timestamp;
                    formattedTime = new Date(date).toLocaleTimeString();
                }
            } catch (error) {
                console.error('Erreur lors du formatage de la date d\'alerte:', error);
            }
            
            // Déterminer la classe de statut
            let statusClass = 'secondary';
            const status = alert.status ? alert.status.toLowerCase() : '';
            
            if (status === 'error' || status === 'danger') {
                statusClass = 'danger';
                tr.classList.add('table-danger');
            } else if (status === 'warning') {
                statusClass = 'warning';
                tr.classList.add('table-warning');
            } else if (status === 'success' || status === 'restored') {
                statusClass = 'success';
                tr.classList.add('table-success');
            } else if (status === 'info') {
                statusClass = 'info';
                tr.classList.add('table-info');
            }
            
            tr.innerHTML = `
                <td>${formattedTime}</td>
                <td>${alert.file || alert.fileName || 'N/A'}</td>
                <td><span class="badge bg-${statusClass}">${alert.status || 'N/A'}</span></td>
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