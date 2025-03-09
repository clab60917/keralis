---
sidebar_position: 3
---

# Serveur Blockchain

Le serveur blockchain est responsable de la vérification de l'intégrité des logs et de l'enregistrement des hashs sur la blockchain Hedera.

## Structure des Fichiers
```bash 
/root/keralis/
├── blockchain/
│   ├── test-integrity-system.js     # Tests d'intégrité
│   ├── blockchain-integrity-checker.js  # Vérificateur principal
│   ├── dashboard.js                 # Interface web
│   ├── ecosystem.config.js          # Configuration PM2
│   └── .env                         # Variables d'environnement
├── public/                          # Assets du dashboard
└── logs/                            # Logs système
```
## Composants Principaux

### blockchain-integrity-checker.js

Service principal qui:
- Surveille périodiquement les fichiers de logs
- Compare les hashs actuels avec les hashs enregistrés
- Enregistre les nouveaux hashs sur la blockchain Hedera
- Génère des alertes email en cas de modification

### test-integrity-system.js

Utilitaire de test qui permet de:
- Tester la connexion à l'API du serveur client
- Simuler des modifications de fichiers
- Vérifier le fonctionnement des alertes
- Tester la configuration email

### dashboard.js

Interface web de monitoring qui offre:
- Visualisation des logs surveillés
- État du système en temps réel
- Historique des modifications détectées
- Statistiques de surveillance
