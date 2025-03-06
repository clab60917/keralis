require('dotenv').config();
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const HASH_SERVER_URL = process.env.HASH_SERVER_URL || 'http://client-server:3001';
const HASH_SERVER_API_KEY = process.env.HASH_SERVER_API_KEY;
const TEST_LOG_DIR = path.join(__dirname, 'test-logs');

async function runTests() {
    console.log('Démarrage des tests du système d\'intégrité...');

    try {
        // 1. Créer un répertoire de test avec des fichiers logs
        await fs.mkdir(TEST_LOG_DIR, { recursive: true });
        const testFile = path.join(TEST_LOG_DIR, 'test1.log');
        await fs.writeFile(testFile, 'Contenu initial');
        
        console.log('✓ Fichier de test créé');

        // 2. Tester l'API du serveur hash
        console.log('\nTest de l\'API du serveur hash...');
        
        // Test de la liste des fichiers
        const filesResponse = await axios.get(`${HASH_SERVER_URL}/api/logs`, {
            headers: { 'x-api-key': HASH_SERVER_API_KEY }
        });
        console.log('✓ Liste des fichiers récupérée:', filesResponse.data);

        // Test du calcul de hash
        const hashResponse = await axios.get(`${HASH_SERVER_URL}/api/hash/test1.log`, {
            headers: { 'x-api-key': HASH_SERVER_API_KEY }
        });
        console.log('✓ Hash initial calculé:', hashResponse.data);

        // 3. Simuler une modification de fichier
        console.log('\nSimulation d\'une modification de fichier...');
        await fs.writeFile(testFile, 'Contenu modifié');
        console.log('✓ Fichier modifié');
        
        // 4. Vérifier que le changement est détecté
        const newHashResponse = await axios.get(`${HASH_SERVER_URL}/api/hash/test1.log`, {
            headers: { 'x-api-key': HASH_SERVER_API_KEY }
        });
        console.log('✓ Nouveau hash calculé:', newHashResponse.data);

        // 5. Vérifier que les hashs sont différents
        if (hashResponse.data.hash !== newHashResponse.data.hash) {
            console.log('✓ Modification correctement détectée');
        } else {
            console.log('❌ Erreur: La modification n\'a pas été détectée');
        }

        // 6. Attendre que le système d'intégrité détecte le changement
        console.log('\nAttente de la détection du changement par le système d\'intégrité...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('\nTests terminés avec succès!');
    } catch (error) {
        console.error('\n❌ Erreur lors des tests:', error.message);
        if (error.response) {
            console.error('Détails de l\'erreur:', error.response.data);
        }
    } finally {
        // Nettoyage
        try {
            await fs.rm(TEST_LOG_DIR, { recursive: true });
            console.log('✓ Nettoyage effectué');
        } catch (error) {
            console.error('❌ Erreur lors du nettoyage:', error.message);
        }
    }
}

runTests(); 