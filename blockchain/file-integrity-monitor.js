const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const axios = require('axios');
const nodemailer = require('nodemailer');
const { MongoClient } = require('mongodb');
const cron = require('node-cron');

const HASH_SERVER_URL = process.env.HASH_SERVER_URL || 'http://172.233.245.220:3001';
const HASH_SERVER_API_KEY = process.env.HASH_SERVER_API_KEY;
const CHECK_INTERVAL = process.env.CHECK_INTERVAL || '*/15 * * * *'; // Toutes les 15 minutes par défaut

// Configuration MongoDB
const MONGODB_URI = `mongodb://${process.env.MONGODB_USER}:${encodeURIComponent(process.env.MONGODB_PASSWORD)}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DB_NAME}?authSource=${process.env.MONGODB_AUTH_SOURCE}`;
let mongoClient;

// Configuration email avec Elastic Email
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.ELASTIC_EMAIL_USER,
        pass: process.env.ELASTIC_EMAIL_API_KEY
    }
});

// Cache des hash pour comparer avec les valeurs précédentes
const hashCache = new Map();

// Fonction pour se connecter à MongoDB
async function connectToMongoDB() {
    try {
        if (mongoClient && mongoClient.isConnected()) {
            return mongoClient.db(process.env.MONGODB_DB_NAME);
        }
        
        mongoClient = new MongoClient(MONGODB_URI, { useUnifiedTopology: true });
        await mongoClient.connect();
        console.log('✓ Connexion à MongoDB établie');
        return mongoClient.db(process.env.MONGODB_DB_NAME);
    } catch (error) {
        console.error('❌ Erreur de connexion à MongoDB:', error.message);
        throw error;
    }
}

// Fonction pour sauvegarder une alerte dans MongoDB
async function saveAlert(fileName, oldHash, newHash) {
    try {
        const db = await connectToMongoDB();
        const alertsCollection = db.collection('alerts');
        
        const alert = {
            timestamp: new Date(),
            fileName,
            oldHash,
            newHash,
            status: 'new',
            emailSent: false,
            type: 'modification',
            details: {
                detectionTime: new Date(),
                serverUrl: HASH_SERVER_URL,
                restored: false
            }
        };

        const result = await alertsCollection.insertOne(alert);
        console.log('✓ Alerte sauvegardée dans MongoDB:', result.insertedId);
        return result.insertedId;
    } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde de l\'alerte:', error.message);
        throw error;
    }
}

// Vérification de la configuration avant utilisation
async function verifyEmailConfig() {
    try {
        await transporter.verify();
        console.log('✓ Configuration email valide');
        return true;
    } catch (error) {
        console.error('❌ Configuration email invalide:', error.message);
        if (error.code) {
            console.error('Code d\'erreur:', error.code);
        }
        return false;
    }
}

async function sendAlertEmail(fileName, oldHash, newHash, alertId) {
    // Vérifier la configuration avant d'envoyer
    if (!await verifyEmailConfig()) {
        console.log('⚠️ Envoi d\'email désactivé en raison d\'une configuration invalide');
        return false;
    }

    const mailOptions = {
        from: {
            name: 'Système Keralis',
            address: 'alert@keralis.org'
        },
        to: process.env.ALERT_EMAIL_TO,
        subject: `🚨 Alerte : Modification détectée dans ${fileName}`,
        html: `
            <h2>Une modification a été détectée dans un fichier de log</h2>
            <p><strong>Fichier :</strong> ${fileName}</p>
            <p><strong>Hash original :</strong> ${oldHash}</p>
            <p><strong>Nouveau hash :</strong> ${newHash}</p>
            <p><strong>Date de détection :</strong> ${new Date().toISOString()}</p>
            <p>Cette alerte a été générée automatiquement par le système de surveillance d'intégrité.</p>
        `,
        text: `
            ALERTE : Modification détectée dans ${fileName}
            
            Fichier : ${fileName}
            Hash original : ${oldHash}
            Nouveau hash : ${newHash}
            Date de détection : ${new Date().toISOString()}
            
            Cette alerte a été générée automatiquement par le système de surveillance d'intégrité.
        `
    };

    try {
        console.log(`Envoi d'email d'alerte pour le fichier ${fileName}...`);
        await transporter.sendMail(mailOptions);
        console.log('✓ Email d\'alerte envoyé avec succès');
        
        // Mettre à jour le statut de l'email dans MongoDB
        try {
            const db = await connectToMongoDB();
            await db.collection('alerts').updateOne(
                { _id: alertId },
                { $set: { emailSent: true } }
            );
        } catch (dbError) {
            console.error('❌ Erreur lors de la mise à jour du statut d\'email:', dbError.message);
        }
        
        return true;
    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi de l\'email:', error.message);
        if (error.code) {
            console.error('Code d\'erreur:', error.code);
        }
        return false;
    }
}

