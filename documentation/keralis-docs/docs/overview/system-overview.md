---
sidebar_position: 1
---

# Vue d'ensemble du système

Keralis est un système distribué de surveillance d'intégrité des fichiers de logs, utilisant la blockchain Hedera pour garantir une immuabilité et un monitoring constant des données sensibles.

## Architecture générale

<div className="screenshot-container">
  <img src="/img/mesimages/dat.png" alt="Architecture système Keralis" width="1000" />
  <p className="caption">**Schéma global de l'architecture Keralis**</p>
</div>

Le système Keralis est composé de deux serveurs principaux qui interagissent avec la blockchain Hedera pour assurer l'intégrité des fichiers de logs et la détection de toute modification / suppression de ceux-ci.

## Composants du système

### Serveur Sender/Client

Ce serveur gère la production des logs, leur traitement initial et leur transfert sécurisé vers le serveur blockchain.

#### Fonctionnalités principales:
- Détection automatique des nouveaux fichiers de logs
- Génération de hashs SHA-256 pour chaque fichier
- Chiffrement asymétrique des logs pour la transmission sécurisée
- Exposition d'une API REST pour la vérification des hashs
- Transfert SFTP des fichiers vers le serveur blockchain

#### Flux de traitement:
1. Les fichiers logs sont générés dans `/root/keralis/logs/`
2. Le script `senderV1.py` surveille ce répertoire en continu
3. Pour chaque nouveau fichier détecté:
   - Un hash SHA-256 est calculé (fichier .hash)
   - Une version chiffrée est générée (fichier .log.enc)
   - Les deux fichiers sont envoyés via SFTP au serveur blockchain
4. L'API REST expose des endpoints permettant aux autres composants de vérifier les hashs des fichiers

### Serveur Blockchain

Ce serveur constitue le cœur du système de sécurité, assurant la vérification, le stockage et la surveillance des logs.

#### Fonctionnalités principales:
- Réception et stockage des fichiers provenant du serveur client dans une base de donnée
- Publication des hashs sur la blockchain Hedera via un TopicID dédié
- Vérification périodique de l'intégrité des fichiers
- Génération d'alertes en cas de modification / suppression détectée
- Dashboard de monitoring accessible via interface web 

#### Flux de traitement:
1. Le script `auto3.js` reçoit les fichiers envoyés par SFTP
2. Les fichiers .hash et .log.enc sont stockés dans des collections MongoDB dédiées
3. Chaque hash est publié sur la blockchain Hedera comme message immuable dans le topic
4. Le service `file-integrity-checker.js` surveille périodiquement l'intégrité:
   - Il interroge l'API du serveur client pour obtenir les hashs actuels
   - Il compare ces valeurs avec celles stockées dans MongoDB et sur la blockchain
   - En cas de différence, il génère une alerte par email
5. Le `dashboard.js` fournit une interface web pour visualiser l'état du système

### Blockchain Hedera

La blockchain Hedera est utilisée comme registre immuable et public pour les hashs des fichiers de logs, offrant:

- Un stockage des hashs via le service HCS (Hedera Consensus Service)
- Un TopicID dédié pour la publication des messages
- Une vérifiabilité publique des hashs via hashscan.io
- Une preuve d'antériorité horodatée pour chaque entrée

## Flux de travail complet

1. **Génération des logs**: Les applications produisent des fichiers logs sur le serveur client
2. **Traitement initial**: Le système sender calcule le hash SHA-256 et chiffre le contenu
3. **Transfert sécurisé**: Les fichiers sont transférés via SFTP au serveur blockchain
4. **Stockage structuré**: Les fichiers et leurs métadonnées sont stockées dans MongoDB
5. **Publication blockchain**: Les hashs sont publiés sur la blockchain Hedera
6. **Vérification continue**: Le vérificateur d'intégrité surveille constamment les modifications
7. **Alertes instantanées**: Des alertes email sont envoyées en cas de détection d'altération
8. **Visualisation**: Le dashboard web permet de surveiller l'ensemble du système

Cette architecture distribuée assure que même si un composant est compromis, l'intégrité globale du système reste vérifiable et les intrusions sont immédiatement détectées.