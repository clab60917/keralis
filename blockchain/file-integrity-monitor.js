const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const axios = require('axios');
const nodemailer = require('nodemailer');
const { MongoClient } = require('mongodb');
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL_MS || 4 * 60 * 1000);  //check toutes les 4 minutes par défaut 

const HASH_SERVER_URL = process.env.HASH_SERVER_URL || 'http://172.233.245.220:3001';
const HASH_SERVER_API_KEY = process.env.HASH_SERVER_API_KEY;

const MONGODB_URI = `mongodb://${process.env.MONGODB_USER}:${encodeURIComponent(process.env.MONGODB_PASSWORD)}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DB_NAME}?authSource=${process.env.MONGODB_AUTH_SOURCE}`;
let mongoClient;

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
        user: process.env.ELASTIC_EMAIL_USER,
        pass: process.env.ELASTIC_EMAIL_API_KEY
    }
});

const hashCache = new Map();

const knownFiles = new Set();

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

async function saveAlert(fileName, oldHash, newHash, type = 'modification') {
    try {
        const db = await connectToMongoDB();
        const alertsCollection = db.collection('alerts');
        
        const alert = {
            timestamp: new Date(),
            fileName,
            oldHash,
            newHash,
            status: 'unrestored',
            emailSent: false,
            type, // 'modification' ou 'deletion'
            details: {
                detectionTime: new Date(),
                serverUrl: HASH_SERVER_URL,
                restored: false
            }
        };

        const result = await alertsCollection.insertOne(alert);
        console.log(`✓ Alerte de ${type} sauvegardée dans MongoDB:`, result.insertedId);
        return result.insertedId;
    } catch (error) {
        console.error('❌ Erreur lors de la sauvegarde de l\'alerte:', error.message);
        throw error;
    }
}

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

