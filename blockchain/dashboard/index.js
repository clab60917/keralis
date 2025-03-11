const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { MongoClient } = require('mongodb');
const path = require('path');
const basicAuth = require('express-basic-auth');
const systemMonitor = require('./system_monitor');
const session = require('express-session');

// Configuration
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configuration de MongoDB
const MONGODB_URI = `mongodb://${process.env.MONGODB_USER}:${encodeURIComponent(process.env.MONGODB_PASSWORD)}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DB_NAME}?authSource=${process.env.MONGODB_AUTH_SOURCE}`;

// Configuration de l'authentification basique
const users = {};
users[process.env.DASHBOARD_USER || 'admin'] = process.env.DASHBOARD_PASSWORD || 'changeme';

app.use(basicAuth({
    users: users,
    challenge: true,
    realm: 'Keralis Dashboard'
}));

// Configuration de l'application
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware de logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'keralis_secret',
    resave: false,
    saveUninitialized: true
}));

// Variables globales
let mongoClient;
let statsInterval;
let lastStats = null;
let lastUpdate = 0;
const UPDATE_INTERVAL = 5000; // 5 secondes entre chaque mise à jour

// Stockage des dernières statistiques pour le calcul des taux
let previousCounts = {
    hash: 0,
    encrypted: 0,
    messages: 0,
    timestamp: Date.now()
};

// Fonction pour récupérer les statistiques
async function getStats() {
    try {
        const now = Date.now();
        
        // Si les dernières stats ont moins de 2 secondes, les renvoyer
        if (lastStats && (now - lastUpdate) < 2000) {
            return lastStats;
        }

        const db = mongoClient.db(process.env.MONGODB_DB_NAME);
        
        console.log('Récupération des statistiques...');
        
        // Récupérer les stats système
        const systemStats = await systemMonitor.getSystemStats();
        
        // Obtenir les compteurs actuels
        const currentCounts = {
            hash: await db.collection('hash').countDocuments(),
            encrypted: await db.collection('encrypted').countDocuments(),
            messages: await db.collection('messages').countDocuments()
        };

        // Récupérer les alertes
        const alerts = await db.collection('alerts')
            .find({})
            .sort({ timestamp: -1 })
            .limit(5)
            .toArray();

        // Calculer les taux de traitement (par minute)
        const timeDiffMinutes = (now - previousCounts.timestamp) / (1000 * 60);
        const rates = {
            hash: Math.round((currentCounts.hash - previousCounts.hash) / timeDiffMinutes),
            encrypted: Math.round((currentCounts.encrypted - previousCounts.encrypted) / timeDiffMinutes),
            messages: Math.round((currentCounts.messages - previousCounts.messages) / timeDiffMinutes)
        };

        // Obtenir les temps de traitement moyens des 5 dernières minutes
        const fiveMinutesAgo = new Date(now - 5 * 60 * 1000);
        const [recentHash, recentEncrypted] = await Promise.all([
            db.collection('hash')
                .find({ timestamp: { $gte: fiveMinutesAgo } })
                .sort({ timestamp: -1 })
                .limit(50)
                .toArray(),
            db.collection('encrypted')
                .find({ timestamp: { $gte: fiveMinutesAgo } })
                .sort({ timestamp: -1 })
                .limit(50)
                .toArray()
        ]);

        // Calculer les temps de traitement moyens
        const processingTimes = {
            hash: recentHash.length > 0 
                ? Math.round(recentHash.reduce((acc, curr) => acc + (curr.processingTime || 0), 0) / recentHash.length)
                : 0,
            encrypted: recentEncrypted.length > 0
                ? Math.round(recentEncrypted.reduce((acc, curr) => acc + (curr.processingTime || 0), 0) / recentEncrypted.length)
                : 0
        };

        // Mettre à jour les compteurs précédents
        previousCounts = {
            ...currentCounts,
            timestamp: now
        };

        const stats = {
            ...currentCounts,
            lastUpdated: new Date().toLocaleString(),
            system: systemStats,
            rates,
            processingTimes,
            alerts
        };

        // Obtenir les 5 derniers messages de chaque collection
        const [recentHashList, recentEncryptedList, recentMessages, recentAlerts] = await Promise.all([
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
                .toArray(),
            db.collection('alerts')
                .find({})
                .sort({ timestamp: -1 })
                .limit(5)
                .toArray()
        ]);

        stats.recentHash = recentHashList;
        stats.recentEncrypted = recentEncryptedList;
        stats.recentMessages = recentMessages;
        stats.alerts = recentAlerts;

        console.log('Statistiques récupérées:', {
            hash: stats.hash,
            encrypted: stats.encrypted,
            messages: stats.messages,
            recentHashCount: recentHashList.length,
            recentEncryptedCount: recentEncryptedList.length,
            recentMessagesCount: recentMessages.length,
            alertsCount: recentAlerts.length,
            systemStatus: systemStats ? 'OK' : 'Error',
            rates,
            processingTimes
        });

        lastStats = stats;
        lastUpdate = now;

        return stats;
    } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
        return null;
    }
}

// Routes
app.get('/', async (req, res) => {
    try {
        const stats = await getStats();
        res.render('index', {
            title: 'Dashboard',
            active: 'home',
            user: { username: req.auth.user }
        });
    } catch (error) {
        console.error('Erreur lors du rendu de la page d\'accueil:', error);
        res.status(500).send('Erreur lors du chargement du dashboard');
    }
});

// Route des alertes
app.get('/alerts', async (req, res) => {
    try {
        const db = mongoClient.db(process.env.MONGODB_DB_NAME);
        const alerts = await db.collection('alerts')
            .find({})
            .sort({ timestamp: -1 })
            .toArray();
        
        console.log(`${alerts.length} alertes trouvées`);
        
        res.render('alerts', {
            title: 'Alertes',
            user: { username: req.auth.user },
            active: 'alerts',
            alerts: alerts
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des alertes:', error);
        res.render('alerts', {
            title: 'Alertes',
            user: { username: req.auth.user },
            active: 'alerts',
            alerts: [],
            error: 'Erreur lors de la récupération des alertes'
        });
    }
});

// Configuration de Socket.IO
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

// Fonction pour diffuser les statistiques à tous les clients
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

// Gestion des erreurs
app.use((err, req, res, next) => {
    console.error('Erreur:', err);
    res.status(500).send('Erreur interne du serveur');
});

// Fonction de démarrage du serveur
async function startServer() {
    try {
        console.log('Tentative de connexion à MongoDB...');
        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        console.log('Connecté à MongoDB');

        const db = mongoClient.db(process.env.MONGODB_DB_NAME);
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

// Gestion de l'arrêt propre
process.on('SIGINT', async () => {
    clearInterval(statsInterval);
    if (mongoClient) {
        await mongoClient.close();
    }
    process.exit(0);
});

// Démarrer le serveur
startServer(); 