import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={styles.heroBanner}>
      <div className={styles.heroBackground}>
        <div className={styles.heroGradient} />
        <div className={styles.heroPattern} />
        <div className={styles.heroGlow} />
      </div>
      <div className="container">
        <div className={styles.heroContent}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>
              <span className={styles.titleHighlight}>Complémentaire à vôtre EDR.</span>
              <br />
              <span className={styles.titleAccent}>Sécurisez vos logs avec la blockchain.</span>
            </h1>
            <p className={styles.heroSubtitle}>
              La première solution qui combine chiffrement et blockchain pour protéger vos logs contre les menaces internes et externes
            </p>
            <div className={styles.heroCta}>
              <Link
                className="button button--primary button--lg"
                to="/docs/intro">
                Découvrir Keralis ⚡
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function HomepageStats() {
  return (
    <div className={styles.statsSection}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Performance & Sécurité</h2>
          <p className={styles.sectionSubtitle}>Des chiffres qui parlent d'eux-mêmes</p>
        </div>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statContent}>
              <div className={styles.statIcon}>🛡️</div>
              <div className={styles.statNumber}>100%</div>
              <div className={styles.statLabel}>Intégrité Garantie</div>
              <div className={styles.statDetails}>
                <div className={styles.statDetail}>
                  <span className={styles.detailIcon}>🔒</span>
                  <div className={styles.detailText}>
                    <span className={styles.detailTitle}>Chiffrement AES-256</span>
                    <span className={styles.detailDescription}>Protection maximale de vos données</span>
                  </div>
                </div>
                <div className={styles.statDetail}>
                  <span className={styles.detailIcon}>⚡</span>
                  <div className={styles.detailText}>
                    <span className={styles.detailTitle}>Immutabilité totale</span>
                    <span className={styles.detailDescription}>Aucune modification possible</span>
                  </div>
                </div>
                <div className={styles.statDetail}>
                  <span className={styles.detailIcon}>🛡️</span>
                  <div className={styles.detailText}>
                    <span className={styles.detailTitle}>Protection maximale</span>
                    <span className={styles.detailDescription}>Contre les menaces internes et externes</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statContent}>
              <div className={styles.statIcon}>⚡</div>
              <div className={styles.statNumber}>0ms</div>
              <div className={styles.statLabel}>Détection en Temps Réel</div>
              <div className={styles.statDetails}>
                <div className={styles.statDetail}>
                  <span className={styles.detailIcon}>🔔</span>
                  <div className={styles.detailText}>
                    <span className={styles.detailTitle}>Alertes instantanées</span>
                    <span className={styles.detailDescription}>Notification immédiate des modifications</span>
                  </div>
                </div>
                <div className={styles.statDetail}>
                  <span className={styles.detailIcon}>📊</span>
                  <div className={styles.detailText}>
                    <span className={styles.detailTitle}>Monitoring continu</span>
                    <span className={styles.detailDescription}>Surveillance 24/7 de vos logs</span>
                  </div>
                </div>
                <div className={styles.statDetail}>
                  <span className={styles.detailIcon}>📱</span>
                  <div className={styles.detailText}>
                    <span className={styles.detailTitle}>Réponse immédiate</span>
                    <span className={styles.detailDescription}>Actions rapides en cas d'incident</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statContent}>
              <div className={styles.statIcon}>🔗</div>
              <div className={styles.statNumber}>∞</div>
              <div className={styles.statLabel}>Immuabilité</div>
              <div className={styles.statDetails}>
                <div className={styles.statDetail}>
                  <span className={styles.detailIcon}>⛓️</span>
                  <div className={styles.detailText}>
                    <span className={styles.detailTitle}>Blockchain dédiée</span>
                    <span className={styles.detailDescription}>Infrastructure sécurisée dédiée</span>
                  </div>
                </div>
                <div className={styles.statDetail}>
                  <span className={styles.detailIcon}>🔍</span>
                  <div className={styles.detailText}>
                    <span className={styles.detailTitle}>Traçabilité totale</span>
                    <span className={styles.detailDescription}>Historique complet des modifications</span>
                  </div>
                </div>
                <div className={styles.statDetail}>
                  <span className={styles.detailIcon}>✅</span>
                  <div className={styles.detailText}>
                    <span className={styles.detailTitle}>Historique infalsifiable</span>
                    <span className={styles.detailDescription}>Preuve d'intégrité absolue</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MainFeatures() {
  return (
    <div className={styles.mainFeatures}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Fonctionnalités Principales</h2>
          <p className={styles.sectionSubtitle}>Une solution complète pour la protection de vos logs</p>
        </div>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🛡️</div>
            <h3>Intégrité Garantie</h3>
            <div className={styles.featureContent}>
              <p>Protection maximale de vos logs avec un chiffrement AES-256 et une immutabilité totale</p>
              <div className={styles.featureDetails}>
                <div className={styles.featureDetail}>
                  <span className={styles.detailIcon}>🔒</span>
                  <span>Chiffrement de bout en bout</span>
                </div>
                <div className={styles.featureDetail}>
                  <span className={styles.detailIcon}>⚡</span>
                  <span>Performance optimale</span>
                </div>
                <div className={styles.featureDetail}>
                  <span className={styles.detailIcon}>🛡️</span>
                  <span>Protection maximale</span>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>⚡</div>
            <h3>Détection en Temps Réel</h3>
            <div className={styles.featureContent}>
              <p>Alertes instantanées en cas de modification non autorisée de vos logs</p>
              <div className={styles.featureDetails}>
                <div className={styles.featureDetail}>
                  <span className={styles.detailIcon}>🔔</span>
                  <span>Alertes en temps réel</span>
                </div>
                <div className={styles.featureDetail}>
                  <span className={styles.detailIcon}>📊</span>
                  <span>Tableau de bord intuitif</span>
                </div>
                <div className={styles.featureDetail}>
                  <span className={styles.detailIcon}>📱</span>
                  <span>Notifications mobiles</span>
                </div>
              </div>
            </div>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🚀</div>
            <h3>Déploiement Facile</h3>
            <div className={styles.featureContent}>
              <p>Intégration rapide avec votre infrastructure existante en quelques minutes</p>
              <div className={styles.featureDetails}>
                <div className={styles.featureDetail}>
                  <span className={styles.detailIcon}>⚙️</span>
                  <span>Configuration simple</span>
                </div>
                <div className={styles.featureDetail}>
                  <span className={styles.detailIcon}>🔄</span>
                  <span>Mise à jour automatique</span>
                </div>
                <div className={styles.featureDetail}>
                  <span className={styles.detailIcon}>📦</span>
                  <span>Docker disponible</span>
                </div>
              </div>
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
      <HomepageStats />
      <MainFeatures />
    </Layout>
  );
}
