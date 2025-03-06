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

// Routes API
app.use('/api/alerts', authMiddleware, alertsRouter);

// Routes des vues
app.get('/alerts', authMiddleware, (req, res) => {
    res.render('alerts', {
        title: 'Alertes',
        user: req.session.user,
        active: 'alerts'
    });
}); 