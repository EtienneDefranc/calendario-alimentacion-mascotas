import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { CreateFamilyForm, AddPetForm, FeedButton } from "@/components/client-components";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.id) return null;

  // Get user families and pets
  const families = await prisma.family.findMany({
    where: {
      members: {
        some: {
          userId: session.user.id
        }
      }
    },
    include: {
      pets: {
        include: {
          feedingRecords: {
            orderBy: { fedAt: 'desc' },
            take: 5,
            include: {
              user: true
            }
          }
        }
      },
      members: {
        include: {
          user: true
        }
      }
    }
  });

  return (
    <div style={{ padding: '2rem 0' }}>
      {families.length === 0 ? (
        <div style={{ textAlign: 'center', marginTop: '4rem' }}>
          <h2>Aún no perteneces a ninguna familia</h2>
          <p style={{ color: 'var(--text-muted)' }}>Crea una para comenzar a registrar a tus mascotas.</p>
          <CreateFamilyForm />
        </div>
      ) : (
        <div>
          {families.map((family: any) => (
            <div key={family.id} style={{ marginBottom: '4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--card-border)', paddingBottom: '1rem', marginBottom: '2rem' }}>
                <h2>Familia: {family.name}</h2>
                <div style={{ display: 'flex', gap: '-10px' }}>
                  {family.members.map((m: any) => (
                    <img key={m.id} src={m.user.image || ''} alt={m.user.name || ''} title={m.user.name || ''} style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid var(--bg-color)', marginLeft: '-10px' }} />
                  ))}
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '2rem' }}>
                {family.pets.map((pet: any) => {
                  const lastFed = pet.feedingRecords[0];
                  return (
                    <div key={pet.id} className="glass" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.5rem', margin: 0 }}>{pet.name}</h3>
                        <span style={{ background: 'rgba(255,255,255,0.1)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{pet.species || 'Mascota'}</span>
                      </div>
                      
                      <div style={{ marginTop: '2rem', flex: 1 }}>
                        <h4 style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Últimas comidas</h4>
                        {pet.feedingRecords.length === 0 ? (
                          <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Sin registros recientes</p>
                        ) : (
                          <ul style={{ listStyle: 'none' }}>
                            {pet.feedingRecords.map((record: any) => (
                              <li key={record.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                                <img src={record.user.image || ''} style={{ width: 24, height: 24, borderRadius: '50%' }} />
                                <div>
                                  <span style={{ fontWeight: 600 }}>{record.user.name}</span>
                                  <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                                    hace {formatDistanceToNow(record.fedAt, { locale: es })}
                                  </span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <FeedButton petId={pet.id} />
                    </div>
                  );
                })}
              </div>
              
              <div style={{ marginTop: '2rem', borderTop: '1px dashed var(--card-border)', paddingTop: '1rem' }}>
                <AddPetForm familyId={family.id} />
              </div>
            </div>
          ))}
          
          <CreateFamilyForm />
        </div>
      )}
    </div>
  );
}
