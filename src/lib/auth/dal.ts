import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import type { SessionUserRecord } from "@/lib/auth/session-user";

export const getCurrentSession = cache(async () => {
  return getSession();
});

export const getCurrentUser = cache(async (): Promise<SessionUserRecord | null> => {
  const session = await getCurrentSession();

  if (!session?.userId) {
    return null;
  }

  return db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
      locale: true,
      clientId: true,
      createdAt: true,
      updatedAt: true,
    },
  });
});

export async function requireAuth() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();

  if (!user || !["SUPER_ADMIN", "ADMIN"].includes(user.role)) {
    redirect("/login");
  }

  return user;
}
