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
const API_KEY = process.env.HASH_SERVER_API_KEY;
const LOGS_DIR = '/root/keralis/logs';  // Chemin absolu vers le répertoire des logs

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

const app = express();
app.use(cors());
app.use(express.json());

const validateApiKey = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== API_KEY) {
        logger.warn('Tentative d\'accès non autorisé');
        return res.status(401).json({ error: 'Non autorisé' });
    }
    next();
};

/**
 * Calcule le hash SHA-256 d'un fichier
 * @param {string} fileName - Nom du fichier
 * @returns {Promise<string>} - Hash SHA-256 en hexadécimal
 */
async function calculateFileHash(fileName) {
    try {
        const filePath = path.join(LOGS_DIR, fileName);
        const content = await fs.readFile(filePath);
        return crypto.createHash('sha256').update(content).digest('hex');
    } catch (error) {
        logger.error(`Erreur lors du calcul du hash pour ${fileName}:`, error);
        throw error;
    }
}

/**
 * Récupère la liste de tous les fichiers de logs
 */
app.get('/api/logs', validateApiKey, async (req, res) => {
  try {
    const files = await fs.readdir(LOGS_DIR);
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
app.get('/api/hash/:fileName', validateApiKey, async (req, res) => {
  try {
    const fileName = req.params.fileName;

    // Vérifier si le hash est dans le cache et est récent (moins de 5 minutes)
    const cached = hashCache.get(fileName);
    if (cached && (Date.now() - cached.timestamp) < 300000) {
        logger.info(`Hash récupéré du cache pour ${fileName}`);
        return res.json({ fileName, hash: cached.hash });
    }

    // Calculer un nouveau hash
    const hash = await calculateFileHash(fileName);
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
    const files = await fs.readdir(LOGS_DIR);
    const logFiles = files.filter(file => file.endsWith('.log') || file.endsWith('.txt'));
    
    for (const file of logFiles) {
      try {
        const hash = await calculateFileHash(file);
        hashCache.set(file, {
          hash,
          timestamp: Date.now()
        });
      } catch (error) {
        logger.error(`Erreur lors du calcul du hash pour ${file}:`, error);
      }
    }
    logger.info('Cache préchauffé avec succès');
  } catch (error) {
    logger.error('Erreur lors du préchauffage du cache:', error);
  }
}

/**
 * Modifie un fichier de log pour les tests
 */
app.post('/api/modify/:fileName', validateApiKey, async (req, res) => {
  try {
    const fileName = req.params.fileName;
    const filePath = path.join(LOGS_DIR, fileName);
    
    const originalContent = await fs.readFile(filePath, 'utf8');
    
    hashCache.set(`${fileName}_original`, {
      content: originalContent,
      timestamp: Date.now()
    });
    
    const newContent = originalContent + '\n' + req.body.modification;
    await fs.writeFile(filePath, newContent);
    
    hashCache.delete(fileName);
    
    logger.info(`Fichier ${fileName} modifié pour les tests`);
    res.json({ status: 'success', message: 'Fichier modifié avec succès' });
  } catch (error) {
    logger.error(`Erreur lors de la modification du fichier ${req.params.fileName}:`, error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

/**
 * Restaure le contenu original d'un fichier de log
 */
app.post('/api/restore/:fileName', validateApiKey, async (req, res) => {
  try {
    const fileName = req.params.fileName;
    const filePath = path.join(LOGS_DIR, fileName);
    
    const originalData = hashCache.get(`${fileName}_original`);
    if (!originalData) {
      throw new Error('Contenu original non trouvé dans le cache');
    }
    
    await fs.writeFile(filePath, originalData.content);
    
    hashCache.delete(`${fileName}_original`);
    hashCache.delete(fileName);
    
    logger.info(`Fichier ${fileName} restauré à son état original`);
    res.json({ status: 'success', message: 'Fichier restauré avec succès' });
  } catch (error) {
    logger.error(`Erreur lors de la restauration du fichier ${req.params.fileName}:`, error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Serveur hash démarré sur le port ${PORT}`);
  warmupCache();
});

setInterval(warmupCache, 900000);

process.on('uncaughtException', (error) => {
    logger.error('Erreur non capturée:', error);
});

process.on('unhandledRejection', (error) => {
    logger.error('Promesse rejetée non gérée:', error);
});