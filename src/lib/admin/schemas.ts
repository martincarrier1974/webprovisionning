import { z } from "zod";

const macRegex = /^[A-Fa-f0-9]{12}$/;

export const createClientSchema = z.object({
  name: z.string().trim().min(2, "Le nom du client est requis."),
  slug: z
    .string()
    .trim()
    .min(2, "Le slug est requis.")
    .regex(/^[a-z0-9-]+$/, "Le slug doit contenir seulement lettres minuscules, chiffres et tirets."),
  defaultLanguage: z.enum(["fr", "en"]).default("fr"),
  timezone: z.string().trim().min(2, "Le fuseau horaire est requis."),
  notes: z.string().trim().optional(),
});

export const createSiteSchema = z.object({
  clientId: z.string().trim().min(1, "Le client est requis."),
  name: z.string().trim().min(2, "Le nom du site est requis."),
  slug: z
    .string()
    .trim()
    .min(2, "Le slug est requis.")
    .regex(/^[a-z0-9-]+$/, "Le slug doit contenir seulement lettres minuscules, chiffres et tirets."),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  province: z.string().trim().optional(),
  country: z.string().trim().optional(),
  timezone: z.string().trim().optional(),
});

export const createPhoneSchema = z.object({
  clientId: z.string().trim().min(1, "Le client est requis."),
  siteId: z.string().trim().optional(),
  phoneModelId: z.string().trim().min(1, "Le modèle est requis."),
  macAddress: z
    .string()
    .trim()
    .transform((value) => value.replace(/[^a-fA-F0-9]/g, "").toUpperCase())
    .refine((value) => macRegex.test(value), "Adresse MAC invalide."),
  label: z.string().trim().optional(),
  extensionNumber: z.string().trim().optional(),
  sipUsername: z.string().trim().optional(),
  sipPassword: z.string().trim().optional(),
  sipServer: z.string().trim().optional(),
  webPassword: z.string().trim().optional(),
  adminPassword: z.string().trim().optional(),
  status: z.enum(["STAGED", "ACTIVE", "DISABLED", "RETIRED"]).default("STAGED"),
});
