/**
 * Origine publique (https://…) pour construire des URLs affichées / copiées.
 * Priorité : NEXT_PUBLIC_APP_URL ou APP_URL, sinon en-têtes de la requête (déploiement).
 */
export function getPublicOriginFromHeaders(headersList: Headers): string {
  const fromEnv = (process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "").trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const host = headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "";
  const rawProto = headersList.get("x-forwarded-proto") ?? "https";
  const proto = rawProto.split(",")[0].trim() || "https";
  if (!host) return "";
  return `${proto}://${host}`;
}
