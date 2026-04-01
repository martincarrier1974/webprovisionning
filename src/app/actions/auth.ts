"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { createSession, deleteSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  createUserSchema,
  loginSchema,
  type ActionState,
} from "@/lib/auth/definitions";
import { requireAdmin, requireAuth } from "@/lib/auth/dal";

export async function loginAction(
  _previousState: ActionState | undefined,
  formData: FormData
): Promise<ActionState | undefined> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const user = await db.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (!user?.passwordHash) {
    return { error: "Identifiants invalides." };
  }

  if (user.status === "DISABLED") {
    return { error: "Ce compte est désactivé." };
  }

  const isValidPassword = await verifyPassword(parsed.data.password, user.passwordHash);

  if (!isValidPassword) {
    return { error: "Identifiants invalides." };
  }

  await createSession({
    userId: user.id,
    role: user.role,
    email: user.email,
  });

  await db.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
      status: user.status === "INVITED" ? "ACTIVE" : user.status,
    },
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  await deleteSession();
  redirect("/login");
}

export async function createUserAction(
  _previousState: ActionState | undefined,
  formData: FormData
): Promise<ActionState | undefined> {
  const currentUser = await requireAdmin();

  const parsed = createUserSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
    locale: formData.get("locale"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const email = parsed.data.email.toLowerCase();
  const existingUser = await db.user.findUnique({ where: { email } });

  if (existingUser) {
    return { error: "Un utilisateur avec ce courriel existe déjà." };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  await db.user.create({
    data: {
      email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      passwordHash,
      role: parsed.data.role,
      locale: parsed.data.locale,
      status: "ACTIVE",
      clientId: currentUser.clientId,
    },
  });

  revalidatePath("/dashboard");
  return { success: "Utilisateur créé avec succès." };
}

export async function disableUserAction(userId: string) {
  const currentUser = await requireAdmin();

  if (currentUser.id === userId) {
    throw new Error("Tu ne peux pas désactiver ton propre compte.");
  }

  await db.user.update({
    where: { id: userId },
    data: { status: "DISABLED" },
  });

  revalidatePath("/dashboard");
}

export async function enableUserAction(userId: string) {
  await requireAdmin();

  await db.user.update({
    where: { id: userId },
    data: { status: "ACTIVE" },
  });

  revalidatePath("/dashboard");
}

export async function deleteUserAction(userId: string) {
  const currentUser = await requireAdmin();

  if (currentUser.id === userId) {
    throw new Error("Tu ne peux pas supprimer ton propre compte.");
  }

  await db.user.delete({
    where: { id: userId },
  });

  revalidatePath("/dashboard");
}

export async function updateOwnLocaleAction(locale: "fr" | "en") {
  const currentUser = await requireAuth();

  await db.user.update({
    where: { id: currentUser.id },
    data: { locale },
  });

  revalidatePath("/dashboard");
}
