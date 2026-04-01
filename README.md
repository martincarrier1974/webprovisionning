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
- Client Prisma partagé côté serveur
- `.env.example` pour préparer la suite

## Démarrage local

```bash
npm install
npm run prisma:generate
npm run dev
```

Puis ouvrir <http://localhost:3000>

## Endpoints disponibles

- `GET /api/health`
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

## Prochaines étapes

1. Générer la migration Prisma initiale
2. Implémenter auth admin globale + utilisateurs
3. Construire le dashboard admin
4. Gérer les firmwares via stockage objet
5. Développer les CRUD clients / sites / téléphones
6. Brancher les vrais templates de provisioning
