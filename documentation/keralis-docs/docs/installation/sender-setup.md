---
sidebar_position: 2
---

# Installation du Service Sender

Cette section couvre l'installation et la configuration du service d'envoi de logs (Sender).

## Préparation

Commencez par créer la structure de dossiers nécessaire:

```bash
mkdir -p /root/keralis/sender/hash
cd /root/keralis/sender
```

## Installation des Dépendances

Installez les dépendances Node.js:

```bash
npm install
```

## Configuration

### Variables d'Environnement

Créez un fichier `.env` dans le dossier `/root/keralis/sender/`:

```bash
cat > .env << EOL
LOG_INTERVAL=300000          # 5 minutes
MAX_FILE_SIZE=500           # Taille en octets
RETENTION_DAYS=7            # Durée de conservation
OUTPUT_DIR=/root/keralis/logs
EOL
```

### Configuration PM2

Créez un fichier `ecosystem.config.js` pour gérer le service avec PM2:

```javascript
cat > ecosystem.config.js << EOL
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
EOL
```

## Démarrage du Service

Démarrez le service avec PM2 et configurez-le pour qu'il démarre automatiquement:

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Vérification

Vérifiez que le service fonctionne correctement:

```bash
pm2 status
pm2 logs auto-sender
```

Après quelques minutes, vous devriez voir de nouveaux fichiers de logs apparaître dans le répertoire `/root/keralis/logs/`.

