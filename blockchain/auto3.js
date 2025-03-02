// ceci est une version du code pour implementation directe sur les serveurs
// Load environment variables and libraries
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { MongoClient } = require('mongodb');
const {
  AccountId,
  PrivateKey,
  Client,
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  Hbar
} = require('@hashgraph/sdk');

// Configuration
const config = {
  hedera: {
    accountId: process.env.MY_ACCOUNT_ID,
    privateKey: process.env.MY_PRIVATE_KEY,
    network: 'testnet' // ou 'mainnet' selon vos besoins
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'Blockchain',
    collectionName: process.env.MONGODB_COLLECTION || 'messages',
    user: process.env.MONGODB_USER,
    password: process.env.MONGODB_PASSWORD,
    host: process.env.MONGODB_HOST || 'localhost',
    port: process.env.MONGODB_PORT || '27017',
    authSource: process.env.MONGODB_AUTH_SOURCE || 'admin'
  },
  files: {
    processedFilesPath: path.join(__dirname, 'processedFiles.json'),
    topicIdPath: path.join(__dirname, 'topicId.txt'),
    watchDir: process.env.WATCH_DIR || '/sender/hash'
  },
  app: {
    logLevel: process.env.LOG_LEVEL || 'info'
  }
};

// Construire l'URI MongoDB à partir des composants si MONGODB_URI n'est pas défini
if (!process.env.MONGODB_URI && config.mongodb.user && config.mongodb.password) {
  const encodedPassword = encodeURIComponent(config.mongodb.password);
  config.mongodb.uri = `mongodb://${config.mongodb.user}:${encodedPassword}@${config.mongodb.host}:${config.mongodb.port}/?authSource=${config.mongodb.authSource}`;
}

// Logger
const logger = {
  info: (message) => console.log(`[INFO] ${new Date().toISOString()}: ${message}`),
  error: (message, error) => console.error(`[ERROR] ${new Date().toISOString()}: ${message}`, error),
  debug: (message) => {
    if (config.app.logLevel === 'debug') {
      console.log(`[DEBUG] ${new Date().toISOString()}: ${message}`);
    }
  }
};

// Hedera client
class HederaService {
  constructor(config) {
    this.accountId = AccountId.fromString(config.hedera.accountId);
    this.privateKey = PrivateKey.fromString(config.hedera.privateKey);
    this.client = config.hedera.network === 'mainnet' 
      ? Client.forMainnet() 
      : Client.forTestnet();
    this.client.setOperator(this.accountId, this.privateKey);
  }

  async createTopic() {
    try {
      // Créer la transaction
      const transaction = new TopicCreateTransaction();
      
      // Configurer explicitement le client
      transaction.setMaxTransactionFee(new Hbar(2));
      
      // Geler la transaction avec le client
      const freezeTx = transaction.freezeWith(this.client);
      
      // Exécuter la transaction
      const txResponse = await freezeTx.execute(this.client);
      
      // Obtenir le reçu
      const receipt = await txResponse.getReceipt(this.client);
      
      // Extraire l'ID du topic
      const topicId = receipt.topicId.toString();
      
      logger.info(`Nouveau topic créé avec ID: ${topicId}`);
      return topicId;
    } catch (error) {
      logger.error('Erreur lors de la création du topic', error);
      throw error;
    }
  }

  async sendMessage(topicId, message) {
    try {
      // Créer la transaction
      const transaction = new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(message);
      
      // Geler la transaction avec le client
      const freezeTx = transaction.freezeWith(this.client);
      
      // Exécuter la transaction
      const txResponse = await freezeTx.execute(this.client);
      
      // Obtenir le reçu
      const receipt = await txResponse.getReceipt(this.client);
      
      logger.info(`Message envoyé au Topic ID ${topicId}: Statut ${receipt.status}`);
      return receipt;
    } catch (error) {
      logger.error(`Erreur lors de l'envoi du message au topic ${topicId}`, error);
      throw error;
    }
  }
}

// MongoDB service
class MongoDBService {
  constructor(config) {
    this.uri = config.mongodb.uri;
    this.dbName = config.mongodb.dbName;
    this.collectionName = config.mongodb.collectionName;
    this.client = null;
    this.db = null;
    this.collection = null;
  }

  async connect() {
    try {
      logger.debug(`Tentative de connexion à MongoDB avec URI: ${this.uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')}`);
      this.client = new MongoClient(this.uri, { useNewUrlParser: true, useUnifiedTopology: true });
      await this.client.connect();
      this.db = this.client.db(this.dbName);
      this.collection = this.db.collection(this.collectionName);
      logger.info(`Connecté à MongoDB: ${this.dbName}.${this.collectionName}`);
    } catch (error) {
      logger.error('Erreur de connexion à MongoDB', error);
      throw error;
    }
  }

  async saveMessage(data) {
    try {
      const result = await this.collection.insertOne({
        ...data,
        timestamp: new Date()
      });
      logger.info(`Message sauvegardé dans MongoDB avec ID: ${result.insertedId}`);
      return result;
    } catch (error) {
      logger.error('Erreur lors de la sauvegarde du message dans MongoDB', error);
      throw error;
    }
  }

  async close() {
    if (this.client) {
      await this.client.close();
      logger.info('Connexion MongoDB fermée');
    }
  }
}

// File service
class FileService {
  constructor(config) {
    this.processedFilesPath = config.files.processedFilesPath;
    this.topicIdPath = config.files.topicIdPath;
    this.watchDir = config.files.watchDir;
  }

