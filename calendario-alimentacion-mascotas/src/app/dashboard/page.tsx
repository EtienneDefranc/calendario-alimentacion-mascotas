import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CalendarDashboard } from "@/components/client-components";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) {
    redirect("/");
  }

  // Get user families with pets
  const families = await prisma.family.findMany({
    where: {
      members: {
        some: { userId: session.user.id }
      }
    },
    include: {
      pets: {
        include: {
          feedingRecords: {
            orderBy: { fedAt: "desc" },
            take: 1,
            include: {
              user: {
                select: { id: true, name: true, username: true, image: true }
              }
            }
          }
        }
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, username: true, image: true }
          }
        }
      }
    }
  });

  // Get ALL feeding records for these families (no limit — for full calendar)
  const familyPetIds = families.flatMap((f) => f.pets.map((p) => p.id));
  
  const allRecordsRaw = await prisma.feedingRecord.findMany({
    where: { petId: { in: familyPetIds } },
    orderBy: { fedAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true, username: true, image: true }
      },
      pet: {
        select: { id: true, name: true, species: true }
      }
    }
  });

  // Serialize dates to strings so they can be passed to client components
  const allRecords = allRecordsRaw.map((r) => ({
    ...r,
    fedAt: r.fedAt.toISOString(),
  }));

  // Also serialize family pet feedingRecords dates
  const familiesSerialized = families.map((f) => ({
    ...f,
    pets: f.pets.map((p) => ({
      ...p,
      feedingRecords: p.feedingRecords.map((fr) => ({
        ...fr,
        fedAt: fr.fedAt.toISOString(),
        notes: fr.notes ?? null,
      }))
    }))
  }));

  if (families.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "1rem", textAlign: "center" }}>
        <h2 style={{ fontSize: "2rem" }}>¡Bienvenido/a! 🐾</h2>
        <p style={{ color: "var(--text-muted)", maxWidth: "400px" }}>
          Para comenzar, crea un grupo familiar e invita a los miembros de tu hogar para llevar juntos el registro de alimentación de sus mascotas.
        </p>
        <div className="glass" style={{ padding: "2rem", width: "100%", maxWidth: "400px", marginTop: "1rem" }}>
          <h3 style={{ marginBottom: "1rem" }}>Crear tu primera familia</h3>
          {/* Inline form for empty state */}
          <form action="/api/family/create" method="POST" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <input type="text" name="name" placeholder="Ej: Familia García" required style={{ padding: "0.75rem", borderRadius: "8px", border: "1px solid var(--card-border)", background: "rgba(0,0,0,0.2)", color: "white" }} />
            <button type="submit" className="btn-primary">Crear Familia</button>
          </form>
        </div>
        {/* We still render the component so the create family form is available */}
        <div style={{ width: "100%", maxWidth: "600px" }}>
          <CalendarDashboard families={[]} allRecords={[]} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: "4rem" }}>
      <CalendarDashboard families={familiesSerialized as any} allRecords={allRecords as any} />
    </div>
  );
}
