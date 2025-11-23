# GUIDE DE MIGRATION DOCKER - PROJET KERALIS

## 1. Contexte et Objectif
Le projet **Keralis** est une solution de sécurisation de logs via la blockchain Hedera. Actuellement, le projet fonctionne via une installation manuelle (Node.js, PM2, SFTP système) sur des serveurs Linux.

**L'objectif** est de transformer ce projet en une solution "Plug & Play" distribuée via Docker Hub. L'architecture cible se divise en deux images Docker distinctes :
1.  **`keralis-sender` (Client)** : Installé sur la machine source (qui génère les logs). Il chiffre et envoie les logs.
2.  **`keralis-server` (Backend)** : Reçoit les logs, ancre les hashs sur Hedera et stocke les preuves dans MongoDB.

L'utilisateur final devra pouvoir lancer toute l'infrastructure serveur via un simple `docker-compose up`.

## 2. Instructions pour l'Assistant de Code (Toi)
Tu as accès à l'ensemble du dépôt. Ta mission est de :
1.  Scanner et refactoriser le code JavaScript pour remplacer les configurations en dur (Hardcoded) par des variables d'environnement (`process.env`).
2.  Créer les fichiers Docker (`Dockerfile.sender`, `Dockerfile.server`, `docker-compose.yml`) à la racine.

---

## ÉTAPE 1 : MODIFICATIONS DU CODE (Refactoring)

Parcours les fichiers JavaScript (notamment dans `/sender` et `/blockchain`) et applique les changements suivants pour rendre l'application "Cloud Native".

### A. Modifications dans le Client (`sender/index.js` ou similaire)
Le Sender ne doit plus avoir d'IPs ou de chemins fixes.

**1. Configuration SFTP dynamique**
Repère la configuration de connexion SFTP.
* **Avant :** `host: '192.168.x.x'`, `username: 'root'`, `password: '...'`
* **Après :**
    ```javascript
    const sftpConfig = {
        host: process.env.SERVER_IP || 'localhost',
        port: process.env.SFTP_PORT || 2222, // Port mappé par défaut
        username: process.env.SFTP_USER || 'keralis',
        password: process.env.SFTP_PASSWORD, // Pas de valeur par défaut pour la sécu
    };
    ```

**2. Chemin des logs à surveiller (Watcher)**
Le conteneur ne verra pas `/var/log` directement, mais un volume monté.
* **Avant :** `const logDirectory = '/var/log/nginx';`
* **Après :**
    ```javascript
    // '/app/logs_mount' sera le point de montage interne dans Docker
    const logDirectory = process.env.WATCH_DIR || '/app/logs_mount';
    ```

**3. API du Client (Si applicable)**
Si le sender lance un serveur Express pour recevoir des commandes :
* **Après :** `const PORT = process.env.CLIENT_PORT || 3001;`

---

### B. Modifications dans le Serveur (`blockchain/server.js` ou `index.js`)

**1. Connexion MongoDB**
Docker Compose expose le service sous le nom `mongo`, pas `localhost`.
* **Avant :** `mongoose.connect('mongodb://localhost:27017/keralis');`
* **Après :**
    ```javascript
    const dbUri = process.env.DB_URI || 'mongodb://localhost:27017/keralis';
    mongoose.connect(dbUri, { ... });
    ```

**2. Dossier de réception des fichiers (Uploads)**
Le serveur doit surveiller un dossier partagé avec le conteneur SFTP.
* **Avant :** `const uploadPath = path.join(__dirname, '../uploads');`
* **Après :**
    ```javascript
    // Ce dossier sera un volume partagé
    const uploadPath = process.env.UPLOAD_DIR || path.join(__dirname, 'received_logs');
    ```

**3. Variables Hedera**
Assure-toi que les clés ne sont JAMAIS en dur.
* **Vérification :**
    ```javascript
    const accountId = process.env.HEDERA_ACCOUNT_ID;
    const privateKey = process.env.HEDERA_PRIVATE_KEY;
    if (!accountId || !privateKey) throw new Error('Missing Hedera Credentials');
    ```