  loadProcessedFiles() {
    try {
      return new Set(JSON.parse(fs.readFileSync(this.processedFilesPath, 'utf8')));
    } catch (error) {
      logger.info("Impossible de charger les fichiers traités, démarrage avec un ensemble vide.");
      return new Set();
    }
  }

  saveProcessedFiles(processedFiles) {
    fs.writeFileSync(this.processedFilesPath, JSON.stringify([...processedFiles]), 'utf8');
  }

  loadTopicId() {
    try {
      return fs.readFileSync(this.topicIdPath, 'utf8').trim();
    } catch (error) {
      logger.info("Aucun ID de topic trouvé, création d'un nouveau.");
      return null;
    }
  }

  saveTopicId(topicId) {
    fs.writeFileSync(this.topicIdPath, topicId, 'utf8');
  }

  readFile(filePath) {
    return fs.readFileSync(filePath, 'utf8');
  }

  ensureWatchDirExists() {
    if (!fs.existsSync(this.watchDir)) {
      logger.info(`Création du répertoire de surveillance: ${this.watchDir}`);
      fs.mkdirSync(this.watchDir, { recursive: true });
    }
  }
}

// Main application
class HashLogBackupApp {
  constructor(config) {
    this.config = config;
    this.hederaService = new HederaService(config);
    this.mongoDBService = new MongoDBService(config);
    this.fileService = new FileService(config);
    this.topicId = null;
    this.processedFiles = null;
    this.watcher = null;
    this.processingQueue = [];
    this.isProcessing = false;
  }

  async initialize() {
    try {
      // S'assurer que le répertoire à surveiller existe
      this.fileService.ensureWatchDirExists();
      
      // Connexion à MongoDB
      await this.mongoDBService.connect();
      
      // Chargement des fichiers traités
      this.processedFiles = this.fileService.loadProcessedFiles();
      
      // Vérification/création du topic
      await this.ensureTopicExists();
      
      logger.info('Application initialisée avec succès');
    } catch (error) {
      logger.error('Erreur lors de l\'initialisation de l\'application', error);
      throw error;
    }
  }

  async ensureTopicExists() {
    this.topicId = this.fileService.loadTopicId();
    if (!this.topicId) {
      this.topicId = await this.hederaService.createTopic();
      this.fileService.saveTopicId(this.topicId);
    } else {
      logger.info(`Utilisation de l'ID de topic existant: ${this.topicId}`);
    }
    return this.topicId;
  }

  async processFile(filePath) {
    // Ajouter le fichier à la file d'attente
    return new Promise((resolve) => {
      this.processingQueue.push({ filePath, resolve });
      this.processNextInQueue();
    });
  }
  
  async processNextInQueue() {
    // Si déjà en train de traiter un fichier ou si la file est vide, ne rien faire
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }
    
    // Marquer comme en cours de traitement
    this.isProcessing = true;
    
    // Récupérer le prochain fichier à traiter
    const { filePath, resolve } = this.processingQueue.shift();
    
    try {
      if (this.processedFiles.has(filePath)) {
        logger.info(`Le fichier ${filePath} a déjà été traité.`);
        this.isProcessing = false;
        resolve(false);
        this.processNextInQueue();
        return;
      }

      // Lecture du contenu du fichier
      const fileContent = this.fileService.readFile(filePath);
      
      // Envoi du message à Hedera
      const receipt = await this.hederaService.sendMessage(this.topicId, fileContent);
      
      // Sauvegarde dans MongoDB
      await this.mongoDBService.saveMessage({
        filePath,
        content: fileContent,
        topicId: this.topicId,
        status: receipt.status.toString()
      });
      
      // Marquer le fichier comme traité
      this.processedFiles.add(filePath);
      this.fileService.saveProcessedFiles(this.processedFiles);
      
      logger.info(`Fichier ${filePath} traité avec succès.`);
      this.isProcessing = false;
      resolve(true);
      
      // Traiter le fichier suivant dans la file
      this.processNextInQueue();
    } catch (error) {
      logger.error(`Erreur lors du traitement du fichier ${filePath}`, error);
      this.isProcessing = false;
      resolve(false);
      
      // Attendre un peu avant de traiter le fichier suivant en cas d'erreur
      setTimeout(() => this.processNextInQueue(), 2000);
    }
  }

  startWatching() {
    const watchDir = this.config.files.watchDir;
    
    logger.info(`Surveillance du répertoire: ${watchDir}`);
    
    this.watcher = chokidar.watch(watchDir, {
      persistent: true,
      ignoreInitial: false
    });

    this.watcher.on('add', async (filePath) => {
      logger.info(`Nouveau fichier détecté: ${filePath}`);
      await this.processFile(filePath);
    });

    this.watcher.on('error', (error) => {
      logger.error('Erreur de surveillance du répertoire', error);
    });
  }

  async stop() {
    if (this.watcher) {
      await this.watcher.close();
    }
    await this.mongoDBService.close();
    logger.info('Application arrêtée');
  }
}

// Exécution de l'application
async function main() {
  const app = new HashLogBackupApp(config);
  
  try {
    await app.initialize();
    app.startWatching();
    
    // Gestion de l'arrêt propre
    process.on('SIGINT', async () => {
      logger.info('Signal d\'interruption reçu, arrêt en cours...');
      await app.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('Signal de terminaison reçu, arrêt en cours...');
      await app.stop();
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Erreur fatale dans l\'application', error);
    process.exit(1);
  }
}

// Démarrage de l'application si ce fichier est exécuté directement
if (require.main === module) {
  main();
}

// Export pour les tests
module.exports = {
  HederaService,
  MongoDBService,
  FileService,
  HashLogBackupApp,
  config
};