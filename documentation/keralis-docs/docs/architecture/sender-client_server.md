---
sidebar_position: 2
---

# Serveur Sender / Client

Le serveur client est responsable de la gestion des fichiers de logs et du calcul des hashs.

## Localisation

Les logs sont stockés dans `/root/keralis/logs/`.

## Structure des Fichiers

```bash 
/root/keralis/
├── sender/
│   ├── setup.sh       # Script d'installation pour le serveur sender
│   ├── senderV1.py    # Programme d'envoi des fichiers .hash et .log.enc via SFTP au serveur blockchain
│   └── .env           # Variables d'environnement (définies via le ./setup.sh)
```

<div className="screenshot-container">
  <img src="/img/mesimages/schema-SFTP.png" alt="Description de l'image" width="600" />
  <p className="caption">Schema envoi SFTP</p>
</div>

## Fonctionnement du code
### setup.sh

Script qui genere le .env et le complete avec les informations données. 

### senderV1.py et PM2

Le script déroule un ensemble d'étapes automatisé dès la detection d'un nouveau fichier de log :
1. Détection d'un nouveau fichier de log
2. Génération d'un hash du fichier avec SHA256
3. Génération d'une copie chiffrée du fichier (.log.enc)
4. Envoi des 2 fichiers sur le serveur blockchain via SFTP
5. Stockage dans mongoDB sur le serveur blockchain

<div className="screenshot-container">
  <img src="/img/mesimages/senderV1-log.png" alt="Description de l'image" width="1000" />
  <p className="caption">Logs pm2 de senderV1.py</p>
</div>

## Serveur API de Hash

Le fichier `client-hash-server.js` implémente un serveur API REST avec les fonctionnalités suivantes:

- Calcul des hashs SHA-256 des fichiers
- Cache des hashs pour optimisation des performances
- API sécurisée par clé
- Gestion des modifications de test

<div className="screenshot-container">
  <img src="/img/mesimages/pm2-log-api.png" alt="Description de l'image" width="1000" />
  <p className="caption">Logs pm2 du serveur API</p>
</div>

## Endpoints API

Le serveur expose les endpoints suivants:

- `GET /api/logs` - Liste des fichiers de logs disponibles
- `GET /api/hash/:fileName` - Hash d'un fichier spécifique
- `POST /api/modify/:fileName` - Modification test (pour le développement)
- `POST /api/restore/:fileName` - Restauration d'un fichier modifié

## PM2 summary

<div className="screenshot-container">
  <img src="/img/mesimages/pm2-list-client.png" alt="Description de l'image" width="1100" />
  <p className="caption">pm2 list sur serveur client</p>
</div>

- id 1 => Sender : senderV1.py (envoi STFP)
- id 3 => Hash-server : client-hash-server.js (serveur API)
