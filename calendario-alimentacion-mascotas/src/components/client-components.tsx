"use client";

import { useState, useTransition, useRef } from "react";
import { createFamily, addPet, feedPet } from "@/app/actions";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, isToday } from "date-fns";
import { es } from "date-fns/locale";

// ——————————————————————————————————————
// TYPES
// ——————————————————————————————————————
interface FeedingRecord {
  id: string;
  fedAt: string;
  notes: string | null;
  user: { id: string; name: string | null; username: string | null; image: string | null };
  pet: { id: string; name: string; species: string | null };
}

interface Pet {
  id: string;
  name: string;
  species: string | null;
  feedingRecords: FeedingRecord[];
}

interface Member {
  id: string;
  user: { id: string; name: string | null; username: string | null; image: string | null };
}

interface Family {
  id: string;
  name: string;
  pets: Pet[];
  members: Member[];
}

// ——————————————————————————————————————
// CALENDAR COMPONENT
// ——————————————————————————————————————
export function CalendarDashboard({ families, allRecords }: { families: Family[]; allRecords: FeedingRecord[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(new Date());
  const [activeFamilyId, setActiveFamilyId] = useState<string>(families[0]?.id || "");

  const activeFamily = families.find((f) => f.id === activeFamilyId) || families[0];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start of calendar grid
  const startPadding = getDay(monthStart); // 0=Sun ... 6=Sat

  // Records for this family
  const familyPetIds = new Set(activeFamily?.pets.map((p) => p.id) || []);
  const familyRecords = allRecords.filter((r) => familyPetIds.has(r.pet.id));

  // Records for selected day
  const selectedDayRecords = selectedDay
    ? familyRecords.filter((r) => isSameDay(new Date(r.fedAt), selectedDay))
    : [];

  // Build a map: dateKey -> count of records
  const recordsByDay: Record<string, FeedingRecord[]> = {};
  familyRecords.forEach((r) => {
    const key = format(new Date(r.fedAt), "yyyy-MM-dd");
    if (!recordsByDay[key]) recordsByDay[key] = [];
    recordsByDay[key].push(r);
  });

  // For today's status panel
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayRecords = recordsByDay[todayStr] || [];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "1.5rem", alignItems: "start" }}>
      
      {/* LEFT: CALENDAR */}
      <div>
        {/* Family Tabs */}
        {families.length > 1 && (
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            {families.map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFamilyId(f.id)}
                className={activeFamilyId === f.id ? "btn-primary" : "btn-secondary"}
                style={{ padding: "0.5rem 1.25rem", fontSize: "0.875rem" }}
              >
                {f.name}
              </button>
            ))}
          </div>
        )}

        {/* Calendar Card */}
        <div className="glass" style={{ padding: "1.5rem" }}>
          {/* Month Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="btn-secondary"
              style={{ padding: "0.5rem 1rem", borderRadius: "8px" }}
            >
              ← Anterior
            </button>
            <h3 style={{ textTransform: "capitalize", fontSize: "1.25rem", fontWeight: 700 }}>
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </h3>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="btn-secondary"
              style={{ padding: "0.5rem 1rem", borderRadius: "8px" }}
            >
              Siguiente →
            </button>
          </div>

          {/* Day-of-week headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "8px" }}>
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => (
              <div key={d} style={{ textAlign: "center", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-muted)", padding: "0.5rem 0" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
            {/* Padding cells */}
            {Array.from({ length: startPadding }).map((_, i) => (
              <div key={`pad-${i}`} />
            ))}

            {/* Day cells */}
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayRecords = recordsByDay[key] || [];
              const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
              const isTodayDay = isToday(day);
              const hasPets = dayRecords.length > 0;

              // Get unique pets fed that day
              const uniquePets = [...new Set(dayRecords.map((r) => r.pet.name))];

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDay(day)}
                  title={hasPets ? `${dayRecords.length} alimentación(es): ${uniquePets.join(", ")}` : "Sin registros"}
                  style={{
                    position: "relative",
                    aspectRatio: "1",
                    borderRadius: "10px",
                    border: isSelected ? "2px solid var(--primary-color)" : isTodayDay ? "2px solid var(--secondary-color)" : "2px solid transparent",
                    background: isSelected ? "rgba(99, 102, 241, 0.25)" : hasPets ? "rgba(16, 185, 129, 0.1)" : "rgba(255,255,255,0.03)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "2px",
                    transition: "all 0.15s ease",
                    padding: "4px",
                  }}
                >
                  <span style={{
                    fontSize: "0.875rem",
                    fontWeight: isTodayDay || isSelected ? 700 : 400,
                    color: isSelected ? "var(--primary-color)" : isTodayDay ? "var(--secondary-color)" : "var(--text-color)",
                  }}>
                    {format(day, "d")}
                  </span>
                  {hasPets && (
                    <div style={{ display: "flex", gap: "2px", flexWrap: "wrap", justifyContent: "center" }}>
                      {uniquePets.slice(0, 3).map((_, i) => (
                        <span key={i} style={{
                          width: "5px", height: "5px", borderRadius: "50%",
                          background: `hsl(${(i * 60 + 160) % 360}, 70%, 60%)`,
                          display: "inline-block"
                        }} />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display: "flex", gap: "1.5rem", marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid var(--card-border)", fontSize: "0.75rem", color: "var(--text-muted)" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(99, 102, 241, 0.4)", border: "2px solid var(--primary-color)", display: "inline-block" }} />
              Día seleccionado
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: "rgba(244, 63, 94, 0.3)", border: "2px solid var(--secondary-color)", display: "inline-block" }} />
              Hoy
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
              Con registros
            </span>
          </div>
        </div>

        {/* Day Detail Panel */}
        {selectedDay && (
          <div className="glass" style={{ padding: "1.5rem", marginTop: "1.5rem" }}>
            <h3 style={{ marginBottom: "1rem", textTransform: "capitalize" }}>
              📅 {format(selectedDay, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
            </h3>
            {selectedDayRecords.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: "2rem 0" }}>
                🐾 Sin registros de alimentación este día.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {selectedDayRecords
                  .sort((a, b) => new Date(b.fedAt).getTime() - new Date(a.fedAt).getTime())
                  .map((record) => (
                    <div key={record.id} style={{
                      display: "flex", alignItems: "center", gap: "1rem",
                      background: "rgba(255,255,255,0.04)", borderRadius: "10px",
                      padding: "0.75rem 1rem", border: "1px solid var(--card-border)"
                    }}>
                      {/* Pet icon */}
                      <div style={{
                        width: 40, height: 40, borderRadius: "50%", flexShrink: 0,
                        background: `hsl(${record.pet.name.charCodeAt(0) * 7 % 360}, 60%, 40%)`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "1.25rem"
                      }}>
                        {record.pet.species?.toLowerCase().includes("gato") ? "🐱" :
                         record.pet.species?.toLowerCase().includes("perro") ? "🐶" : "🐾"}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{record.pet.name}</div>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          Alimentado por <strong>{record.user.name || record.user.username}</strong>
                        </div>
                        {record.notes && (
                          <div style={{ color: "var(--text-muted)", fontSize: "0.8rem", fontStyle: "italic", marginTop: "2px" }}>
                            "{record.notes}"
                          </div>
                        )}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{
                          color: "var(--primary-color)", fontWeight: 700,
                          fontSize: "1rem", fontVariantNumeric: "tabular-nums"
                        }}>
                          {format(new Date(record.fedAt), "HH:mm")}
                        </div>
                        <div style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>
                          {format(new Date(record.fedAt), "a", { locale: es })}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* RIGHT SIDEBAR */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        
        {/* TODAY STATUS */}
        <div className="glass" style={{ padding: "1.5rem" }}>
          <h4 style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--text-muted)", marginBottom: "1rem" }}>
            Estado de hoy
          </h4>
          {activeFamily?.pets.length === 0 ? (
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No hay mascotas registradas.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {activeFamily?.pets.map((pet) => {
                const fedToday = todayRecords.some((r) => r.pet.id === pet.id);
                const lastRecord = pet.feedingRecords[0];
                return (
                  <div key={pet.id} style={{
                    borderRadius: "10px", padding: "1rem",
                    background: fedToday ? "rgba(16, 185, 129, 0.1)" : "rgba(244, 63, 94, 0.08)",
                    border: `1px solid ${fedToday ? "rgba(16, 185, 129, 0.3)" : "rgba(244, 63, 94, 0.25)"}`,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{pet.name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{pet.species || "Mascota"}</div>
                      </div>
                      <span style={{
                        fontSize: "0.7rem", fontWeight: 700, padding: "3px 8px", borderRadius: "999px",
                        background: fedToday ? "rgba(16,185,129,0.2)" : "rgba(244,63,94,0.2)",
                        color: fedToday ? "#10b981" : "#f43f5e"
                      }}>
                        {fedToday ? "✓ Alimentado" : "⚠ Sin comer"}
                      </span>
                    </div>
                    {lastRecord && (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.5rem" }}>
                        Última vez: {format(new Date(lastRecord.fedAt), "d MMM · HH:mm", { locale: es })} — {lastRecord.user.name || lastRecord.user.username}
                      </div>
                    )}
                    <FeedButtonWithNote petId={pet.id} />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ADD PET */}
        {activeFamily && (
          <div className="glass" style={{ padding: "1.5rem" }}>
            <h4 style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--text-muted)", marginBottom: "1rem" }}>
              Agregar mascota a {activeFamily.name}
            </h4>
            <AddPetForm familyId={activeFamily.id} />
          </div>
        )}

        {/* FAMILY MEMBERS */}
        {activeFamily && (
          <div className="glass" style={{ padding: "1.5rem" }}>
            <h4 style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--text-muted)", marginBottom: "1rem" }}>
              Miembros de la familia
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {activeFamily.members.map((m) => (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem" }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: "50%",
                    background: `hsl(${(m.user.name || m.user.username || "").charCodeAt(0) * 11 % 360}, 60%, 40%)`,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: 700
                  }}>
                    {(m.user.name || m.user.username || "?").charAt(0).toUpperCase()}
                  </div>
                  <span>{m.user.name || m.user.username}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CREATE FAMILY */}
        <div className="glass" style={{ padding: "1.5rem" }}>
          <h4 style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--text-muted)", marginBottom: "1rem" }}>
            Nueva familia
          </h4>
          <CreateFamilyForm compact />
        </div>
      </div>
    </div>
  );
}

// ——————————————————————————————————————
// FEED BUTTON WITH OPTIONAL NOTE
// ——————————————————————————————————————
function FeedButtonWithNote({ petId }: { petId: string }) {
  const [isPending, startTransition] = useTransition();
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");

  const handleFeed = () => {
    startTransition(() => {
      feedPet(petId, note || undefined);
      setNote("");
      setShowNote(false);
    });
  };

  return (
    <div style={{ marginTop: "0.75rem" }}>
      {showNote ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nota opcional (ej: comió todo)"
            style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--card-border)", background: "rgba(0,0,0,0.2)", color: "white", fontSize: "0.8rem" }}
          />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={handleFeed} className="btn-primary" disabled={isPending} style={{ flex: 1, padding: "0.6rem" }}>
              {isPending ? "..." : "🍖 Registrar"}
            </button>
            <button onClick={() => setShowNote(false)} className="btn-secondary" style={{ padding: "0.6rem 0.75rem", borderRadius: "8px" }}>
              ✕
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowNote(true)}
          className="btn-primary"
          disabled={isPending}
          style={{ width: "100%", padding: "0.6rem", fontSize: "0.85rem" }}
        >
          🍖 Alimentar
        </button>
      )}
    </div>
  );
}

// ——————————————————————————————————————
// ADD PET FORM
// ——————————————————————————————————————
function AddPetForm({ familyId }: { familyId: string }) {
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form ref={ref} action={(formData) => {
      startTransition(() => {
        addPet(familyId, formData).then(() => ref.current?.reset());
      });
    }} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <input
        type="text" name="name" placeholder="Nombre" required
        style={{ padding: "0.6rem 0.75rem", borderRadius: "8px", border: "1px solid var(--card-border)", background: "rgba(0,0,0,0.2)", color: "white", fontSize: "0.875rem" }}
      />
      <input
        type="text" name="species" placeholder="Especie (Perro, Gato...)"
        style={{ padding: "0.6rem 0.75rem", borderRadius: "8px", border: "1px solid var(--card-border)", background: "rgba(0,0,0,0.2)", color: "white", fontSize: "0.875rem" }}
      />
      <button type="submit" className="btn-secondary" disabled={isPending} style={{ borderRadius: "8px" }}>
        {isPending ? "Agregando..." : "+ Agregar mascota"}
      </button>
    </form>
  );
}

// ——————————————————————————————————————
// CREATE FAMILY FORM
// ——————————————————————————————————————
function CreateFamilyForm({ compact }: { compact?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form ref={ref} action={(formData) => {
      startTransition(() => {
        createFamily(formData).then(() => ref.current?.reset());
      });
    }} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <input
        type="text" name="name" placeholder="Nombre de la familia" required
        style={{ padding: "0.6rem 0.75rem", borderRadius: "8px", border: "1px solid var(--card-border)", background: "rgba(0,0,0,0.2)", color: "white", fontSize: "0.875rem" }}
      />
      <button type="submit" className="btn-primary" disabled={isPending} style={{ borderRadius: "8px" }}>
        {isPending ? "Creando..." : "Crear familia"}
      </button>
    </form>
  );
}
