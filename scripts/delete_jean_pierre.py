#!/usr/bin/env python3
"""
Script pour supprimer le compte Jean-Pierre de Firebase
"""

import firebase_admin
from firebase_admin import credentials, firestore, auth
import os

# Initialiser Firebase Admin
cred_path = '/home/ubuntu/upload/studio-1433254313-1efda-firebase-adminsdk-fbsvc-75f8d1ad9a.json'
if not os.path.exists(cred_path):
    print(f"ERREUR: Fichier credentials non trouvé: {cred_path}")
    exit(1)

cred = credentials.Certificate(cred_path)
firebase_admin.initialize_app(cred)

db = firestore.client()

print("🔍 Recherche du compte Jean-Pierre...")

# Chercher dans la collection drivers
drivers_ref = db.collection('drivers')
query = drivers_ref.where('firstName', '==', 'Jean-Pierre').limit(10)
docs = query.stream()

deleted_count = 0

for doc in docs:
    driver_data = doc.to_dict()
    driver_id = doc.id
    
    print(f"\n📋 Trouvé: {driver_data.get('firstName')} {driver_data.get('lastName')}")
    print(f"   ID: {driver_id}")
    print(f"   Email: {driver_data.get('email')}")
    print(f"   Status: {driver_data.get('status')}")
    
    # Supprimer les documents du chauffeur
    print(f"🗑️  Suppression des documents...")
    docs_query = db.collection('driver_documents').where('driverId', '==', driver_id)
    for driver_doc in docs_query.stream():
        driver_doc.reference.delete()
        print(f"   ✅ Document {driver_doc.id} supprimé")
    
    # Supprimer le profil chauffeur
    print(f"🗑️  Suppression du profil chauffeur...")
    doc.reference.delete()
    print(f"   ✅ Profil supprimé")
    
    # Supprimer l'utilisateur Firebase Auth
    try:
        print(f"🗑️  Suppression du compte Firebase Auth...")
        auth.delete_user(driver_id)
        print(f"   ✅ Compte Auth supprimé")
    except Exception as e:
        print(f"   ⚠️  Erreur Auth: {e}")
    
    deleted_count += 1

if deleted_count == 0:
    print("\n❌ Aucun compte Jean-Pierre trouvé")
else:
    print(f"\n✅ {deleted_count} compte(s) supprimé(s)")

print("\n🔍 Vérification finale...")
remaining = drivers_ref.where('firstName', '==', 'Jean-Pierre').limit(1).stream()
if len(list(remaining)) == 0:
    print("✅ Aucun compte Jean-Pierre restant")
else:
    print("⚠️  Il reste des comptes Jean-Pierre")
