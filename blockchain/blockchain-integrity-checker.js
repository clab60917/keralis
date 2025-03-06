/**
 * Script pour le Serveur 2 (blockchain)
 * Ce script vérifie l'intégrité des fichiers de logs en comparant 
 * les hashs stockés dans MongoDB avec ceux calculés en temps réel 
 * sur le Serveur 1 (client).
 */

// Charger les variables d'environnement depuis le fichier .env
require('dotenv').config();

const mongoose = require('mongoose');
const axios = require('axios');
const winston = require('winston');
const nodemailer = require('nodemailer'); // Facultatif pour les alertes par e-mail
const { MongoClient } = require('mongodb');

// Configuration depuis le fichier .env
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/hedera_logs';
const CLIENT_API_URL = process.env.CLIENT_API_URL || 'http://serveur1-client:3030';
const API_SECRET_KEY = process.env.API_SECRET_KEY || 'changez-moi-en-production';
const CHECK_INTERVAL = parseInt(process.env.CHECK_INTERVAL || '900000', 10); // 15 minutes par défaut
const EMAIL_ALERTS = process.env.EMAIL_ALERTS === 'true' || false;
const HASH_SERVER_URL = process.env.HASH_SERVER_URL || 'http://client-server:3001';
const HASH_SERVER_API_KEY = process.env.HASH_SERVER_API_KEY;

// Configuration du logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/integrity-checker-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/integrity-checker.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Configuration optionnelle pour les alertes par e-mail
let transporter;
if (EMAIL_ALERTS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || 'user@example.com',
      pass: process.env.SMTP_PASS || 'password'
    }
  });
}

// Connexion à MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).catch(err => {
  logger.error('Erreur de connexion à MongoDB', { error: err.message });
  process.exit(1);
});

// Définition du schéma pour les messages blockchain
const messageSchema = new mongoose.Schema({
  fileHash: String,
  fileName: String,
  timestamp: Date,
  topicId: String,
  messageId: String
}, { collection: 'messages' });

// Création du modèle
const BlockchainMessage = mongoose.model('BlockchainMessage', messageSchema);

// Configuration pour l'API du client
const clientApi = axios.create({
  baseURL: CLIENT_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_SECRET_KEY
  },
  timeout: 10000 // Timeout après 10 secondes
});

// Connexion MongoDB
let mongoClient;
async function connectMongo() {
    if (!mongoClient) {
        mongoClient = new MongoClient(process.env.MONGODB_URI);
        await mongoClient.connect();
        logger.info('Connecté à MongoDB');
    }
    return mongoClient.db(process.env.MONGODB_DB_NAME);
}

/**
 * Envoie une alerte par e-mail pour les fichiers compromis
 * @param {Array} compromisedFiles - Liste des fichiers compromis
 */
async function sendEmailAlert(compromisedFiles) {
  if (!EMAIL_ALERTS || !transporter) return;
  
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Système d\'Intégrité" <integrity@example.com>',
      to: process.env.EMAIL_TO || 'admin@example.com',
      subject: `ALERTE: ${compromisedFiles.length} fichier(s) de logs compromis`,
      html: `
        <h1>Alerte de sécurité: Intégrité compromise</h1>
        <p>Le système a détecté ${compromisedFiles.length} fichier(s) de logs dont l'intégrité est compromise:</p>
        <ul>
          ${compromisedFiles.map(file => `
            <li>
              <strong>${file.fileName}</strong><br>
              Hash stocké: ${file.storedHash}<br>
              Hash actuel: ${file.currentHash}<br>
              Détecté le: ${new Date().toLocaleString()}
            </li>
          `).join('')}
        </ul>
        <p>Veuillez vérifier ces fichiers immédiatement.</p>
      `
    });
    
    logger.info('Alerte e-mail envoyée', { messageId: info.messageId });
  } catch (error) {
    logger.error('Erreur lors de l\'envoi de l\'alerte e-mail', {
      error: error.message
    });
  }
}

/**
 * Récupère le hash actuel d'un fichier de log depuis l'API du client
 * @param {string} fileName - Nom du fichier
 * @returns {Promise<Object>} - Réponse de l'API contenant le hash
 */
