# WebProvisionning

Serveur de provisioning multi-tenant pour téléphones **Yealink T-Series** et **Grandstream GXP**.

## Stack actuelle

- Next.js 16 (App Router)
- TypeScript
- ESLint
- Prisma
- PostgreSQL

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

## Endpoints disponibles

- `GET /api/health`
- `GET /api/dashboard/summary`
- `GET /api/provisioning/yealink/:mac`
- `GET /api/provisioning/grandstream/:mac`

## Modèle de données initial

- `users`
- `clients`
- `sites`
- `phone_models`
- `phones`
- `provisioning_rules`
- `firmwares`
- `provision_logs`
- `audit_logs`

## Seed initial

Le seed crée un catalogue de modèles de départ pour :

- Yealink T31P, T33G, T43U, T46U, T48U, T53W, T54W, T57W
- Grandstream GXP1625, GXP1630, GXP2130, GXP2135, GXP2140, GXP2160, GXP2170

Optionnel :

- définir `SEED_ADMIN_EMAIL` pour créer un super-admin invité au seed

## Prochaines étapes

1. Brancher une vraie base PostgreSQL locale / Railway
2. Implémenter auth admin globale + utilisateurs
3. Construire le dashboard admin
4. Développer les CRUD clients / sites / téléphones
5. Ajouter l’upload de firmwares
6. Brancher les vrais templates de provisioning
