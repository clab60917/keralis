# Guide de Publication Docker Hub

Ce guide explique comment construire et publier les images Keralis sur Docker Hub pour qu'elles soient accessibles à tous.

## 1. Pré-requis

1.  Avoir un compte sur [Docker Hub](https://hub.docker.com/).
2.  Être connecté en ligne de commande :
    ```bash
    docker login
    ```

## 2. Stratégie Multi-Architecture (Important)

Comme vous êtes sur Mac (Apple Silicon / ARM64) et que la plupart des serveurs sont sous Linux (AMD64/x86_64), il est **crucial** de construire des images multi-architectures. Sinon, vos images ne fonctionneront pas sur les serveurs standards.

Nous utiliserons `docker buildx`.

### Initialisation (à faire une seule fois)
```bash
docker buildx create --use
```

## 3. Commandes de Publication

Remplacez `VOTRE_USER` par votre nom d'utilisateur Docker Hub (ex: `clab60917`).

### A. Publier le Client (Sender)

```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  -t clemarz/keralis-sender:latest \
  -t clemarz/keralis-sender:1.0.0 \
  -f Dockerfile.sender \
  --push .
```

### B. Publier le Serveur (Backend)

```bash
docker buildx build --platform linux/amd64,linux/arm64 \
  -t clemarz/keralis-server:latest \
  -t clemarz/keralis-server:1.0.0 \
  -f Dockerfile.server \
  --push .
```

## 4. Vérification

Allez sur votre profil Docker Hub : https://hub.docker.com/u/clemarz
Vous devriez voir deux nouveaux dépôts : `keralis-sender` et `keralis-server`.

## 5. Mettre à jour le docker-compose.yml public

Une fois les images publiées, pensez à mettre à jour le fichier `docker-compose.yml` que vous distribuez pour qu'il utilise vos images officielles au lieu de construire localement.

**Dans `docker-compose.yml` :**

Remplacer :
```yaml
  server:
    build:
      context: .
      dockerfile: Dockerfile.server
    image: keralis-server:latest
```

Par :
```yaml
  server:
    image: clemarz/keralis-server:latest
```
