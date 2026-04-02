export function translateStatus(status: string): string {
  const map: Record<string, string> = {
    STAGED: "En attente",
    ACTIVE: "Actif",
    DISABLED: "Désactivé",
    RETIRED: "Retiré",
    DRAFT: "Brouillon",
    ARCHIVED: "Archivé",
    INVITED: "Invité",
  };
  return map[status] ?? status;
}
