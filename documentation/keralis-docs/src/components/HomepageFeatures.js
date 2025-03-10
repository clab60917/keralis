import React from 'react';
import clsx from 'clsx';
import styles from './HomepageFeatures.module.css';

const FeatureList = [
  {
    title: 'Intégrité Garantie',
    Svg: require('@site/static/img/undraw_secure_files.svg').default,
    description: (
      <>
        Keralis surveille en permanence l'intégrité de vos fichiers de logs
        grâce à des calculs de hash et à la technologie blockchain.
      </>
    ),
  },
  {
    title: 'Détection en Temps Réel',
    Svg: require('@site/static/img/undraw_real_time_analytics.svg').default,
    description: (
      <>
        Détectez immédiatement toute modification non autorisée de vos logs
        et recevez des alertes en temps réel.
      </>
    ),
  },
  {
    title: 'Déploiement Facile',
    Svg: require('@site/static/img/undraw_server_cluster.svg').default,
    description: (
      <>
        Architecture modulaire facile à déployer et à maintenir,
        avec une documentation complète et des outils de monitoring intégrés.
      </>
    ),
  },
];

function Feature({Svg, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
