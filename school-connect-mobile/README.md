# School Connect Mobile

Application mobile Correspondant School développée avec Expo, React Native, Expo Router et TypeScript.

## Stack

- Expo 57
- React Native 0.86
- React 19
- Expo Router
- TypeScript
- TanStack React Query
- Zustand
- Axios
- React Hook Form
- Zod
- Expo Secure Store
- Expo Document Picker
- XLSX

## Fonctionnalités

- authentification ;
- gestion de session ;
- tableaux de bord par rôle ;
- élèves et classes ;
- enseignants et personnel ;
- annonces ;
- devoirs ;
- notes/résultats ;
- emplois du temps ;
- présences ;
- messages et conversations ;
- assistant IA ;
- vie scolaire ;
- discipline ;
- autorisations ;
- documents ;
- réunions ;
- paiements ;
- tickets ;
- module médical.

## Rôles supportés

```text
SUPER_ADMIN
SCHOOL_ADMIN
TEACHER
PARENT
STUDENT
STAFF
```

Pour `STAFF` : administration, surveillant, secrétariat, comptabilité et infirmier.

## Architecture

```text
school-connect-mobile/
├── app/
│   ├── (auth)/       # authentification
│   └── (app)/        # espace connecté
├── config/
├── constants/
├── core/
├── features/
├── services/
├── stores/
├── theme/
├── types/
└── assets/
```

Les écrans sont gérés par Expo Router. La logique réutilisable doit rester dans `features/`, `services/` et `stores/`.

## Installation

```bash
cd school-connect-mobile
npm install
cp .env.example .env
```

PowerShell :

```powershell
Copy-Item .env.example .env
```

## Configuration API

```env
EXPO_PUBLIC_API_URL=http://localhost:4000/api/v1
```

Sur un téléphone physique :

```env
EXPO_PUBLIC_API_URL=http://192.168.1.20:4000/api/v1
```

Le téléphone et le serveur doivent être sur le même réseau et l'API doit écouter sur `0.0.0.0`.

## Démarrage

```bash
npm start
npm run android
npm run ios
npm run web
```

Lint :

```bash
npm run lint
```

Après modification de `.env` :

```bash
npx expo start -c
```

## Authentification

```text
Login
  │
  ▼
POST /api/v1/auth/login
  │
  ▼
accessToken + refreshToken + user
  │
  ▼
Zustand authStore
  │
  ▼
Secure Store
  │
  ▼
Expo Router
  │
  ▼
Dashboard selon le rôle
```

L'autorisation métier reste côté API. Le fait de masquer un écran mobile n'est pas une mesure de sécurité.

## API client

`EXPO_PUBLIC_API_URL` définit la base URL.

- Axios : transport HTTP ;
- TanStack React Query : données serveur ;
- Zustand : état global/session ;
- Expo Secure Store : stockage sécurisé de session.

## Assistant IA

Écran :

```text
app/(app)/assistant.tsx
```

Endpoint :

```text
POST /api/v1/ai/chat
```

Le contexte métier est déterminé par l'API.

## Design system

Le thème est centralisé :

```text
theme/
├── colors.ts
├── radius.ts
├── spacing.ts
├── typography.ts
└── index.ts
```

## Ajouter une fonctionnalité

Structure recommandée :

```text
features/
└── my-feature/
    ├── components/
    ├── my-feature.service.ts
    ├── my-feature.types.ts
    └── my-feature.schema.ts
```

Créer ensuite l'écran dans `app/`.

## Documents et imports

Le projet utilise `expo-document-picker` et `xlsx`. Les données importées doivent être validées côté backend avant persistance.

## Sécurité

- Ne jamais hardcoder un secret backend.
- Les variables `EXPO_PUBLIC_*` sont publiques.
- Utiliser Secure Store pour les informations de session.
- Ne jamais mettre un token dans les logs.
- Toute action sensible doit être autorisée par l'API.
- Utiliser HTTPS en production.

## Dépannage

### API inaccessible

Tester :

```text
http://<IP_MACHINE>:4000/api/v1/health
```

Si le téléphone utilise `localhost`, il essaie de joindre son propre appareil.

### Expo ne recharge pas l'environnement

```bash
npx expo start -c
```

### CORS

Configurer `CORS_ORIGIN` côté API avec l'origine réellement utilisée en développement.

## Licence

Le sous-projet contient son propre fichier `LICENSE`. Le consulter avant redistribution ou usage commercial.

## Repository

https://github.com/zagarino0/correspondant-school

## Design system — Correspondant

L’interface mobile utilise une palette unique, lumineuse et sans noir pur :

| Token | Valeur | Usage |
| --- | --- | --- |
| primary | #237A57 | Actions principales et éléments actifs |
| primaryDark | #18543E | Variantes profondes |
| accent | #55A77D | Accents et états positifs |
| background | #F7F6F0 | Fond général |
| surface | #FFFDF8 | Cartes et surfaces |
| text | #263B32 | Texte principal |
| textSecondary | #6B7C74 | Texte secondaire |
| border | #DCE5DF | Bordures |

Les écrans Parent, Élève, Enseignant, Staff, messages, médical, emploi du temps et administration doivent consommer les tokens de src/theme/colors.ts plutôt que des couleurs hexadécimales locales.
