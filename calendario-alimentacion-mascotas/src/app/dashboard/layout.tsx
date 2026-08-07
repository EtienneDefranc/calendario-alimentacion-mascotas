import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/logout-button";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/");
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className="glass" style={{ margin: '1rem', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary-color)' }}>
          Pets<span style={{ color: 'var(--text-color)' }}>Calendar</span>
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {session.user?.image && (
              <img 
                src={session.user.image} 
                alt="Perfil" 
                style={{ width: '32px', height: '32px', borderRadius: '50%' }}
              />
            )}
            <span style={{ fontWeight: 500 }}>{session.user?.name}</span>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="container animate-fade-in" style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
}
