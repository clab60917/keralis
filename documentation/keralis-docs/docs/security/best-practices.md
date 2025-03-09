---
sidebar_position: 1
---

# Bonnes Pratiques de Sécurité

Cette section couvre les bonnes pratiques de sécurité pour le système Keralis.

## Gestion des Clés et Mots de Passe

1. **Rotation des Clés API**
   - Changez régulièrement la clé API du serveur hash
   - Planifiez une rotation tous les 90 jours

2. **Mots de Passe Forts**
   - Utilisez des mots de passe forts pour le dashboard
   - Minimum 12 caractères avec majuscules, minuscules, chiffres et caractères spéciaux

3. **Stockage Sécurisé**
   - Sauvegardez les fichiers `.env` dans un endroit sécurisé
   - Ne partagez jamais les clés privées Hedera

## Sécurité du Réseau

1. **Configuration du Firewall**
   - Limitez l'accès aux ports nécessaires uniquement
   - Serveur Client: Port 3001 (API)
   - Serveur Blockchain: Port 3000 (Dashboard)

2. **HTTPS**
   - Configurez HTTPS pour le dashboard et l'API
   - Utilisez Let's Encrypt pour obtenir des certificats gratuits

## Mise à Jour et Maintenance

1. **Dépendances**
   - Mettez à jour régulièrement les dépendances
   - Utilisez `npm audit` pour identifier les vulnérabilités

2. **Système d'Exploitation**
   - Appliquez régulièrement les mises à jour de sécurité
   - Configurez les mises à jour automatiques

## Surveillance et Audits

1. **Logs d'Accès**
   - Surveillez les logs d'accès au dashboard et à l'API
   - Configurez des alertes pour les tentatives d'accès suspectes

2. **Audit Régulier**
   - Effectuez un audit de sécurité tous les 6 mois
   - Vérifiez la configuration et les permissions
