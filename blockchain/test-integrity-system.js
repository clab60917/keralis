require('dotenv').config();
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const HASH_SERVER_URL = process.env.HASH_SERVER_URL || 'http://172.233.245.220:3001';
const HASH_SERVER_API_KEY = process.env.HASH_SERVER_API_KEY;
const TEST_FILE_NAME = '20250306122942.log';

async function runTests() {
    console.log('Démarrage des tests du système d\'intégrité...');

    try {
        // 1. Tester l'API du serveur hash
        console.log('\nTest de l\'API du serveur hash...');
        
        // Test de la liste des fichiers
        const filesResponse = await axios.get(`${HASH_SERVER_URL}/api/logs`, {
            headers: { 'x-api-key': HASH_SERVER_API_KEY }
        });
        console.log('✓ Liste des fichiers récupérée:', filesResponse.data);

        // Test du calcul de hash initial
        const hashResponse = await axios.get(`${HASH_SERVER_URL}/api/hash/${TEST_FILE_NAME}`, {
            headers: { 'x-api-key': HASH_SERVER_API_KEY }
        });
        console.log('✓ Hash initial calculé:', hashResponse.data);

        // 2. Simuler une modification de fichier
        console.log('\nSimulation d\'une modification de fichier...');
        const originalContent = await fs.readFile(path.join('/root/keralis/logs', TEST_FILE_NAME), 'utf8');
        await fs.writeFile(path.join('/root/keralis/logs', TEST_FILE_NAME), originalContent + '\nModification test ' + Date.now());
        console.log('✓ Fichier modifié');
        
        // 3. Vérifier que le changement est détecté
        const newHashResponse = await axios.get(`${HASH_SERVER_URL}/api/hash/${TEST_FILE_NAME}`, {
            headers: { 'x-api-key': HASH_SERVER_API_KEY }
        });
        console.log('✓ Nouveau hash calculé:', newHashResponse.data);

        if (hashResponse.data.hash !== newHashResponse.data.hash) {
            console.log('✓ Modification correctement détectée');
        } else {
            console.log('❌ Erreur: La modification n\'a pas été détectée');
        }

        // 4. Restaurer le contenu original
        await fs.writeFile(path.join('/root/keralis/logs', TEST_FILE_NAME), originalContent);
        console.log('✓ Contenu original restauré');

        console.log('\nTests terminés avec succès!');
    } catch (error) {
        console.error('\n❌ Erreur lors des tests:', error.message);
        if (error.response) {
            console.error('Détails de l\'erreur:', error.response.data);
        }
    }
}

runTests(); 