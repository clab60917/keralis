---
sidebar_position: 1
---

# Introduction

Bienvenue dans la documentation du Projet Keralis, un système distribué de surveillance d'intégrité des fichiers de logs utilisant la blockchain Hedera pour garantir l'immuabilité et la traçabilité des journaux système.

## La problématique de sécurité des logs

Dans le paysage actuel de la cybersécurité, les fichiers de logs représentent des éléments critiques pour la détection des incidents et les investigations de sécurité. Cependant, ces fichiers constituent également une cible privilégiée lors d'attaques informatiques.

### Menaces externes

Les attaquants externes qui parviennent à compromettre un système cherchent généralement à effacer leurs traces pour :
- Dissimuler leur présence sur le réseau
- Masquer les actions malveillantes effectuées
- Allonger le délai de détection de l'intrusion
- Compliquer l'analyse forensique post-incident

La modification ou suppression des fichiers de logs est souvent l'une des premières actions entreprises après avoir obtenu des privilèges élevés sur un système.

### Menaces internes

Les menaces internes représentent un risque tout aussi important :
- Administrateurs système disposant de droits d'accès élevés
- Employés malveillants cherchant à dissimuler des actions non autorisées
- Personnel technique pouvant modifier les logs pour masquer des erreurs ou négligences

### Scénarios d'incidents courants

- **Vol de données sensibles** : Un attaquant exfiltre des données confidentielles puis efface les logs de connexion
- **Fraude interne** : Un employé manipule des systèmes critiques puis altère les journaux d'audit
- **Vol de propriété intellectuelle** : Des accès inhabituels aux référentiels de code sont masqués par la suppression des logs
- **Sabotage** : Des modifications critiques sont effectuées puis dissimulées par l'altération des logs

La plupart des frameworks de sécurité (NIST, ISO27001, PCI-DSS) exigent la protection de l'intégrité des logs, mais les solutions traditionnelles présentent souvent des failles exploitables.

## Qu'est-ce que Keralis ?

Keralis est une solution complète et innovante qui répond spécifiquement à ces problématiques de sécurité. Le système intègre plusieurs technologies avancées pour créer une architecture distribuée hautement sécurisée.

### Fonctionnalités principales

- **Surveillance en temps réel** de l'intégrité des fichiers de logs
- **Garantie d'immuabilité** via l'ancrage des hashs sur la blockchain Hedera
- **Détection instantanée** de toute modification ou suppression
- **Alertes automatisées** par email en cas d'incident détecté
- **Vérifiabilité publique** des preuves d'intégrité via la blockchain
- **Dashboard centralisé** pour le monitoring et l'analyse des événements

### Architecture sécurisée

Keralis utilise une architecture distribuée où :
- Les logs sont traités sur un serveur sécurisé dédié
- Les hashs et les fichiers chiffrés sont stockés séparément
- Les empreintes cryptographiques sont ancrées sur la blockchain Hedera
- Le monitoring est effectué par un système indépendant

Cette séparation des responsabilités garantit qu'un attaquant devrait compromettre plusieurs systèmes indépendants pour dissimuler ses actions, augmentant significativement le niveau de sécurité global.

### Avantages uniques

- **Preuve d'antériorité** : Horodatage blockchain incontestable
- **Non-répudiation** : Les modifications sont toujours détectées et signalées
- **Conformité réglementaire** : Répond aux exigences des normes de sécurité (NIST, ISO27001, PCI-DSS)
- **Transparence et auditabilité** : Vérification indépendante possible via la blockchain publique

Cette documentation vous guidera à travers l'installation, la configuration et l'utilisation du système Keralis pour sécuriser vos infrastructures critiques.