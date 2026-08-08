"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

function UnirseContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [result, setResult] = useState<{ type: "success" | "error" | "idle"; msg: string }>({ type: "idle", msg: "" });
  const [loading, setLoading] = useState(false);

  const code = searchParams.get("codigo") || "";

  useEffect(() => {
    // Auto-join once logged in and we have a code
    if (status === "authenticated" && code && result.type === "idle") {
      handleJoin();
    }
  }, [status, code]);

  const handleJoin = async () => {
    setLoading(true);
    const res = await fetch("/api/family/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json();
    if (res.ok) {
      setResult({ type: "success", msg: `¡Te uniste a "${data.familyName}"! Redirigiendo al calendario...` });
      setTimeout(() => router.push("/dashboard"), 2000);
    } else {
      setResult({ type: "error", msg: data.message || "No fue posible unirse a la familia." });
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "1.5rem" }}>
      <div className="glass animate-fade-in" style={{ padding: "2.5rem", maxWidth: "420px", width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🐾</div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "0.5rem" }}>
          Invitación familiar
        </h1>

        {!code ? (
          <>
            <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
              No se encontró ningún código de invitación en el enlace.
            </p>
            <Link href="/dashboard" className="btn-primary" style={{ display: "inline-block", textDecoration: "none" }}>
              Ir al calendario
            </Link>
          </>
        ) : status === "unauthenticated" ? (
          <>
            <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem", lineHeight: 1.6 }}>
              Para unirte al núcleo familiar, primero inicia sesión o crea una cuenta.
              Una vez dentro, serás añadido automáticamente.
            </p>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Link href={`/?redirect=/unirse?codigo=${code}`} className="btn-primary" style={{ textDecoration: "none" }}>
                Iniciar sesión
              </Link>
              <Link href={`/registro?redirect=/unirse?codigo=${code}`} className="btn-secondary" style={{ textDecoration: "none" }}>
                Crear cuenta
              </Link>
            </div>
          </>
        ) : status === "loading" || loading ? (
          <p style={{ color: "var(--text-muted)", marginTop: "1rem" }}>Procesando invitación...</p>
        ) : result.type === "success" ? (
          <p style={{ color: "var(--success)", fontWeight: 600, marginTop: "1rem" }}>{result.msg}</p>
        ) : result.type === "error" ? (
          <>
            <p style={{ color: "var(--secondary-color)", marginBottom: "1.5rem" }}>{result.msg}</p>
            <Link href="/dashboard" className="btn-primary" style={{ textDecoration: "none" }}>
              Ir al calendario
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );
}

export default function UnirsePage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <p style={{ color: "var(--text-muted)" }}>Cargando...</p>
      </div>
    }>
      <UnirseContent />
    </Suspense>
  );
}
