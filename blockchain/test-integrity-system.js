// const path = require('path');
// require('dotenv').config({ path: path.join(__dirname, '.env') });
// const axios = require('axios');
// const fs = require('fs').promises;
// const nodemailer = require('nodemailer');
// const { MongoClient } = require('mongodb');

// const HASH_SERVER_URL = process.env.HASH_SERVER_URL || 'http://172.233.245.220:3001';
// const HASH_SERVER_API_KEY = process.env.HASH_SERVER_API_KEY;
// const TEST_FILE_NAME = '20250305012039.log';  // Un des fichiers existants

// // Configuration MongoDB
// const MONGODB_URI = `mongodb://${process.env.MONGODB_USER}:${encodeURIComponent(process.env.MONGODB_PASSWORD)}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DB_NAME}?authSource=${process.env.MONGODB_AUTH_SOURCE}`;
// let mongoClient;

// // Configuration email avec Elastic Email
// const transporter = nodemailer.createTransport({
//     host: process.env.SMTP_HOST,
//     port: process.env.SMTP_PORT,
//     secure: false,
//     auth: {
//         user: process.env.ELASTIC_EMAIL_USER,
//         pass: process.env.ELASTIC_EMAIL_API_KEY
//     }
// });

// // Fonction pour se connecter à MongoDB
// async function connectToMongoDB() {
//     try {
//         mongoClient = new MongoClient(MONGODB_URI);
//         await mongoClient.connect();
//         console.log('✓ Connexion à MongoDB établie');
//         return mongoClient.db(process.env.MONGODB_DB_NAME);
//     } catch (error) {
//         console.error('❌ Erreur de connexion à MongoDB:', error.message);
//         throw error;
//     }
// }

// // Fonction pour sauvegarder une alerte dans MongoDB
// async function saveAlert(fileName, oldHash, newHash) {
//     try {
//         const db = await connectToMongoDB();
//         const alertsCollection = db.collection('alerts');
        
//         const alert = {
//             timestamp: new Date(),
//             fileName,
//             oldHash,
//             newHash,
//             status: 'new',
//             emailSent: true,
//             type: 'modification',
//             details: {
//                 detectionTime: new Date(),
//                 serverUrl: HASH_SERVER_URL,
//                 restored: false
//             }
//         };

//         const result = await alertsCollection.insertOne(alert);
//         console.log('✓ Alerte sauvegardée dans MongoDB:', result.insertedId);
//         return result.insertedId;
//     } catch (error) {
//         console.error('❌ Erreur lors de la sauvegarde de l\'alerte:', error.message);
//         throw error;
//     }
// }

// // Fonction pour mettre à jour le statut d'une alerte
// async function updateAlertStatus(alertId, status) {
//     try {
//         const db = await connectToMongoDB();
//         const alertsCollection = db.collection('alerts');
        
//         await alertsCollection.updateOne(
//             { _id: alertId },
//             { $set: { status, restored: status === 'restored' } }
//         );
//         console.log(`✓ Statut de l'alerte mis à jour: ${status}`);
//     } catch (error) {
//         console.error('❌ Erreur lors de la mise à jour du statut de l\'alerte:', error.message);
//     }
// }

// // Vérification de la configuration avant utilisation
// async function verifyEmailConfig() {
//     try {
//         console.log('Vérification de la configuration email...');
//         await transporter.verify();
//         console.log('✓ Configuration email valide');
//         return true;
//     } catch (error) {
//         console.error('❌ Configuration email invalide:', error.message);
//         if (error.code) {
//             console.error('Code d\'erreur:', error.code);
//         }
//         return false;
//     }
// }

// async function sendAlertEmail(fileName, oldHash, newHash) {
//     // Vérifier la configuration avant d'envoyer
//     if (!await verifyEmailConfig()) {
//         console.log('⚠️ Envoi d\'email désactivé en raison d\'une configuration invalide');
//         return;
//     }

