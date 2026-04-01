export type SessionUserRecord = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "VIEWER";
  status: "ACTIVE" | "INVITED" | "DISABLED";
  locale: string;
  clientId: string | null;
  createdAt: Date;
  updatedAt: Date;
};
