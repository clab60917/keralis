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
            updateRecentTable('recentHashTableBody', stats.recentHashList);
        }
        
        if (stats.recentEncryptedList && Array.isArray(stats.recentEncryptedList)) {
            updateRecentTable('recentEncryptedTableBody', stats.recentEncryptedList);
        }
        
        if (stats.recentMessages && Array.isArray(stats.recentMessages)) {
            updateRecentTable('recentMessagesTableBody', stats.recentMessages);
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
        
        items.forEach(item => {
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
            
            if (tableId === 'recentHashTableBody') {
                tr.innerHTML = `
                    <td>${item.fileName || 'N/A'}</td>
                    <td><small>${item.hash || 'N/A'}</small></td>
                    <td>${formattedTime}</td>
                `;
            } else if (tableId === 'recentEncryptedTableBody') {
                tr.innerHTML = `
                    <td>${item.fileName || 'N/A'}</td>
                    <td>${item.status || 'N/A'}</td>
                    <td>${formattedTime}</td>
                `;
            } else if (tableId === 'recentMessagesTableBody') {
                tr.innerHTML = `
                    <td>${item.type || 'N/A'}</td>
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
    if (!tbody || !alerts) return;
    
    tbody.innerHTML = '';
    alerts.slice(0, 5).forEach(alert => {
        const tr = document.createElement('tr');
        const statusClass = alert.status === 'restored' ? 'success' : 'danger';
        
        tr.innerHTML = `
            <td>${new Date(alert.timestamp).toLocaleTimeString()}</td>
            <td>${alert.fileName}</td>
            <td><span class="badge bg-${statusClass}">${alert.status}</span></td>
        `;
        
        tbody.appendChild(tr);
    });
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
    
    // Définir la largeur de la barre de progression
    element.style.width = `${numericValue}%`;
    
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
    
    console.log(`Mise à jour de ${elementId} avec la valeur ${numericValue}%, classe: ${element.className}`);
} 