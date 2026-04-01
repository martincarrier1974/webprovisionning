import { z } from "zod";

const macRegex = /^[A-Fa-f0-9]{12}$/;

const slugField = z
  .string()
  .trim()
  .min(2, "Le slug est requis.")
  .regex(/^[a-z0-9-]+$/, "Le slug doit contenir seulement lettres minuscules, chiffres et tirets.");

const optionalTrimmed = z.string().trim().optional();

export const createClientSchema = z.object({
  name: z.string().trim().min(2, "Le nom du client est requis."),
  slug: slugField,
  defaultLanguage: z.enum(["fr", "en"]).default("fr"),
  timezone: z.string().trim().min(2, "Le fuseau horaire est requis."),
  notes: optionalTrimmed,
});

export const updateClientSchema = createClientSchema.extend({
  id: z.string().trim().min(1, "Identifiant client requis."),
});

export const createSiteSchema = z.object({
  clientId: z.string().trim().min(1, "Le client est requis."),
  name: z.string().trim().min(2, "Le nom du site est requis."),
  slug: slugField,
  address: optionalTrimmed,
  city: optionalTrimmed,
  province: optionalTrimmed,
  country: optionalTrimmed,
  timezone: optionalTrimmed,
});

export const updateSiteSchema = createSiteSchema.extend({
  id: z.string().trim().min(1, "Identifiant site requis."),
});

export const createPhoneSchema = z.object({
  clientId: z.string().trim().min(1, "Le client est requis."),
  siteId: optionalTrimmed,
  phoneModelId: z.string().trim().min(1, "Le modèle est requis."),
  macAddress: z
    .string()
    .trim()
    .transform((value) => value.replace(/[^a-fA-F0-9]/g, "").toUpperCase())
    .refine((value) => macRegex.test(value), "Adresse MAC invalide."),
  label: optionalTrimmed,
  extensionNumber: optionalTrimmed,
  sipUsername: optionalTrimmed,
  sipPassword: optionalTrimmed,
  sipServer: optionalTrimmed,
  webPassword: optionalTrimmed,
  adminPassword: optionalTrimmed,
  status: z.enum(["STAGED", "ACTIVE", "DISABLED", "RETIRED"]).default("STAGED"),
});

export const updatePhoneSchema = createPhoneSchema.extend({
  id: z.string().trim().min(1, "Identifiant téléphone requis."),
});

export const createFirmwareSchema = z.object({
  phoneModelId: z.string().trim().min(1, "Le modèle est requis."),
  version: z.string().trim().min(1, "La version est requise."),
  storageKey: z.string().trim().min(1, "Le storage key est requis."),
  originalName: z.string().trim().min(1, "Le nom du fichier est requis."),
  checksumSha256: optionalTrimmed,
  releaseNotes: optionalTrimmed,
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  isDefault: z.union([z.literal("on"), z.literal("true"), z.literal("1"), z.literal("yes")]).optional(),
});

export const updateFirmwareSchema = createFirmwareSchema.extend({
  id: z.string().trim().min(1, "Identifiant firmware requis."),
});
