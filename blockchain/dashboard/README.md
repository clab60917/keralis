# Keralis Dashboard

Ce dossier contient le dashboard pour le système Keralis. Il permet de visualiser les statistiques et les alertes du système.

## Structure

- `index.js` : Point d'entrée du dashboard
- `system_monitor.js` : Module pour surveiller les performances système
- `views/` : Dossier contenant les templates EJS
  - `index.ejs` : Page d'accueil du dashboard
  - `alerts.ejs` : Page des alertes
  - `partials/` : Dossier contenant les éléments partiels (header, footer, etc.)
- `public/` : Dossier contenant les fichiers statiques (CSS, JS, images)

## Installation

```bash
cd dashboard
npm install
```

## Configuration

Le dashboard utilise les variables d'environnement définies dans le fichier `.env` à la racine du dossier `blockchain`.

## Démarrage

```bash
# Avec Node.js
npm start

# Avec PM2
pm2 start ecosystem.config.js
```

## Accès

Le dashboard est accessible à l'adresse suivante :

```
http://localhost:3000
```

Utilisez les identifiants définis dans le fichier `.env` pour vous connecter. 