async function getCurrentHashFromClient(fileName) {
  try {
    const response = await clientApi.get(`/api/hash/${encodeURIComponent(fileName)}`);
    return response.data;
  } catch (error) {
    if (error.response) {
      // La requête a été faite et le serveur a répondu avec un code d'erreur
      logger.error('Erreur API client', {
        fileName,
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.request) {
      // La requête a été faite mais aucune réponse n'a été reçue
      logger.error('Pas de réponse de l\'API client', {
        fileName,
        error: error.message
      });
    } else {
      // Une erreur s'est produite lors de la configuration de la requête
      logger.error('Erreur lors de la configuration de la requête API', {
        fileName,
        error: error.message
      });
    }
    throw error;
  }
}

/**
 * Vérifie l'intégrité d'un fichier de log spécifique
 * @param {string} fileName - Nom du fichier de log
 * @returns {Promise<Object>} - Résultat de la vérification
 */
async function checkFileIntegrity(fileName) {
  try {
    // Récupérer le dernier message pour ce fichier dans MongoDB
    const latestMessage = await BlockchainMessage.findOne({ 
      fileName: fileName 
    }).sort({ timestamp: -1 }).exec();
    
    if (!latestMessage) {
      logger.warn(`Aucun hash trouvé dans la base de données pour ${fileName}`, { fileName });
      return { 
        fileName, 
        isIntact: false, 
        error: 'Hash non trouvé dans la base de données' 
      };
    }
    
    const storedHash = latestMessage.fileHash;
    
    // Récupérer le hash actuel depuis l'API du client
    const clientHashData = await getCurrentHashFromClient(fileName);
    const currentHash = clientHashData.hash;
    
    // Comparer les hash
    const isIntact = currentHash === storedHash;
    
    if (!isIntact) {
      logger.error('Intégrité compromise', { 
        fileName,
        currentHash,
        storedHash,
        messageId: latestMessage.messageId,
        topicId: latestMessage.topicId,
        timestampDB: latestMessage.timestamp,
        timestampCheck: new Date()
      });
      
      return {
        fileName,
        isIntact: false,
        storedHash,
        currentHash,
        messageId: latestMessage.messageId,
        storedTimestamp: latestMessage.timestamp
      };
    } else {
      logger.info('Vérification d\'intégrité réussie', { 
        fileName,
        hash: currentHash,
        timestamp: new Date()
      });
      
      return {
        fileName,
        isIntact: true,
        hash: currentHash
      };
    }
  } catch (error) {
    logger.error('Erreur lors de la vérification d\'intégrité', { 
      fileName, 
      error: error.message,
      stack: error.stack
    });
    
    return {
      fileName,
      isIntact: false,
      error: error.message
    };
  }
}

/**
 * Récupère la liste des fichiers de logs depuis l'API du client
 * @returns {Promise<Array>} - Liste des noms de fichiers
 */
async function getLogFilesFromClient() {
  try {
    const response = await clientApi.get('/api/logs');
    return response.data.files || [];
  } catch (error) {
    logger.error('Erreur lors de la récupération de la liste des fichiers', {
      error: error.message
    });
    throw error;
  }
}

/**
 * Vérifie l'intégrité de tous les fichiers connus
 */
async function checkAllFilesIntegrity() {
  try {
    logger.info('Démarrage de la vérification d\'intégrité');
    
    // Stratégie 1: Vérifier tous les fichiers connus dans MongoDB
    const dbLogFiles = await BlockchainMessage.distinct('fileName');
    
    // Stratégie 2: Obtenir aussi la liste des fichiers depuis le client
    let clientLogFiles = [];
    try {
      clientLogFiles = await getLogFilesFromClient();
    } catch (error) {
      logger.warn('Impossible de récupérer la liste des fichiers depuis le client, utilisation uniquement de la liste depuis MongoDB');
    }
    
    // Fusionner les deux listes pour ne pas manquer de fichiers
    const uniqueLogFiles = [...new Set([...dbLogFiles, ...clientLogFiles])];
    
    if (uniqueLogFiles.length === 0) {
      logger.warn('Aucun fichier de log trouvé');
      return;
    }
    
    logger.info(`Vérification de ${uniqueLogFiles.length} fichiers`);
    
    // Vérifier l'intégrité de chaque fichier
    const results = await Promise.all(
      uniqueLogFiles.map(fileName => checkFileIntegrity(fileName))
    );
    
    // Extraire les fichiers compromis
    const compromisedFiles = results.filter(r => r && r.isIntact === false);
    
    // Journaliser les résultats
    if (compromisedFiles.length > 0) {
      logger.error(`${compromisedFiles.length} fichier(s) compromis détectés`, { 
        compromisedFiles: compromisedFiles.map(f => f.fileName),
        timestamp: new Date()
      });
      
      // Envoyer une alerte par e-mail si configuré
      await sendEmailAlert(compromisedFiles);
    } else {
      logger.info(`Tous les ${results.length} fichiers vérifiés sont intacts`, {
        timestamp: new Date()
      });
    }
    
    return {
      totalFiles: results.length,
      compromisedFiles: compromisedFiles.length,
      details: compromisedFiles
    };
  } catch (error) {
    logger.error('Erreur lors de la vérification globale', { 
      error: error.message,
      stack: error.stack
    });
  }
}

// Exécution immédiate lors du démarrage
checkAllFilesIntegrity();

// Programmation de l'exécution périodique
setInterval(checkAllFilesIntegrity, CHECK_INTERVAL);

// Gestion propre de la fermeture
process.on('SIGINT', async () => {
  logger.info('Arrêt du service de vérification d\'intégrité');
  await mongoose.connection.close();
  process.exit(0);
});

// Fonction pour envoyer une alerte par email
async function sendAlert(message, details) {
    try {
        await transporter.sendMail({
            from: process.env.ALERT_EMAIL_FROM,
            to: process.env.ALERT_EMAIL_TO,
            subject: 'Alerte Intégrité Blockchain',
            text: `${message}\n\nDétails: ${JSON.stringify(details, null, 2)}`,
            html: `<h2>${message}</h2><pre>${JSON.stringify(details, null, 2)}</pre>`
        });
        logger.info('Alerte email envoyée');
    } catch (error) {
        logger.error('Erreur lors de l\'envoi de l\'email:', error);
    }
}

// Fonction pour mettre à jour le statut dans le dashboard
async function updateDashboardStatus(alerts) {
    try {
        const db = await connectMongo();
        await db.collection('alerts').insertOne({
            timestamp: new Date(),
            alerts,
            status: alerts.length > 0 ? 'warning' : 'ok'
        });
    } catch (error) {
        logger.error('Erreur lors de la mise à jour du dashboard:', error);
    }
}

// Fonction principale de vérification
async function checkIntegrity() {
    try {
        logger.info('Début de la vérification d\'intégrité');
        const alerts = [];

        // Récupérer la liste des fichiers depuis le serveur client
        const filesResponse = await axios.get(`${HASH_SERVER_URL}/api/logs`, {
            headers: { 'x-api-key': HASH_SERVER_API_KEY }
        });

        const db = await connectMongo();
        
        // Vérifier chaque fichier
        for (const fileName of filesResponse.data.files) {
            // Récupérer le hash actuel
            const hashResponse = await axios.get(`${HASH_SERVER_URL}/api/hash/${fileName}`, {
                headers: { 'x-api-key': HASH_SERVER_API_KEY }
            });
            
            // Récupérer le hash stocké dans MongoDB
            const storedHash = await db.collection('hash').findOne({ fileName });

            if (!storedHash) {
                logger.warn(`Pas de hash stocké pour ${fileName}`);
                continue;
            }

            if (hashResponse.data.hash !== storedHash.hash) {
                const alert = {
                    fileName,
                    currentHash: hashResponse.data.hash,
                    storedHash: storedHash.hash,
                    timestamp: new Date()
                };
                alerts.push(alert);
                logger.warn(`Différence de hash détectée pour ${fileName}`, alert);
            }
        }

        // S'il y a des alertes, envoyer un email et mettre à jour le dashboard
        if (alerts.length > 0) {
            await sendAlert('Modifications non autorisées détectées', alerts);
            await updateDashboardStatus(alerts);
        } else {
            await updateDashboardStatus([]);
        }

        logger.info('Vérification d\'intégrité terminée');
    } catch (error) {
        logger.error('Erreur lors de la vérification d\'intégrité:', error);
    }
}

// Démarrage des vérifications périodiques
setInterval(checkIntegrity, CHECK_INTERVAL);
checkIntegrity(); // Première vérification au démarrage

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
    logger.error('Erreur non capturée:', error);
});

process.on('unhandledRejection', (error) => {
    logger.error('Promesse rejetée non gérée:', error);
});