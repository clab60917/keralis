---
sidebar_position: 1
---

# Introduction

Bienvenue dans la documentation du Projet Keralis, un système distribué de surveillance d'intégrité des fichiers de logs utilisant la blockchain Hedera pour garantir l'immuabilité des fichiers de logs serveur.

## Qu'est-ce que Keralis ?

Keralis est une solution complète pour:
- Surveiller l'intégrité des fichiers de logs
- Garantir leur immuabilité via la blockchain 
- Alerter en cas de modification des fichiers

## Composants principaux

Le système est composé de trois composants principaux:
1. **Service d'envoi de logs (Sender)** - Traite et envoie automatiquement les logs serveurs vers le serveur blockchain
2. **Serveur Client** - Gère les fichiers de logs et calcule leurs hashs
3. **Serveur Blockchain** - Vérifie l'intégrité des logs et enregistre les hashs sur la blockchain

Cette documentation vous guidera à travers l'installation, la configuration et l'utilisation du système Keralis.
