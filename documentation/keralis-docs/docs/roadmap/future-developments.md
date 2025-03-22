---
sidebar_position: 1
---

# Prochaines Étapes et Viabilité

Suite au développement complet de la version 1.0 de Keralis, nous avons conduit une analyse approfondie de la viabilité technique et financière de la solution. Cette évaluation est essentielle pour garantir que la plateforme peut répondre efficacement aux besoins des entreprises dans des conditions réelles d'utilisation.

## Faisabilité Technique

### Tests de Charge et Optimisation

Nous avons effectué plusieurs tests de charge pour déterminer les limites et capacités de notre système :

#### Volumétrie Optimale par Fichier

Une question importante concernait la taille optimale des fichiers de logs à traiter. Nos tests montrent que :

- **Taille recommandée** : 10 000 lignes de logs par fichier
- **Capacité maximale** : Le système peut facilement traiter plus de 100 000 lignes par fichier pour le calcul des hashs SHA-256.
Pour le vérifier nous avons run des calculs de hash pour des tailles de fichiers de logs variables, les différences en terme de temps nous permettent de monter jusqu'a 100 000 lignes de logs en traitement sans soucis.


##### Tableau comparatif

| Nombre de lignes | Temps réel (s) | Temps utilisateur (s) | Temps système (s) |
|------------------|----------------|------------------------|-------------------|
| 10               | 0.003          | 0.002                  | 0.000             |
| 100              | 0.001          | 0.000                  | 0.001             |
| 1,000            | 0.002          | 0.000                  | 0.001             |
| 8,465            | 0.002          | 0.001                  | 0.001             |
| 101,580          | 0.006          | 0.004                  | 0.002             |

##### Graphique de performance

```
Temps réel (secondes)
0.006 |                                                      *
      |                                                      
      |                                                      
0.005 |                                                      
      |                                                      
      |                                                      
0.004 |                                                      
      |                                                      
      |                                                      
0.003 |  *                                                   
      |                                                      
      |                                                      
0.002 |              *                   *                   
      |                                                      
      |                                                      
0.001 |         *                                            
      |                                                      
      +------------------------------------------------------
         10       100      1K       10K      100K     1000K
                          Nombre de lignes (échelle log)
```

- **Perspective d'évolution** : Pour les logs les plus anciens, nous envisageons d'implémenter un système de regroupement en pools pour optimiser le stockage et les performances

#### Scénario Réel pour une PME

Pour une PME typique avec une infrastructure standard (serveur web et services associés), nous avons mesuré la production moyenne de logs sur 24 heures avec des fichiers standardisés à 10 000 lignes :

| Type de Logs | Nombre de Fichiers / 24h |
|--------------|--------------------------|
| Syslogs      | 72 fichiers              |
| Auth.log     | 8 fichiers               |
| Cron.log     | 2 fichiers               |
| Audit.log    | 29 fichiers              |
| **Total**    | **111 fichiers**         |

#### Capacité de Traitement Réelle

Pour une infrastructure composée de 5 serveurs :

- **Volume journalier** : 555 fichiers (5 × 111)
- **Fréquence moyenne** : 1 fichier toutes les 2,4 minutes
- **Temps de traitement actuel** : 6 secondes par fichier (de la détection jusqu'à l'ancrage blockchain)
- **Marge de sécurité** : Même avec une allocation d'1 minute par fichier, le système fonctionne largement dans ses capacités

### Architecture Évolutive

Pour l'extension de la solution à plusieurs clients, nous avons conçu une architecture distribuée :

<div className="screenshot-container">
  <img src="/img/mesimages/road.svg" alt="Architecture pour multiples clients" width="1000" />
  <p className="caption">Architecture évolutive prenant en charge de multiples clients</p>
</div>

Cette architecture prévoit :
- Des instances VPS séparées par client
- Des bases de données isolées
- Un système de monitoring centralisé
- Une gestion optimisée des requêtes blockchain

## Analyse des Coûts

### Coûts Blockchain

Les frais de transaction sur la blockchain Hedera constituent un élément important du modèle économique :

- **Coût par message** : 0,0001$ (tarif officiel Hedera)
- **Validation empirique** : Après plus de 4 000 messages envoyés dans nos tests, nous confirmons ce coût unitaire moyen
- **Coût journalier pour une PME de 5 serveurs** : Environ 0,60$ par jour (555 fichiers × 0,0001$)

### Coûts d'Infrastructure

Les besoins matériels de la solution sont remarquablement modestes :

- **Utilisation des ressources** : Le système fonctionne à 70% de ses capacités sur un serveur avec seulement 1 Go de RAM
- **Stockage** : Principal besoin d'expansion selon la durée de rétention des logs
- **VPS avec sauvegarde** : Environ 10$ par mois
- **Base de données MongoDB** : Environ 10$ par mois pour un déploiement standard

### Coût Total Mensuel

Pour une PME type avec 5 serveurs :

| Composant | Coût Mensuel |
|-----------|--------------|
| VPS + Backups | 10$ |
| MongoDB | 10$ |
| Transactions Hedera | 18$ (0,60$ × 30 jours) |
| **Total** | **38$** |

Ce coût extrêmement compétitif, inférieur à 40$ par mois pour une PME standard, démontre la viabilité économique de Keralis comme solution de sécurité pour les organisations de toutes tailles.

## Roadmap de Développement

Pour les prochaines étapes du projet, nous prévoyons :

1. **Développement d'une interface d'administration multi-clients**
2. **Optimisation des calculs de hash lors du monitoring par pool pour réduire la charge**
3. **Création d'un tool CLI pour le déployement automatisé sur tout type de serveur linux**

Affaire à suivre !
