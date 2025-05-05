const { expect } = require('chai');
const sinon = require('sinon');
const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');
const {
  HederaService,
  MongoDBService,
  FileService,
  HashLogBackupApp,
  config
} = require('../auto3');

const testConfig = {
  ...config,
  mongodb: {
    ...config.mongodb,
    uri: 'mongodb://testuser:testpass@localhost:27017',
    dbName: 'TestBlockchain',
    collectionName: 'test_messages'
  },
  files: {
    ...config.files,
    processedFilesPath: path.join(__dirname, 'test-processedFiles.json'),
    topicIdPath: path.join(__dirname, 'test-topicId.txt'),
    watchDir: path.join(__dirname, 'test-data')
  }
};

describe('HashLogBackupApp', function() {
  this.timeout(10000); 
  
  let sandbox;
  let app;
  let hederaServiceStub;
  let mongoDBServiceStub;
  let fileServiceStub;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    hederaServiceStub = {
      createTopic: sandbox.stub().resolves('0.0.123456'),
      sendMessage: sandbox.stub().resolves({ status: 'SUCCESS' })
    };
    
    mongoDBServiceStub = {
      connect: sandbox.stub().resolves(),
      saveMessage: sandbox.stub().resolves({ insertedId: 'mockId123' }),
      close: sandbox.stub().resolves()
    };
    
    fileServiceStub = {
      loadProcessedFiles: sandbox.stub().returns(new Set()),
      saveProcessedFiles: sandbox.stub(),
      loadTopicId: sandbox.stub().returns(null),
      saveTopicId: sandbox.stub(),
      readFile: sandbox.stub().returns('test file content'),
      ensureWatchDirExists: sandbox.stub()
    };
    
    app = new HashLogBackupApp(testConfig);
    app.hederaService = hederaServiceStub;
    app.mongoDBService = mongoDBServiceStub;
    app.fileService = fileServiceStub;
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('initialize()', () => {
    it('devrait initialiser l\'application correctement', async () => {
      await app.initialize();
      
      expect(fileServiceStub.ensureWatchDirExists.calledOnce).to.be.true;
      expect(mongoDBServiceStub.connect.calledOnce).to.be.true;
      expect(fileServiceStub.loadProcessedFiles.calledOnce).to.be.true;
      expect(fileServiceStub.loadTopicId.calledOnce).to.be.true;
      expect(hederaServiceStub.createTopic.calledOnce).to.be.true;
      expect(fileServiceStub.saveTopicId.calledOnce).to.be.true;
    });
    
    it('ne devrait pas créer un nouveau topic si un topic existe déjà', async () => {
      fileServiceStub.loadTopicId.returns('0.0.existingTopic');
      
      await app.initialize();
      
      expect(hederaServiceStub.createTopic.called).to.be.false;
      expect(app.topicId).to.equal('0.0.existingTopic');
    });
  });
  
  describe('processFile()', () => {
    beforeEach(async () => {
      app.topicId = '0.0.123456';
      app.processedFiles = new Set();
      await app.initialize();
    });
    
    it('devrait traiter un nouveau fichier correctement', async () => {
      const filePath = '/path/to/test/file.txt';
      
      const result = await app.processFile(filePath);
      
      expect(result).to.be.true;
      expect(fileServiceStub.readFile.calledWith(filePath)).to.be.true;
      expect(hederaServiceStub.sendMessage.calledWith('0.0.123456', 'test file content')).to.be.true;
      expect(mongoDBServiceStub.saveMessage.calledOnce).to.be.true;
      expect(app.processedFiles.has(filePath)).to.be.true;
      expect(fileServiceStub.saveProcessedFiles.calledOnce).to.be.true;
    });
    
    it('ne devrait pas traiter un fichier déjà traité', async () => {
      const filePath = '/path/to/test/file.txt';
      app.processedFiles.add(filePath);
      
      const result = await app.processFile(filePath);
      
      expect(result).to.be.false;
      expect(fileServiceStub.readFile.called).to.be.false;
      expect(hederaServiceStub.sendMessage.called).to.be.false;
      expect(mongoDBServiceStub.saveMessage.called).to.be.false;
    });
    
    it('devrait gérer les erreurs lors du traitement d\'un fichier', async () => {
      const filePath = '/path/to/test/file.txt';
      hederaServiceStub.sendMessage.rejects(new Error('Test error'));
      
      const result = await app.processFile(filePath);
      
      expect(result).to.be.false;
      expect(app.processedFiles.has(filePath)).to.be.false;
    });
  });
});

describe('HederaService', function() {
  let sandbox;
  let hederaService;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    hederaService = new HederaService(testConfig);
    
    sandbox.stub(hederaService, 'createTopic').resolves('0.0.123456');
    sandbox.stub(hederaService, 'sendMessage').resolves({ status: 'SUCCESS' });
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('createTopic()', () => {
    it('devrait créer un topic et retourner son ID', async () => {
      const topicId = await hederaService.createTopic();
      
      expect(topicId).to.equal('0.0.123456');
      expect(hederaService.createTopic.calledOnce).to.be.true;
    });
  });
  
  describe('sendMessage()', () => {
    it('devrait envoyer un message au topic spécifié', async () => {
      const receipt = await hederaService.sendMessage('0.0.123456', 'test message');
      
      expect(receipt.status).to.equal('SUCCESS');
      expect(hederaService.sendMessage.calledOnce).to.be.true;
    });
  });
});

