# Service de Dispatch Automatique KULOOC

## Configuration

Pour exécuter le service de dispatch automatique, vous devez configurer les credentials Firebase Admin SDK.

### Étape 1 : Obtenir les credentials Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet : `studio-1433254313-1efda`
3. Allez dans **Paramètres du projet** → **Comptes de service**
4. Cliquez sur **Générer une nouvelle clé privée**
5. Téléchargez le fichier JSON

### Étape 2 : Configurer les credentials

Copiez le fichier JSON téléchargé dans le dossier `scripts/` et renommez-le en `firebase-credentials.json` :

```bash
cp ~/Downloads/studio-1433254313-1efda-firebase-adminsdk-*.json scripts/firebase-credentials.json
```

**⚠️ IMPORTANT :** Ce fichier contient des informations sensibles et ne doit **JAMAIS** être commité sur GitHub. Il est déjà ajouté au `.gitignore`.

### Étape 3 : Lancer le service

```bash
# Lancer le service de dispatch
pnpm dispatch

# Ou en mode développement avec auto-reload
pnpm dispatch:dev
```

## Fonctionnement

Le service de dispatch automatique :

1. **Écoute** en temps réel les nouvelles demandes de course (`ride_requests` avec `status: 'pending'`)
2. **Recherche** le chauffeur disponible le plus proche du point de prise en charge
3. **Assigne** automatiquement la course au chauffeur trouvé
4. **Crée** une `active_ride` dans Firestore
5. **Met à jour** le statut du chauffeur (`online` → `en-route`)
6. **Calcule** automatiquement le tarif avec taxes (TPS + TVQ Québec)

## Architecture

```
Client (ride page)
    ↓
  useRide hook
    ↓
createRideRequest() → Firestore (ride_requests)
    ↓
Dispatch Service (écoute en temps réel)
    ↓
findNearestAvailableDriver()
    ↓
assignRideToDriver()
    ↓
Firestore (active_rides) + Update driver status
    ↓
Driver App (notification)
```

## Index Firestore requis

Le service nécessite les index composites suivants dans Firestore. Ils sont définis dans `firestore.indexes.json` :

- `ride_requests` : `status` (ASC) + `requestedAt` (ASC)
- `active_rides` : `passengerId` (ASC) + `status` (CONTAINS)
- `active_rides` : `driverId` (ASC) + `status` (CONTAINS)
- `completed_rides` : `passengerId` (ASC) + `completedAt` (DESC)

Pour déployer les index :

```bash
firebase deploy --only firestore:indexes
```

Ou créez-les manuellement via la Firebase Console en cliquant sur les liens fournis dans les messages d'erreur.
