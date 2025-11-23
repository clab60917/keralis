#!/usr/bin/env python3
"""
Script de surveillance des fichiers logs avec génération de hash, chiffrement et transfert SFTP.
Utilise un fichier .env pour stocker les informations d'identification.
"""

import os
import time
import hashlib
import shutil
import paramiko
import logging
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from cryptography.fernet import Fernet
from dotenv import load_dotenv

# Couleurs pour les logs
class Colors:
    HEADER = '\033[95m'
    INFO = '\033[94m'
    SUCCESS = '\033[92m'
    WARNING = '\033[93m'
    ERROR = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

# Formateur personnalisé pour les logs
class ColoredFormatter(logging.Formatter):
    def format(self, record):
        if record.levelno == logging.INFO:
            record.msg = f"{Colors.INFO}ℹ️  {record.msg}{Colors.ENDC}"
        elif record.levelno == logging.ERROR:
            record.msg = f"{Colors.ERROR}❌ {record.msg}{Colors.ENDC}"
        elif record.levelno == logging.WARNING:
            record.msg = f"{Colors.WARNING}⚠️  {record.msg}{Colors.ENDC}"
        return super().format(record)

# Charger les variables d'environnement depuis .env
load_dotenv()

# Configuration
# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Docker paths defaults
DEFAULT_LOG_DIR = "/app/logs_mount"
DEFAULT_HASH_DIR = "/app/hash"
DEFAULT_ENCRYPTED_DIR = "/app/encrypted"

LOG_DIR = os.getenv("LOG_DIR", DEFAULT_LOG_DIR)
HASH_DIR = os.getenv("HASH_DIR", DEFAULT_HASH_DIR)
ENCRYPTED_DIR = os.getenv("ENCRYPTED_DIR", DEFAULT_ENCRYPTED_DIR)

SFTP_HOST = os.getenv("SFTP_HOST")  # Doit être défini dans le .env
SFTP_PORT = int(os.getenv("SFTP_PORT", "2222"))  # Port SFTP standard (2222 pour le conteneur sftp)
SFTP_USERNAME = os.getenv("SFTP_USERNAME", "keralis")
SFTP_PASSWORD = os.getenv("SFTP_PASSWORD")  # Doit être défini dans le .env
SFTP_HASH_DIR = os.getenv("SFTP_HASH_DIR", "/upload/hash")  # Chemin interne au conteneur SFTP
SFTP_ENCRYPTED_DIR = os.getenv("SFTP_ENCRYPTED_DIR", "/upload/encrypted")

# Vérification des variables obligatoires
required_vars = ["SFTP_HOST", "SFTP_USERNAME", "SFTP_PASSWORD", "SFTP_HASH_DIR", "SFTP_ENCRYPTED_DIR"]
missing_vars = [var for var in required_vars if not os.getenv(var)]
if missing_vars:
    raise ValueError(f"Variables d'environnement manquantes : {', '.join(missing_vars)}. Veuillez les définir dans le fichier .env")

# Configuration du logging
console_handler = logging.StreamHandler()
console_handler.setFormatter(ColoredFormatter('%(asctime)s - %(message)s'))
file_handler = logging.FileHandler('keralis.log')
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))

logging.basicConfig(
    level=logging.INFO,
    handlers=[console_handler, file_handler]
)
logger = logging.getLogger(__name__)

# Génération ou chargement de la clé de chiffrement
def get_encryption_key():
    key_file = "encryption.key"
    if os.path.exists(key_file):
        with open(key_file, "rb") as f:
            key = f.read()
    else:
        key = Fernet.generate_key()
        with open(key_file, "wb") as f:
            f.write(key)
    return key

# Initialisation
def initialize_directories():
    """Crée les répertoires nécessaires s'ils n'existent pas."""
    for directory in [LOG_DIR, HASH_DIR, ENCRYPTED_DIR]:
        if not os.path.exists(directory):
            os.makedirs(directory)
            logger.info(f"Répertoire créé: {directory}")

# Génère le hash d'un fichier
def generate_hash(file_path):
    """Génère un hash SHA-256 du fichier."""
    h = hashlib.sha256()
    with open(file_path, 'rb') as file:
        # Lire le fichier par petits morceaux pour éviter de consommer trop de mémoire
        chunk = 0
        while chunk != b'':
            chunk = file.read(1024)
            h.update(chunk)
    return h.hexdigest()

# Chiffre un fichier
def encrypt_file(file_path, key):
    """Chiffre le fichier avec la clé fournie."""
    f = Fernet(key)
    with open(file_path, 'rb') as file:
        file_data = file.read()
    encrypted_data = f.encrypt(file_data)
    return encrypted_data

