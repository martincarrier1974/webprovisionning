import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Adresse courriel invalide."),
  password: z.string().min(8, "Mot de passe invalide."),
});

export const createUserSchema = z.object({
  firstName: z.string().trim().min(1, "Prénom requis."),
  lastName: z.string().trim().min(1, "Nom requis."),
  email: z.string().trim().email("Adresse courriel invalide."),
  password: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères."),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "MANAGER", "VIEWER"]),
  locale: z.enum(["fr", "en"]).default("fr"),
});

export type ActionState = {
  error?: string;
  success?: string;
};

export type SessionUser = {
  userId: string;
  role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "VIEWER";
  email: string;
};
