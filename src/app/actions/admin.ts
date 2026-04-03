"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { phoneMacMatchWhere } from "@/lib/mac-address";
import { type ActionState } from "@/lib/auth/definitions";
import {
  createClientSchema,
  createFirmwareSchema,
  createPhoneSchema,
  createSiteSchema,
  updateClientSchema,
  updateFirmwareSchema,
  updatePhoneSchema,
  updateSiteSchema,
} from "@/lib/admin/schemas";

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

export async function updateClientAction(formData: FormData) {
  await requireAdmin();

  const parsed = updateClientSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    slug: formData.get("slug"),
    defaultLanguage: formData.get("defaultLanguage"),
    timezone: formData.get("timezone"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
  }

  const existingClient = await db.client.findFirst({
    where: {
      slug: parsed.data.slug,
      NOT: { id: parsed.data.id },
    },
  });

  if (existingClient) {
    throw new Error("Un client avec ce slug existe déjà.");
  }

  await db.client.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      defaultLanguage: parsed.data.defaultLanguage,
      timezone: parsed.data.timezone,
      notes: parsed.data.notes || null,
    },
  });

  revalidatePath("/dashboard");
}

export async function deleteClientAction(clientId: string) {
  await requireAdmin();

  await db.client.delete({ where: { id: clientId } });
  revalidatePath("/dashboard");
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

export async function updateSiteAction(formData: FormData) {
  await requireAdmin();

  const parsed = updateSiteSchema.safeParse({
    id: formData.get("id"),
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
    throw new Error(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
  }

  const client = await db.client.findUnique({ where: { id: parsed.data.clientId } });

  if (!client) {
    throw new Error("Client introuvable.");
  }

  const existingSite = await db.site.findFirst({
    where: {
      clientId: parsed.data.clientId,
      slug: parsed.data.slug,
      NOT: { id: parsed.data.id },
    },
  });

  if (existingSite) {
    throw new Error("Un site avec ce slug existe déjà pour ce client.");
  }

  await db.site.update({
    where: { id: parsed.data.id },
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
}

export async function deleteSiteAction(siteId: string) {
  await requireAdmin();

  await db.site.delete({ where: { id: siteId } });
  revalidatePath("/dashboard");
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

  const existingPhone = await db.phone.findFirst({
    where: phoneMacMatchWhere(parsed.data.macAddress),
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

export async function updatePhoneAction(formData: FormData) {
  await requireAdmin();

  const parsed = updatePhoneSchema.safeParse({
    id: formData.get("id"),
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
    throw new Error(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
  }

  const [client, phoneModel] = await Promise.all([
    db.client.findUnique({ where: { id: parsed.data.clientId } }),
    db.phoneModel.findUnique({ where: { id: parsed.data.phoneModelId } }),
  ]);

  if (!client) {
    throw new Error("Client introuvable.");
  }

  if (!phoneModel) {
    throw new Error("Modèle introuvable.");
  }

  if (parsed.data.siteId) {
    const site = await db.site.findUnique({ where: { id: parsed.data.siteId } });

    if (!site || site.clientId !== parsed.data.clientId) {
      throw new Error("Le site sélectionné n’appartient pas au client.");
    }
  }

  const existingPhone = await db.phone.findFirst({
    where: phoneMacMatchWhere(parsed.data.macAddress, { excludePhoneId: parsed.data.id }),
  });

  if (existingPhone) {
    throw new Error("Un téléphone avec cette MAC existe déjà.");
  }

  await db.phone.update({
    where: { id: parsed.data.id },
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
}

export async function deletePhoneAction(phoneId: string) {
  await requireAdmin();

  await db.phone.delete({
    where: { id: phoneId },
  });

  revalidatePath("/dashboard");
}

export async function createFirmwareAction(
  _previousState: ActionState | undefined,
  formData: FormData
): Promise<ActionState | undefined> {
  await requireAdmin();

  const parsed = createFirmwareSchema.safeParse({
    phoneModelId: formData.get("phoneModelId"),
    version: formData.get("version"),
    storageKey: formData.get("storageKey"),
    originalName: formData.get("originalName"),
    checksumSha256: formData.get("checksumSha256") || undefined,
    releaseNotes: formData.get("releaseNotes") || undefined,
    status: formData.get("status") || "DRAFT",
    isDefault: formData.get("isDefault") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const phoneModel = await db.phoneModel.findUnique({ where: { id: parsed.data.phoneModelId } });

  if (!phoneModel) {
    return { error: "Modèle introuvable." };
  }

  const existingFirmware = await db.firmware.findUnique({
    where: {
      phoneModelId_version: {
        phoneModelId: parsed.data.phoneModelId,
        version: parsed.data.version,
      },
    },
  });

  if (existingFirmware) {
    return { error: "Un firmware avec cette version existe déjà pour ce modèle." };
  }

  if (parsed.data.isDefault) {
    await db.firmware.updateMany({
      where: { phoneModelId: parsed.data.phoneModelId },
      data: { isDefault: false },
    });
  }

  await db.firmware.create({
    data: {
      phoneModelId: parsed.data.phoneModelId,
      version: parsed.data.version,
      storageKey: parsed.data.storageKey,
      originalName: parsed.data.originalName,
      checksumSha256: parsed.data.checksumSha256 || null,
      releaseNotes: parsed.data.releaseNotes || null,
      status: parsed.data.status,
      isDefault: Boolean(parsed.data.isDefault),
    },
  });

  revalidatePath("/dashboard");
  return { success: "Firmware créé avec succès." };
}

export async function updateFirmwareAction(formData: FormData) {
  await requireAdmin();

  const parsed = updateFirmwareSchema.safeParse({
    id: formData.get("id"),
    phoneModelId: formData.get("phoneModelId"),
    version: formData.get("version"),
    storageKey: formData.get("storageKey"),
    originalName: formData.get("originalName"),
    checksumSha256: formData.get("checksumSha256") || undefined,
    releaseNotes: formData.get("releaseNotes") || undefined,
    status: formData.get("status") || "DRAFT",
    isDefault: formData.get("isDefault") || undefined,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Formulaire invalide.");
  }

  const existingFirmware = await db.firmware.findFirst({
    where: {
      phoneModelId: parsed.data.phoneModelId,
      version: parsed.data.version,
      NOT: { id: parsed.data.id },
    },
  });

  if (existingFirmware) {
    throw new Error("Un firmware avec cette version existe déjà pour ce modèle.");
  }

  if (parsed.data.isDefault) {
    await db.firmware.updateMany({
      where: { phoneModelId: parsed.data.phoneModelId },
      data: { isDefault: false },
    });
  }

  await db.firmware.update({
    where: { id: parsed.data.id },
    data: {
      version: parsed.data.version,
      storageKey: parsed.data.storageKey,
      originalName: parsed.data.originalName,
      checksumSha256: parsed.data.checksumSha256 || null,
      releaseNotes: parsed.data.releaseNotes || null,
      status: parsed.data.status,
      isDefault: Boolean(parsed.data.isDefault),
    },
  });

  revalidatePath("/dashboard");
}

export async function deleteFirmwareAction(firmwareId: string) {
  await requireAdmin();

  await db.firmware.delete({ where: { id: firmwareId } });
  revalidatePath("/dashboard");
}
