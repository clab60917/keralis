const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');

// Configuration MongoDB
const MONGODB_URI = `mongodb://${process.env.MONGODB_USER}:${encodeURIComponent(process.env.MONGODB_PASSWORD)}@${process.env.MONGODB_HOST}:${process.env.MONGODB_PORT}/${process.env.MONGODB_DB_NAME}?authSource=${process.env.MONGODB_AUTH_SOURCE}`;

// Route pour obtenir toutes les alertes
router.get('/', async (req, res) => {
    let client;
    try {
        client = await MongoClient.connect(MONGODB_URI);
        const db = client.db(process.env.MONGODB_DB_NAME);
        const alerts = await db.collection('alerts')
            .find({})
            .sort({ timestamp: -1 })
            .toArray();

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

// Route pour obtenir une alerte spécifique
router.get('/:id', async (req, res) => {
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

// Route pour mettre à jour le statut d'une alerte
router.put('/:id/status', async (req, res) => {
    let client;
    try {
        client = await MongoClient.connect(MONGODB_URI);
        const db = client.db(process.env.MONGODB_DB_NAME);
        const result = await db.collection('alerts').updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { 
                status: req.body.status,
                updatedAt: new Date()
            }}
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Alerte non trouvée' });
        }

        res.json({ message: 'Statut mis à jour avec succès' });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut:', error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour du statut' });
    } finally {
        if (client) {
            await client.close();
        }
    }
});

module.exports = router; 