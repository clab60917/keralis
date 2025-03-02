#!/bin/bash

# Couleurs pour le terminal
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== CONFIGURATION DU SCRIPT KERALIS ===${NC}\n"

# Vérifier si Python 3 est installé
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 n'est pas installé. Veuillez l'installer avant de continuer.${NC}"
    exit 1
fi

# Installer les dépendances système requises
echo -e "${YELLOW}Installation des dépendances système...${NC}"
sudo apt-get update
sudo apt-get install -y python3-pip python3-venv python3-dev libffi-dev libssl-dev

# Créer l'environnement virtuel correctement
echo -e "${YELLOW}Création de l'environnement virtuel...${NC}"
python3 -m venv venv
if [ $? -ne 0 ]; then
    echo -e "${RED}Erreur lors de la création de l'environnement virtuel.${NC}"
    echo -e "${YELLOW}Installation des dépendances au niveau système...${NC}"
    sudo pip3 install paramiko cryptography python-dotenv watchdog
else
    # Activer l'environnement virtuel et installer les dépendances
    echo -e "${YELLOW}Activation de l'environnement virtuel et installation des dépendances...${NC}"
    source venv/bin/activate
    pip install --upgrade pip
    pip install paramiko cryptography python-dotenv watchdog
fi

# Créer les répertoires nécessaires
echo -e "${YELLOW}Configuration des répertoires...${NC}"

# Demander les chemins des répertoires
read -p "Chemin du répertoire pour les logs (par défaut: logs): " LOG_DIR
LOG_DIR=${LOG_DIR:-logs}

read -p "Chemin du répertoire pour les hash (par défaut: hash): " HASH_DIR
HASH_DIR=${HASH_DIR:-hash}

read -p "Chemin du répertoire pour les fichiers chiffrés (par défaut: encrypted): " ENCRYPTED_DIR
ENCRYPTED_DIR=${ENCRYPTED_DIR:-encrypted}

# Créer les répertoires s'ils n'existent pas
mkdir -p "$LOG_DIR" "$HASH_DIR" "$ENCRYPTED_DIR"

# Configuration SFTP
echo -e "\n${YELLOW}Configuration du serveur SFTP...${NC}"
read -p "Adresse du serveur SFTP: " SFTP_HOST
read -p "Port SFTP (par défaut: 22): " SFTP_PORT
SFTP_PORT=${SFTP_PORT:-22}
read -p "Nom d'utilisateur SFTP: " SFTP_USERNAME
read -p "Mot de passe SFTP: " -s SFTP_PASSWORD
echo ""
read -p "Chemin distant pour les hash (par défaut: /sender/hash): " SFTP_HASH_DIR
SFTP_HASH_DIR=${SFTP_HASH_DIR:-/sender/hash}
read -p "Chemin distant pour les fichiers chiffrés (par défaut: /sender/encrypted): " SFTP_ENCRYPTED_DIR
SFTP_ENCRYPTED_DIR=${SFTP_ENCRYPTED_DIR:-/sender/encrypted}

# Créer ou mettre à jour le fichier .env
echo -e "\n${YELLOW}Création du fichier .env...${NC}"
cat > .env << EOF
# Configuration des dossiers
LOG_DIR=$LOG_DIR
HASH_DIR=$HASH_DIR
ENCRYPTED_DIR=$ENCRYPTED_DIR

# Configuration SFTP
SFTP_HOST=$SFTP_HOST
SFTP_PORT=$SFTP_PORT
SFTP_USERNAME=$SFTP_USERNAME
SFTP_PASSWORD=$SFTP_PASSWORD
SFTP_HASH_DIR=$SFTP_HASH_DIR
SFTP_ENCRYPTED_DIR=$SFTP_ENCRYPTED_DIR
EOF

# Corriger le shebang dans senderV1.py si nécessaire
sed -i '1s/^s#/#!/' senderV1.py

# Rendre le script Python exécutable
chmod +x senderV1.py

echo -e "\n${GREEN}Configuration terminée avec succès !${NC}"
if [ -d "venv" ]; then
    echo -e "${BLUE}Pour démarrer le script de surveillance, exécutez:${NC}"
    echo -e "  source venv/bin/activate"
    echo -e "  ./senderV1.py"
else
    echo -e "${BLUE}Pour démarrer le script de surveillance, exécutez:${NC}"
    echo -e "  python3 senderV1.py"
fi
echo -e "\n${YELLOW}Les logs seront surveillés dans le répertoire:${NC} $LOG_DIR" 