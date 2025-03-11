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
    if (!stats) return;
    
    console.log('Mise à jour des statistiques avec:', stats);
    
    try {
        // Mise à jour des compteurs
        updateElement('hashCount', stats.hash);
        updateElement('encryptedCount', stats.encrypted);
        updateElement('messagesCount', stats.messages);
        
        // Mise à jour des taux (convertir de par minute à par heure)
        const hashRateHourly = stats.rates && typeof stats.rates.hash === 'number' ? stats.rates.hash * 60 : 0;
        const encryptedRateHourly = stats.rates && typeof stats.rates.encrypted === 'number' ? stats.rates.encrypted * 60 : 0;
        const messagesRateHourly = stats.rates && typeof stats.rates.messages === 'number' ? stats.rates.messages * 60 : 0;
        
        updateElement('hashRate', hashRateHourly);
        updateElement('encryptedRate', encryptedRateHourly);
        updateElement('messagesRate', messagesRateHourly);
        
        // Mise à jour des temps de traitement
        updateElement('hashProcessingTime', stats.processingTimes && stats.processingTimes.hash !== undefined ? stats.processingTimes.hash : 0);
        updateElement('encryptedProcessingTime', stats.processingTimes && stats.processingTimes.encrypted !== undefined ? stats.processingTimes.encrypted : 0);
        
        // Mise à jour des stats système
        if (stats.system) {
            // Vérifier que cpu et memory sont des nombres ou les extraire s'ils sont des objets
            let cpuValue = 0;
            let memoryValue = 0;
            
            if (typeof stats.system.cpu === 'number') {
                cpuValue = stats.system.cpu.toFixed(1);
            } else if (typeof stats.system.cpu === 'object') {
                // Essayer d'extraire une valeur numérique de l'objet
                cpuValue = '0';
                console.warn('CPU est un objet:', stats.system.cpu);
            } else {
                cpuValue = stats.system.cpu || '0';
            }
            
            if (typeof stats.system.memory === 'number') {
                memoryValue = stats.system.memory.toFixed(1);
            } else if (typeof stats.system.memory === 'object') {
                // Essayer d'extraire une valeur numérique de l'objet
                memoryValue = '0';
                console.warn('Memory est un objet:', stats.system.memory);
            } else {
                memoryValue = stats.system.memory || '0';
            }
            
            updateElement('cpuUsage', cpuValue);
            updateElement('memoryUsage', memoryValue);
        }
        
        // Mise à jour de la dernière mise à jour
        updateElement('lastUpdated', stats.lastUpdated || new Date().toLocaleString());
        
        // Mise à jour des tableaux récents
        if (stats.recentHash) updateRecentTable('recentHashTableBody', stats.recentHash);
        if (stats.recentEncrypted) updateRecentTable('recentEncryptedTableBody', stats.recentEncrypted);
        if (stats.recentMessages) updateRecentTable('recentMessagesTableBody', stats.recentMessages);
        
        // Mise à jour des alertes
        if (stats.alerts) {
            updateAlertsTable('alertsTableBody', stats.alerts);
        }
    } catch (error) {
        console.error('Erreur lors de la mise à jour des statistiques:', error);
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
    if (!tbody || !items) return;
    
    console.log(`Mise à jour du tableau ${tableId} avec ${items.length} éléments:`, items);
    
    tbody.innerHTML = '';
    items.forEach(item => {
        const tr = document.createElement('tr');
        
        if (tableId === 'recentHashTableBody') {
            tr.innerHTML = `
                <td>${item.fileName || 'N/A'}</td>
                <td><small>${item.hash || 'N/A'}</small></td>
                <td>${item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'N/A'}</td>
            `;
        } else if (tableId === 'recentEncryptedTableBody') {
            tr.innerHTML = `
                <td>${item.fileName || 'N/A'}</td>
                <td>${item.status || 'N/A'}</td>
                <td>${item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'N/A'}</td>
            `;
        } else if (tableId === 'recentMessagesTableBody') {
            tr.innerHTML = `
                <td>${item.type || 'N/A'}</td>
                <td>${item.message || 'N/A'}</td>
                <td>${item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'N/A'}</td>
            `;
        }
        
        tbody.appendChild(tr);
    });
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