/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  tutorialSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Vue d\'ensemble',
      items: ['overview/system-overview'],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/sender-service',
        'architecture/client-server',
        'architecture/blockchain-server',
      ],
    },
    {
      type: 'category',
      label: 'Installation',
      items: [
        'installation/prerequisites',
        'installation/sender-setup',
        'installation/client-setup',
        'installation/blockchain-setup',
      ],
    },
    {
      type: 'category',
      label: 'Maintenance',
      items: ['maintenance/monitoring'],
    },
    {
      type: 'category',
      label: 'Sécurité',
      items: ['security/best-practices'],
    },
    {
      type: 'category',
      label: 'Dépannage',
      items: ['troubleshooting/common-issues'],
    },
    {
      type: 'category',
      label: 'Roadmap',
      items: ['roadmap/future-developments'],
    },
  ],
};

module.exports = sidebars;
