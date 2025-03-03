const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { MongoClient } = require('mongodb');
const path = require('path');
const basicAuth = require('express-basic-auth');

const config = require('./auto3').config;

// Configuration de l'authentification basique
const users = {};
users[process.env.DASHBOARD_USER || 'admin'] = process.env.DASHBOARD_PASSWORD || 'changeme';

app.use(basicAuth({
    users: users,
    challenge: true,
    realm: 'Dashboard Blockchain'
}));

app.use(express.static(path.join(__dirname, 'public')));

let mongoClient;
let statsInterval;

async function getStats() {
    try {
        const db = mongoClient.db(config.mongodb.dbName);
        
        console.log('Récupération des statistiques...');
        
        const stats = {
            hash: await db.collection('hash').countDocuments(),
            encrypted: await db.collection('encrypted').countDocuments(),
            messages: await db.collection('messages').countDocuments(),
            lastUpdated: new Date().toLocaleString()
        };
        
        console.log('Statistiques:', stats);

        // Obtenir les 5 derniers messages de chaque collection
        stats.recentHash = await db.collection('hash')
            .find({})
            .sort({ timestamp: -1 })
            .limit(5)
            .toArray();

        stats.recentEncrypted = await db.collection('encrypted')
            .find({})
            .sort({ timestamp: -1 })
            .limit(5)
            .toArray();

        stats.recentMessages = await db.collection('messages')
            .find({})
            .sort({ timestamp: -1 })
            .limit(5)
            .toArray();
            
        console.log('Derniers hash:', stats.recentHash.length);
        console.log('Derniers encrypted:', stats.recentEncrypted.length);
        console.log('Derniers messages:', stats.recentMessages.length);

        return stats;
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        return null;
    }
}

// Configuration de Socket.IO
io.on('connection', async (socket) => {
    console.log('Nouvelle connexion Socket.IO tentée');
    
    try {
        // Envoyer les stats initiales
        const initialStats = await getStats();
        if (initialStats) {
            console.log('Envoi des statistiques initiales au client');
            socket.emit('stats', initialStats);
        } else {
            console.log('Pas de statistiques initiales disponibles');
        }
    } catch (error) {
        console.error('Erreur lors de l\'envoi des stats initiales:', error);
    }

    socket.on('disconnect', () => {
        console.log('Client déconnecté');
    });

    socket.on('error', (error) => {
        console.error('Erreur Socket.IO:', error);
    });

    // Gestion du rafraîchissement manuel
    socket.on('requestStats', async () => {
        try {
            const stats = await getStats();
            if (stats) {
                console.log('Envoi des statistiques suite à une demande manuelle');
                socket.emit('stats', stats);
            }
        } catch (error) {
            console.error('Erreur lors de la récupération manuelle des stats:', error);
        }
    });
});

async function broadcastStats() {
    try {
        const stats = await getStats();
        if (stats) {
            console.log('Diffusion des statistiques mises à jour');
            io.emit('stats', stats);
        }
    } catch (error) {
        console.error('Erreur lors de la diffusion des stats:', error);
    }
}

async function startServer() {
    try {
        // Connexion à MongoDB
        console.log('Tentative de connexion à MongoDB...');
        mongoClient = new MongoClient(config.mongodb.uri);
        await mongoClient.connect();
        console.log('Connecté à MongoDB');

        // Vérifier l'existence des collections
        const db = mongoClient.db(config.mongodb.dbName);
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        console.log('Collections disponibles:', collectionNames);

        // Démarrer la diffusion des stats toutes les 5 secondes
        statsInterval = setInterval(broadcastStats, 5000);

        // Démarrer le serveur sur toutes les interfaces
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

// Gestion de l'arrêt propre
process.on('SIGINT', async () => {
    clearInterval(statsInterval);
    if (mongoClient) {
        await mongoClient.close();
    }
    process.exit(0);
});

startServer(); 