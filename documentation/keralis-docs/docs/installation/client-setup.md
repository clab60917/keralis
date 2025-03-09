---
sidebar_position: 3
---

# Installation du Serveur Client

Cette section couvre l'installation et la configuration du serveur client qui gère les fichiers de logs et calcule leurs hashs.

## Préparation

Commencez par créer la structure de dossiers nécessaire:

```bash
mkdir -p /root/keralis/logs
cd /root/keralis
git clone `repo_url` .
cd blockchain
```

## Installation des Dépendances

Installez les dépendances Node.js:

```bash
npm install
```

## Configuration

### Variables d'Environnement

Créez un fichier `.env` dans le dossier `/root/keralis/blockchain/`:

```bash
cat > .env << EOL
HASH_SERVER_PORT=3001
HASH_SERVER_API_KEY=`generate_strong_key`
EOL
```

:::tip
Utilisez une commande comme `openssl rand -hex 32` pour générer une clé API forte.
:::

### Configuration PM2

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

## Démarrage du Serveur

Démarrez le serveur avec PM2 et configurez-le pour qu'il démarre automatiquement:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Test de l'API

Vérifiez que l'API fonctionne correctement:

```bash
curl -H "x-api-key: `your_api_key`" http://localhost:3001/api/logs
```

Si tout est configuré correctement, vous devriez obtenir une liste des fichiers de logs disponibles au format JSON.
