#!/usr/bin/env python3
"""
Script pour créer automatiquement un chauffeur de test dans Firestore
"""

import json
import os
import sys
from datetime import datetime
from google.cloud import firestore
from google.oauth2 import service_account

def create_test_driver():
    print("🚗 Création d'un chauffeur de test dans Firestore...")
    
    # Charger les credentials
    credentials_path = os.path.join(os.path.dirname(__file__), 'firebase-credentials.json')
    
    if not os.path.exists(credentials_path):
        print(f"❌ Fichier de credentials introuvable: {credentials_path}")
        sys.exit(1)
    
    # Charger les credentials
    credentials = service_account.Credentials.from_service_account_file(
        credentials_path
    )
    
    # Créer le client Firestore
    db = firestore.Client(credentials=credentials, project=credentials.project_id)
    
    print(f"📦 Projet: {credentials.project_id}")
    
    # Données du chauffeur de test
    driver_data = {
        "name": "Jean Dupont",
        "email": "jean.dupont@kulooc.com",
        "phone": "+15141234567",
        "status": "online",
        "location": {
            "latitude": 45.5088,
            "longitude": -73.554
        },
        "vehicle": {
            "make": "Toyota",
            "model": "Camry",
            "year": 2022,
            "color": "Noir",
            "licensePlate": "ABC123"
        },
        "rating": 4.8,
        "totalTrips": 0,
        "acceptanceRate": 0.95,
        "averageRating": 4.8,
        "onlineSince": firestore.SERVER_TIMESTAMP,
        "createdAt": firestore.SERVER_TIMESTAMP,
        "updatedAt": firestore.SERVER_TIMESTAMP
    }
    
    # Vérifier si un chauffeur avec le même email existe déjà
    existing_drivers = db.collection('drivers').where('email', '==', driver_data['email']).limit(1).get()
    
    if len(list(existing_drivers)) > 0:
        print("ℹ️  Un chauffeur avec cet email existe déjà")
        for driver in existing_drivers:
            driver_id = driver.id
            print(f"   ID: {driver_id}")
            print(f"   Nom: {driver.to_dict().get('name')}")
            print(f"   Statut: {driver.to_dict().get('status')}")
            
            # Mettre à jour le statut à "online"
            db.collection('drivers').document(driver_id).update({
                'status': 'online',
                'onlineSince': firestore.SERVER_TIMESTAMP,
                'updatedAt': firestore.SERVER_TIMESTAMP
            })
            print(f"   ✅ Statut mis à jour: online")
        return
    
    # Créer le chauffeur
    doc_ref = db.collection('drivers').document()
    doc_ref.set(driver_data)
    
    print(f"\n✅ Chauffeur créé avec succès!")
    print(f"   ID: {doc_ref.id}")
    print(f"   Nom: {driver_data['name']}")
    print(f"   Email: {driver_data['email']}")
    print(f"   Véhicule: {driver_data['vehicle']['make']} {driver_data['vehicle']['model']}")
    print(f"   Plaque: {driver_data['vehicle']['licensePlate']}")
    print(f"   Statut: {driver_data['status']}")
    print(f"   Position: {driver_data['location']['latitude']}, {driver_data['location']['longitude']}")
    
    print(f"\n🎉 Le chauffeur est maintenant disponible pour recevoir des courses!")
    print(f"\n📍 Vous pouvez le voir sur le dashboard dispatch:")
    print(f"   https://kulooc-app.vercel.app/dispatch")

if __name__ == '__main__':
    try:
        create_test_driver()
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        sys.exit(1)
