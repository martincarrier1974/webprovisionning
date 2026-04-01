import { z } from "zod";

export const createClientSchema = z.object({
  name: z.string().trim().min(2, "Le nom du client est requis."),
  slug: z.string().trim().min(2, "Le slug est requis.").regex(/^[a-z0-9-]+$/, "Le slug doit contenir seulement lettres minuscules, chiffres et tirets."),
  defaultLanguage: z.enum(["fr", "en"]).default("fr"),
  timezone: z.string().trim().min(2, "Le fuseau horaire est requis."),
  notes: z.string().trim().optional(),
});

export const createSiteSchema = z.object({
  clientId: z.string().trim().min(1, "Le client est requis."),
  name: z.string().trim().min(2, "Le nom du site est requis."),
  slug: z.string().trim().min(2, "Le slug est requis.").regex(/^[a-z0-9-]+$/, "Le slug doit contenir seulement lettres minuscules, chiffres et tirets."),
  address: z.string().trim().optional(),
  city: z.string().trim().optional(),
  province: z.string().trim().optional(),
  country: z.string().trim().optional(),
  timezone: z.string().trim().optional(),
});
