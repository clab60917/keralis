// @ts-check

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Projet Keralis',
  tagline: 'Système de Surveillance d\'Intégrité des Logs',
  favicon: 'img/favicon.ico',

  // Définir l'URL de base pour le déploiement
  url: 'https://keralis-docs.netlify.app',
  baseUrl: '/',

  // Lien vers votre répertoire GitHub
  organizationName: 'clab60917',
  projectName: 'keralis',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'fr',
    locales: ['fr'],
  },

  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/clab60917/keralis/tree/main/documentation/keralis-docs',
        },
        blog: false,
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: 'Keralis',
        logo: {
          alt: 'Logo Keralis',
          src: 'img/logo-keralis.png',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Documentation',
          },
          {
            href: 'https://github.com/clab60917/keralis',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Vue d\'ensemble',
                to: '/docs/intro',
              },
              {
                label: 'Installation',
                to: '/docs/installation/prerequisites',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'GitHub Issues',
                href: 'https://github.com/clab60917/keralis/issues',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Projet Keralis. Built with Docusaurus.`,
      },
      prism: {
        // Suppression des configurations spécifiques des thèmes pour utiliser les valeurs par défaut
        additionalLanguages: ['bash', 'javascript'],
      },
    }),
};

module.exports = config;