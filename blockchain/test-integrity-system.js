const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const axios = require('axios');
const fs = require('fs').promises;
const nodemailer = require('nodemailer');

const HASH_SERVER_URL = process.env.HASH_SERVER_URL || 'http://172.233.245.220:3001';
const HASH_SERVER_API_KEY = process.env.HASH_SERVER_API_KEY;
const TEST_FILE_NAME = '20250305012039.log';  // Un des fichiers existants

// Configuration email améliorée
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    // Ajout des options de timeout
    connectionTimeout: 10000, // 10 secondes
    greetingTimeout: 10000,
    socketTimeout: 10000,
    // Options de sécurité TLS
    tls: {
        rejectUnauthorized: false // Permet les certificats auto-signés
    },
    // Retry en cas d'échec
    pool: true,
    maxConnections: 1,
    maxMessages: 1,
    rateDelta: 1000,
    rateLimit: 1
});

async function sendAlertEmail(fileName, oldHash, newHash) {
    const mailOptions = {
        from: process.env.ALERT_EMAIL_FROM,
        to: process.env.ALERT_EMAIL_TO,
        subject: `🚨 Alerte : Modification détectée dans ${fileName}`,
        html: `
            <h2>Une modification a été détectée dans un fichier de log</h2>
            <p><strong>Fichier :</strong> ${fileName}</p>
            <p><strong>Hash original :</strong> ${oldHash}</p>
            <p><strong>Nouveau hash :</strong> ${newHash}</p>
            <p><strong>Date de détection :</strong> ${new Date().toISOString()}</p>
            <p>Cette alerte a été générée automatiquement par le système de test d'intégrité.</p>
        `,
        // Ajout d'une version texte pour plus de compatibilité
        text: `
            ALERTE : Modification détectée dans ${fileName}
            
            Fichier : ${fileName}
            Hash original : ${oldHash}
            Nouveau hash : ${newHash}
            Date de détection : ${new Date().toISOString()}
            
            Cette alerte a été générée automatiquement par le système de test d'intégrité.
        `
    };

    try {
        console.log('Tentative d\'envoi de l\'email d\'alerte...');
        // Ajout d'un timeout de 30 secondes pour l'envoi complet
        const sendPromise = transporter.sendMail(mailOptions);
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout global dépassé')), 30000)
        );

        await Promise.race([sendPromise, timeoutPromise]);
        console.log('✓ Email d\'alerte envoyé avec succès');
    } catch (error) {
        console.error('❌ Erreur lors de l\'envoi de l\'email:', error.message);
        if (error.code) {
            console.error('Code d\'erreur:', error.code);
        }
        // On continue l'exécution même si l'email échoue
        console.log('⚠️ Le test continue malgré l\'échec de l\'envoi d\'email');
    } finally {
        // Fermeture propre du transporteur
        try {
            await transporter.close();
        } catch (error) {
            console.error('Erreur lors de la fermeture du transporteur:', error.message);
        }
    }
}

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
            // Envoyer un email d'alerte
            await sendAlertEmail(
                TEST_FILE_NAME,
                hashResponse.data.hash,
                newHashResponse.data.hash
            );
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