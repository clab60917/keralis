import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <div className={styles.heroContent}>
          <h1 className="hero__title">{siteConfig.title}</h1>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
          <div className={styles.heroSlogan}>
            <span className={styles.sloganHighlight}>Complémentaire à votre EDR</span>
            <p className={styles.sloganText}>
              Verrouillez vos logs, protégés même des menaces internes
            </p>
          </div>
          <div className={styles.buttons}>
            <Link
              className="button button--secondary button--lg"
              to="/docs/intro">
              Commencer avec Keralis ⚡
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

function HomepageMainFeatures() {
  return (
    <div className={styles.mainFeatures}>
      <div className="container">
        <div className="row">
          <div className="col col--4">
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🔒</div>
              <h3>Sécurité Maximale</h3>
              <p>Protection de vos logs avec chiffrement et blockchain</p>
            </div>
          </div>
          <div className="col col--4">
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>⚡</div>
              <h3>Performance</h3>
              <p>Détection en temps réel des modifications</p>
            </div>
          </div>
          <div className="col col--4">
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>🛠️</div>
              <h3>Facile à Déployer</h3>
              <p>Installation simple et documentation complète</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="Système de Surveillance d'Intégrité des Logs">
      <HomepageHeader />
      <HomepageMainFeatures />
      <main className={styles.main}>
        <HomepageFeatures />
      </main>
    </Layout>
  );
}
