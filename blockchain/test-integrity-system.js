const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const axios = require('axios');
const fs = require('fs').promises;

const HASH_SERVER_URL = process.env.HASH_SERVER_URL || 'http://172.233.245.220:3001';
const HASH_SERVER_API_KEY = process.env.HASH_SERVER_API_KEY;
const TEST_FILE_NAME = '20250305012039.log';  // Un des fichiers existants

// Fonction pour afficher les informations de debug
function debugInfo() {
    console.log('Debug Info:');
    console.log('HASH_SERVER_URL:', HASH_SERVER_URL);
    console.log('HASH_SERVER_API_KEY:', HASH_SERVER_API_KEY);
}

async function runTests() {
    console.log('Démarrage des tests du système d\'intégrité...');
    debugInfo();

    // Configuration Axios avec les headers par défaut
    const axiosConfig = {
        headers: {
            'x-api-key': HASH_SERVER_API_KEY,
            'Content-Type': 'application/json'
        }
    };

    try {
        // 1. Tester l'API du serveur hash
        console.log('\nTest de l\'API du serveur hash...');
        
        // Test de la liste des fichiers
        console.log('Envoi de la requête GET /api/logs avec la clé API...');
        const filesResponse = await axios.get(`${HASH_SERVER_URL}/api/logs`, axiosConfig);
        console.log('✓ Liste des fichiers récupérée:', filesResponse.data);

        // Test du calcul de hash initial
        const hashResponse = await axios.get(`${HASH_SERVER_URL}/api/hash/${TEST_FILE_NAME}`, axiosConfig);
        console.log('✓ Hash initial calculé:', hashResponse.data);

        // 2. Simuler une modification de fichier en envoyant une requête au serveur
        console.log('\nSimulation d\'une modification de fichier...');
        const modifyResponse = await axios.post(`${HASH_SERVER_URL}/api/modify/${TEST_FILE_NAME}`, {
            modification: `Test modification ${Date.now()}`
        }, axiosConfig);
        console.log('✓ Fichier modifié:', modifyResponse.data);
        
        // 3. Vérifier que le changement est détecté
        const newHashResponse = await axios.get(`${HASH_SERVER_URL}/api/hash/${TEST_FILE_NAME}`, axiosConfig);
        console.log('✓ Nouveau hash calculé:', newHashResponse.data);

        if (hashResponse.data.hash !== newHashResponse.data.hash) {
            console.log('✓ Modification correctement détectée');
        } else {
            console.log('❌ Erreur: La modification n\'a pas été détectée');
        }

        // 4. Restaurer le contenu original
        const restoreResponse = await axios.post(`${HASH_SERVER_URL}/api/restore/${TEST_FILE_NAME}`, {}, axiosConfig);
        console.log('✓ Contenu original restauré:', restoreResponse.data);

        console.log('\nTests terminés avec succès!');
    } catch (error) {
        console.error('\n❌ Erreur lors des tests:', error.message);
        if (error.response) {
            console.error('Détails de l\'erreur:', error.response.data);
            console.error('Headers de la requête:', axiosConfig.headers);
            console.error('Status:', error.response.status);
        }
    }
}

runTests(); 