const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const { MongoClient } = require('mongodb');
const path = require('path');
const basicAuth = require('express-basic-auth');
const systemMonitor = require('./system_monitor');
const session = require('express-session');
const os = require('os');
const fs = require('fs').promises;

// Configuration
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Configuration de MongoDB
console.log('Variables d\'environnement MongoDB:');
console.log('- MONGODB_USER:', process.env.MONGODB_USER ? 'défini' : 'non défini');
console.log('- MONGODB_PASSWORD:', process.env.MONGODB_PASSWORD ? 'défini' : 'non défini');
console.log('- MONGODB_HOST:', process.env.MONGODB_HOST);
console.log('- MONGODB_PORT:', process.env.MONGODB_PORT);
console.log('- MONGODB_DB_NAME:', process.env.MONGODB_DB_NAME);
console.log('- MONGODB_AUTH_SOURCE:', process.env.MONGODB_AUTH_SOURCE);

// Construire l'URI MongoDB
let MONGODB_URI;
if (process.env.MONGODB_USER && process.env.MONGODB_PASSWORD) {
    MONGODB_URI = `mongodb://${process.env.MONGODB_USER}:${encodeURIComponent(process.env.MONGODB_PASSWORD)}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DB_NAME}?authSource=${process.env.MONGODB_AUTH_SOURCE}`;
} else {
    // Connexion sans authentification
    MONGODB_URI = `mongodb://${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DB_NAME}`;
    console.log('ATTENTION: Connexion MongoDB sans authentification');
}

// // Configuration de l'authentification basique
// const users = {};
// users[process.env.DASHBOARD_USER || 'admin'] = process.env.DASHBOARD_PASSWORD || 'changeme';

// app.use(basicAuth({
//     users: users,
//     challenge: true,
//     realm: 'Keralis Dashboard'
// }));



// Configuration de l'authentification basique
let users = {};

// Vérifier si nous avons une liste d'utilisateurs au format user:pass;user:pass
if (process.env.DASHBOARD_USERS) {
    const userPairs = process.env.DASHBOARD_USERS.split(',');
    for (const pair of userPairs) {
        const [username, password] = pair.split(':');
        if (username && password) {
            users[username.trim()] = password.trim();
        }
    }
    console.log(`${Object.keys(users).length} utilisateurs chargés depuis DASHBOARD_USERS`);
} 
// Vérifier les variables numérotées (DASHBOARD_USER_1, DASHBOARD_PASSWORD_1, etc.)
else {
    let index = 1;
    let continueChecking = true;
    
    while (continueChecking) {
        const userVar = `DASHBOARD_USER_${index}`;
        const passVar = `DASHBOARD_PASSWORD_${index}`;
        
        if (process.env[userVar] && process.env[passVar]) {
            users[process.env[userVar]] = process.env[passVar];
            index++;
        } else {
            continueChecking = false;
        }
    }
    
    console.log(`${Object.keys(users).length} utilisateurs chargés depuis les variables numérotées`);
}

// Si aucun utilisateur n'est défini, utiliser l'authentification simple
if (Object.keys(users).length === 0) {
    users[process.env.DASHBOARD_USER || 'admin'] = process.env.DASHBOARD_PASSWORD || 'changeme';
    console.log('Utilisation de l\'authentification simple avec un seul utilisateur');
}

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

// Middleware pour définir les en-têtes de sécurité
app.use((req, res, next) => {
    // Content Security Policy pour permettre les scripts et les connexions WebSocket
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline' 'unsafe-eval'; style-src 'self' https://cdn.jsdelivr.net https://fonts.googleapis.com 'unsafe-inline'; font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com data:; connect-src 'self' ws: wss: https://hashscan.io; img-src 'self' data:; frame-src https://hashscan.io;"
    );
    next();
});

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

// Chemin vers le fichier topicId.txt
const topicIdPath = path.join(__dirname, '../topicId.txt');

// Fonction pour lire le topicId
async function getTopicId() {
    try {
        const topicId = await fs.readFile(topicIdPath, 'utf8');
        return topicId.trim();
    } catch (error) {
        console.error('Erreur lors de la lecture du topicId:', error);
        return 'Non disponible';
    }
}

