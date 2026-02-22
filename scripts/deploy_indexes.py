#!/usr/bin/env python3
"""
Script pour déployer automatiquement les index Firestore
Utilise l'API Firestore Admin avec les credentials Firebase
"""

import json
import os
import sys
from google.cloud import firestore_admin_v1
from google.oauth2 import service_account

def deploy_indexes():
    print("🚀 Déploiement des index Firestore...")
    
    # Charger les credentials
    credentials_path = os.path.join(os.path.dirname(__file__), 'firebase-credentials.json')
    
    if not os.path.exists(credentials_path):
        print(f"❌ Fichier de credentials introuvable: {credentials_path}")
        print("   Veuillez placer le fichier firebase-credentials.json dans le dossier scripts/")
        sys.exit(1)
    
    # Charger les credentials
    credentials = service_account.Credentials.from_service_account_file(
        credentials_path,
        scopes=['https://www.googleapis.com/auth/cloud-platform']
    )
    
    # Créer le client Firestore Admin
    client = firestore_admin_v1.FirestoreAdminClient(credentials=credentials)
    
    # Lire le projet ID depuis les credentials
    with open(credentials_path, 'r') as f:
        creds_data = json.load(f)
        project_id = creds_data['project_id']
    
    print(f"📦 Projet: {project_id}")
    
    # Définir les index à créer
    indexes = [
        {
            "name": "ride_requests_status_requestedAt",
            "collection_group": "ride_requests",
            "fields": [
                {"field_path": "status", "order": "ASCENDING"},
                {"field_path": "requestedAt", "order": "ASCENDING"}
            ]
        }
    ]
    
    parent = f"projects/{project_id}/databases/(default)/collectionGroups/ride_requests"
    
    for index_config in indexes:
        print(f"\n📝 Création de l'index: {index_config['name']}")
        
        # Construire l'index
        index = firestore_admin_v1.Index()
        index.query_scope = firestore_admin_v1.Index.QueryScope.COLLECTION
        
        for field_config in index_config['fields']:
            field = firestore_admin_v1.Index.IndexField()
            field.field_path = field_config['field_path']
            
            if field_config['order'] == 'ASCENDING':
                field.order = firestore_admin_v1.Index.IndexField.Order.ASCENDING
            elif field_config['order'] == 'DESCENDING':
                field.order = firestore_admin_v1.Index.IndexField.Order.DESCENDING
            
            index.fields.append(field)
        
        try:
            # Créer l'index
            operation = client.create_index(parent=parent, index=index)
            print(f"   ⏳ Index en cours de création...")
            print(f"   ℹ️  Cela peut prendre 1-5 minutes")
            
            # Attendre que l'opération se termine (avec timeout de 10 secondes)
            try:
                result = operation.result(timeout=10)
                print(f"   ✅ Index créé avec succès!")
            except Exception as e:
                if "ALREADY_EXISTS" in str(e) or "already exists" in str(e).lower():
                    print(f"   ℹ️  Index déjà existant (ignoré)")
                else:
                    print(f"   ⏳ Index en cours de création en arrière-plan...")
                    print(f"   ℹ️  Vous pouvez continuer, l'index sera prêt dans quelques minutes")
        
        except Exception as e:
            error_msg = str(e)
            if "ALREADY_EXISTS" in error_msg or "already exists" in error_msg.lower():
                print(f"   ℹ️  Index déjà existant (ignoré)")
            elif "PERMISSION_DENIED" in error_msg:
                print(f"   ❌ Erreur de permissions")
                print(f"   ℹ️  Veuillez vérifier que le compte de service a les permissions nécessaires")
                print(f"   ℹ️  Rôle requis: Cloud Datastore Index Admin")
            else:
                print(f"   ⚠️  Erreur: {error_msg}")
                print(f"   ℹ️  L'index peut être créé manuellement via la console Firebase")
    
    print("\n✅ Déploiement des index terminé!")
    print("\nℹ️  Si les index sont en cours de création, ils seront prêts dans 1-5 minutes.")
    print("   Vous pouvez vérifier leur statut sur:")
    print(f"   https://console.firebase.google.com/project/{project_id}/firestore/indexes")

if __name__ == '__main__':
    try:
        deploy_indexes()
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        print("\nℹ️  Alternative: Créer l'index manuellement")
        print("   1. Lancez le service de dispatch: pnpm dispatch")
        print("   2. Cliquez sur le lien fourni dans l'erreur")
        print("   3. Cliquez sur 'Create Index'")
        sys.exit(1)
