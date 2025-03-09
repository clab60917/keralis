---
sidebar_position: 1
---

# Monitoring et Maintenance

Cette section couvre les aspects de monitoring et de maintenance du système Keralis.

## Logs Système

Voici où trouver les logs des différents composants:

- **Sender**: `/root/keralis/sender/logs/`
- **Hash Server**: `/root/keralis/logs/hash-server.log`
- **PM2**: `pm2 logs`
- **Application**: `/root/keralis/logs/`

## Surveillance des Services PM2

### Liste des Services

Pour voir l'état de tous les services:

```bash
pm2 list
```

Logs Spécifiques
Pour consulter les logs d'un service spécifique:
```
pm2 logs auto-sender    # Logs du sender
pm2 logs hash-server    # Logs du serveur hash
pm2 logs dashboard      # Logs du dashboard
```
Monitoring en Temps Réel
Pour un monitoring en temps réel:

```
pm2 monit
```
Redémarrage et Mises à Jour
Redémarrage des Services
Pour redémarrer tous les services:

```
pm2 restart all
```
Pour redémarrer un service spécifique:

```
pm2 restart auto-sender
```
Mise à Jour du Code
Pour mettre à jour le code depuis le dépôt Git:
```
cd /root/keralis
git pull
pm2 reload all
```
Nettoyage du Cache
Pour nettoyer le cache de PM2:
```
pm2 flush
```
Interfaces de Monitoring
```
Dashboard: http://`blockchain_ip`:3000
PM2 Monitoring: pm2 monit
```

