const express = require('express');
const session = require('express-session');
const path = require('path');
const { MongoClient } = require('mongodb');

const app = express();

// Configuration MongoDB
const MONGODB_URI = `mongodb://${process.env.MONGODB_USER}:${encodeURIComponent(process.env.MONGODB_PASSWORD)}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DB_NAME}?authSource=${process.env.MONGODB_AUTH_SOURCE}`;

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

// Routes API
app.get('/api/alerts', async (req, res) => {
    let client;
    try {
        client = await MongoClient.connect(MONGODB_URI);
        const db = client.db(process.env.MONGODB_DB_NAME);
        const alerts = await db.collection('alerts')
            .find({})
            .sort({ timestamp: -1 })
            .toArray();
        
        console.log(`${alerts.length} alertes trouvées`);
        res.json(alerts);
    } catch (error) {
        console.error('Erreur lors de la récupération des alertes:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des alertes' });
    } finally {
        if (client) {
            await client.close();
        }
    }
});

app.get('/api/alerts/:id', async (req, res) => {
    let client;
    try {
        client = await MongoClient.connect(MONGODB_URI);
        const db = client.db(process.env.MONGODB_DB_NAME);
        const alert = await db.collection('alerts').findOne({
            _id: new ObjectId(req.params.id)
        });

        if (!alert) {
            return res.status(404).json({ error: 'Alerte non trouvée' });
        }

        res.json(alert);
    } catch (error) {
        console.error('Erreur lors de la récupération de l\'alerte:', error);
        res.status(500).json({ error: 'Erreur lors de la récupération de l\'alerte' });
    } finally {
        if (client) {
            await client.close();
        }
    }
});

// Route des alertes
app.get('/alerts', async (req, res) => {
    let client;
    try {
        client = await MongoClient.connect(MONGODB_URI);
        const db = client.db(process.env.MONGODB_DB_NAME);
        const alerts = await db.collection('alerts')
            .find({})
            .sort({ timestamp: -1 })
            .toArray();
        
        console.log(`${alerts.length} alertes trouvées`);
        
        res.render('alerts', {
            title: 'Alertes',
            user: { username: 'admin' },
            active: 'alerts',
            alerts: alerts
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des alertes:', error);
        res.render('alerts', {
            title: 'Alertes',
            user: { username: 'admin' },
            active: 'alerts',
            alerts: [],
            error: 'Erreur lors de la récupération des alertes'
        });
    } finally {
        if (client) {
            await client.close();
        }
    }
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