// Fonction pour récupérer les statistiques
async function getStats() {
    try {
        const now = Date.now();
        
        // Si les dernières statistiques sont récentes, les renvoyer directement
        if (lastStats && (now - lastUpdate < UPDATE_INTERVAL)) {
            return lastStats;
        }
        
        console.log('Récupération des statistiques...');
        
        // Vérifier la connexion à MongoDB
        if (!mongoClient || !mongoClient.topology || !mongoClient.topology.isConnected()) {
            console.error('Erreur: MongoDB n\'est pas connecté');
            return null;
        }
        
        const db = mongoClient.db(process.env.MONGODB_DB_NAME);
        
        // Récupérer le topicId
        const topicId = await getTopicId();
        
        // Récupérer les statistiques système
        let systemStats = null;
        let cpuUsage = 0;
        let memoryUsage = 0;
        let diskUsage = 0;
        let sftpStatus = { running: false };
        let blockchainStatus = { running: false, status: 'unknown' };
        let serverStatus = { running: true };
        
        try {
            systemStats = await systemMonitor.getSystemStats();
            cpuUsage = systemStats.cpuUsage || (systemStats.cpu && systemStats.cpu.loadAverage ? systemStats.cpu.loadAverage[0] * 10 : 0);
            memoryUsage = systemStats.memoryUsage || (systemStats.memory && systemStats.memory.usedPercentage ? parseFloat(systemStats.memory.usedPercentage) : 0);
            diskUsage = systemStats.diskUsage || (systemStats.disk && systemStats.disk.usedPercentage ? parseFloat(systemStats.disk.usedPercentage) : 0);
            
            // Extraire les informations sur les services
            sftpStatus = systemStats.sftp && typeof systemStats.sftp === 'object' ? systemStats.sftp : { running: false };
            blockchainStatus = systemStats.blockchain && typeof systemStats.blockchain === 'object' ? systemStats.blockchain : { running: false };
            serverStatus = systemStats.server && typeof systemStats.server === 'object' ? systemStats.server : {
                running: true, // Par défaut, si on peut exécuter ce code, le serveur est en marche
                uptime: os.uptime(),
                hostname: os.hostname(),
                platform: os.platform(),
                lastChecked: new Date().toISOString()
            };
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques système:', error);
        }
        
        // Obtenir les compteurs actuels
        const currentCounts = {
            hash: await db.collection('hash').countDocuments(),
            encrypted: await db.collection('encrypted').countDocuments(),
            messages: await db.collection('messages').countDocuments()
        };

        // Récupérer le nombre total d'alertes
        const totalAlertsCount = await db.collection('alerts').countDocuments();

        // Récupérer les alertes
        const alerts = await db.collection('alerts')
            .find({})
            .sort({ timestamp: -1 })
            .limit(5)
            .toArray();

        // Calculer les taux de traitement (par minute)
        const timeDiffMinutes = (now - previousCounts.timestamp) / (1000 * 60);
        const hashesPerMinute = timeDiffMinutes > 0 ? Math.round((currentCounts.hash - previousCounts.hash) / timeDiffMinutes) : 0;
        const encryptedPerMinute = timeDiffMinutes > 0 ? Math.round((currentCounts.encrypted - previousCounts.encrypted) / timeDiffMinutes) : 0;
        const messagesPerMinute = timeDiffMinutes > 0 ? Math.round((currentCounts.messages - previousCounts.messages) / timeDiffMinutes) : 0;

        // Mettre à jour les compteurs précédents
        previousCounts = {
            ...currentCounts,
            timestamp: now
        };

        // Obtenir les 5 derniers messages de chaque collection
        // Récupérer les 5 derniers hash
        const recentHashList = await db.collection('hash')
            .find({})
            .sort({ timestamp: -1 })
            .limit(20)
            .toArray();
            
        // Récupérer les 5 derniers encrypted
        const recentEncryptedList = await db.collection('encrypted')
            .find({})
            .sort({ timestamp: -1 })
            .limit(20)
            .toArray();
            
        // Récupérer les 5 derniers messages
        const recentMessages = await db.collection('messages')
            .find({})
            .sort({ timestamp: -1 })
            .limit(20)
            .toArray();

        // Logs détaillés pour comprendre la structure des données
        console.log('Structure des données récupérées:');
        console.log('recentHashList (premier élément):', recentHashList.length > 0 ? JSON.stringify(recentHashList[0]) : 'aucun élément');
        console.log('recentEncryptedList (premier élément):', recentEncryptedList.length > 0 ? JSON.stringify(recentEncryptedList[0]) : 'aucun élément');
        console.log('recentMessages (premier élément):', recentMessages.length > 0 ? JSON.stringify(recentMessages[0]) : 'aucun élément');

        // Créer l'objet stats dans le format attendu par le client
        const stats = {
            totalHashes: currentCounts.hash,
            totalEncrypted: currentCounts.encrypted,
            totalMessages: currentCounts.messages,
            hashesPerMinute: hashesPerMinute,
            encryptedPerMinute: encryptedPerMinute,
            messagesPerMinute: messagesPerMinute,
            cpuUsage: cpuUsage,
            memoryUsage: memoryUsage,
            diskUsage: diskUsage,
            recentHashList: recentHashList,
            recentEncryptedList: recentEncryptedList,
            recentMessages: recentMessages,
            alerts: alerts,
            totalAlerts: totalAlertsCount,
            sftpStatus: sftpStatus || { running: false },
            blockchainStatus: blockchainStatus || { running: false, status: 'unknown' },
            serverStatus: serverStatus || { running: true },
            topicId: topicId
        };

        console.log('Statistiques récupérées:', {
            totalHashes: stats.totalHashes,
            totalEncrypted: stats.totalEncrypted,
            totalMessages: stats.totalMessages,
            recentHashCount: recentHashList.length,
            recentEncryptedCount: recentEncryptedList.length,
            recentMessagesCount: recentMessages.length,
            alertsCount: alerts.length,
            totalAlertsCount: totalAlertsCount,
            systemStatus: systemStats ? 'OK' : 'Error',
            cpuUsage,
            memoryUsage,
            diskUsage,
            hashesPerMinute,
            encryptedPerMinute,
            messagesPerMinute
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
        // Récupérer les données directement ici plutôt que de s'appuyer sur getStats
        const db = mongoClient.db(process.env.MONGODB_DB_NAME);
        
        // Récupérer le nombre total d'alertes
        const totalAlerts = await db.collection('alerts').countDocuments();
        
        // Récupérer les 5 dernières alertes
        const alerts = await db.collection('alerts')
            .find({})
            .sort({ timestamp: -1 })
            .limit(5)
            .toArray();
            
        // Récupérer les 5 derniers hash
        const recentHashList = await db.collection('hash')
            .find({})
            .sort({ timestamp: -1 })
            .limit(20)
            .toArray();
            
        // Récupérer les 5 derniers encrypted
        const recentEncryptedList = await db.collection('encrypted')
            .find({})
            .sort({ timestamp: -1 })
            .limit(20)
            .toArray();
            
        // Récupérer les 5 derniers messages
        const recentMessages = await db.collection('messages')
            .find({})
            .sort({ timestamp: -1 })
            .limit(20)
            .toArray();
        
        console.log('Données récupérées pour la page d\'accueil:');
        console.log('- Alertes:', alerts.length);
        console.log('- Total Alertes:', totalAlerts);
        console.log('- Hash:', recentHashList.length);
        console.log('- Encrypted:', recentEncryptedList.length);
        console.log('- Messages:', recentMessages.length);
        
        // Passer les données directement au template
        res.render('index', {
            title: 'Dashboard',
            active: 'home',
            user: { username: req.auth.user },
            alerts: alerts,
            totalAlerts: totalAlerts,
            recentHashList: recentHashList,
            recentEncryptedList: recentEncryptedList,
            recentMessages: recentMessages
        });
    } catch (error) {
        console.error('Erreur lors du rendu de la page d\'accueil:', error);
        res.status(500).send('Erreur lors du chargement du dashboard');
    }
});

// Route des alertes
app.get('/alerts', async (req, res) => {
    try {
        console.log('Accès à la page des alertes');
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
            alerts: alerts,
            totalAlerts: alerts.length,
            error: null // Définir error comme null par défaut
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des alertes:', error);
        res.render('alerts', {
            title: 'Alertes',
            user: { username: req.auth.user },
            active: 'alerts',
            alerts: [],
            totalAlerts: 0,
            error: 'Erreur lors de la récupération des alertes: ' + error.message
        });
    }
});

// Configuration de Socket.IO
io.on('connection', async (socket) => {
    console.log('Nouvelle connexion Socket.IO établie - ID:', socket.id);
    
    try {
        console.log('Tentative de récupération des stats initiales...');
        const initialStats = await getStats();
        if (initialStats) {
            console.log('Stats initiales récupérées avec succès, envoi au client');
            socket.emit('stats', initialStats);
        } else {
            console.log('Aucune stat initiale récupérée');
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
        console.log('Diffusion des stats à tous les clients...');
        const stats = await getStats();
        if (stats) {
            console.log('Stats récupérées avec succès, diffusion à', io.engine.clientsCount, 'clients');
            io.emit('stats', stats);
        } else {
            console.log('Aucune stat à diffuser');
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
        console.log('Tentative de connexion à MongoDB...', MONGODB_URI);
        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        console.log('Connecté à MongoDB avec succès');

        // Vérifier si les collections sont vides et ajouter des données de test si nécessaire
        const db = mongoClient.db(process.env.MONGODB_DB_NAME);
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        console.log('Collections disponibles:', collectionNames);

        // Examiner le contenu de chaque collection pertinente
        for (const collName of collectionNames) {
            if (['hash', 'encrypted', 'blockchain', 'encryption', 'messages'].includes(collName)) {
                try {
                    const count = await db.collection(collName).countDocuments();
                    console.log(`Collection ${collName} contient ${count} documents`);
                    
                    if (count > 0) {
                        const sample = await db.collection(collName).find().limit(1).toArray();
                        console.log(`Exemple de document dans ${collName}:`, JSON.stringify(sample[0], null, 2));
                    }
                } catch (err) {
                    console.error(`Erreur lors de l'examen de la collection ${collName}:`, err);
                }
            }
        }

        // Vérifier que les collections nécessaires existent
        const requiredCollections = ['hash', 'encrypted', 'messages', 'alerts'];
        const missingCollections = requiredCollections.filter(c => !collectionNames.includes(c));
        
        if (missingCollections.length > 0) {
            console.warn('ATTENTION: Collections manquantes:', missingCollections);
            
            // Créer des collections manquantes avec des données de test
            for (const missingColl of missingCollections) {
                if (missingColl === 'hash') {
                    console.log('Création de la collection hash avec des données de test');
                    await db.createCollection('hash');
                    await db.collection('hash').insertMany([
                        { fileName: 'document1.pdf', hash: 'a1b2c3d4e5f6g7h8i9j0', timestamp: new Date() },
                        { fileName: 'image.jpg', hash: 'b2c3d4e5f6g7h8i9j0k1', timestamp: new Date(Date.now() - 60000) },
                        { fileName: 'rapport.docx', hash: 'c3d4e5f6g7h8i9j0k1l2', timestamp: new Date(Date.now() - 120000) }
                    ]);
                } else if (missingColl === 'encrypted') {
                    console.log('Création de la collection encrypted avec des données de test');
                    await db.createCollection('encrypted');
                    await db.collection('encrypted').insertMany([
                        { fileName: 'confidential.pdf', status: 'Encrypted', timestamp: new Date() },
                        { fileName: 'credentials.txt', status: 'Encrypted', timestamp: new Date(Date.now() - 60000) },
                        { fileName: 'private_key.pem', status: 'Failed', timestamp: new Date(Date.now() - 120000) }
                    ]);
                }
            }
        }

        // Initialiser les compteurs précédents
        previousCounts = {
            hash: await db.collection('hash').countDocuments(),
            encrypted: await db.collection('encrypted').countDocuments(),
            messages: await db.collection('messages').countDocuments(),
            timestamp: Date.now()
        };

        // Démarrer la diffusion des stats
        console.log('Démarrage de la diffusion des stats toutes les', UPDATE_INTERVAL, 'ms');
        statsInterval = setInterval(broadcastStats, UPDATE_INTERVAL);

        // Démarrer le serveur HTTP
        const PORT = process.env.DASHBOARD_PORT || 3000;
        const HOST = '0.0.0.0';
        http.listen(PORT, HOST, () => {
            console.log(`Dashboard disponible sur http://${HOST}:${PORT}`);
        });

    } catch (error) {
        console.error('Erreur lors du démarrage du serveur:', error);
        console.error('Détails de l\'erreur:', error.stack);
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