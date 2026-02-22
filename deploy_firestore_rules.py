#!/usr/bin/env python3
import json
from google.oauth2 import service_account
from google.auth.transport.requests import Request
import requests

# Charger le service account
with open('/home/ubuntu/kulooc/firebase-service-account.json', 'r') as f:
    service_account_info = json.load(f)

# Créer les credentials
credentials = service_account.Credentials.from_service_account_info(
    service_account_info,
    scopes=['https://www.googleapis.com/auth/cloud-platform',
            'https://www.googleapis.com/auth/firebase',
            'https://www.googleapis.com/auth/datastore']
)

# Obtenir un token d'accès
credentials.refresh(Request())
access_token = credentials.token

# Lire les règles Firestore
with open('/home/ubuntu/kulooc/firestore.rules', 'r') as f:
    rules_content = f.read()

# Préparer la requête
project_id = service_account_info['project_id']

# Préparer le payload pour l'API Firebase Rules
payload = {
    "source": {
        "files": [
            {
                "name": "firestore.rules",
                "content": rules_content
            }
        ]
    }
}

headers = {
    'Authorization': f'Bearer {access_token}',
    'Content-Type': 'application/json'
}

# Créer le ruleset
url_rulesets = f'https://firebaserules.googleapis.com/v1/projects/{project_id}/rulesets'
print(f"Création du ruleset pour le projet {project_id}...")
response = requests.post(url_rulesets, json=payload, headers=headers)

if response.status_code in [200, 201]:
    ruleset = response.json()
    ruleset_name = ruleset['name']
    print(f"✅ Ruleset créé: {ruleset_name}")
    
    # Créer une release avec POST
    releases_url = f'https://firebaserules.googleapis.com/v1/projects/{project_id}/releases'
    release_payload = {
        "name": f"projects/{project_id}/releases/cloud.firestore",
        "rulesetName": ruleset_name
    }
    
    print("Création de la release...")
    release_response = requests.post(releases_url, json=release_payload, headers=headers)
    
    if release_response.status_code in [200, 201]:
        print("✅ Règles Firestore déployées avec succès!")
        print(json.dumps(release_response.json(), indent=2))
    else:
        print(f"❌ Erreur lors de la création de la release: {release_response.status_code}")
        print(release_response.text)
else:
    print(f"❌ Erreur lors de la création du ruleset: {response.status_code}")
    print(response.text)
