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

require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log('Variables d\'environnement MongoDB:');
console.log('- MONGODB_USER:', process.env.MONGODB_USER ? 'défini' : 'non défini');
console.log('- MONGODB_PASSWORD:', process.env.MONGODB_PASSWORD ? 'défini' : 'non défini');
console.log('- MONGODB_HOST:', process.env.MONGODB_HOST);
console.log('- MONGODB_PORT:', process.env.MONGODB_PORT);
console.log('- MONGODB_DB_NAME:', process.env.MONGODB_DB_NAME);
console.log('- MONGODB_AUTH_SOURCE:', process.env.MONGODB_AUTH_SOURCE);

let MONGODB_URI;
if (process.env.MONGODB_USER && process.env.MONGODB_PASSWORD) {
    MONGODB_URI = `mongodb://${process.env.MONGODB_USER}:${encodeURIComponent(process.env.MONGODB_PASSWORD)}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DB_NAME}?authSource=${process.env.MONGODB_AUTH_SOURCE}`;
} else {
    MONGODB_URI = `mongodb://${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DB_NAME}`;
    console.log('ATTENTION: Connexion MongoDB sans authentification');
}


let users = {};

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

if (Object.keys(users).length === 0) {
    users[process.env.DASHBOARD_USER || 'admin'] = process.env.DASHBOARD_PASSWORD || 'changeme';
    console.log('Utilisation de l\'authentification simple avec un seul utilisateur');
}

app.use(basicAuth({
    users: users,
    challenge: false,
    realm: 'Keralis Dashboard'
}));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline' 'unsafe-eval'; style-src 'self' https://cdn.jsdelivr.net https://fonts.googleapis.com 'unsafe-inline'; font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com data:; connect-src 'self' ws: wss: https://hashscan.io; img-src 'self' data:; frame-src https://hashscan.io;"
    );
    next();
});

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

app.use(session({
    secret: process.env.SESSION_SECRET || 'keralis_secret',
    resave: false,
    saveUninitialized: true
}));

let mongoClient;
let statsInterval;
let lastStats = null;
let lastUpdate = 0;
const UPDATE_INTERVAL = 5000; 

let previousCounts = {
    hash: 0,
    encrypted: 0,
    messages: 0,
    timestamp: Date.now()
};

const topicIdPath = path.join(__dirname, '../topicId.txt');

async function getTopicId() {
    try {
        const topicId = await fs.readFile(topicIdPath, 'utf8');
        return topicId.trim();
    } catch (error) {
        console.error('Erreur lors de la lecture du topicId:', error);
        return 'Non disponible';
    }
}

