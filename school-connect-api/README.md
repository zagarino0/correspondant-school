# School Connect API

Backend de Correspondant School. Il centralise l'authentification, les autorisations, la logique métier scolaire, les communications, l'IA, le temps réel et l'accès PostgreSQL.

## Stack

Node.js · TypeScript · Fastify 5 · Prisma 6 · PostgreSQL · Zod · JWT · bcryptjs · WebSocket · Vitest · Docker.

## Structure

```text
src/
├── app/             # construction Fastify
├── authorization/   # rôles, permissions, contexte autorisé
├── config/          # environnement
├── middleware/      # authentification / autorisation
├── plugins/         # Prisma, JWT, WebSocket
├── realtime/        # temps réel
├── routes/          # routes HTTP
└── services/        # logique métier
```

## Installation

```bash
cd school-connect-api
npm install
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

## PostgreSQL

```bash
npm run db:up
npm run prisma:generate
npm run prisma:deploy
```

Commandes utiles :

```bash
npm run db:logs
npm run db:down
npm run prisma:migrate
npm run prisma:studio
npm run prisma:validate
```

## Développement

```bash
npm run dev
```

Build / production :

```bash
npm run build
npm start
```

## Health checks

```text
GET /api/v1/health
GET /api/v1/health/database
GET /api/v1/health/config
```

## Routes

```text
/api/v1/auth
/api/v1/school-admin
/api/v1/assignments
/api/v1/schedules
/api/v1/announcements
/api/v1/messages
/api/v1/ai
/api/v1/medical
/api/v1/medical-reports
/api/v1/surveillant
/api/v1/discipline
/api/v1/teachers
/api/v1/*
```

## Authentification

Login :

```http
POST /api/v1/auth/login
```

```json
{
  "email": "parent@example.com",
  "password": "mot-de-passe"
}
```

Refresh :

```http
POST /api/v1/auth/refresh
```

Profil :

```http
GET /api/v1/auth/me
Authorization: Bearer <access-token>
```

Rôles :

```text
SUPER_ADMIN
SCHOOL_ADMIN
TEACHER
PARENT
STUDENT
STAFF
```

## Assistant IA

```http
POST /api/v1/ai/chat
Authorization: Bearer <access-token>
```

```json
{
  "message": "Quels sont les devoirs de mon enfant ?",
  "conversationId": "optionnel"
}
```

Le contexte IA est construit côté serveur avec les données autorisées pour l'utilisateur.

## SMS

```env
SMS_ENABLED=false
SMS_PROVIDER=stub
SMS_MAX_ATTEMPTS=3
SMS_RETRY_BASE_DELAY_MS=30000
SMS_WORKER_INTERVAL_MS=15000
```

Twilio est configurable sans exposer les credentials dans Git.

## Sécurité

Le backend utilise Helmet, CORS, rate limiting, JWT, refresh tokens hashés, bcrypt, Zod et des middleware d'autorisation.

Les secrets suivants doivent rester hors Git :

- `.env`
- `JWT_SECRET`
- clés IA
- credentials Twilio
- credentials PostgreSQL

## Tests

```bash
npm run typecheck
npm test
npm run test:surveillant-school-life
npm run test:attendance-schedule-flow
```

## Render

Le service est défini par le `render.yaml` racine.

```bash
npm ci && npm run prisma:generate && npm run build
npm run prisma:deploy && npm start
```

Health check :

```text
/api/v1/health
```

Variables principales :

```text
DATABASE_URL
JWT_SECRET
CORS_ORIGIN
```

## Relation mobile

Le mobile utilise :

```env
EXPO_PUBLIC_API_URL=http://localhost:4000/api/v1
```

Depuis un téléphone physique, utiliser l'IP LAN du serveur.

## Licence

Vérifier la licence applicable à ce sous-projet avant redistribution ou usage commercial.
