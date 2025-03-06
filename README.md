# Projet Keralis - Système de Surveillance d'Intégrité des Logs

## Vue d'ensemble
Keralis est un système distribué de surveillance d'intégrité des fichiers de logs, utilisant la blockchain Hedera pour garantir l'immuabilité des enregistrements. Le système est composé de trois composants principaux : un service d'envoi de logs (sender), un serveur client qui gère les fichiers de logs et calcule leurs hashs, et un serveur blockchain qui vérifie l'intégrité des logs et enregistre les hashs sur la blockchain.

## Architecture du Système

### Service Sender
- **Rôle** : Génération et envoi automatique des logs
- **Localisation** : `/root/keralis/sender/`
- **Format des fichiers générés** : `YYYYMMDDHHMMSS.log`

#### Structure des Fichiers
```
/root/keralis/
├── sender/
│   ├── auto3.js               # Script de génération automatique
│   ├── ecosystem.config.js    # Configuration PM2
│   ├── .env                   # Variables d'environnement
│   └── hash/                  # Dossier temporaire des hashs
```

#### Fichiers Principaux
1. **auto3.js**
   - Rôle : Génération automatique des logs
   - Fonctionnalités :
     - Création périodique de fichiers de logs
     - Format timestamp pour les noms de fichiers
     - Rotation automatique des logs
     - Envoi vers le dossier de destination
   - Configuration :
     - Intervalle de génération : 5 minutes
     - Taille maximale des fichiers : 500 octets
     - Rétention : 7 jours

2. **ecosystem.config.js**
   ```javascript
   module.exports = {
     apps: [{
       name: 'auto-sender',
       script: 'auto3.js',
       watch: true,
       env: {
         NODE_ENV: 'production'
       }
     }]
   }
   ```

#### Variables d'Environnement Sender
```bash
# Créer .env dans /sender
cat > .env << EOL
LOG_INTERVAL=300000          # 5 minutes
MAX_FILE_SIZE=500           # Taille en octets
RETENTION_DAYS=7            # Durée de conservation
OUTPUT_DIR=/root/keralis/logs
EOL
```

### Installation Service Sender

1. **Préparation**
   ```bash
   mkdir -p /root/keralis/sender/hash
   cd /root/keralis/sender
   npm install
   ```

2. **Démarrage**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   ```

### Workflow Complet
1. **Génération des Logs (Sender)**
   - Le service `auto-sender` crée un nouveau fichier toutes les 5 minutes
   - Format : `YYYYMMDDHHMMSS.log`
   - Stockage dans `/root/keralis/logs`

2. **Traitement (Client Hash Server)**
   - Détection des nouveaux fichiers
   - Calcul des hashs
   - Mise en cache des résultats

3. **Vérification (Blockchain Server)**
   - Surveillance périodique
   - Comparaison des hashs
   - Enregistrement blockchain
   - Alertes si modification

### Serveur Client
- **Rôle** : Gestion des fichiers de logs et calcul des hashs
- **Localisation des logs** : `/root/keralis/logs/`
- **Format des fichiers** : `YYYYMMDDHHMMSS.log`

#### Structure des Fichiers
```
/root/keralis/
├── logs/                    # Répertoire des fichiers de logs
├── blockchain/
│   ├── client-hash-server.js  # Serveur API de hash
│   ├── ecosystem.config.js    # Configuration PM2
│   └── .env                   # Variables d'environnement
```

#### Fichiers Principaux
1. **client-hash-server.js**
   - Rôle : Serveur API REST pour la gestion des hashs
   - Fonctionnalités :
     - Calcul des hashs SHA-256 des fichiers
     - Cache des hashs pour optimisation
     - API sécurisée par clé
     - Gestion des modifications de test
   - Endpoints :
     ```
     GET /api/logs            # Liste des fichiers
     GET /api/hash/:fileName  # Hash d'un fichier
     POST /api/modify/:fileName  # Modification test
     POST /api/restore/:fileName # Restauration
     ```

### Serveur Blockchain
- **Rôle** : Vérification de l'intégrité et enregistrement blockchain

#### Structure des Fichiers
```
/root/keralis/
├── blockchain/
│   ├── test-integrity-system.js     # Tests d'intégrité
│   ├── blockchain-integrity-checker.js  # Vérificateur principal
│   ├── dashboard.js                 # Interface web
│   ├── ecosystem.config.js          # Configuration PM2
│   └── .env                         # Variables d'environnement
├── public/                          # Assets du dashboard
└── logs/                            # Logs système
```

#### Fichiers Principaux
1. **blockchain-integrity-checker.js**
   - Rôle : Service principal de vérification
   - Fonctionnalités :
     - Surveillance périodique des logs
     - Comparaison des hashs
     - Enregistrement blockchain
     - Alertes email

2. **test-integrity-system.js**
   - Rôle : Tests du système
   - Fonctionnalités :
     - Test de connexion API
     - Simulation de modifications
     - Vérification des alertes
     - Tests email

3. **dashboard.js**
   - Rôle : Interface de monitoring
   - Fonctionnalités :
     - Visualisation des logs
     - État du système
     - Historique des modifications
     - Statistiques

## Guide d'Installation

### Prérequis
- Node.js v18+
- PM2 (global) : `npm install -g pm2`
- MongoDB v5+
- Compte Hedera Testnet
- Serveurs Linux (Ubuntu 20.04+ recommandé)

### Installation Serveur Client

1. **Préparation**
   ```bash
   # Création structure
   mkdir -p /root/keralis/logs
   cd /root/keralis
   git clone <repo_url> .
   cd blockchain
   npm install
   ```

2. **Configuration**
   ```bash
   # Créer .env
   cat > .env << EOL
   HASH_SERVER_PORT=3001
   HASH_SERVER_API_KEY=<generate_strong_key>
   EOL
   ```

3. **Configuration PM2**
   ```bash
   # ecosystem.config.js pour le client
   module.exports = {
     apps: [{
       name: 'hash-server',
       script: 'client-hash-server.js',
       watch: true,
       env: {
         NODE_ENV: 'production'
       }
     }]
   }
   ```

4. **Démarrage**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   ```