async function getStats() {
    try {
        const now = Date.now();
        
        if (lastStats && (now - lastUpdate < UPDATE_INTERVAL)) {
            return lastStats;
        }
        
        console.log('Récupération des statistiques...');
        
        if (!mongoClient || !mongoClient.topology || !mongoClient.topology.isConnected()) {
            console.error('Erreur: MongoDB n\'est pas connecté');
            return null;
        }
        
        const db = mongoClient.db(process.env.MONGODB_DB_NAME);
        
        const topicId = await getTopicId();
        
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
            
            sftpStatus = systemStats.sftp && typeof systemStats.sftp === 'object' ? systemStats.sftp : { running: false };
            blockchainStatus = systemStats.blockchain && typeof systemStats.blockchain === 'object' ? systemStats.blockchain : { running: false };
            serverStatus = systemStats.server && typeof systemStats.server === 'object' ? systemStats.server : {
                running: true,
                uptime: os.uptime(),
                hostname: os.hostname(),
                platform: os.platform(),
                lastChecked: new Date().toISOString()
            };
        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques système:', error);
        }
        
        const currentCounts = {
            hash: await db.collection('hash').countDocuments(),
            encrypted: await db.collection('encrypted').countDocuments(),
            messages: await db.collection('messages').countDocuments()
        };

        const totalAlertsCount = await db.collection('alerts').countDocuments();

        const alerts = await db.collection('alerts')
            .find({})
            .sort({ timestamp: -1 })
            .limit(5)
            .toArray();

        const timeDiffMinutes = (now - previousCounts.timestamp) / (1000 * 60);
        const hashesPerMinute = timeDiffMinutes > 0 ? Math.round((currentCounts.hash - previousCounts.hash) / timeDiffMinutes) : 0;
        const encryptedPerMinute = timeDiffMinutes > 0 ? Math.round((currentCounts.encrypted - previousCounts.encrypted) / timeDiffMinutes) : 0;
        const messagesPerMinute = timeDiffMinutes > 0 ? Math.round((currentCounts.messages - previousCounts.messages) / timeDiffMinutes) : 0;

        previousCounts = {
            ...currentCounts,
            timestamp: now
        };

        const recentHashList = await db.collection('hash')
            .find({})
            .sort({ timestamp: -1 })
            .limit(20)
            .toArray();
            
        const recentEncryptedList = await db.collection('encrypted')
            .find({})
            .sort({ timestamp: -1 })
            .limit(20)
            .toArray();
            
        const recentMessages = await db.collection('messages')
            .find({})
            .sort({ timestamp: -1 })
            .limit(20)
            .toArray();

        console.log('Structure des données récupérées:');
        console.log('recentHashList (premier élément):', recentHashList.length > 0 ? JSON.stringify(recentHashList[0]) : 'aucun élément');
        console.log('recentEncryptedList (premier élément):', recentEncryptedList.length > 0 ? JSON.stringify(recentEncryptedList[0]) : 'aucun élément');
        console.log('recentMessages (premier élément):', recentMessages.length > 0 ? JSON.stringify(recentMessages[0]) : 'aucun élément');

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

app.get('/', async (req, res) => {
    try {
        const db = mongoClient.db(process.env.MONGODB_DB_NAME);
        
        const totalAlerts = await db.collection('alerts').countDocuments();
        
        const alerts = await db.collection('alerts')
            .find({})
            .sort({ timestamp: -1 })
            .limit(5)
            .toArray();
            
        const recentHashList = await db.collection('hash')
            .find({})
            .sort({ timestamp: -1 })
            .limit(20)
            .toArray();
            
        const recentEncryptedList = await db.collection('encrypted')
            .find({})
            .sort({ timestamp: -1 })
            .limit(20)
            .toArray();
            
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
        
        res.render('index', {
            title: 'Dashboard',
            active: 'home',
            user: { username: Visiteur },
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
            error: null
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

    let lastRefresh = 0;
    socket.on('requestStats', async () => {
        const now = Date.now();
        if (now - lastRefresh < 2000) {
            return; 
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

app.use((err, req, res, next) => {
    console.error('Erreur:', err);
    res.status(500).send('Erreur interne du serveur');
});

async function startServer() {
    try {
        console.log('Tentative de connexion à MongoDB...', MONGODB_URI);
        mongoClient = new MongoClient(MONGODB_URI);
        await mongoClient.connect();
        console.log('Connecté à MongoDB avec succès');

        const db = mongoClient.db(process.env.MONGODB_DB_NAME);
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        console.log('Collections disponibles:', collectionNames);

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

        const requiredCollections = ['hash', 'encrypted', 'messages', 'alerts'];
        const missingCollections = requiredCollections.filter(c => !collectionNames.includes(c));
        
        if (missingCollections.length > 0) {
            console.warn('ATTENTION: Collections manquantes:', missingCollections);
            
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

        previousCounts = {
            hash: await db.collection('hash').countDocuments(),
            encrypted: await db.collection('encrypted').countDocuments(),
            messages: await db.collection('messages').countDocuments(),
            timestamp: Date.now()
        };

        console.log('Démarrage de la diffusion des stats toutes les', UPDATE_INTERVAL, 'ms');
        statsInterval = setInterval(broadcastStats, UPDATE_INTERVAL);

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

process.on('SIGINT', async () => {
    clearInterval(statsInterval);
    if (mongoClient) {
        await mongoClient.close();
    }
    process.exit(0);
});

startServer(); 