"use server";

import { revalidatePath } from "next/cache";
import { ProvisioningSource } from "@prisma/client";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { type ActionState } from "@/lib/auth/definitions";
import { z } from "zod";

const createProvisioningRuleSchema = z.object({
  source: z.nativeEnum(ProvisioningSource),
  clientId: z.string().trim().optional(),
  siteId: z.string().trim().optional(),
  phoneModelId: z.string().trim().optional(),
  phoneId: z.string().trim().optional(),
  key: z.string().trim().min(1, "La clé est requise."),
  value: z.string().trim().min(1, "La valeur est requise."),
  sortOrder: z.coerce.number().int().default(0),
  isEncrypted: z.union([z.literal("on"), z.literal("true"), z.literal("1"), z.literal("yes")]).optional(),
});

export async function createProvisioningRuleAction(
  _previousState: ActionState | undefined,
  formData: FormData
): Promise<ActionState | undefined> {
  await requireAdmin();

  const parsed = createProvisioningRuleSchema.safeParse({
    source: formData.get("source"),
    clientId: formData.get("clientId") || undefined,
    siteId: formData.get("siteId") || undefined,
    phoneModelId: formData.get("phoneModelId") || undefined,
    phoneId: formData.get("phoneId") || undefined,
    key: formData.get("key"),
    value: formData.get("value"),
    sortOrder: formData.get("sortOrder") || 0,
    isEncrypted: formData.get("isEncrypted") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const data = parsed.data;

  if (data.source === ProvisioningSource.CLIENT && !data.clientId) {
    return { error: "Client requis pour une règle de type client." };
  }
  if (data.source === ProvisioningSource.SITE && !data.siteId) {
    return { error: "Site requis pour une règle de type site." };
  }
  if (data.source === ProvisioningSource.MODEL && !data.phoneModelId) {
    return { error: "Modèle requis pour une règle de type modèle." };
  }
  if (data.source === ProvisioningSource.PHONE && !data.phoneId) {
    return { error: "Téléphone requis pour une règle de type téléphone." };
  }

  await db.provisioningRule.create({
    data: {
      source: data.source,
      clientId: data.clientId || null,
      siteId: data.siteId || null,
      phoneModelId: data.phoneModelId || null,
      phoneId: data.phoneId || null,
      key: data.key,
      value: data.value,
      sortOrder: data.sortOrder,
      isEncrypted: Boolean(data.isEncrypted),
    },
  });

  revalidatePath("/dashboard");
  return { success: "Règle créée avec succès." };
}

export async function deleteProvisioningRuleAction(id: string) {
  'use server';
  
  await requireAdmin();
  
  try {
    await db.provisioningRule.delete({ where: { id } });
    revalidatePath("/dashboard/rules");
    return { success: "Règle supprimée avec succès." };
  } catch (error) {
    console.error("Erreur suppression règle:", error);
    return { error: "Échec de la suppression." };
  }
}