//     const mailOptions = {
//         from: {
//             name: 'Système Keralis',
//             address: 'alert@keralis.org'
//         },
//         to: process.env.ALERT_EMAIL_TO,
//         subject: `🚨 Alerte : Modification détectée dans ${fileName}`,
//         html: `
//             <h2>Une modification a été détectée dans un fichier de log</h2>
//             <p><strong>Fichier :</strong> ${fileName}</p>
//             <p><strong>Hash original :</strong> ${oldHash}</p>
//             <p><strong>Nouveau hash :</strong> ${newHash}</p>
//             <p><strong>Date de détection :</strong> ${new Date().toISOString()}</p>
//             <p>Cette alerte a été générée automatiquement par le système de test d'intégrité.</p>
//         `,
//         text: `
//             ALERTE : Modification détectée dans ${fileName}
            
//             Fichier : ${fileName}
//             Hash original : ${oldHash}
//             Nouveau hash : ${newHash}
//             Date de détection : ${new Date().toISOString()}
            
//             Cette alerte a été générée automatiquement par le système de test d'intégrité.
//         `
//     };

//     try {
//         console.log('Tentative d\'envoi de l\'email d\'alerte...');
//         await transporter.sendMail(mailOptions);
//         console.log('✓ Email d\'alerte envoyé avec succès');
//         return true;
//     } catch (error) {
//         console.error('❌ Erreur lors de l\'envoi de l\'email:', error.message);
//         if (error.code) {
//             console.error('Code d\'erreur:', error.code);
//         }
//         console.log('⚠️ Le test continue malgré l\'échec de l\'envoi d\'email');
//         return false;
//     }
// }

// // Fonction pour afficher les informations de debug
// function debugInfo() {
//     console.log('Debug Info:');
//     console.log('HASH_SERVER_URL:', HASH_SERVER_URL);
//     console.log('HASH_SERVER_API_KEY:', HASH_SERVER_API_KEY);
// }

// async function runTests() {
//     console.log('Démarrage des tests du système d\'intégrité...');
//     debugInfo();

//     let alertId = null;

//     // Configuration Axios avec les headers par défaut
//     const axiosConfig = {
//         headers: {
//             'x-api-key': HASH_SERVER_API_KEY,
//             'Content-Type': 'application/json'
//         }
//     };

//     try {
//         // 1. Tester l'API du serveur hash
//         console.log('\nTest de l\'API du serveur hash...');
        
//         // Test de la liste des fichiers
//         console.log('Envoi de la requête GET /api/logs avec la clé API...');
//         const filesResponse = await axios.get(`${HASH_SERVER_URL}/api/logs`, axiosConfig);
//         console.log('✓ Liste des fichiers récupérée:', filesResponse.data);

//         // Test du calcul de hash initial
//         const hashResponse = await axios.get(`${HASH_SERVER_URL}/api/hash/${TEST_FILE_NAME}`, axiosConfig);
//         console.log('✓ Hash initial calculé:', hashResponse.data);

//         // 2. Simuler une modification de fichier
//         console.log('\nSimulation d\'une modification de fichier...');
//         const modifyResponse = await axios.post(`${HASH_SERVER_URL}/api/modify/${TEST_FILE_NAME}`, {
//             modification: `Test modification ${Date.now()}`
//         }, axiosConfig);
//         console.log('✓ Fichier modifié:', modifyResponse.data);
        
//         // 3. Vérifier que le changement est détecté
//         const newHashResponse = await axios.get(`${HASH_SERVER_URL}/api/hash/${TEST_FILE_NAME}`, axiosConfig);
//         console.log('✓ Nouveau hash calculé:', newHashResponse.data);

//         if (hashResponse.data.hash !== newHashResponse.data.hash) {
//             console.log('✓ Modification correctement détectée');
            
//             // Sauvegarder l'alerte dans MongoDB
//             alertId = await saveAlert(
//                 TEST_FILE_NAME,
//                 hashResponse.data.hash,
//                 newHashResponse.data.hash
//             );
            
//             // Envoyer l'email d'alerte
//             await sendAlertEmail(
//                 TEST_FILE_NAME,
//                 hashResponse.data.hash,
//                 newHashResponse.data.hash
//             );
//         } else {
//             console.log('❌ Erreur: La modification n\'a pas été détectée');
//         }

//         // 4. Restaurer le contenu original
//         const restoreResponse = await axios.post(`${HASH_SERVER_URL}/api/restore/${TEST_FILE_NAME}`, {}, axiosConfig);
//         console.log('✓ Contenu original restauré:', restoreResponse.data);

