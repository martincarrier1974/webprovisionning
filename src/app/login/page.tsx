import { LoginForm } from "@/components/auth/login-form";
import { getCurrentSession } from "@/lib/auth/dal";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await getCurrentSession();

  if (session?.userId) {
    redirect("/dashboard");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
        background:
          "radial-gradient(circle at top, rgba(28, 100, 242, 0.12), transparent 32%), linear-gradient(180deg, #081120 0%, #0f172a 100%)",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 460,
          borderRadius: 24,
          border: "1px solid rgba(148, 163, 184, 0.18)",
          background: "rgba(15, 23, 42, 0.78)",
          padding: 28,
          color: "#f8fafc",
          display: "grid",
          gap: 18,
        }}
      >
        <div>
          <p style={{ color: "#93c5fd", marginBottom: 8 }}>WebProvisionning</p>
          <h1 style={{ fontSize: 32, marginBottom: 8 }}>Connexion admin</h1>
          <p style={{ color: "#cbd5e1", lineHeight: 1.6 }}>
            Connecte-toi pour gérer les clients, sites, téléphones et firmwares.
          </p>
        </div>

        <LoginForm />
      </section>
    </main>
  );
}
