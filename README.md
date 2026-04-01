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
- Helpers de validation vendor / MAC
- Schéma Prisma multi-tenant initial
- Migration SQL initiale générée
- Seed initial pour modèles Yealink T / Grandstream GXP
- Auth admin de base (login, session, dashboard protégé, logout)
- Création d’utilisateurs via dashboard admin
- Endpoint admin `GET /api/admin/users`
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

## Endpoints disponibles

- `GET /api/health`
- `GET /api/dashboard/summary`
- `GET /api/provisioning/yealink/:mac`
- `GET /api/provisioning/grandstream/:mac`
- `GET /api/admin/users`

## Seed initial

Le seed crée :

- les modèles Yealink T et Grandstream GXP de départ
- un super-admin si `SEED_ADMIN_EMAIL` est défini
- un mot de passe hashé si `SEED_ADMIN_PASSWORD` est défini

## Prochaines étapes

1. CRUD clients / sites / téléphones
2. suppression / désactivation d’utilisateurs
3. upload de firmwares
4. édition des règles de provisioning
5. gabarits réels Yealink / Grandstream
