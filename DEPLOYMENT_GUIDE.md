# Guide de Déploiement Keralis (Docker)

Ce guide explique comment déployer l'infrastructure Keralis en utilisant les images Docker.

## Architecture
- **Serveur (Backend)** : Reçoit les logs, les stocke et les ancre sur Hedera.
- **Client (Sender)** : Installé sur la machine source, chiffre et envoie les logs au serveur.

---

## 1. Installation du Serveur (Backend)

Sur la machine qui fera office de serveur central :

### Pré-requis
- Docker et Docker Compose installés.
- Un fichier `.env` avec vos clés Hedera.

### Démarrage
1. Créez un dossier pour Keralis.
2. Copiez-y le fichier `docker-compose.yml`.
3. Créez un fichier `.env` à côté :
   ```bash
   HEDERA_ACCOUNT_ID=0.0.xxxx
   HEDERA_PRIVATE_KEY=302...
   HEDERA_NETWORK=testnet
   ```
4. Lancez la stack :
   ```bash
   docker compose up -d
   ```

Cela va démarrer :
- **MongoDB** (Base de données)
- **SFTP** (Port 2222 - Pour recevoir les fichiers)
- **Keralis Server** (Backend Node.js)

---

## 2. Installation du Client (Sender)

Sur la machine source (celle qui génère les logs à sécuriser) :

### Démarrage
Utilisez la commande `docker run` pour lancer l'agent. Vous devez lui monter le dossier de logs à surveiller.

```bash
docker run -d \
  --name keralis-sender \
  --restart always \
  # Montage du dossier de logs de l'hôte vers le conteneur
  -v /var/log/nginx:/app/logs_mount \
  # Configuration SFTP (vers votre Serveur Keralis)
  -e SFTP_HOST=ip_de_votre_serveur \
  -e SFTP_PORT=2222 \
  -e SFTP_USERNAME=keralis \
  -e SFTP_PASSWORD=keralissecurepass \
  # Nom de l'image sur le Hub
  mon-user-dockerhub/keralis-sender:latest
```

### Vérification
Le client va commencer à surveiller `/var/log/nginx` (ou tout autre dossier monté). Dès qu'un fichier `.log` est créé ou modifié (selon la logique du script), il sera chiffré et envoyé au serveur.
