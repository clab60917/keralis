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
        console.log('Stats système récupérées:', JSON.stringify(systemStats, null, 2));
        
        // Extraire les valeurs CPU, mémoire et disque
        let cpuUsage = 0;
        let memoryUsage = 0;
        let diskUsage = 0;
        
        if (systemStats) {
            // Extraire la valeur CPU
            if (systemStats.cpu && typeof systemStats.cpu === 'object') {
                if (systemStats.cpu.loadAverage && Array.isArray(systemStats.cpu.loadAverage)) {
                    // Utiliser la moyenne de charge sur 1 minute
                    cpuUsage = systemStats.cpu.loadAverage[0] * 10; // Multiplier par 10 pour avoir un pourcentage approximatif
                } else if (typeof systemStats.cpu.usage === 'number') {
                    cpuUsage = systemStats.cpu.usage;
                }
            }
            
            // Extraire la valeur mémoire
            if (systemStats.memory && typeof systemStats.memory === 'object') {
                if (systemStats.memory.usedPercentage) {
                    memoryUsage = parseFloat(systemStats.memory.usedPercentage);
                } else if (systemStats.memory.used && systemStats.memory.total) {
                    memoryUsage = (systemStats.memory.used / systemStats.memory.total) * 100;
                }
            }
            
            // Extraire la valeur disque
            if (systemStats.disk && typeof systemStats.disk === 'object') {
                if (systemStats.disk.usedPercentage) {
                    diskUsage = parseFloat(systemStats.disk.usedPercentage);
                } else if (systemStats.disk.used && systemStats.disk.total) {
                    diskUsage = (systemStats.disk.used / systemStats.disk.total) * 100;
                }
            }
        }
        
        // Forcer des valeurs par défaut si les valeurs sont NaN ou undefined
        cpuUsage = isNaN(cpuUsage) ? 0 : cpuUsage;
        memoryUsage = isNaN(memoryUsage) ? 0 : memoryUsage;
        diskUsage = isNaN(diskUsage) ? 0 : diskUsage;
        
        console.log('Valeurs système extraites:', { cpuUsage, memoryUsage, diskUsage });
        
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
        const hashesPerMinute = timeDiffMinutes > 0 ? Math.round((currentCounts.hash - previousCounts.hash) / timeDiffMinutes) : 0;
        const encryptedPerMinute = timeDiffMinutes > 0 ? Math.round((currentCounts.encrypted - previousCounts.encrypted) / timeDiffMinutes) : 0;
        const messagesPerMinute = timeDiffMinutes > 0 ? Math.round((currentCounts.messages - previousCounts.messages) / timeDiffMinutes) : 0;

        // Mettre à jour les compteurs précédents
        previousCounts = {
            ...currentCounts,
            timestamp: now
        };

        // Obtenir les 5 derniers messages de chaque collection
        let recentHashList = [];
        let recentEncryptedList = [];
        let recentMessages = [];
        let recentAlerts = [];
        
        try {
            // Récupérer les hash récents avec une projection pour limiter les champs
            recentHashList = await db.collection('hash')
                .find({})
                .sort({ timestamp: -1 })
                .limit(5)
                .project({ fileName: 1, hash: 1, timestamp: 1, file: 1, name: 1, filename: 1, path: 1, _id: 0 })
                .toArray();
                
            console.log('Hash récents récupérés:', recentHashList);
        } catch (error) {
            console.error('Erreur lors de la récupération des hash récents:', error);
        }
        
        try {
            // Récupérer les encrypted récents avec une projection pour limiter les champs
            recentEncryptedList = await db.collection('encrypted')
                .find({})
                .sort({ timestamp: -1 })
                .limit(5)
                .project({ fileName: 1, status: 1, timestamp: 1, file: 1, name: 1, filename: 1, path: 1, _id: 0 })
                .toArray();
                
            console.log('Encrypted récents récupérés:', recentEncryptedList);
        } catch (error) {
            console.error('Erreur lors de la récupération des encrypted récents:', error);
        }
        
        try {
            // Récupérer les messages récents avec une projection pour limiter les champs
            recentMessages = await db.collection('messages')
                .find({})
                .sort({ timestamp: -1 })
                .limit(5)
                .project({ type: 1, message: 1, timestamp: 1, content: 1, text: 1, data: 1, _id: 0 })
                .toArray();
                
            console.log('Messages récents récupérés:', recentMessages);
        } catch (error) {
            console.error('Erreur lors de la récupération des messages récents:', error);
        }
        
        try {
            recentAlerts = await db.collection('alerts')
                .find({})
                .sort({ timestamp: -1 })
                .limit(5)
                .toArray();
        } catch (error) {
            console.error('Erreur lors de la récupération des alertes récentes:', error);
        }

        // Logs détaillés pour comprendre la structure des données
        console.log('Structure des données récupérées:');
        console.log('recentHashList (premier élément):', recentHashList.length > 0 ? JSON.stringify(recentHashList[0]) : 'aucun élément');
        console.log('recentEncryptedList (premier élément):', recentEncryptedList.length > 0 ? JSON.stringify(recentEncryptedList[0]) : 'aucun élément');
        console.log('recentMessages (premier élément):', recentMessages.length > 0 ? JSON.stringify(recentMessages[0]) : 'aucun élément');

        // Normaliser les données pour s'assurer qu'elles ont la bonne structure
        let normalizedHashList = Array.isArray(recentHashList) ? recentHashList.map(item => {
            // Analyser la structure de l'élément pour extraire les bonnes informations
            console.log('Normalisation d\'un élément hash:', JSON.stringify(item));
            
            // Rechercher les champs possibles pour le nom de fichier
            let fileName = 'N/A';
            if (item.fileName) fileName = item.fileName;
            else if (item.file) fileName = item.file;
            else if (item.name) fileName = item.name;
            else if (item.filename) fileName = item.filename;
            else if (item.path) {
                // Extraire le nom du fichier à partir du chemin
                const pathParts = item.path.split(/[\/\\]/);
                fileName = pathParts[pathParts.length - 1];
            }
            
            // S'assurer que le nom du fichier a l'extension .hash si ce n'est pas déjà le cas
            if (fileName !== 'N/A' && !fileName.toLowerCase().endsWith('.hash')) {
                fileName = fileName + '.hash';
            }
            
            // Rechercher les champs possibles pour le hash
            let hash = 'N/A';
            if (item.hash) hash = item.hash;
            else if (item.hashValue) hash = item.hashValue;
            else if (item.value) hash = item.value;
            else if (item.digest) hash = item.digest;
            
            // Rechercher les champs possibles pour l'horodatage
            let timestamp = Date.now();
            if (item.timestamp) timestamp = item.timestamp;
            else if (item.date) timestamp = item.date;
            else if (item.time) timestamp = item.time;
            else if (item.createdAt) timestamp = item.createdAt;
            
            return {
                fileName: fileName,
                hash: hash,
                timestamp: timestamp
            };
        }) : [];

        let normalizedEncryptedList = Array.isArray(recentEncryptedList) ? recentEncryptedList.map(item => {
            // Analyser la structure de l'élément pour extraire les bonnes informations
            console.log('Normalisation d\'un élément encrypted:', JSON.stringify(item));
            
            // Rechercher les champs possibles pour le nom de fichier
            let fileName = 'N/A';
            if (item.fileName) fileName = item.fileName;
            else if (item.file) fileName = item.file;
            else if (item.name) fileName = item.name;
            else if (item.filename) fileName = item.filename;
            else if (item.path) {
                // Extraire le nom du fichier à partir du chemin
                const pathParts = item.path.split(/[\/\\]/);
                fileName = pathParts[pathParts.length - 1];
            }
            
            // S'assurer que le nom du fichier a l'extension .enc si ce n'est pas déjà le cas
            if (fileName !== 'N/A' && !fileName.toLowerCase().endsWith('.enc')) {
                fileName = fileName + '.enc';
            }
            
            // Rechercher les champs possibles pour le statut
            let status = 'N/A';
            if (item.status) status = item.status;
            else if (item.state) status = item.state;
            else if (item.result) status = item.result;
            
            // Rechercher les champs possibles pour l'horodatage
            let timestamp = Date.now();
            if (item.timestamp) timestamp = item.timestamp;
            else if (item.date) timestamp = item.date;
            else if (item.time) timestamp = item.time;
            else if (item.createdAt) timestamp = item.createdAt;
            
            return {
                fileName: fileName,
                status: status,
                timestamp: timestamp
            };
        }) : [];

        // Pour les messages, vérifier si le message est un hash (chaîne longue sans espaces) et le remplacer par un message lisible
        let normalizedMessagesList = Array.isArray(recentMessages) ? recentMessages.map(item => {
            // Analyser la structure de l'élément pour extraire les bonnes informations
            console.log('Normalisation d\'un élément message:', JSON.stringify(item));
            
            // Rechercher les champs possibles pour le type
            let type = 'Info';
            if (item.type) type = item.type;
            else if (item.category) type = item.category;
            else if (item.level) type = item.level;
            
            // Rechercher les champs possibles pour le message
            let message = 'N/A';
            if (item.message) message = item.message;
            else if (item.content) message = item.content;
            else if (item.text) message = item.text;
            else if (item.data) {
                if (typeof item.data === 'string') message = item.data;
                else if (typeof item.data === 'object') message = JSON.stringify(item.data);
            }
            
            // Si le message ressemble à un hash (longue chaîne sans espaces), le remplacer par un message lisible
            if (typeof message === 'string' && message.length > 30 && !message.includes(' ')) {
                // Remplacer par un message plus descriptif basé sur le type
                if (type.toLowerCase() === 'error') {
                    message = 'Erreur détectée lors du traitement du fichier';
                } else if (type.toLowerCase() === 'warning') {
                    message = 'Avertissement: vérification de l\'intégrité recommandée';
                } else if (type.toLowerCase() === 'success') {
                    message = 'Opération terminée avec succès';
                } else {
                    message = 'Message système: traitement en cours';
                }
            }
            
            // Rechercher les champs possibles pour l'horodatage
            let timestamp = Date.now();
            if (item.timestamp) timestamp = item.timestamp;
            else if (item.date) timestamp = item.date;
            else if (item.time) timestamp = item.time;
            else if (item.createdAt) timestamp = item.createdAt;
            
            return {
                type: type,
                message: message,
                timestamp: timestamp
            };
        }) : [];

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
            recentHashList: normalizedHashList,
            recentEncryptedList: normalizedEncryptedList,
            recentMessages: normalizedMessagesList,
            alerts: recentAlerts
        };

        console.log('Statistiques récupérées:', {
            totalHashes: stats.totalHashes,
            totalEncrypted: stats.totalEncrypted,
            totalMessages: stats.totalMessages,
            recentHashCount: normalizedHashList.length,
            recentEncryptedCount: normalizedEncryptedList.length,
            recentMessagesCount: normalizedMessagesList.length,
            alertsCount: recentAlerts.length,
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
            error: null // Définir error comme null par défaut
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des alertes:', error);
        res.render('alerts', {
            title: 'Alertes',
            user: { username: req.auth.user },
            active: 'alerts',
            alerts: [],
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