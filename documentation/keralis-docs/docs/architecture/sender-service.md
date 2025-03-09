---
sidebar_position: 1
---

# Service Sender

Le service Sender est responsable de la génération et de l'envoi automatique des logs.

## Localisation

Le service est installé dans le répertoire `/root/keralis/sender/`.

## Format des fichiers générés

Les fichiers de logs sont générés au format `YYYYMMDDHHMMSS.log`.

## Structure des Fichiers
```bash
/root/keralis/
├── sender/
│   ├── auto3.js               # Script de génération automatique
│   ├── ecosystem.config.js    # Configuration PM2
│   ├── .env                   # Variables d'environnement
│   └── hash/                  # Dossier temporaire des hashs
```

## Fichiers Principaux

### auto3.js

Ce script est responsable de la génération automatique des logs avec les fonctionnalités suivantes:
- Création périodique de fichiers de logs
- Format timestamp pour les noms de fichiers
- Rotation automatique des logs
- Envoi vers le dossier de destination

### ecosystem.config.js

Configuration PM2 pour le service Sender:

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

##Variables d'Environnement
Le fichier .env contient les configurations suivantes:
LOG_INTERVAL=300000          # 5 minutes
MAX_FILE_SIZE=500           # Taille en octets
RETENTION_DAYS=7            # Durée de conservation
OUTPUT_DIR=/root/keralis/logs

