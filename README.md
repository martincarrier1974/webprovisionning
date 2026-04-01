# WebProvisionning

Serveur de provisioning multi-tenant pour téléphones **Yealink T-Series** et **Grandstream GXP**.

## Stack actuelle

- Next.js 16 (App Router)
- TypeScript
- ESLint

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
- Endpoint de provisioning dynamique en préparation
- Helpers de validation vendor / MAC
- `.env.example` pour préparer la suite

## Démarrage local

```bash
npm install
npm run dev
```

Puis ouvrir <http://localhost:3000>

## Endpoints disponibles

- `GET /api/health`
- `GET /api/provisioning/yealink/:mac`
- `GET /api/provisioning/grandstream/:mac`

## Prochaines étapes

1. Ajouter Prisma + PostgreSQL
2. Implémenter auth admin globale + utilisateurs
3. Construire le modèle multi-tenant
4. Gérer les firmwares via stockage objet
5. Développer l’interface admin
6. Brancher les vrais templates de provisioning
