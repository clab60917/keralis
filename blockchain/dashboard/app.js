const express = require('express');
const session = require('express-session');
const path = require('path');
const alertsRouter = require('./routes/alerts');

const app = express();

// Configuration
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Middleware de logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'keralis_secret',
    resave: false,
    saveUninitialized: true
}));

// Middleware d'authentification
const authMiddleware = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/login');
    }
};

// Route de test
app.get('/api/test', (req, res) => {
    res.json({ status: 'ok', message: 'API fonctionne correctement' });
});

// Routes API
app.use('/api/alerts', alertsRouter);

// Routes des vues
app.get('/alerts', (req, res) => {
    console.log('Rendu de la page des alertes');
    res.render('alerts', {
        title: 'Alertes',
        user: { username: 'admin' }, // Temporaire pour le test
        active: 'alerts'
    });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
    console.error('Erreur:', err);
    res.status(500).json({ error: 'Erreur interne du serveur' });
});

const port = process.env.DASHBOARD_PORT || 3000;
app.listen(port, '0.0.0.0', () => {
    console.log(`Dashboard disponible sur http://0.0.0.0:${port}`);
}); 