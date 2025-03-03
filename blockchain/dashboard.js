const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { MongoClient } = require('mongodb');
const path = require('path');
const basicAuth = require('express-basic-auth');

const config = require('./auto3').config;

// Configuration de l'authentification basique
app.use(basicAuth({
    users: { 
        [process.env.DASHBOARD_USER || 'admin']: process.env.DASHBOARD_PASSWORD || 'changeme'
    },
    challenge: true,
    realm: 'Dashboard Blockchain'
}));

app.use(express.static(path.join(__dirname, 'public')));

let mongoClient;
let statsInterval;

async function getStats() {
    try {
        const db = mongoClient.db(config.mongodb.dbName);
        
        const stats = {
            hash: await db.collection('hash').countDocuments(),
            encrypted: await db.collection('encrypted').countDocuments(),
            messages: await db.collection('messages').countDocuments(),
            lastUpdated: new Date().toLocaleString()
        };

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

        return stats;
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        return null;
    }
}

// Configuration de Socket.IO avec authentification
io.use((socket, next) => {
    const auth = socket.handshake.auth;
    if (auth && auth.username === (process.env.DASHBOARD_USER || 'admin') && 
        auth.password === (process.env.DASHBOARD_PASSWORD || 'changeme')) {
        next();
    } else {
        next(new Error('Authentification non autorisée'));
    }
});

io.on('connection', async (socket) => {
    console.log('Nouveau client connecté');
    
    // Envoyer les stats initiales
    const initialStats = await getStats();
    socket.emit('stats', initialStats);
});

async function broadcastStats() {
    const stats = await getStats();
    if (stats) {
        io.emit('stats', stats);
    }
}

async function startServer() {
    try {
        // Connexion à MongoDB
        mongoClient = new MongoClient(config.mongodb.uri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        await mongoClient.connect();
        console.log('Connecté à MongoDB');

        // Démarrer la diffusion des stats toutes les 5 secondes
        statsInterval = setInterval(broadcastStats, 5000);

        // Démarrer le serveur sur toutes les interfaces
        const PORT = process.env.DASHBOARD_PORT || 3000;
        const HOST = '0.0.0.0';  // Écoute sur toutes les interfaces
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