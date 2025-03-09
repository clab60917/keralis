---
sidebar_position: 1
---

# Problèmes Courants

Cette section couvre les problèmes courants et leurs solutions pour le système Keralis.

## API Inaccessible

Si l'API du serveur hash est inaccessible:

1. Vérifiez que le service est en cours d'exécution:
   ```bash
   pm2 status hash-server ```

2. Redémarrez le service :
   ```
pm2 restart hash-server
```
3. Vérifiez les logs et identifiez le problème : 
```
pm2 logs hash-server
```
4. Vérifiez la configuration du port et du firewall : 
```
netstat -tulpn | grep 3001
sudo ufw status
```

## Emails non reçus

Si les alertes par email ne sont pas reçues:

1. Vérifiez la configuration SMTP dans le fichier .env
2. Testez l'envoi d'email avec le script de test:
```
cd /root/keralis/blockchain
node test-integrity-system.js
```
3. Vérifiez les logs pour les erreurs SMTP:
```
pm2 logs blockchain-checker
```
4. Assurez-vous que votre serveur SMTP autorise les connexions depuis l'adresse IP du serveur blockchain

## Dashboard Inacessible
Si le dashboard est inacessible : 
1. Vérifiez que le service est en cours d'execution :
```
pm2 status dashboard
```
2. Redémarrez le service : 
```
pm2 restart dashboard
```
3. Vérifiez les logs pour identifier le problème:
```
pm2 logs dashboard
```
4. Vérifiez la config firewall (cf au dessus)

## Problèmes de Connexion MongoDB
Si vous rencontrez des problèmes avec MongoDB:

1. Vérifiez que MongoDB est en cours d'exécution:
```
sudo systemctl status mongod
```
2. Redémarrez MongoDB:
```
sudo systemctl restart mongod
```
3. Vérifiez les logs MongoDB:
```
sudo tail -f /var/log/mongodb/mongod.log
```
4. Vérifiez la configuration de connexion dans le fichier .env



