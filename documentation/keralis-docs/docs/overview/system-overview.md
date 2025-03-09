---
sidebar_position: 1
---

# Vue d'ensemble du système

Keralis est un système distribué de surveillance d'intégrité des fichiers de logs, utilisant la blockchain Hedera pour garantir l'immuabilité des enregistrements.

## Architecture générale

Le système est composé de trois composants principaux qui fonctionnent ensemble pour assurer l'intégrité des logs:

1. **Service d'envoi de logs (Sender)**
   - Génère et envoie automatiquement les logs
   - Crée des fichiers au format `YYYYMMDDHHMMSS.log`
   - Gère la rotation et la rétention des logs

2. **Serveur Client**
   - Gère les fichiers de logs
   - Calcule les hashs SHA-256 des fichiers
   - Expose une API sécurisée pour accéder aux hashs

3. **Serveur Blockchain**
   - Vérifie périodiquement l'intégrité des logs
   - Enregistre les hashs sur la blockchain Hedera
   - Génère des alertes en cas de modification
   - Fournit une interface de monitoring (dashboard)

## Flux de travail

1. Le service Sender génère un nouveau fichier de log toutes les 5 minutes
2. Le Serveur Client détecte le nouveau fichier, calcule son hash et le met en cache
3. Le Serveur Blockchain vérifie périodiquement l'intégrité des logs en comparant les hashs
4. Si une modification est détectée, une alerte est envoyée
5. Les hashs sont enregistrés sur la blockchain Hedera pour garantir leur immuabilité
