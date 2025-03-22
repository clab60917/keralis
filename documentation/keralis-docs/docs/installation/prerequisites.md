---
sidebar_position: 1
---

# Prérequis

Avant d'installer Keralis, assurez-vous que votre système répond aux exigences suivantes:

## Environnement Requis

- Node.js v18 ou supérieur
- PM2 (global): `npm install -g pm2`
- MongoDB v5 ou supérieur
- Compte Hedera Testnet
- Serveurs Linux (Ubuntu 20.04 ou supérieur recommandé)

## Dépendances NPM

Les principales dépendances du projet sont:

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "@hashgraph/sdk": "^2.x",
    "mongodb": "^5.x",
    "nodemailer": "^6.x",
    "winston": "^3.x",
    "axios": "^1.x",
    "cors": "^2.x"
  }
}
```

## Configuration du Réseau

Assurez-vous que les ports suivants sont accessibles:

- Serveur Client: Port 3001 (API)
- Serveur Blockchain: Port 3000 (Dashboard)

## Préparation des Serveurs

:::tip
Il est possible de mettre les 2 serveurs dans une même VLAN pour plus de simplicité au niveau de la gestion réseau.
:::

**Il est necessaire d'utiliser deux serveurs distincts:**

- Serveur Client: Pour la gestion des logs et le calcul des hashs
- Serveur Blockchain: Pour la vérification de l'intégrité et le dashboard