---

## ÉTAPE 2 : CRÉATION DES FICHIERS DOCKER

Crée ces 3 fichiers **à la racine** du projet.

### Fichier 1 : `Dockerfile.sender`
*Ce fichier construit l'image pour le client.*

```dockerfile
# Image légère
FROM node:18-alpine

# Dossier de travail
WORKDIR /app

# Installation des dépendances
COPY package*.json ./
RUN npm ci --only=production

# Copie du code source complet
COPY . .

# Création du point de montage pour les logs utilisateur
RUN mkdir -p /app/logs_mount

# Variables d'environnement par défaut
ENV NODE_ENV=production
ENV WATCH_DIR=/app/logs_mount

# Commande de lancement (ADAPTE 'sender/index.js' au vrai chemin d'entrée)
CMD ["node", "sender/index.js"]
````

### Fichier 2 : `Dockerfile.server`

*Ce fichier construit l'image pour le serveur backend.*

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Dépendances
COPY package*.json ./
RUN npm ci --only=production

# Copie du code
COPY . .

# Création des dossiers nécessaires
RUN mkdir -p /app/received_logs /app/encrypted

# Port API
EXPOSE 3000

# Variables par défaut
ENV NODE_ENV=production
ENV UPLOAD_DIR=/app/received_logs

# Commande de lancement (ADAPTE 'blockchain/server.js' au vrai chemin d'entrée)
CMD ["node", "blockchain/server.js"]
```

### Fichier 3 : `docker-compose.yml`

*Ce fichier est celui que les utilisateurs finaux utiliseront pour lancer le Backend.*
*Il orchestre : Mongo + Serveur SFTP + Keralis Server.*

```yaml
version: '3.8'

services:
  # 1. Base de données
  mongo:
    image: mongo:5
    container_name: keralis_mongo
    restart: always
    volumes:
      - mongo_data:/data/db
    networks:
      - keralis_net

  # 2. Serveur SFTP (Sidecar)
  # Permet au Sender d'envoyer les fichiers ici via SSH/SFTP
  sftp:
    image: atmoz/sftp
    container_name: keralis_sftp
    restart: always
    volumes:
      # On map le dossier upload du SFTP vers un volume partagé
      - keralis_uploads:/home/keralis/upload
    ports:
      - "2222:22"
    environment:
      # Format: user:password:uid
      - SFTP_USERS=keralis:keralissecurepass:1000
    networks:
      - keralis_net

  # 3. Keralis Backend
  server:
    build:
      context: .
      dockerfile: Dockerfile.server
    image: keralis-server:latest
    container_name: keralis_core
    restart: always
    depends_on:
      - mongo
    ports:
      - "3000:3000"
    environment:
      - DB_URI=mongodb://mongo:27017/keralis
      - UPLOAD_DIR=/app/received_logs/upload
      # Variables Hedera injectées depuis le .env de l'utilisateur
      - HEDERA_ACCOUNT_ID=${HEDERA_ACCOUNT_ID}
      - HEDERA_PRIVATE_KEY=${HEDERA_PRIVATE_KEY}
      - HEDERA_NETWORK=${HEDERA_NETWORK:-testnet}
    volumes:
      # PARTAGE CRITIQUE : Le serveur Node voit ce que le SFTP reçoit
      - keralis_uploads:/app/received_logs
    networks:
      - keralis_net

volumes:
  mongo_data:
  keralis_uploads:

networks:
  keralis_net:
```

-----

## ÉTAPE 3 : VÉRIFICATION FINALE

Avant de confirmer la tâche terminée, assure-toi de :

1.  Vérifier le nom exact des fichiers d'entrée dans `package.json` (est-ce `index.js`, `server.js`, `app.js` ?) et corrige les `CMD` dans les Dockerfiles.
2.  T'assurer que le module `hash` (s'il est partagé) est bien accessible par les deux Dockerfiles (le `COPY . .` devrait gérer ça).

<!-- end list -->

```
```
