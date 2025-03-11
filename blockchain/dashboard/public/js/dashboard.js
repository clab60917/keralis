// Script principal du dashboard Keralis

document.addEventListener('DOMContentLoaded', function() {
    // Initialisation de Socket.IO
    const socket = io();
    
    // Fonction pour mettre à jour les statistiques
    function updateStats(stats) {
        if (!stats) return;
        
        console.log('Mise à jour des statistiques avec:', stats);
        
        // Mise à jour des compteurs
        updateElement('hashCount', stats.hash);
        updateElement('encryptedCount', stats.encrypted);
        updateElement('messagesCount', stats.messages);
        
        // Mise à jour des taux
        updateElement('hashRate', stats.rates.hash);
        updateElement('encryptedRate', stats.rates.encrypted);
        updateElement('messagesRate', stats.rates.messages);
        
        // Mise à jour des temps de traitement
        updateElement('hashProcessingTime', stats.processingTimes.hash);
        updateElement('encryptedProcessingTime', stats.processingTimes.encrypted);
        
        // Mise à jour des stats système
        if (stats.system) {
            updateElement('cpuUsage', stats.system.cpu.toFixed(1));
            updateElement('memoryUsage', stats.system.memory.toFixed(1));
        }
        
        // Mise à jour de la dernière mise à jour
        updateElement('lastUpdated', stats.lastUpdated);
        
        // Mise à jour des tableaux récents
        if (stats.recentHash) updateRecentTable('recentHashTableBody', stats.recentHash);
        if (stats.recentEncrypted) updateRecentTable('recentEncryptedTableBody', stats.recentEncrypted);
        if (stats.recentMessages) updateRecentTable('recentMessagesTableBody', stats.recentMessages);
        
        // Mise à jour des alertes
        if (stats.alerts) {
            updateAlertsTable('alertsTableBody', stats.alerts);
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
        
        tbody.innerHTML = '';
        items.forEach(item => {
            const tr = document.createElement('tr');
            
            if (tableId === 'recentHashTableBody') {
                tr.innerHTML = `
                    <td>${item.fileName}</td>
                    <td><small>${item.hash}</small></td>
                    <td>${new Date(item.timestamp).toLocaleTimeString()}</td>
                `;
            } else if (tableId === 'recentEncryptedTableBody') {
                tr.innerHTML = `
                    <td>${item.fileName}</td>
                    <td>${item.status}</td>
                    <td>${new Date(item.timestamp).toLocaleTimeString()}</td>
                `;
            } else if (tableId === 'recentMessagesTableBody') {
                tr.innerHTML = `
                    <td>${item.type}</td>
                    <td>${item.message}</td>
                    <td>${new Date(item.timestamp).toLocaleTimeString()}</td>
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
    
    // Écoute des événements Socket.IO
    socket.on('connect', function() {
        console.log('Connecté au serveur Socket.IO');
    });
    
    socket.on('stats', updateStats);
    
    socket.on('disconnect', function() {
        console.log('Déconnecté du serveur Socket.IO');
    });
    
    // Demande de mise à jour toutes les 5 secondes
    setInterval(() => {
        socket.emit('requestStats');
    }, 5000);
    
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
}); 