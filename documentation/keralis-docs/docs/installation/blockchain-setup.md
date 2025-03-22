---
sidebar_position: 4
---

# Installation du Serveur Blockchain

Cette section couvre l'installation et la configuration du serveur blockchain qui vérifie l'intégrité des logs et enregistre les hashs sur la blockchain Hedera.

## Préparation

Commencez par créer la structure de dossiers nécessaire:

```bash
mkdir -p /root/keralis
cd /root/keralis
git clone <repo_url> .
cd blockchain
```

## Installation des Dépendances

Installez les dépendances Node.js:

```bash
npm install
```

## Configuration de MongoDB

Assurez-vous que MongoDB est installé et en cours d'exécution:

```bash
# Installation de MongoDB (si nécessaire)
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```
<div className="screenshot-container">
  <img src="/img/mesimages/mongo.png" alt="Liste des alertes reçues par email" width="600" />
  <p className="caption">**Schema d'architecture de la DB mongoDB**</p>
</div>


## Configuration

### Variables d'Environnement

Créez un fichier `.env` dans le dossier `/root/keralis/blockchain/`:

```bash
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

### Configuration PM2

Créez un fichier `ecosystem.config.js` pour gérer les services avec PM2:

```javascript
cat > ecosystem.config.js << EOL
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
EOL
```

## Démarrage des Services

Démarrez les services avec PM2 et configurez-les pour qu'ils démarrent automatiquement:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Test du Système

Testez le système complet:

```bash
node test-integrity-system.js
```

## Accès au Dashboard

Le dashboard devrait être accessible à l'adresse suivante:

```
http://<blockchain_server_ip>:3000
```

Utilisez les identifiants définis dans le fichier `.env` pour vous connecter.

## Installation du Serveur blockchain-api

Cette section couvre l'installation et la configuration du serveur client qui gère les fichiers de logs et calcule leurs hashs.

### Préparation

Commencez par créer la structure de dossiers nécessaire:

```bash
mkdir -p /root/keralis/logs
cd /root/keralis
git clone <repo_url> .
cd blockchain
```

### Installation des Dépendances

Installez les dépendances Node.js:

```bash
npm install
```

### Configuration

#### Variables d'Environnement

Créez un fichier `.env` dans le dossier `/root/keralis/blockchain/`:

```bash
cat > .env << EOL
HASH_SERVER_PORT=3001
HASH_SERVER_API_KEY=<generate_strong_key>
EOL
```

:::tip
Utilisez une commande comme `openssl rand -hex 32` pour générer une clé API forte.
:::

#### Configuration PM2

Créez un fichier `ecosystem.config.js` pour gérer le service avec PM2:

```javascript
cat > ecosystem.config.js << EOL
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
EOL
```

### Démarrage du Serveur

Démarrez le serveur avec PM2 et configurez-le pour qu'il démarre automatiquement:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Test de l'API

Vérifiez que l'API fonctionne correctement:

```bash
curl -H "x-api-key: <your_api_key>" http://localhost:3001/api/logs
```

Si tout est configuré correctement, vous devriez obtenir une liste des fichiers de logs disponibles au format JSON.