"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { type ActionState } from "@/lib/auth/definitions";
import { createClientSchema, createPhoneSchema, createSiteSchema } from "@/lib/admin/schemas";

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

export async function createPhoneAction(
  _previousState: ActionState | undefined,
  formData: FormData
): Promise<ActionState | undefined> {
  await requireAdmin();

  const parsed = createPhoneSchema.safeParse({
    clientId: formData.get("clientId"),
    siteId: formData.get("siteId") || undefined,
    phoneModelId: formData.get("phoneModelId"),
    macAddress: formData.get("macAddress"),
    label: formData.get("label") || undefined,
    extensionNumber: formData.get("extensionNumber") || undefined,
    sipUsername: formData.get("sipUsername") || undefined,
    sipPassword: formData.get("sipPassword") || undefined,
    sipServer: formData.get("sipServer") || undefined,
    webPassword: formData.get("webPassword") || undefined,
    adminPassword: formData.get("adminPassword") || undefined,
    status: formData.get("status") || "STAGED",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const [client, phoneModel] = await Promise.all([
    db.client.findUnique({ where: { id: parsed.data.clientId } }),
    db.phoneModel.findUnique({ where: { id: parsed.data.phoneModelId } }),
  ]);

  if (!client) {
    return { error: "Client introuvable." };
  }

  if (!phoneModel) {
    return { error: "Modèle introuvable." };
  }

  if (parsed.data.siteId) {
    const site = await db.site.findUnique({ where: { id: parsed.data.siteId } });

    if (!site || site.clientId !== parsed.data.clientId) {
      return { error: "Le site sélectionné n’appartient pas au client." };
    }
  }

  const existingPhone = await db.phone.findUnique({
    where: { macAddress: parsed.data.macAddress },
  });

  if (existingPhone) {
    return { error: "Un téléphone avec cette MAC existe déjà." };
  }

  await db.phone.create({
    data: {
      clientId: parsed.data.clientId,
      siteId: parsed.data.siteId || null,
      phoneModelId: parsed.data.phoneModelId,
      macAddress: parsed.data.macAddress,
      label: parsed.data.label || null,
      extensionNumber: parsed.data.extensionNumber || null,
      sipUsername: parsed.data.sipUsername || null,
      sipPassword: parsed.data.sipPassword || null,
      sipServer: parsed.data.sipServer || null,
      webPassword: parsed.data.webPassword || null,
      adminPassword: parsed.data.adminPassword || null,
      status: parsed.data.status,
    },
  });

  revalidatePath("/dashboard");
  return { success: "Téléphone créé avec succès." };
}

export async function deletePhoneAction(phoneId: string) {
  await requireAdmin();

  await db.phone.delete({
    where: { id: phoneId },
  });

  revalidatePath("/dashboard");
}