async function sendAlertEmail(fileName, oldHash, newHash, alertId, type = 'modification') {
    if (!await verifyEmailConfig()) {
        console.log('⚠️ Envoi d\'email désactivé en raison d\'une configuration invalide');
        return false;
    }

    let subject, htmlContent, textContent;
    
    if (type === 'modification') {
        subject = `🚨 Alerte : Modification détectée dans ${fileName}`;
        htmlContent = `
            <h2>Une modification a été détectée dans un fichier de log</h2>
            <p><strong>Fichier :</strong> ${fileName}</p>
            <p><strong>Hash original :</strong> ${oldHash}</p>
            <p><strong>Nouveau hash :</strong> ${newHash}</p>
            <p><strong>Date de détection :</strong> ${new Date().toISOString()}</p>
            <p>Cette alerte a été générée automatiquement par le système de surveillance d'intégrité.</p>
        `;
        textContent = `
            ALERTE : Modification détectée dans ${fileName}
            
            Fichier : ${fileName}
            Hash original : ${oldHash}
            Nouveau hash : ${newHash}
            Date de détection : ${new Date().toISOString()}
            
            Cette alerte a été générée automatiquement par le système de surveillance d'intégrité.
        `;
    } else if (type === 'deletion') {
        subject = `⚠️ Alerte : Fichier supprimé ${fileName}`;
        htmlContent = `
            <h2>Un fichier a été supprimé</h2>
            <p><strong>Fichier :</strong> ${fileName}</p>
            <p><strong>Dernier hash connu :</strong> ${oldHash}</p>
            <p><strong>Date de détection :</strong> ${new Date().toISOString()}</p>
            <p>Cette alerte a été générée automatiquement par le système de surveillance d'intégrité.</p>
        `;
        textContent = `
            ALERTE : Fichier supprimé ${fileName}
            
            Fichier : ${fileName}
            Dernier hash connu : ${oldHash}
            Date de détection : ${new Date().toISOString()}
            
            Cette alerte a été générée automatiquement par le système de surveillance d'intégrité.
        `;
    }

    const mailOptions = {
        from: {
            name: 'Système Keralis',
            address: 'alert@keralis.org'
        },
        to: process.env.ALERT_EMAIL_TO,
        subject,
        html: htmlContent,
        text: textContent
    };

    try {
        console.log(`Envoi d'email d'alerte pour le fichier ${fileName}...`);
        await transporter.sendMail(mailOptions);
        console.log('✓ Email d\'alerte envoyé avec succès');
        
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
        
        for (const fileName of files) {
            try {
                const hashResponse = await axios.get(`${HASH_SERVER_URL}/api/hash/${fileName}`, axiosConfig);
                hashCache.set(fileName, hashResponse.data.hash);
                // Ajouter le fichier à la liste des fichiers connus
                knownFiles.add(fileName);
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

async function checkFileIntegrity(fileName) {
    const axiosConfig = {
        headers: {
            'x-api-key': HASH_SERVER_API_KEY,
            'Content-Type': 'application/json'
        }
    };

    try {
        const hashResponse = await axios.get(`${HASH_SERVER_URL}/api/hash/${fileName}`, axiosConfig);
        const currentHash = hashResponse.data.hash;
        
        const previousHash = hashCache.get(fileName);
        
        if (!previousHash) {
            hashCache.set(fileName, currentHash);
            console.log(`Premier hash enregistré pour ${fileName}: ${currentHash}`);
            return;
        }
        
        if (currentHash !== previousHash) {
            console.log(`⚠️ Modification détectée dans ${fileName}`);
            console.log(`  - Ancien hash: ${previousHash}`);
            console.log(`  - Nouveau hash: ${currentHash}`);
            
            const alertId = await saveAlert(fileName, previousHash, currentHash, 'modification');
            
            await sendAlertEmail(fileName, previousHash, currentHash, alertId, 'modification');
            
            hashCache.set(fileName, currentHash);
        } else {
            console.log(`✓ Intégrité vérifiée pour ${fileName}`);
        }
    } catch (error) {
        console.error(`❌ Erreur lors de la vérification de l'intégrité de ${fileName}:`, error.message);
    }
}

async function handleDeletedFiles(currentFiles) {
    const currentFilesSet = new Set(currentFiles);
    
    for (const fileName of knownFiles) {
        if (!currentFilesSet.has(fileName)) {
            console.log(`🗑️ Fichier supprimé détecté: ${fileName}`);
            
            const lastHash = hashCache.get(fileName);
            
            const alertId = await saveAlert(fileName, lastHash, null, 'deletion');
            
            await sendAlertEmail(fileName, lastHash, null, alertId, 'deletion');
            
            hashCache.delete(fileName);
            knownFiles.delete(fileName);
            
            console.log(`✓ Suppression du fichier ${fileName} traitée`);
        }
    }
}

async function checkAllFilesIntegrity() {
    console.log(`\n[${new Date().toISOString()}] Vérification de l'intégrité des fichiers...`);
    
    const axiosConfig = {
        headers: {
            'x-api-key': HASH_SERVER_API_KEY,
            'Content-Type': 'application/json'
        }
    };

    try {
        const filesResponse = await axios.get(`${HASH_SERVER_URL}/api/logs`, axiosConfig);
        const files = filesResponse.data.files || [];
        
        console.log(`Vérification de ${files.length} fichiers...`);
        
        await handleDeletedFiles(files);
        
        for (const fileName of files) {
            if (!knownFiles.has(fileName)) {
                knownFiles.add(fileName);
            }
        }
        
        for (const fileName of files) {
            await checkFileIntegrity(fileName);
        }
        
        console.log('✓ Vérification terminée');
    } catch (error) {
        console.error('❌ Erreur lors de la vérification des fichiers:', error.message);
    }
}

async function startMonitoring() {
    console.log('Démarrage du système de surveillance d\'intégrité...');
    
    try {
        await initializeHashCache();
        
        const monitoringTimer = setTimeout(() => {
            checkAllFilesIntegrity().then(() => {
                startMonitoring();
            });
        }, CHECK_INTERVAL);
        
        console.log(`✓ Système de surveillance démarré. Intervalle de vérification: ${CHECK_INTERVAL}`);
        
        await checkAllFilesIntegrity();
    } catch (error) {
        console.error('❌ Erreur lors du démarrage du système de surveillance:', error.message);
    }
}

process.on('SIGINT', async () => {
    console.log('Fermeture du système de surveillance...');
    if (monitoringTimer) {
        clearTimeout(monitoringTimer);
    }
    if (mongoClient) {
        await mongoClient.close();
        console.log('Connexion MongoDB fermée');
    }
    process.exit(0);
});

startMonitoring();