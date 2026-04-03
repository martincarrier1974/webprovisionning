import { SummaryCards } from "@/components/dashboard/summary-cards";
import { getDashboardSummary } from "@/lib/dashboard/summary";

import styles from "./page.module.css";

const pillars = [
  {
    title: "Multi-tenant / multi-sites",
    description:
      "Gestion centralisée des clients, succursales, téléphones, modèles et utilisateurs administratifs.",
  },
  {
    title: "Provisioning HTTP",
    description:
      "Endpoints dédiés pour Yealink T-Series et Grandstream GXP avec génération dynamique par client, modèle et MAC.",
  },
  {
    title: "Firmwares & fichiers",
    description:
      "Architecture prévue pour upload, versionnement et distribution via stockage objet compatible Railway.",
  },
  {
    title: "FR / EN",
    description:
      "Interface bilingue prévue dès le départ pour éviter une refonte plus tard.",
  },
];

const nextSteps = [
  "Générer la migration Prisma initiale.",
  "Créer l’authentification admin globale et la gestion des utilisateurs.",
  "Construire les écrans Clients / Sites / Téléphones / Firmwares.",
  "Brancher la génération réelle des fichiers de provisioning par marque.",
];

export default async function Home() {
  const rawStats = await getDashboardSummary().catch(() => null);
  const stats = {
    clients: rawStats?.clients ?? 0,
    sites: rawStats?.sites ?? 0,
    phoneModels: 0,
    phones: rawStats?.phones.total ?? 0,
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.badge}>WebProvisionning · MVP initial</div>
        <h1>Provisioning centralisé pour Yealink et Grandstream.</h1>
        <p className={styles.lead}>
          Base de projet Next.js pour un serveur de provisioning multi-tenant,
          multi-sites, avec interface web admin, endpoints HTTP et gestion future
          des firmwares.
        </p>

        <div className={styles.actions}>
          <a href="/api/health" className={styles.primary}>
            Tester l’API health
          </a>
          <a
            href="/api/provisioning/yealink/001565A1B2C3"
            className={styles.secondary}
          >
            Exemple provisioning Yealink
          </a>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.eyebrow}>Dashboard</span>
          <h2>Vue rapide de la plateforme</h2>
        </div>
        <SummaryCards stats={stats} />
      </section>

      <section className={styles.grid}>
        {pillars.map((pillar) => (
          <article key={pillar.title} className={styles.card}>
            <h2>{pillar.title}</h2>
            <p>{pillar.description}</p>
          </article>
        ))}
      </section>

      <section className={styles.panel}>
        <div>
          <span className={styles.eyebrow}>État actuel</span>
          <h2>Squelette prêt pour la phase back-end.</h2>
          <p>
            Le projet démarre avec une base App Router propre, une identité de
            produit, et les premiers endpoints de provisioning afin de fixer la
            structure technique dès le début.
          </p>
        </div>

        <div>
          <span className={styles.eyebrow}>Prochaines étapes</span>
          <ul className={styles.list}>
            {nextSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
