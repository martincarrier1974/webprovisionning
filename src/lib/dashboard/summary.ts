import { db } from "@/lib/db";

const emptySummary = {
  clients: 0,
  sites: 0,
  phoneModels: 0,
  phones: 0,
};

export async function getDashboardSummary() {
  if (!process.env.DATABASE_URL) {
    return emptySummary;
  }

  try {
    const [clients, sites, phoneModels, phones] = await Promise.all([
      db.client.count(),
      db.site.count(),
      db.phoneModel.count(),
      db.phone.count(),
    ]);

    return {
      clients,
      sites,
      phoneModels,
      phones,
    };
  } catch {
    return emptySummary;
  }
}
