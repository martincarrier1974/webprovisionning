"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { type ActionState } from "@/lib/auth/definitions";
import { createClientSchema, createSiteSchema } from "@/lib/admin/schemas";

export async function createClientAction(
  _previousState: ActionState | undefined,
  formData: FormData
): Promise<ActionState | undefined> {
  await requireAdmin();

  const parsed = createClientSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    defaultLanguage: formData.get("defaultLanguage"),
    timezone: formData.get("timezone"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const existingClient = await db.client.findUnique({
    where: { slug: parsed.data.slug },
  });

  if (existingClient) {
    return { error: "Un client avec ce slug existe déjà." };
  }

  await db.client.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      defaultLanguage: parsed.data.defaultLanguage,
      timezone: parsed.data.timezone,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/dashboard");
  return { success: "Client créé avec succès." };
}

export async function createSiteAction(
  _previousState: ActionState | undefined,
  formData: FormData
): Promise<ActionState | undefined> {
  await requireAdmin();

  const parsed = createSiteSchema.safeParse({
    clientId: formData.get("clientId"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    address: formData.get("address") || undefined,
    city: formData.get("city") || undefined,
    province: formData.get("province") || undefined,
    country: formData.get("country") || undefined,
    timezone: formData.get("timezone") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const client = await db.client.findUnique({ where: { id: parsed.data.clientId } });

  if (!client) {
    return { error: "Client introuvable." };
  }

  const existingSite = await db.site.findUnique({
    where: {
      clientId_slug: {
        clientId: parsed.data.clientId,
        slug: parsed.data.slug,
      },
    },
  });

  if (existingSite) {
    return { error: "Un site avec ce slug existe déjà pour ce client." };
  }

  await db.site.create({
    data: {
      clientId: parsed.data.clientId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      address: parsed.data.address || null,
      city: parsed.data.city || null,
      province: parsed.data.province || null,
      country: parsed.data.country || "CA",
      timezone: parsed.data.timezone || client.timezone,
    },
  });

  revalidatePath("/dashboard");
  return { success: "Site créé avec succès." };
}