// Initialiser le cache avec les valeurs actuelles
async function initializeHashCache() {
    console.log('Initialisation du cache des hash...');
    const axiosConfig = {
        headers: {
            'x-api-key': HASH_SERVER_API_KEY,
            'Content-Type': 'application/json'
        }
    };

    try {
        // Récupérer la liste des fichiers
        const filesResponse = await axios.get(`${HASH_SERVER_URL}/api/logs`, axiosConfig);
        const files = filesResponse.data.files || [];
        
        console.log(`Récupération des hash initiaux pour ${files.length} fichiers...`);
        
        // Pour chaque fichier, récupérer et stocker le hash
        for (const fileName of files) {
            try {
                const hashResponse = await axios.get(`${HASH_SERVER_URL}/api/hash/${fileName}`, axiosConfig);
                hashCache.set(fileName, hashResponse.data.hash);
                console.log(`✓ Hash initial pour ${fileName}: ${hashResponse.data.hash}`);
            } catch (error) {
                console.error(`❌ Erreur lors de la récupération du hash pour ${fileName}:`, error.message);
            }
        }
        
        console.log('✓ Initialisation du cache terminée');
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation du cache:', error.message);
        throw error;
    }
}

// Vérifier l'intégrité d'un fichier spécifique
async function checkFileIntegrity(fileName) {
    const axiosConfig = {
        headers: {
            'x-api-key': HASH_SERVER_API_KEY,
            'Content-Type': 'application/json'
        }
    };

    try {
        // Récupérer le hash actuel
        const hashResponse = await axios.get(`${HASH_SERVER_URL}/api/hash/${fileName}`, axiosConfig);
        const currentHash = hashResponse.data.hash;
        
        // Récupérer le hash précédent du cache
        const previousHash = hashCache.get(fileName);
        
        // Si c'est la première vérification, simplement stocker le hash
        if (!previousHash) {
            hashCache.set(fileName, currentHash);
            console.log(`Premier hash enregistré pour ${fileName}: ${currentHash}`);
            return;
        }
        
        // Comparer les hash
        if (currentHash !== previousHash) {
            console.log(`⚠️ Modification détectée dans ${fileName}`);
            console.log(`  - Ancien hash: ${previousHash}`);
            console.log(`  - Nouveau hash: ${currentHash}`);
            
            // Sauvegarder l'alerte
            const alertId = await saveAlert(fileName, previousHash, currentHash);
            
            // Envoyer un email d'alerte
            await sendAlertEmail(fileName, previousHash, currentHash, alertId);
            
            // Mettre à jour le cache avec la nouvelle valeur
            hashCache.set(fileName, currentHash);
        } else {
            console.log(`✓ Intégrité vérifiée pour ${fileName}`);
        }
    } catch (error) {
        console.error(`❌ Erreur lors de la vérification de l'intégrité de ${fileName}:`, error.message);
    }
}

// Vérifier l'intégrité de tous les fichiers
async function checkAllFilesIntegrity() {
    console.log(`\n[${new Date().toISOString()}] Vérification de l'intégrité des fichiers...`);
    
    const axiosConfig = {
        headers: {
            'x-api-key': HASH_SERVER_API_KEY,
            'Content-Type': 'application/json'
        }
    };

    try {
        // Récupérer la liste actuelle des fichiers
        const filesResponse = await axios.get(`${HASH_SERVER_URL}/api/logs`, axiosConfig);
        const files = filesResponse.data.files || [];
        
        console.log(`Vérification de ${files.length} fichiers...`);
        
        // Vérifier chaque fichier
        for (const fileName of files) {
            await checkFileIntegrity(fileName);
        }
        
        console.log('✓ Vérification terminée');
    } catch (error) {
        console.error('❌ Erreur lors de la vérification des fichiers:', error.message);
    }
}

// Démarrer le système de surveillance
async function startMonitoring() {
    console.log('Démarrage du système de surveillance d\'intégrité...');
    
    try {
        // Initialiser le cache des hash
        await initializeHashCache();
        
        // Configurer la tâche cron pour vérifier régulièrement les fichiers
        cron.schedule(CHECK_INTERVAL, async () => {
            await checkAllFilesIntegrity();
        });
        
        console.log(`✓ Système de surveillance démarré. Intervalle de vérification: ${CHECK_INTERVAL}`);
        
        // Exécuter une première vérification immédiatement
        await checkAllFilesIntegrity();
    } catch (error) {
        console.error('❌ Erreur lors du démarrage du système de surveillance:', error.message);
    }
}

// Gérer la fermeture propre
process.on('SIGINT', async () => {
    console.log('Fermeture du système de surveillance...');
    if (mongoClient) {
        await mongoClient.close();
        console.log('Connexion MongoDB fermée');
    }
    process.exit(0);
});

// Démarrer le système
startMonitoring();