### Installation Serveur Blockchain

1. **Préparation**
   ```bash
   mkdir -p /root/keralis
   cd /root/keralis
   git clone <repo_url> .
   cd blockchain
   npm install
   ```

2. **Configuration**
   ```bash
   # Créer .env
   cat > .env << EOL
   # Hedera
   MY_ACCOUNT_ID=<your_account_id>
   MY_PRIVATE_KEY=<your_private_key>
   MY_PUBLIC_KEY=<your_public_key>

   # MongoDB
   MONGODB_USER=<db_user>
   MONGODB_PASSWORD=<db_password>
   MONGODB_HOST=<db_host>
   MONGODB_PORT=27017
   MONGODB_DB_NAME=Blockchain
   MONGODB_COLLECTION=messages
   MONGODB_AUTH_SOURCE=admin

   # Application
   HASH_SERVER_URL=http://<client_ip>:3001
   HASH_SERVER_API_KEY=<same_as_client>
   CHECK_INTERVAL=900000

   # Dashboard
   DASHBOARD_PORT=3000
   DASHBOARD_USER=<admin_user>
   DASHBOARD_PASSWORD=<strong_password>

   # Email
   SMTP_HOST=<smtp_host>
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=<email_user>
   SMTP_PASS=<email_password>
   ALERT_EMAIL_FROM=<sender_email>
   ALERT_EMAIL_TO=<recipient_email>
   EOL
   ```

3. **Configuration PM2**
   ```bash
   # ecosystem.config.js pour blockchain
   module.exports = {
     apps: [{
       name: 'blockchain-checker',
       script: 'blockchain-integrity-checker.js',
       watch: true,
       env: {
         NODE_ENV: 'production'
       }
     }, {
       name: 'dashboard',
       script: 'dashboard.js',
       env: {
         NODE_ENV: 'production'
       }
     }]
   }
   ```

4. **Démarrage**
   ```bash
   pm2 start ecosystem.config.js
   pm2 save
   ```

## Tests et Vérification

### Test du Serveur Hash
```bash
# Sur le serveur client
curl -H "x-api-key: <your_api_key>" http://localhost:3001/api/logs
```

### Test du Système Complet
```bash
# Sur le serveur blockchain
cd blockchain
node test-integrity-system.js
```

### Vérification des Services
```bash
pm2 list
pm2 logs
```

## Maintenance et Monitoring

### Logs Système
- **Sender** : `/root/keralis/sender/logs/`
- **Hash Server** : `/root/keralis/logs/hash-server.log`
- **PM2** : `pm2 logs`
- **Application** : `/root/keralis/logs/`

### Services PM2
```bash
# Liste des services
pm2 list

# Logs spécifiques
pm2 logs auto-sender    # Logs du sender
pm2 logs hash-server    # Logs du serveur hash
pm2 logs dashboard      # Logs du dashboard

# Redémarrage ciblé
pm2 restart auto-sender # Redémarrer le sender
```

### Commandes Utiles
```bash
# Redémarrage services
pm2 restart all

# Mise à jour du code
git pull
pm2 reload all

# Nettoyage cache
pm2 flush
```

### Monitoring
- Dashboard : `http://<blockchain_ip>:3000`
- PM2 Monitoring : `pm2 monit`
- Logs en temps réel : `pm2 logs`

## Sécurité

### Bonnes Pratiques
1. Changer régulièrement les clés API
2. Utiliser des mots de passe forts
3. Mettre à jour régulièrement les dépendances
4. Sauvegarder les fichiers .env
5. Monitorer les logs d'accès

### Firewall
Ports à ouvrir :
- Serveur Client : 3001 (API)
- Serveur Blockchain : 3000 (Dashboard)

## Dépannage

### Problèmes Courants
1. **API inaccessible**
   ```bash
   pm2 restart hash-server
   pm2 logs hash-server
   ```

2. **Emails non reçus**
   - Vérifier configuration SMTP
   - Tester avec `node test-integrity-system.js`

3. **Dashboard inaccessible**
   ```bash
   pm2 restart dashboard
   pm2 logs dashboard
   ```

## Dépendances
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "@hashgraph/sdk": "^2.x",
    "mongodb": "^5.x",
    "nodemailer": "^6.x",
    "winston": "^3.x",
    "axios": "^1.x",
    "cors": "^2.x"
  }
}
```

## Prochaines Étapes
1. Implémentation Hedera
   - Création smart contract
   - Stockage des hashs
   - Vérification blockchain

2. Améliorations Dashboard
   - Graphiques temps réel
   - Historique complet
   - Export données

3. Optimisations
   - Rotation des logs
   - Compression données
   - Cache distribué

4. Sécurité
   - Audit complet
   - Tests pénétration
   - Chiffrement bout en bout
