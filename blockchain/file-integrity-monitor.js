const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const axios = require('axios');
const fs = require('fs').promises;
const nodemailer = require('nodemailer');
const { MongoClient } = require('mongodb');

const HASH_SERVER_URL = process.env.HASH_SERVER_URL || 'http://172.233.245.220:3001';
const HASH_SERVER_API_KEY = process.env.HASH_SERVER_API_KEY;
const CHECK_INTERVAL_MS = parseInt(process.env.CHECK_INTERVAL_MS || 15 * 60 * 1000); // 15 minutes par défaut

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

// Stockage des hash précédents des fichiers
const hashStore = {};
let monitoringTimer = null;

// Fonction pour se connecter à MongoDB
async function connectToMongoDB() {
    try {
        mongoClient = new MongoClient(MONGODB_URI);
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
            emailSent: true,
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
        console.log('Vérification de la configuration email...');
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

async function sendAlertEmail(fileName, oldHash, newHash) {
    // Vérifier la configuration avant d'envoyer
    if (!await verifyEmailConfig()) {
        console.log('⚠️ Envoi d\'email désactivé en raison d\'une configuration invalide');
        return;
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
        console.log('Tentative d\'envoi de l\'email d\'alerte...');
        await transporter.sendMail(mailOptions);
        console.log('✓ Email d\'alerte envoyé avec succès');
        return true;
    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi de l\'email:', error.message);
        if (error.code) {
            console.error('Code d\'erreur:', error.code);
        }
        console.log('⚠️ La surveillance continue malgré l\'échec de l\'envoi d\'email');
        return false;
    }
}

// Fonction pour afficher les informations de debug
function debugInfo() {
    console.log('Debug Info:');
    console.log('HASH_SERVER_URL:', HASH_SERVER_URL);
    console.log('HASH_SERVER_API_KEY présent:', !!HASH_SERVER_API_KEY);
    console.log('Intervalle de vérification:', `${CHECK_INTERVAL_MS/1000} secondes`);
}

// Initialiser les hash de tous les fichiers
async function initializeFileHashes() {
    console.log('\nInitialisation des hash de référence...');
    
    // Configuration Axios avec les headers par défaut
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
        
        console.log(`Initialisation des hash pour ${files.length} fichiers...`);
        
        // Pour chaque fichier, récupérer et stocker le hash
        for (const fileName of files) {
            try {
                const hashResponse = await axios.get(`${HASH_SERVER_URL}/api/hash/${fileName}`, axiosConfig);
                hashStore[fileName] = hashResponse.data.hash;
                console.log(`✓ Hash initial pour ${fileName}: ${hashResponse.data.hash}`);
            } catch (error) {
                console.error(`❌ Erreur lors de la récupération du hash pour ${fileName}:`, error.message);
            }
        }
        
        console.log('✓ Initialisation des hash terminée');
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation des hash:', error.message);
        throw error;
    }
}

// Vérifier l'intégrité de tous les fichiers
async function checkFilesIntegrity() {
    console.log(`\n[${new Date().toISOString()}] Vérification de l'intégrité des fichiers...`);
    
    // Configuration Axios avec les headers par défaut
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
        
        console.log(`Vérification de ${files.length} fichiers...`);
        
        // Vérifier chaque fichier
        for (const fileName of files) {
            try {
                // Récupérer le hash actuel
                const hashResponse = await axios.get(`${HASH_SERVER_URL}/api/hash/${fileName}`, axiosConfig);
                const currentHash = hashResponse.data.hash;
                
                // Si c'est la première vérification pour ce fichier, l'enregistrer simplement
                if (!hashStore[fileName]) {
                    hashStore[fileName] = currentHash;
                    console.log(`Premier hash enregistré pour ${fileName}: ${currentHash}`);
                    continue;
                }
                
                // Comparer avec le hash précédent
                if (currentHash !== hashStore[fileName]) {
                    console.log(`⚠️ MODIFICATION DÉTECTÉE dans ${fileName}`);
                    console.log(`  - Hash d'origine: ${hashStore[fileName]}`);
                    console.log(`  - Nouveau hash: ${currentHash}`);
                    
                    // Sauvegarder l'alerte
                    const alertId = await saveAlert(fileName, hashStore[fileName], currentHash);
                    
                    // Envoyer l'email d'alerte
                    await sendAlertEmail(fileName, hashStore[fileName], currentHash);
                    
                    // Mettre à jour le hash stocké
                    hashStore[fileName] = currentHash;
                } else {
                    console.log(`✓ Intégrité vérifiée pour ${fileName}`);
                }
            } catch (error) {
                console.error(`❌ Erreur lors de la vérification de l'intégrité de ${fileName}:`, error.message);
            }
        }
        
        console.log('✓ Vérification terminée');
        
    } catch (error) {
        console.error('❌ Erreur lors de la vérification des fichiers:', error.message);
    }
    
    // Planifier la prochaine vérification
    console.log(`Prochaine vérification prévue dans ${CHECK_INTERVAL_MS/1000} secondes`);
    monitoringTimer = setTimeout(checkFilesIntegrity, CHECK_INTERVAL_MS);
}

async function startMonitoring() {
    console.log('Démarrage du système de surveillance d\'intégrité...');
    debugInfo();

    try {
        // Initialiser les hash de référence
        await initializeFileHashes();
        
        // Commencer la surveillance périodique
        await checkFilesIntegrity();
        
        console.log(`✓ Système de surveillance démarré avec un intervalle de ${CHECK_INTERVAL_MS/1000} secondes`);
    } catch (error) {
        console.error('❌ Erreur lors du démarrage du système de surveillance:', error.message);
        
        // En cas d'erreur, réessayer après un délai
        console.log('Tentative de redémarrage dans 60 secondes...');
        setTimeout(startMonitoring, 60000);
    }
}

// Gérer la fermeture propre
process.on('SIGINT', async () => {
    console.log('Arrêt du système de surveillance...');
    
    // Annuler le timer en cours
    if (monitoringTimer) {
        clearTimeout(monitoringTimer);
    }
    
    // Fermer la connexion MongoDB
    if (mongoClient) {
        await mongoClient.close();
        console.log('Connexion MongoDB fermée');
    }
    
    console.log('Système arrêté.');
    process.exit(0);
});

// Démarrer le système
startMonitoring();