def create_remote_directory(sftp, path):
    """Crée récursivement les dossiers distants."""
    current_path = "/"
    for part in path.split("/"):
        if part:
            current_path = f"{current_path}{part}/"
            try:
                sftp.stat(current_path)
            except FileNotFoundError:
                logger.info(f"Création du dossier distant: {current_path}")
                sftp.mkdir(current_path)

def send_file_via_sftp(local_file, remote_path):
    """Envoie un fichier vers un serveur SFTP."""
    try:
        logger.info(f"Tentative de connexion SFTP à {SFTP_HOST}:{SFTP_PORT} avec l'utilisateur {SFTP_USERNAME}")
        
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(
            hostname=SFTP_HOST,
            port=SFTP_PORT,
            username=SFTP_USERNAME,
            password=SFTP_PASSWORD,
            allow_agent=False,
            look_for_keys=False,
            timeout=10
        )
        
        sftp = ssh.open_sftp()
        logger.info("Connexion SFTP établie avec succès")
        
        # Créer les dossiers distants de manière récursive
        remote_dir = os.path.dirname(remote_path)
        create_remote_directory(sftp, remote_dir)
        
        logger.info(f"Envoi du fichier {local_file} vers {remote_path}")
        sftp.put(local_file, remote_path)
        logger.info(f"Fichier envoyé avec succès: {local_file} -> {remote_path}")
        
        sftp.close()
        ssh.close()
        return True
    except paramiko.AuthenticationException:
        logger.error(f"Échec d'authentification SFTP. Vérifiez le nom d'utilisateur et le mot de passe.")
        return False
    except paramiko.SSHException as e:
        logger.error(f"Erreur SSH lors de l'envoi SFTP: {str(e)}")
        return False
    except Exception as e:
        logger.error(f"Erreur lors de l'envoi SFTP: {str(e)}")
        logger.error(f"Type d'erreur: {type(e).__name__}")
        return False

# Gestionnaire d'événements pour les nouveaux fichiers
class LogFileHandler(FileSystemEventHandler):
    def __init__(self):
        self.key = get_encryption_key()
        self.processed_files = set()

    def on_created(self, event):
        if event.is_directory:
            return
        
        file_path = event.src_path
        filename = os.path.basename(file_path)
        
        if not filename.endswith('.log'):
            return
        
        if file_path in self.processed_files:
            return
        
        self.processed_files.add(file_path)
        time.sleep(1)
        
        logger.info(f"📝 Nouveau fichier log détecté: {filename}")
        
        try:
            # Générer le hash
            file_hash = generate_hash(file_path)
            hash_filename = f"{filename}.hash"
            hash_path = os.path.join(HASH_DIR, hash_filename)
            
            with open(hash_path, 'w') as f:
                f.write(file_hash)
            logger.info(f"🔒 Hash généré: {hash_path}")
            
            # Chiffrer le fichier
            encrypted_data = encrypt_file(file_path, self.key)
            encrypted_filename = f"{filename}.enc"
            encrypted_path = os.path.join(ENCRYPTED_DIR, encrypted_filename)
            
            with open(encrypted_path, 'wb') as f:
                f.write(encrypted_data)
            logger.info(f"🔐 Fichier chiffré: {encrypted_path}")
            
            # Envoyer les fichiers via SFTP
            remote_hash_path = f"{SFTP_HASH_DIR}/{hash_filename}"
            remote_encrypted_path = f"{SFTP_ENCRYPTED_DIR}/{encrypted_filename}"
            
            if send_file_via_sftp(hash_path, remote_hash_path):
                logger.info(f"📤 Hash envoyé avec succès: {hash_filename}")
            if send_file_via_sftp(encrypted_path, remote_encrypted_path):
                logger.info(f"📤 Fichier chiffré envoyé avec succès: {encrypted_filename}")
            
        except Exception as e:
            logger.error(f"Erreur lors du traitement de {filename}: {str(e)}")

def main():
    print(f"\n{Colors.HEADER}{Colors.BOLD}=== DÉMARRAGE DU SCRIPT DE SURVEILLANCE KERALIS ==={Colors.ENDC}\n")
    logger.info("🚀 Initialisation du script...")
    
    initialize_directories()
    
    logger.info("👀 Démarrage de la surveillance des fichiers logs...")
    logger.info(f"📁 Dossier surveillé: {os.path.abspath(LOG_DIR)}")
    
    event_handler = LogFileHandler()
    observer = Observer()
    observer.schedule(event_handler, LOG_DIR, recursive=False)
    observer.start()
    
    try:
        logger.info("⏳ Script en cours d'exécution. Appuyez sur Ctrl+C pour arrêter.")
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.warning("🛑 Arrêt du script demandé...")
        observer.stop()
    observer.join()
    logger.info("✨ Script arrêté avec succès.")

if __name__ == "__main__":
    main()