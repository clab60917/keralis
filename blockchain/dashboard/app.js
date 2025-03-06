const alertsRouter = require('./routes/alerts');

// Routes
app.use('/api/alerts', alertsRouter);

// Ajouter un lien vers les alertes dans le menu de navigation
app.get('/alerts', (req, res) => {
    res.render('alerts', { 
        title: 'Alertes',
        user: req.session.user 
    });
}); 