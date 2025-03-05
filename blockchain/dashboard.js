const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { MongoClient } = require('mongodb');
const path = require('path');
const basicAuth = require('express-basic-auth');
const systemMonitor = require('./system_monitor');

const config = require('./auto3').config;

// Configuration de l'authentification basique
const users = {};
users[process.env.DASHBOARD_USER || 'admin'] = process.env.DASHBOARD_PASSWORD || 'changeme';

app.use(basicAuth({
    users: users,
    challenge: true,
    realm: 'Keralis Dashboard'
}));

app.use(express.static(path.join(__dirname, 'public')));

let mongoClient;
let statsInterval;
let lastStats = null;
let lastUpdate = 0;
const UPDATE_INTERVAL = 5000; // 5 secondes entre chaque mise à jour

async function getStats() {
    try {
        const now = Date.now();
        
        // Si les dernières stats ont moins de 2 secondes, les renvoyer
        if (lastStats && (now - lastUpdate) < 2000) {
            return lastStats;
        }

        const db = mongoClient.db(config.mongodb.dbName);
        
        console.log('Récupération des statistiques...');
        
        // Récupérer les stats système
        const systemStats = await systemMonitor.getSystemStats();
        
        const stats = {
            hash: await db.collection('hash').countDocuments(),
            encrypted: await db.collection('encrypted').countDocuments(),
            messages: await db.collection('messages').countDocuments(),
            lastUpdated: new Date().toLocaleString(),
            system: systemStats
        };

        // Obtenir les 5 derniers messages de chaque collection
        const [recentHash, recentEncrypted, recentMessages] = await Promise.all([
            db.collection('hash')
                .find({})
                .sort({ timestamp: -1 })
                .limit(5)
                .toArray(),
            db.collection('encrypted')
                .find({})
                .sort({ timestamp: -1 })
                .limit(5)
                .toArray(),
            db.collection('messages')
                .find({})
                .sort({ timestamp: -1 })
                .limit(5)
                .toArray()
        ]);

        stats.recentHash = recentHash;
        stats.recentEncrypted = recentEncrypted;
        stats.recentMessages = recentMessages;

        console.log('Statistiques récupérées:', {
            hash: stats.hash,
            encrypted: stats.encrypted,
            messages: stats.messages,
            recentHashCount: recentHash.length,
            recentEncryptedCount: recentEncrypted.length,
            recentMessagesCount: recentMessages.length,
            systemStatus: systemStats ? 'OK' : 'Error'
        });

        lastStats = stats;
        lastUpdate = now;

        return stats;
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        return null;
    }
}

// Configuration de Socket.IO avec des options de performance
io.on('connection', async (socket) => {
    console.log('Nouvelle connexion Socket.IO tentée');
    
    try {
        const initialStats = await getStats();
        if (initialStats) {
            socket.emit('stats', initialStats);
        }
    } catch (error) {
        console.error('Erreur lors de l\'envoi des stats initiales:', error);
    }

    // Limiter les demandes de rafraîchissement
    let lastRefresh = 0;
    socket.on('requestStats', async () => {
        const now = Date.now();
        if (now - lastRefresh < 2000) {
            return; // Ignorer les demandes trop fréquentes
        }
        lastRefresh = now;

        try {
            const stats = await getStats();
            if (stats) {
                socket.emit('stats', stats);
            }
        } catch (error) {
            console.error('Erreur lors de la récupération manuelle des stats:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client déconnecté');
    });
});

async function broadcastStats() {
    try {
        const stats = await getStats();
        if (stats) {
            io.emit('stats', stats);
        }
    } catch (error) {
        console.error('Erreur lors de la diffusion des stats:', error);
    }
}

async function startServer() {
    try {
        console.log('Tentative de connexion à MongoDB...');
        mongoClient = new MongoClient(config.mongodb.uri);
        await mongoClient.connect();
        console.log('Connecté à MongoDB');

        const db = mongoClient.db(config.mongodb.dbName);
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        console.log('Collections disponibles:', collectionNames);

        // Démarrer la diffusion des stats
        statsInterval = setInterval(broadcastStats, UPDATE_INTERVAL);

        const PORT = process.env.DASHBOARD_PORT || 3000;
        const HOST = '0.0.0.0';
        http.listen(PORT, HOST, () => {
            console.log(`Dashboard disponible sur http://${HOST}:${PORT}`);
        });

    } catch (error) {
        console.error('Erreur lors du démarrage du serveur:', error);
        process.exit(1);
    }
}

process.on('SIGINT', async () => {
    clearInterval(statsInterval);
    if (mongoClient) {
        await mongoClient.close();
    }
    process.exit(0);
});

startServer(); 