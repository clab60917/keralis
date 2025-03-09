---
sidebar_position: 2
---

# Serveur Client

Le serveur client est responsable de la gestion des fichiers de logs et du calcul des hashs.

## Localisation

Les logs sont stockés dans `/root/keralis/logs/`.

## Structure des Fichiers
## Serveur API de Hash

Le fichier `client-hash-server.js` implémente un serveur API REST avec les fonctionnalités suivantes:

- Calcul des hashs SHA-256 des fichiers
- Cache des hashs pour optimisation des performances
- API sécurisée par clé
- Gestion des modifications de test

## Endpoints API

Le serveur expose les endpoints suivants:

- `GET /api/logs` - Liste des fichiers de logs disponibles
- `GET /api/hash/:fileName` - Hash d'un fichier spécifique
- `POST /api/modify/:fileName` - Modification test (pour le développement)
- `POST /api/restore/:fileName` - Restauration d'un fichier modifié
