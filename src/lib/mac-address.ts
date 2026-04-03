import { db } from "@/lib/db";
import { normalizeMac } from "@/lib/provisioning/vendors";

export { normalizeMac };

/** Affichage lisible (ex. messages d’erreur CSV). */
export function macAsColonSeparated(normalized12: string): string {
  const pairs = normalized12.match(/.{2}/g);
  if (!pairs || pairs.length !== 6) return normalized12;
  return pairs.join(":").toUpperCase();
}

/**
 * Résout l’id du téléphone en comparant la MAC « canonique » (12 hex majuscules),
 * quel que soit le format stocké (`000B8292DE93`, `00:0B:…`, `00-0B-…`, casse mixte, etc.).
 */
export async function findPhoneIdByMacCanonical(
  macInput: string,
  options?: { excludePhoneId?: string }
): Promise<string | null> {
  const normalized = normalizeMac(macInput);
  if (normalized.length !== 12) return null;

  if (options?.excludePhoneId) {
    const rows = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Phone"
      WHERE UPPER(REGEXP_REPLACE("macAddress", '[^a-fA-F0-9]', '', 'g')) = ${normalized}
        AND id <> ${options.excludePhoneId}
      LIMIT 1
    `;
    return rows[0]?.id ?? null;
  }

  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Phone"
    WHERE UPPER(REGEXP_REPLACE("macAddress", '[^a-fA-F0-9]', '', 'g')) = ${normalized}
    LIMIT 1
  `;
  return rows[0]?.id ?? null;
}
