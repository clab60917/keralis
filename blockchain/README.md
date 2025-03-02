# Système de Sauvegarde de Logs dans Hedera Blockchain

Ce projet implémente un système de sauvegarde de fichiers de hash logs dans la blockchain Hedera. Chaque message publié sur un topic Hedera correspond à un hash d'un fichier de log, permettant ainsi de garantir l'intégrité et la traçabilité des logs.

## Fonctionnalités

- Surveillance d'un répertoire pour détecter les nouveaux fichiers
- Publication des contenus de fichiers sur un topic Hedera
- Sauvegarde des messages dans MongoDB
- Suivi des fichiers déjà traités pour éviter les doublons
- Gestion propre des arrêts et des erreurs

## Prérequis

- Node.js (v14 ou supérieur)
- MongoDB
- Compte Hedera (Testnet ou Mainnet)

## Installation

1. Clonez ce dépôt :
```bash
git clone <url-du-repo>
cd <nom-du-repo>
```

2. Installez les dépendances :
```bash
npm install
```

3. Créez un fichier `.env` à la racine du projet avec les variables suivantes :
```
# Configuration Hedera
MY_ACCOUNT_ID=votre-account-id-hedera
MY_PRIVATE_KEY=votre-private-key-hedera

# Configuration MongoDB (Option 1: URI complète)
MONGODB_URI=mongodb://utilisateur:mot-de-passe@hote:port/?authSource=admin

# Configuration MongoDB (Option 2: Composants individuels)
# Si MONGODB_URI n'est pas défini, ces variables seront utilisées pour construire l'URI
MONGODB_USER=utilisateur
MONGODB_PASSWORD=mot-de-passe
MONGODB_HOST=hote
MONGODB_PORT=port
MONGODB_DB_NAME=nom-de-la-base
MONGODB_COLLECTION=nom-de-la-collection
MONGODB_AUTH_SOURCE=admin

# Configuration de l'application
WATCH_DIR=/chemin/vers/repertoire/a/surveiller
LOG_LEVEL=info  # options: debug, info, error
```

## Utilisation

Pour démarrer l'application :

```bash
node auto3.js
```

L'application va :
1. Se connecter à MongoDB
2. Créer un topic Hedera (si aucun n'existe déjà)
3. Surveiller le répertoire spécifié
4. Traiter les nouveaux fichiers et les publier sur Hedera
5. Sauvegarder les informations dans MongoDB

## Structure du projet

- `auto3.js` : Point d'entrée principal de l'application
- `tests/` : Tests unitaires
- `processedFiles.json` : Fichier de suivi des fichiers déjà traités
- `topicId.txt` : Stockage de l'ID du topic Hedera

## Tests

Pour exécuter les tests unitaires :

```bash
npm test
```

## Déploiement sur un serveur VPS Ubuntu

1. Connectez-vous à votre VPS :
```bash
ssh utilisateur@adresse-ip
```

2. Installez Node.js et MongoDB si nécessaire :
```bash
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs
```

3. Clonez le dépôt et configurez l'application comme indiqué dans la section Installation.

4. Pour exécuter l'application en arrière-plan avec PM2 :
```bash
npm install -g pm2
pm2 start auto3.js --name "hedera-log-backup"
pm2 save
pm2 startup
```

## Sécurité

- Ne stockez jamais vos informations d'identification en dur dans le code
- Utilisez toujours des variables d'environnement pour les informations sensibles
- Assurez-vous que votre fichier `.env` est inclus dans `.gitignore` pour éviter de le pousser accidentellement vers un dépôt public

## Licence

MIT

## Auteur

Votre nom 