/**
 * Script pour le Serveur 1 (client)
 * Ce script expose une API REST permettant au Serveur 2 (blockchain) 
 * de récupérer le hash actuel des fichiers de logs.
 */

// Charger les variables d'environnement depuis le fichier .env
require('dotenv').config();

const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const winston = require('winston');
const cors = require('cors');

// Configuration depuis le fichier .env
const PORT = process.env.HASH_SERVER_PORT || 3001;
const LOGS_DIRECTORY = process.env.LOGS_DIRECTORY || '/path/to/logs';
const API_KEY = process.env.HASH_SERVER_API_KEY;

// Configuration du logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/hash-server-error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/hash-server.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

// Cache pour les hashs précalculés
const hashCache = new Map();

// Middleware pour vérifier la clé API
const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== API_KEY) {
        logger.warn('Tentative d\'accès non autorisé');
        return res.status(401).json({ error: 'Non autorisé' });
    }
    next();
};

// Middleware
const app = express();
app.use(cors());
app.use(express.json());
app.use(validateApiKey); // Sécurise toutes les routes

/**
 * Calcule le hash SHA-256 d'un fichier
 * @param {string} filePath - Chemin vers le fichier
 * @returns {Promise<string>} - Hash SHA-256 en hexadécimal
 */
async function calculateFileHash(filePath) {
    try {
        const content = await fs.readFile(filePath);
        return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
        logger.error(`Erreur lors du calcul du hash pour ${filePath}:`, error);
        throw error;
    }
}

/**
 * Récupère la liste de tous les fichiers de logs
 */
app.get('/api/logs', async (req, res) => {
  try {
    const logsDir = process.env.LOGS_DIR || path.join(__dirname, 'sender');
    const files = await fs.readdir(logsDir);
    const logFiles = files.filter(file => file.endsWith('.log') || file.endsWith('.txt'));
    
    logger.info('Liste des fichiers de logs demandée');
    res.json({ files: logFiles });
  } catch (error) {
    logger.error('Erreur lors de la récupération des logs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * Récupère le hash d'un fichier de log spécifique
 */
app.get('/api/hash/:fileName', async (req, res) => {
  try {
    const fileName = req.params.fileName;
    const logsDir = process.env.LOGS_DIR || path.join(__dirname, 'sender');
    const filePath = path.join(logsDir, fileName);

    // Vérifier si le hash est dans le cache et est récent (moins de 5 minutes)
    const cached = hashCache.get(fileName);
    if (cached && (Date.now() - cached.timestamp) < 300000) {
        logger.info(`Hash récupéré du cache pour ${fileName}`);
        return res.json({ fileName, hash: cached.hash });
    }

    // Calculer un nouveau hash
    const hash = await calculateFileHash(filePath);
    hashCache.set(fileName, {
        hash,
        timestamp: Date.now()
    });

    logger.info(`Nouveau hash calculé pour ${fileName}`);
    res.json({ fileName, hash });
  } catch (error) {
    logger.error(`Erreur lors du calcul du hash pour ${req.params.fileName}:`, error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * Fonction de préchauffage qui calcule le hash de tous les fichiers
 * afin de les mettre en cache
 */
async function warmupCache() {
  try {
    const logsDir = process.env.LOGS_DIR || path.join(__dirname, 'sender');
    const files = await fs.readdir(logsDir);
    
    for (const file of files) {
      if (file.endsWith('.log') || file.endsWith('.txt')) {
        const filePath = path.join(logsDir, file);
        const hash = await calculateFileHash(filePath);
        hashCache.set(file, {
          hash,
          timestamp: Date.now()
        });
      }
    }
    logger.info('Cache préchauffé avec succès');
  } catch (error) {
    logger.error('Erreur lors du préchauffage du cache:', error);
  }
}

// Démarrage du serveur
app.listen(PORT, () => {
  logger.info(`Serveur hash démarré sur le port ${PORT}`);
  // Préchauffer le cache au démarrage
  warmupCache();
});

// Préchauffer le cache toutes les 15 minutes
setInterval(warmupCache, 900000);

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
    logger.error('Erreur non capturée:', error);
});

process.on('unhandledRejection', (error) => {
    logger.error('Promesse rejetée non gérée:', error);
});