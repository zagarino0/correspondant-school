# Correspondant School

> Plateforme numérique de gestion, de communication et de suivi de la vie scolaire.

Correspondant School regroupe dans une même plateforme les élèves, parents, enseignants, surveillants, secrétariat, personnel médical et administrateurs.

## Sommaire

- [Présentation](#présentation)
- [Fonctionnalités](#fonctionnalités)
- [Rôles](#rôles)
- [Architecture](#architecture)
- [Stack technique](#stack-technique)
- [Structure](#structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Backend](#backend)
- [Mobile](#mobile)
- [Base de données](#base-de-données)
- [API](#api)
- [Authentification](#authentification)
- [Assistant IA](#assistant-ia)
- [Temps réel et SMS](#temps-réel-et-sms)
- [Tests](#tests)
- [Docker](#docker)
- [Déploiement Render](#déploiement-render)
- [Sécurité](#sécurité)
- [Dépannage](#dépannage)
- [Roadmap](#roadmap)
- [Contribution](#contribution)

## Présentation

Le projet est organisé comme un monorepo contenant :

- **School Connect API** : API REST Fastify/TypeScript avec Prisma et PostgreSQL.
- **School Connect Mobile** : application Expo/React Native avec Expo Router.

Le principe central est simple : **les règles d'autorisation et la logique métier restent côté serveur**, tandis que le mobile fournit une interface adaptée au profil connecté.

## Fonctionnalités

### Pédagogie
- élèves, classes et niveaux ;
- années scolaires et inscriptions ;
- enseignants et affectations ;
- notes et évaluations ;
- devoirs ;
- emplois du temps ;
- observations de cours.

### Présences et vie scolaire
- présences, absences et retards ;
- justifications ;
- événements de présence ;
- convocations de parents ;
- sorties et mouvements d'élèves ;
- incidents ;
- actions disciplinaires ;
- observations de vie scolaire ;
- autorisations.

### Administration
- établissements ;
- utilisateurs et personnel ;
- tableau de bord établissement ;
- documents ;
- réunions ;
- paiements ;
- tickets/support.

### Communication
- annonces ciblées ;
- messagerie et conversations ;
- messages lus/non lus ;
- convocations ;
- notifications SMS.

### Module médical
- dossiers médicaux ;
- événements médicaux ;
- rapports médicaux ;
- historique des modifications ;
- informations d'urgence et constantes.

### Assistant IA
L'API fournit un assistant conversationnel authentifié via :

`POST /api/v1/ai/chat`

Le backend construit un contexte autorisé à partir du profil et des permissions de l'utilisateur avant de solliciter le service IA.

## Rôles

| Rôle | Responsabilité |
|---|---|
| `SUPER_ADMIN` | Administration globale |
| `SCHOOL_ADMIN` | Administration d'un établissement |
| `TEACHER` | Gestion pédagogique |
| `PARENT` | Suivi des enfants |
| `STUDENT` | Espace personnel de l'élève |
| `STAFF` | Personnel administratif et vie scolaire |

Fonctions `STAFF` actuellement prévues :

`ADMINISTRATION`, `SURVEILLANT`, `SECRETARIAT`, `COMPTABILITE`, `INFIRMIER`.

## Architecture

```text
                 Correspondant School
                         │
              ┌──────────┴──────────┐
              │                     │
       Mobile Expo             Fastify API
       React Native            TypeScript
       Expo Router             Prisma
       React Query             JWT / Zod
       Zustand                 WebSocket
              │                     │
              └────────HTTPS────────┘
                                    │
                              PostgreSQL
```

Le backend applique :
- authentification JWT ;
- autorisations par rôle ;
- contrôle des ressources ;
- validation Zod ;
- rate limiting ;
- Helmet ;
- CORS configurable.

## Stack technique

### Backend
- Node.js
- TypeScript
- Fastify 5
- Prisma 6
- PostgreSQL
- Zod
- JWT
- bcryptjs
- WebSocket
- Vitest
- Docker

### Mobile
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

## Structure

```text
correspondant-school/
├── README.md
├── render.yaml
│
├── school-connect-api/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── app/
│   │   ├── authorization/
│   │   ├── config/
│   │   ├── middleware/
│   │   ├── plugins/
│   │   ├── realtime/
│   │   ├── routes/
│   │   └── services/
│   ├── scripts/
│   ├── tests/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── .env.example
│   └── package.json
│
└── school-connect-mobile/
    ├── app/
    │   ├── (auth)/
    │   └── (app)/
    ├── config/
    ├── constants/
    ├── core/
    ├── features/
    ├── services/
    ├── stores/
    ├── theme/
    ├── types/
    ├── assets/
    ├── .env.example
    └── package.json
```

## Installation

Prérequis :
- Node.js LTS ;
- npm ;
- Git ;
- Docker Desktop ;
- Android Studio si développement Android ;
- Xcode si développement iOS sur macOS.

Cloner :

```bash
git clone https://github.com/zagarino0/correspondant-school.git
cd correspondant-school
```

### Backend

```bash
cd school-connect-api
npm install
```

### Mobile

```bash
cd school-connect-mobile
npm install
```

## Configuration

### Backend

```bash
cd school-connect-api
cp .env.example .env
```

PowerShell :

```powershell
Copy-Item .env.example .env
```

Configuration locale :

```env
NODE_ENV=development
PORT=4000
HOST=0.0.0.0

DATABASE_URL=postgresql://schoolconnect:schoolconnect@localhost:5433/school_connect?schema=public

JWT_SECRET=replace-with-a-random-secret-at-least-32-characters
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

CORS_ORIGIN=*
LOG_LEVEL=info

LLM_PROVIDER=stub
LLM_TIMEOUT_MS=30000

SMS_ENABLED=false
SMS_PROVIDER=stub
```

### Mobile

```bash
cd school-connect-mobile
cp .env.example .env
```

```env
EXPO_PUBLIC_API_URL=http://localhost:4000/api/v1
```

Sur un téléphone physique, remplacer `localhost` par l'adresse IP LAN de la machine exécutant l'API, par exemple :

```env
EXPO_PUBLIC_API_URL=http://192.168.1.20:4000/api/v1
```

Ne jamais committer les vrais secrets.

## Backend

Démarrer PostgreSQL :

```bash
npm run db:up
```

Générer Prisma :

```bash
npm run prisma:generate
```

Appliquer les migrations :

```bash
npm run prisma:deploy
```

Développement :

```bash
npm run dev
```

Build :

```bash
npm run build
```

Production :

```bash
npm start
```

API locale :

```text
http://localhost:4000
```

Health check :

```text
GET /api/v1/health
```

## Mobile

Depuis `school-connect-mobile` :

```bash
npm start
```

Android :

```bash
npm run android
```

iOS :

```bash
npm run ios
```

Web :

```bash
npm run web
```

Lint :

```bash
npm run lint
```

Après modification du `.env` :

```bash
npx expo start -c
```

## Base de données

Le schéma se trouve dans :

```text
school-connect-api/prisma/schema.prisma
```

Il couvre notamment :

```text
School
User
Student
AcademicYear
SchoolClass
TeacherClass
StudentEnrollment
Attendance
AttendanceEvent
ParentSummons
Assignment
Grade
Schedule
Announcement
Conversation
Message
MedicalEvent
MedicalReport
MedicalHistory
Document
Meeting
Payment
Ticket
SmsNotification
```

Prisma Studio :

```bash
npm run prisma:studio
```

Validation :

```bash
npm run prisma:validate
```

Migration de développement :

```bash
npm run prisma:migrate
```

## API

Préfixe global :

```text
/api/v1
```

| Domaine | Préfixe |
|---|---|
| Health | `/api/v1/health` |
| Auth | `/api/v1/auth` |
| School admin | `/api/v1/school-admin` |
| Assignments | `/api/v1/assignments` |
| Schedules | `/api/v1/schedules` |
| Announcements | `/api/v1/announcements` |
| Messages | `/api/v1/messages` |
| AI | `/api/v1/ai` |
| Medical | `/api/v1/medical` |
| Medical reports | `/api/v1/medical-reports` |
| Surveillant | `/api/v1/surveillant` |
| Discipline | `/api/v1/discipline` |
| Teachers | `/api/v1/teachers` |
| Autres modules | `/api/v1` |

## Authentification

Login :

```http
POST /api/v1/auth/login
Content-Type: application/json
```

```json
{
  "email": "parent@example.com",
  "password": "mot-de-passe"
}
```

La réponse contient l'utilisateur, ses permissions, un access token et un refresh token.

Refresh :

```http
POST /api/v1/auth/refresh
```

Profil courant :

```http
GET /api/v1/auth/me
Authorization: Bearer <access-token>
```

Le mot de passe est vérifié avec bcrypt. Les refresh tokens sont hashés en base.

## Assistant IA

```http
POST /api/v1/ai/chat
Authorization: Bearer <access-token>
Content-Type: application/json
```

```json
{
  "message": "Quels sont les devoirs de mon enfant cette semaine ?",
  "conversationId": "optionnel"
}
```

Configuration :

```env
LLM_PROVIDER=stub
LLM_TIMEOUT_MS=30000
```

Le mobile ne doit jamais contourner le contrôle d'accès pour construire le contexte IA.

## Temps réel et SMS

Le backend dispose d'une couche WebSocket pour les besoins temps réel : messagerie, notifications et événements.

Le service SMS dispose d'un worker et d'une stratégie de retry :

```env
SMS_ENABLED=false
SMS_PROVIDER=stub
SMS_MAX_ATTEMPTS=3
SMS_RETRY_BASE_DELAY_MS=30000
SMS_WORKER_INTERVAL_MS=15000
```

Pour Twilio, configurer les credentials uniquement dans l'environnement de déploiement.

## Tests

Backend :

```bash
npm run typecheck
npm test
npm run test:surveillant-school-life
npm run test:attendance-schedule-flow
```

Mobile :

```bash
npm run lint
```

## Docker

Démarrer PostgreSQL :

```bash
npm run db:up
```

Logs :

```bash
npm run db:logs
```

Arrêter :

```bash
npm run db:down
```

## Déploiement Render

Le fichier racine `render.yaml` configure le backend.

Build :

```bash
npm ci && npm run prisma:generate && npm run build
```

Start :

```bash
npm run prisma:deploy && npm start
```

Health check :

```text
/api/v1/health
```

Variables à renseigner dans Render :

```text
DATABASE_URL
JWT_SECRET
CORS_ORIGIN
```

Pour SMS Twilio, ajouter uniquement si activé :

```text
TWILIO_ACCOUNT_SID
TWILIO_API_KEY
TWILIO_API_SECRET
TWILIO_AUTH_TOKEN
TWILIO_FROM
TWILIO_MESSAGING_SERVICE_SID
```

## Sécurité

- Ne jamais versionner `.env`.
- Utiliser un `JWT_SECRET` aléatoire d'au moins 32 caractères.
- Garder les secrets IA/Twilio côté serveur.
- Valider les entrées avec Zod.
- Conserver l'autorisation métier côté API.
- Utiliser HTTPS en production.
- Protéger les sauvegardes PostgreSQL.
- Ne pas logger les tokens ou données médicales.
- Appliquer le principe du moindre privilège.
- Maintenir l'isolation entre établissements.

Le module médical manipule des données sensibles et doit bénéficier de permissions particulièrement restrictives en production.

## Flux principal

```text
Mobile
  │
  ├── POST /auth/login
  ▼
Fastify
  ├── validation
  ├── bcrypt
  ├── JWT
  └── refresh token
  │
  ▼
Mobile
  └── Secure Store
        │
        ▼
Dashboard selon le rôle
        │
        ▼
API protégée
        │
        ▼
Authorization → Service → Prisma → PostgreSQL
```

## Dépannage

### PostgreSQL inaccessible

```bash
docker ps
npm run db:logs
```

Vérifier `DATABASE_URL`.

### Mobile inaccessible depuis un téléphone

Ne pas utiliser `localhost`. Utiliser l'IP LAN de la machine et vérifier le pare-feu.

### CORS

Exemple :

```env
CORS_ORIGIN=http://localhost:8081,http://192.168.1.20:8081
```

### Expo ne voit pas les changements d'environnement

```bash
npx expo start -c
```

## Roadmap

- stabilisation des flux d'authentification ;
- renforcement des tests d'autorisation ;
- documentation OpenAPI ;
- notifications push ;
- IA avec fournisseur de production ;
- SMS de production ;
- observabilité et métriques ;
- audit trail renforcé ;
- portail web d'administration ;
- analytics scolaires ;
- évolution vers une architecture SaaS multi-établissements.

## Contribution

Créer une branche :

```bash
git checkout -b feature/ma-fonctionnalite
```

Tester puis committer :

```bash
git commit -m "feat: add school attendance report"
git push origin feature/ma-fonctionnalite
```

Ouvrir ensuite une Pull Request.

## Repository

https://github.com/zagarino0/correspondant-school

> Consulter les fichiers `LICENSE` présents dans les sous-projets avant redistribution ou utilisation commerciale.