//         // Mettre à jour le statut de l'alerte si elle existe
//         if (alertId) {
//             await updateAlertStatus(alertId, 'restored');
//         }

//         console.log('\nTests terminés avec succès!');
//     } catch (error) {
//         console.error('\n❌ Erreur lors des tests:', error.message);
//         if (error.response) {
//             console.error('Détails de l\'erreur:', error.response.data);
//             console.error('Headers de la requête:', axiosConfig.headers);
//             console.error('Status:', error.response.status);
//         }
//     } finally {
//         // Fermer la connexion MongoDB
//         if (mongoClient) {
//             await mongoClient.close();
//             console.log('Connexion MongoDB fermée');
//         }
//     }
// }

// runTests(); 
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const axios = require('axios');
const nodemailer = require('nodemailer');
const { MongoClient } = require('mongodb');

const HASH_SERVER_URL = process.env.HASH_SERVER_URL || 'http://172.233.245.220:3001';
const HASH_SERVER_API_KEY = process.env.HASH_SERVER_API_KEY;
const CHECK_INTERVAL = process.env.CHECK_INTERVAL || 60000; // Vérification toutes les 60 secondes par défaut

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

// Fonction pour mettre à jour le statut d'une alerte
async function updateAlertStatus(alertId, status) {
    try {
        const db = await connectToMongoDB();
        const alertsCollection = db.collection('alerts');
        
        await alertsCollection.updateOne(
            { _id: alertId },
            { $set: { status, restored: status === 'restored' } }
        );
        console.log(`✓ Statut de l'alerte mis à jour: ${status}`);
    } catch (error) {
        console.error('❌ Erreur lors de la mise à jour du statut de l\'alerte:', error.message);
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
            <p>Cette alerte a été générée automatiquement par le système de test d'intégrité.</p>
        `,
        text: `
            ALERTE : Modification détectée dans ${fileName}
            
            Fichier : ${fileName}
            Hash original : ${oldHash}
            Nouveau hash : ${newHash}
            Date de détection : ${new Date().toISOString()}
            
            Cette alerte a été générée automatiquement par le système de test d'intégrité.
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
        console.log('⚠️ Le test continue malgré l\'échec de l\'envoi d\'email');
        return false;
    }
}

// Fonction pour vérifier les fichiers de logs
async function checkLogFiles() {
    console.log('Vérification des fichiers de logs...');
    const axiosConfig = {
        headers: {
            'x-api-key': HASH_SERVER_API_KEY,
            'Content-Type': 'application/json'
        }
    };

    try {
        // Récupérer la liste des fichiers de logs
        const filesResponse = await axios.get(`${HASH_SERVER_URL}/api/logs`, axiosConfig);
        const files = filesResponse.data;

        for (const file of files) {
            const fileName = file.name;
            const hashResponse = await axios.get(`${HASH_SERVER_URL}/api/hash/${fileName}`, axiosConfig);
            const currentHash = hashResponse.data.hash;

            // Vérifier si le fichier a déjà été vérifié
            const db = await connectToMongoDB();
            const alertsCollection = db.collection('alerts');
            const lastAlert = await alertsCollection.findOne({ fileName }, { sort: { timestamp: -1 } });

            if (lastAlert && lastAlert.newHash !== currentHash) {
                console.log(`✓ Modification détectée dans ${fileName}`);
                
                // Sauvegarder l'alerte dans MongoDB
                const alertId = await saveAlert(fileName, lastAlert.newHash, currentHash);
                
                // Envoyer l'email d'alerte
                await sendAlertEmail(fileName, lastAlert.newHash, currentHash);
            } else if (!lastAlert) {
                // Si c'est la première vérification, enregistrer le hash initial
                await saveAlert(fileName, currentHash, currentHash);
            }
        }
    } catch (error) {
        console.error('❌ Erreur lors de la vérification des fichiers de logs:', error.message);
    }
}

// Fonction pour démarrer la vérification en continu
async function startContinuousCheck() {
    console.log('Démarrage de la vérification en continu...');
    setInterval(checkLogFiles, CHECK_INTERVAL);
}

// Démarrer la vérification en continu
startContinuousCheck();