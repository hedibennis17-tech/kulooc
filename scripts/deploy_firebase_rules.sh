#!/bin/bash

# Script pour déployer les règles Firestore et Storage sur Firebase

echo "🔥 Déploiement des règles Firebase..."

# Vérifier si firebase CLI est installé
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI n'est pas installé"
    echo "📦 Installation de Firebase CLI..."
    npm install -g firebase-tools
fi

# Se placer dans le répertoire du projet
cd /home/ubuntu/kulooc

# Déployer les règles Firestore
echo "📋 Déploiement des règles Firestore..."
firebase deploy --only firestore:rules --project studio-1433254313-1efda

# Déployer les règles Storage
echo "📦 Déploiement des règles Storage..."
firebase deploy --only storage --project studio-1433254313-1efda

echo "✅ Déploiement terminé !"
