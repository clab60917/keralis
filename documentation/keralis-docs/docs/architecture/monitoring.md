---
sidebar_position: 2
---

# Monitoring

Le système de monitoring est un élément essentiel de notre architecture de sécurité des logs. Il permet de surveiller en temps réel l'intégrité des fichiers journaux, de détecter toute modification non autorisée et d'alerter les administrateurs en cas d'incident.

## Dashboard de Surveillance

Notre plateforme dispose d'un dashboard sécurisé avec authentification individuelle. Chaque utilisateur dispose de ses propres identifiants pour accéder aux informations de monitoring.

<div className="screenshot-container">
  <img src="/img/mesimages/dashboard1.png" alt="Vue principale du dashboard Keralis" width="1000" />
  <p className="caption">**Vue d'ensemble du dashboard présentant les alertes récentes et l'état du système**</p>
</div>

### Statistiques et Performances

Le dashboard fournit des statistiques détaillées sur l'état global du système, notamment:

- **Statistiques générales**: Nombre de hashs, fichiers chiffrés et messages traités
- **Performances système**: Utilisation du CPU, de la mémoire et du disque
- **État des services**: Surveillance en temps réel des composants critiques (SFTP, Blockchain, Serveur)
- **TopicID Hedera**: Suivi du topic blockchain ID.0.XXXXXX où sont publiés les hashs


### Historique des alertes

Le système de monitoring conserve un historique complet des alertes levées:

<div className="screenshot-container">
  <img src="/img/mesimages/dashboard2.png" alt="Liste des alertes de modification" width="1000" />
  <p className="caption">**Tableau de toutes les alertes**</p>
</div>

### Détails des Alertes

Pour chaque alerte, le système conserve des informations détaillées permettant l'analyse forensique:
- Nom du fichier de log concerné
- Date et heure de détection
- Statut : restored (dans le cas d'un test-integrity) / unrestored
- Hash original
- Nouveau Hash / hash supprimé
- Email envoyé à l'administrateur : oui / non
- Adresse ip du serveur concerné par l'alerte

<div className="screenshot-container">
  <img src="/img/mesimages/dashboard3.png" alt="Détails d'une alerte de modification" width="1000" />
  <p className="caption">**Détails d'une alerte montrant le fichier modifié, le hash original et le nouveau hash**</p>
</div>

<div className="screenshot-container">
  <img src="/img/mesimages/dashboard4.png" alt="Statistiques système et activité récente" width="1000" />
  <p className="caption">**Détails d'une alerte montrant le fichier modifié, le hash original et la suppression de celui-ci**</p>
</div>


## Vérification Blockchain via Hashscan.io

Notre système publie tous les hashs sur la blockchain Hedera pour garantir leur immuabilité. Ces entrées peuvent être vérifiées de façon indépendante via l'explorateur de blockchain Hashscan.io en utilisant le TopicID.

<div className="screenshot-container">
  <img src="/img/mesimages/screen_hashscan.png" alt="Topic Hedera sur Hashscan.io" width="1000" />
  <p className="caption">**Vue du Topic ID.0.5643349 sur Hashscan.io montrant les messages horodatés contenant les hashs**</p>
</div>

Cette vérifiabilité publique permet de confirmer que les hashs n'ont pas été altérés dans notre propre système de stockage avec MongoDB et offre une couche supplémentaire de sécurité et de transparence.

## Système d'Alertes par Email

En cas de détection d'une anomalie (modification de fichier ou suppression), le système envoie automatiquement une alerte par email à l'administrateurs.

:::tip
Connectez-vous sur `https://app.elasticemail.com` pour obtenir un serveur d'envoi de mail SMTP chiffré gratuitement.
:::

### Liste des Alertes

L'administrateurs reçoit instantanément une alerte par mail :
- Alerte de modification
- Alerte de suppression

<div className="screenshot-container">
  <img src="/img/mesimages/email1.png" alt="Liste des alertes reçues par email" width="1000" />
  <p className="caption">**Boîte d'émission montrant les différentes alertes envoyées par le système**</p>
</div>

### Alerte de Modification


<div className="screenshot-container">
  <img src="/img/mesimages/email2.png" alt="Détail d'une alerte de modification" width="800" />
  <p className="caption">**Email d'alerte détaillant une modification détectée dans un fichier de log**</p>
</div>

### Alerte de Suppression



<div className="screenshot-container">
  <img src="/img/mesimages/email3.png" alt="Détail d'une alerte de suppression" width="800" />
  <p className="caption">**Email d'alerte signalant la suppression d'un fichier de log**</p>
</div>

Les emails sont envoyés depuis l'adresse mail d'alerting `alert@keralis.org` via la plateforme Elastice Mail.