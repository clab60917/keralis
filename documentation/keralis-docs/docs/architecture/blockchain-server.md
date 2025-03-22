---
sidebar_position: 3
---

# Serveur Blockchain

Le serveur blockchain est responsable de la vérification de l'intégrité des logs et de l'enregistrement des hashs sur la blockchain Hedera. Il écrit également l'ensemble des messages, hashs, fichiers chiffrés, et alertes dans MongoDB.

## Structure des Fichiers
```bash 
/root/keralis/
├── blockchain/
│   ├── test-integrity-system.js     # Tests d'intégrité
│   ├── auto3.js                     # Script d'envoi des messages sur la blockchain + 
│   ├── file-integrity-checker.js  # Vérificateur principal
│   ├── dashboard.js                 # Interface web
│   ├── ecosystem.config.js          # Configuration PM2
│   └── .env                         # Variables d'environnement
├── public/                          # Assets du dashboard
└── logs/                            # Logs système
```
## Composants Principaux

### auto3.js

Le programme principal qui traite les hashs, les fichiers de logs chiffrés et les messages blockchain.
- Enregistre le hash reçu du serveur sender dans la DB MongoDB
- Envoie le hash directement dans le topic Hedera
- Enregistre le message envoyé dans la blockchain (ici le hash) dans la DB
- Enregistre le fichier .log.enc dans la DB

<div className="screenshot-container">
  <img src="/img/mesimages/auto3.png" alt="Description de l'image" width="800" />
  <p className="caption">Schema envoi SFTP</p>
</div>

### file-integrity-checker.js

Service de monitoring qui:
- Surveille périodiquement les fichiers de logs
- Recalcule et compare les hashs du serveur Sender avec les hashs enregistrés sur la blockchain
- Génère des alertes email en cas de modification

<div className="screenshot-container">
  <img src="/img/mesimages/check.png" alt="Description de l'image" width="600" />
  <p className="caption">Schema envoi SFTP</p>
</div>

### test-integrity-system.js

Utilitaire de test qui permet de:
- Tester la connexion à l'API du serveur client
- Simuler des modifications de fichiers
- Vérifier le fonctionnement des alertes
- Tester la configuration email

:::tip
Faire `node test-integrity-system.js`peut s'averer très utile !
:::

### dashboard.js

Interface web de monitoring qui offre:
- Visualisation des logs surveillés
- État du système en temps réel
- Historique des modifications détectées
- Statistiques de surveillance

Run : `node dashboard.js`ou utiliser la config pm2 ci-dessous.

### ecosystem.config.js - 1

Configuration PM2 pour l'envoi blockchain auto3.js:

```javascript
module.exports = {
  apps: [{
    name: 'blockchain-app',
    script: 'auto3.js',
    watch: true,
    env: {
      NODE_ENV: 'production'
    }
  }]
}
```

### ecosystem.config.js - 2

Configuration PM2 pour le check integrity:

```javascript
module.exports = {
  apps: [{
    name: 'integrity-checker',
    script: 'auto3.js',
    watch: true,
    env: {
      NODE_ENV: 'production'
    }
  }]
}
```
:::tip
Penser à faire `pm2 save`pour sauvegarder les config pm2 !
:::
