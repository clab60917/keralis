module.exports = {
  apps: [{
    name: 'blockchain-app',
    script: 'auto3.js',
    watch: true,
    env: {
      NODE_ENV: 'production'
    }
  }, {
    name: 'blockchain-new',
    script: 'dashboard/index.js',
    watch: true,
    env: {
      NODE_ENV: 'production'
    }
  }]
}; 