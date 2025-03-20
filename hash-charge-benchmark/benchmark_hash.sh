#!/bin/bash

# Fonction pour mesurer le temps de hash
measure_hash_time() {
    local file=$1
    local size=$(wc -l < "$file")
    echo "Test avec $size lignes:"
    
    # Test avec sha256sum
    echo "SHA256:"
    time sha256sum "$file" > /dev/null
    
    echo "----------------------------------------"
}

# Test avec différentes tailles
sizes=(10 100 1000 10000 100000)

for size in "${sizes[@]}"; do
    file="test_${size}.log"
    if [ -f "$file" ]; then
        measure_hash_time "$file"
    else
        echo "Le fichier $file n'existe pas"
    fi
done 