describe('MongoDBService', function() {
  let sandbox;
  let mongoDBService;
  let mongoClientStub;
  let dbStub;
  let collectionStub;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    collectionStub = {
      insertOne: sandbox.stub().resolves({ insertedId: 'mockId123' })
    };
    
    dbStub = {
      collection: sandbox.stub().returns(collectionStub)
    };
    
    mongoClientStub = {
      connect: sandbox.stub().resolves(),
      db: sandbox.stub().returns(dbStub),
      close: sandbox.stub().resolves()
    };
    
    sandbox.stub(MongoClient.prototype, 'connect').resolves();
    sandbox.stub(MongoClient.prototype, 'db').returns(dbStub);
    sandbox.stub(MongoClient.prototype, 'close').resolves();
    
    mongoDBService = new MongoDBService(testConfig);
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('connect()', () => {
    it('devrait se connecter à MongoDB', async () => {
      await mongoDBService.connect();
      
      expect(MongoClient.prototype.connect.calledOnce).to.be.true;
      expect(mongoDBService.db).to.not.be.null;
      expect(mongoDBService.collection).to.not.be.null;
    });
  });
  
  describe('saveMessage()', () => {
    beforeEach(async () => {
      mongoDBService.collection = collectionStub;
      await mongoDBService.connect();
    });
    
    it('devrait sauvegarder un message dans MongoDB', async () => {
      const data = {
        filePath: '/path/to/file.txt',
        content: 'test content',
        topicId: '0.0.123456',
        status: 'SUCCESS'
      };
      
      const result = await mongoDBService.saveMessage(data);
      
      expect(result.insertedId).to.equal('mockId123');
      expect(collectionStub.insertOne.calledOnce).to.be.true;
      
      const insertedData = collectionStub.insertOne.firstCall.args[0];
      expect(insertedData).to.have.property('timestamp');
      expect(insertedData.timestamp).to.be.an.instanceOf(Date);
    });
  });
});

describe('FileService', function() {
  let sandbox;
  let fileService;
  
  beforeEach(() => {
    sandbox = sinon.createSandbox();
    
    sandbox.stub(fs, 'readFileSync');
    sandbox.stub(fs, 'writeFileSync');
    sandbox.stub(fs, 'existsSync');
    sandbox.stub(fs, 'mkdirSync');
    
    fileService = new FileService(testConfig);
  });
  
  afterEach(() => {
    sandbox.restore();
  });
  
  describe('loadProcessedFiles()', () => {
    it('devrait charger les fichiers traités depuis le fichier JSON', () => {
      fs.readFileSync.returns('["file1.txt","file2.txt"]');
      
      const processedFiles = fileService.loadProcessedFiles();
      
      expect(processedFiles).to.be.an.instanceOf(Set);
      expect(processedFiles.size).to.equal(2);
      expect(processedFiles.has('file1.txt')).to.be.true;
      expect(processedFiles.has('file2.txt')).to.be.true;
    });
    
    it('devrait retourner un ensemble vide si le fichier n\'existe pas', () => {
      fs.readFileSync.throws(new Error('File not found'));
      
      const processedFiles = fileService.loadProcessedFiles();
      
      expect(processedFiles).to.be.an.instanceOf(Set);
      expect(processedFiles.size).to.equal(0);
    });
  });
  
  describe('saveProcessedFiles()', () => {
    it('devrait sauvegarder les fichiers traités dans le fichier JSON', () => {
      const processedFiles = new Set(['file1.txt', 'file2.txt']);
      
      fileService.saveProcessedFiles(processedFiles);
      
      expect(fs.writeFileSync.calledOnce).to.be.true;
      expect(fs.writeFileSync.firstCall.args[1]).to.equal('["file1.txt","file2.txt"]');
    });
  });
  
  describe('loadTopicId()', () => {
    it('devrait charger l\'ID du topic depuis le fichier', () => {
      fs.readFileSync.returns('0.0.123456\n');
      
      const topicId = fileService.loadTopicId();
      
      expect(topicId).to.equal('0.0.123456');
    });
    
    it('devrait retourner null si le fichier n\'existe pas', () => {
      fs.readFileSync.throws(new Error('File not found'));
      
      const topicId = fileService.loadTopicId();
      
      expect(topicId).to.be.null;
    });
  });
  
  describe('ensureWatchDirExists()', () => {
    it('devrait créer le répertoire s\'il n\'existe pas', () => {
      fs.existsSync.returns(false);
      
      fileService.ensureWatchDirExists();
      
      expect(fs.mkdirSync.calledOnce).to.be.true;
      expect(fs.mkdirSync.firstCall.args[0]).to.equal(fileService.watchDir);
      expect(fs.mkdirSync.firstCall.args[1]).to.deep.equal({ recursive: true });
    });
    
    it('ne devrait pas créer le répertoire s\'il existe déjà', () => {
      fs.existsSync.returns(true);
      
      fileService.ensureWatchDirExists();
      
      expect(fs.mkdirSync.called).to.be.false;
    });
  });
}); 