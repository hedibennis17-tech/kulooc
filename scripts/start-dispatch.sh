#!/bin/bash

echo "🚀 Démarrage du service de dispatch KULOOC..."
echo ""

# Vérifier que les credentials existent
if [ ! -f "scripts/firebase-credentials.json" ]; then
    echo "❌ Fichier firebase-credentials.json introuvable!"
    echo ""
    echo "📝 Veuillez copier vos credentials Firebase:"
    echo "   cp /home/ubuntu/upload/studio-1433254313-1efda-firebase-adminsdk-fbsvc-75f8d1ad9a.json scripts/firebase-credentials.json"
    echo ""
    exit 1
fi

echo "✅ Credentials Firebase trouvés"
echo ""

# Lancer le service de dispatch
echo "🎯 Lancement du service de dispatch..."
echo "   (Appuyez sur Ctrl+C pour arrêter)"
echo ""

pnpm dispatch
