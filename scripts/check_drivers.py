#!/usr/bin/env python3
"""
Script pour vérifier les chauffeurs dans Firestore
"""

import json
import os
import sys
from google.cloud import firestore
from google.oauth2 import service_account

def check_drivers():
    print("🔍 Vérification des chauffeurs dans Firestore...")
    
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
    
    print(f"📦 Projet: {credentials.project_id}\n")
    
    # Récupérer tous les chauffeurs
    drivers_ref = db.collection('drivers')
    drivers = drivers_ref.stream()
    
    driver_list = list(drivers)
    
    if len(driver_list) == 0:
        print("❌ Aucun chauffeur trouvé dans Firestore")
        return
    
    print(f"✅ {len(driver_list)} chauffeur(s) trouvé(s):\n")
    
    for driver in driver_list:
        driver_data = driver.to_dict()
        print(f"📍 Chauffeur ID: {driver.id}")
        print(f"   Nom: {driver_data.get('name', 'N/A')}")
        print(f"   Email: {driver_data.get('email', 'N/A')}")
        print(f"   Statut: {driver_data.get('status', 'N/A')}")
        
        location = driver_data.get('location')
        if location:
            print(f"   Position: {location.get('latitude')}, {location.get('longitude')}")
        else:
            print(f"   Position: Non définie")
        
        vehicle = driver_data.get('vehicle')
        if vehicle:
            print(f"   Véhicule: {vehicle.get('make')} {vehicle.get('model')} ({vehicle.get('licensePlate')})")
        
        print()

if __name__ == '__main__':
    try:
        check_drivers()
    except Exception as e:
        print(f"\n❌ Erreur: {e}")
        sys.exit(1)
