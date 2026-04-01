# WebProvisionning

Serveur de provisioning multi-tenant pour téléphones **Yealink T-Series** et **Grandstream GXP**.

## Stack actuelle

- Next.js 16 (App Router)
- TypeScript
- ESLint
- Prisma
- PostgreSQL
- Auth custom légère (cookie session signée)

## Vision produit

- Multi-tenant / multi-sites
- Interface web admin FR / EN
- Provisioning HTTP par **client**, **modèle** et **MAC**
- Gestion des firmwares et fichiers
- Import / export CSV
- Déploiement sur Railway

## Ce qui est déjà en place

- Base Next.js initialisée
- Page d’accueil produit personnalisée
- Endpoint `GET /api/health`
- Endpoints de provisioning dynamique Yealink / Grandstream
- Résolution hiérarchique des règles de provisioning : default → client → site → modèle → téléphone
- Templates enrichis Yealink / Grandstream avec SIP, labels, timezone, langue, mots de passe et firmware target
- Logs de provisioning par requête et mise à jour de `lastProvisionedAt`
- Helpers de validation vendor / MAC
- Schéma Prisma multi-tenant initial
- Migration SQL initiale générée
- Seed initial pour modèles Yealink T / Grandstream GXP
- Auth admin de base (login, session, dashboard protégé, logout)
- CRUD utilisateurs (create / disable / enable / delete)
- CRUD clients (create / update / delete)
- CRUD sites (create / update / delete)
- CRUD téléphones (create / update / delete)
- CRUD firmwares (create / update / delete)
- Création de règles de provisioning hiérarchiques via dashboard admin
- Statut de configuration du stockage objet dans le dashboard
- Route de redirection firmware : `GET /api/firmware/[...path]`
- Endpoints admin :
  - `GET /api/admin/users`
  - `GET /api/admin/clients`
  - `GET /api/admin/sites`
  - `GET /api/admin/phones`
  - `GET /api/admin/firmwares`
  - `GET /api/admin/provisioning-rules`
  - `GET /api/admin/storage`
- Dockerfile + `railway.json` pour déploiement Railway
- Client Prisma partagé côté serveur
- `.env.example` et `.env.local.example`

## Démarrage local

```bash
cp .env.local.example .env.local
npm install
npm run prisma:generate
npm run prisma:migrate:dev
npm run prisma:seed
npm run dev
```

Puis ouvrir <http://localhost:3000>

## Variables importantes

- `DATABASE_URL`
- `AUTH_SECRET`
- `SEED_ADMIN_EMAIL`
- `SEED_ADMIN_PASSWORD`
- `NEXT_PUBLIC_APP_URL` (recommandé pour les URLs de provisioning générées)
- `STORAGE_PROVIDER`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`

## Endpoints disponibles

- `GET /api/health`
- `GET /api/dashboard/summary`
- `GET /api/provisioning/yealink/:mac`
- `GET /api/provisioning/grandstream/:mac`
- `GET /api/firmware/[...path]`
- `GET /api/admin/users`
- `GET /api/admin/clients`
- `GET /api/admin/sites`
- `GET /api/admin/phones`
- `GET /api/admin/firmwares`
- `GET /api/admin/provisioning-rules`
- `GET /api/admin/storage`

## Seed initial

Le seed crée :

- les modèles Yealink T et Grandstream GXP de départ
- un super-admin si `SEED_ADMIN_EMAIL` est défini
- un mot de passe hashé si `SEED_ADMIN_PASSWORD` est défini

## Prochaines étapes

1. vrai upload firmware vers stockage objet
2. import/export CSV
3. vues détaillées de logs de provisioning
4. améliorations UI dashboard
