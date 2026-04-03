import { normalizeMac } from "@/lib/provisioning/vendors";

export { normalizeMac };

/** Variante `00:0B:82:92:DE:93` pour les anciennes entrées / imports CSV. */
export function macAsColonSeparated(normalized12: string): string {
  const pairs = normalized12.match(/.{2}/g);
  if (!pairs || pairs.length !== 6) return normalized12;
  return pairs.join(":").toUpperCase();
}

/**
 * Trouve un téléphone par MAC, que la base stocke `000B8292DE93` ou `00:0B:82:92:DE:93`.
 * @param excludePhoneId — pour les mises à jour, exclure le téléphone en cours d’édition
 */
export function phoneMacMatchWhere(macInput: string, options?: { excludePhoneId?: string }) {
  const normalized = normalizeMac(macInput);
  const colon = macAsColonSeparated(normalized);
  const orClause = {
    OR: [{ macAddress: normalized }, { macAddress: colon }],
  };
  if (!options?.excludePhoneId) return orClause;
  return {
    AND: [orClause, { NOT: { id: options.excludePhoneId } }],
  };
}
