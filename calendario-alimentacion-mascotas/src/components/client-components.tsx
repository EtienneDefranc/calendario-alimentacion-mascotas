"use client";

import { useState, useTransition, useRef, useCallback } from "react";
import { createFamily, addPet, feedPet } from "@/app/actions";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, addMonths, subMonths, getDay, isToday, parseISO
} from "date-fns";
import { es } from "date-fns/locale";
import { useRouter } from "next/navigation";

// ——————————————————————————
// TYPES
// ——————————————————————————
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

const MEALS_GOAL = 2;

function petEmoji(species: string | null) {
  const s = (species || "").toLowerCase();
  if (s.includes("gato") || s.includes("cat")) return "🐱";
  if (s.includes("perro") || s.includes("dog")) return "🐶";
  if (s.includes("conejo") || s.includes("rabbit")) return "🐰";
  if (s.includes("pájaro") || s.includes("bird")) return "🐦";
  if (s.includes("pez") || s.includes("fish")) return "🐟";
  return "🐾";
}

function avatarInitial(name: string | null | undefined, username: string | null | undefined) {
  return ((name || username || "?").charAt(0)).toUpperCase();
}

// ——————————————————————————
// MAIN DASHBOARD
// ——————————————————————————
export function CalendarDashboard({ families, allRecords }: { families: Family[]; allRecords: FeedingRecord[] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [activeFamilyId, setActiveFamilyId] = useState<string>(families[0]?.id || "");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const activeFamily = families.find((f) => f.id === activeFamilyId) || families[0];

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);

  const familyPetIds = new Set(activeFamily?.pets.map((p) => p.id) || []);
  const familyRecords = allRecords.filter((r) => familyPetIds.has(r.pet.id));

  const selectedDayRecords = familyRecords.filter((r) => isSameDay(parseISO(r.fedAt), selectedDay));

  // dayKey → records[]
  const recordsByDay: Record<string, FeedingRecord[]> = {};
  familyRecords.forEach((r) => {
    const key = format(parseISO(r.fedAt), "yyyy-MM-dd");
    if (!recordsByDay[key]) recordsByDay[key] = [];
    recordsByDay[key].push(r);
  });

  const todayStr = format(new Date(), "yyyy-MM-dd");
  const todayRecords = recordsByDay[todayStr] || [];

  // Per-pet count today
  const todayCountByPet: Record<string, number> = {};
  todayRecords.forEach((r) => {
    todayCountByPet[r.pet.id] = (todayCountByPet[r.pet.id] || 0) + 1;
  });

  if (!activeFamily && families.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "50vh", gap: "1.5rem", textAlign: "center", padding: "1rem" }}>
        <div style={{ fontSize: "4rem" }}>🐾</div>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 700 }}>¡Bienvenido/a!</h2>
        <p style={{ color: "var(--text-muted)", maxWidth: "380px", lineHeight: 1.6 }}>
          Crea un grupo familiar o únete con un código de invitación para llevar el registro de alimentación de sus mascotas.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", width: "100%", maxWidth: "500px" }}>
          <div className="glass" style={{ padding: "1.5rem" }}>
            <h3 style={{ marginBottom: "1rem", fontSize: "1rem" }}>Nueva familia</h3>
            <CreateFamilyForm compact />
          </div>
          <div className="glass" style={{ padding: "1.5rem" }}>
            <h3 style={{ marginBottom: "1rem", fontSize: "1rem" }}>Unirse con código</h3>
            <JoinFamilyForm />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-root">
      {/* ── MOBILE HEADER ── */}
      <div className="mobile-header">
        <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "4px" }}>
          {families.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFamilyId(f.id)}
              className={activeFamilyId === f.id ? "btn-primary" : "btn-secondary"}
              style={{ padding: "0.4rem 1rem", fontSize: "0.8rem", whiteSpace: "nowrap", flexShrink: 0 }}
            >
              {f.name}
            </button>
          ))}
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="btn-secondary"
          style={{ padding: "0.4rem 0.75rem", borderRadius: "8px", fontSize: "0.8rem", whiteSpace: "nowrap" }}
        >
          {sidebarOpen ? "✕ Cerrar" : "☰ Panel"}
        </button>
      </div>

      <div className="dashboard-grid">
        {/* ════ LEFT: CALENDAR ════ */}
        <div className="calendar-column">

          {/* Desktop family tabs */}
          {families.length > 0 && (
            <div className="desktop-tabs" style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
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

          {/* Calendar card */}
          <div className="glass" style={{ padding: "1.25rem" }}>
            {/* Month nav */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="btn-secondary" style={{ padding: "0.4rem 0.8rem", borderRadius: "8px", fontSize: "0.85rem" }}>←</button>
              <h3 style={{ textTransform: "capitalize", fontSize: "1.1rem", fontWeight: 700 }}>
                {format(currentMonth, "MMMM yyyy", { locale: es })}
              </h3>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="btn-secondary" style={{ padding: "0.4rem 0.8rem", borderRadius: "8px", fontSize: "0.85rem" }}>→</button>
            </div>

            {/* Week headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px", marginBottom: "6px" }}>
              {["D", "L", "M", "X", "J", "V", "S"].map((d) => (
                <div key={d} style={{ textAlign: "center", fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", padding: "0.3rem 0" }}>{d}</div>
              ))}
            </div>

            {/* Day grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px" }}>
              {Array.from({ length: startPadding }).map((_, i) => <div key={`pad-${i}`} />)}
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayRecs = recordsByDay[key] || [];
                const isSelected = isSameDay(day, selectedDay);
                const isTodayDay = isToday(day);
                const hasRecords = dayRecs.length > 0;
                // Unique pets fed that day
                const petSet = [...new Set(dayRecs.map((r) => r.pet.id))];

                return (
                  <button
                    key={key}
                    onClick={() => setSelectedDay(day)}
                    title={hasRecords ? `${dayRecs.length} comida(s)` : undefined}
                    style={{
                      position: "relative",
                      aspectRatio: "1",
                      borderRadius: "9px",
                      border: isSelected
                        ? "2px solid var(--primary-color)"
                        : isTodayDay
                        ? "2px solid var(--secondary-color)"
                        : "2px solid transparent",
                      background: isSelected
                        ? "rgba(99,102,241,0.22)"
                        : hasRecords
                        ? "rgba(16,185,129,0.08)"
                        : "rgba(255,255,255,0.02)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "2px",
                      transition: "all 0.15s ease",
                      padding: "3px",
                    }}
                  >
                    <span style={{
                      fontSize: "0.8rem",
                      fontWeight: isSelected || isTodayDay ? 700 : 400,
                      color: isSelected ? "var(--primary-color)" : isTodayDay ? "var(--secondary-color)" : "inherit",
                      lineHeight: 1,
                    }}>
                      {format(day, "d")}
                    </span>
                    {hasRecords && (
                      <div style={{ display: "flex", gap: "2px", justifyContent: "center" }}>
                        {petSet.slice(0, 4).map((_, i) => (
                          <span key={i} style={{
                            width: "4px", height: "4px", borderRadius: "50%",
                            background: `hsl(${(i * 70 + 150) % 360}, 70%, 60%)`,
                          }} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid var(--card-border)", fontSize: "0.7rem", color: "var(--text-muted)", flexWrap: "wrap" }}>
              <LegendItem color="var(--primary-color)" label="Seleccionado" />
              <LegendItem color="var(--secondary-color)" label="Hoy" />
              <LegendItem color="#10b981" label="Con registros" dot />
            </div>
          </div>

          {/* ── DAY DETAIL ── */}
          <div className="glass" style={{ padding: "1.25rem", marginTop: "1rem" }}>
            <h3 style={{ marginBottom: "1rem", fontSize: "1rem", textTransform: "capitalize", fontWeight: 700 }}>
              📅 {format(selectedDay, "EEEE d 'de' MMMM", { locale: es })}
              <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "0.85rem", marginLeft: "0.5rem" }}>
                {format(selectedDay, "yyyy")}
              </span>
            </h3>
            {selectedDayRecords.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", padding: "1.5rem 0", fontSize: "0.9rem" }}>
                🐾 Sin registros de alimentación este día.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {[...selectedDayRecords]
                  .sort((a, b) => parseISO(b.fedAt).getTime() - parseISO(a.fedAt).getTime())
                  .map((record) => (
                    <FeedingRecordRow key={record.id} record={record} />
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* ════ RIGHT SIDEBAR ════ */}
        <aside className={`sidebar-column ${sidebarOpen ? "sidebar-open" : ""}`}>

          {/* TODAY STATUS */}
          <div className="glass" style={{ padding: "1.25rem" }}>
            <SectionLabel>Estado de hoy</SectionLabel>
            {!activeFamily || activeFamily.pets.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>No hay mascotas. Agrégalas abajo.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {activeFamily.pets.map((pet) => {
                  const count = todayCountByPet[pet.id] || 0;
                  const done = count >= MEALS_GOAL;
                  const lastRecord = pet.feedingRecords[0];
                  return (
                    <PetStatusCard key={pet.id} pet={pet} count={count} done={done} lastRecord={lastRecord} />
                  );
                })}
              </div>
            )}
          </div>

          {/* ADD PET */}
          {activeFamily && (
            <div className="glass" style={{ padding: "1.25rem" }}>
              <SectionLabel>Agregar mascota</SectionLabel>
              <AddPetForm familyId={activeFamily.id} />
            </div>
          )}

          {/* INVITE */}
          {activeFamily && (
            <div className="glass" style={{ padding: "1.25rem" }}>
              <SectionLabel>Invitar a la familia</SectionLabel>
              <InvitePanel familyId={activeFamily.id} />
            </div>
          )}

          {/* JOIN WITH CODE */}
          <div className="glass" style={{ padding: "1.25rem" }}>
            <SectionLabel>Unirse con código</SectionLabel>
            <JoinFamilyForm />
          </div>

          {/* MEMBERS */}
          {activeFamily && (
            <div className="glass" style={{ padding: "1.25rem" }}>
              <SectionLabel>Miembros de {activeFamily.name}</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {activeFamily.members.map((m) => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontSize: "0.875rem" }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                      background: `hsl(${((m.user.name || m.user.username || "").charCodeAt(0) * 13) % 360}, 55%, 40%)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.75rem", fontWeight: 700, color: "white"
                    }}>
                      {avatarInitial(m.user.name, m.user.username)}
                    </div>
                    <span style={{ fontWeight: 500 }}>{m.user.name || m.user.username}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CREATE FAMILY */}
          <div className="glass" style={{ padding: "1.25rem" }}>
            <SectionLabel>Nueva familia</SectionLabel>
            <CreateFamilyForm compact />
          </div>
        </aside>
      </div>
    </div>
  );
}

// ——————————————————————————
// PET STATUS CARD
// ——————————————————————————
function PetStatusCard({ pet, count, done, lastRecord }: {
  pet: Pet; count: number; done: boolean;
  lastRecord?: FeedingRecord;
}) {
  const [isPending, startTransition] = useTransition();
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState("");

  const handleFeed = () => {
    startTransition(() => {
      feedPet(pet.id, note || undefined);
      setNote("");
      setShowNote(false);
    });
  };

  const progress = Math.min(count / MEALS_GOAL, 1);
  const progressColor = done ? "#10b981" : count > 0 ? "#f59e0b" : "#f43f5e";

  return (
    <div style={{
      borderRadius: "12px", padding: "1rem",
      background: done ? "rgba(16,185,129,0.08)" : count > 0 ? "rgba(245,158,11,0.08)" : "rgba(244,63,94,0.07)",
      border: `1px solid ${done ? "rgba(16,185,129,0.25)" : count > 0 ? "rgba(245,158,11,0.25)" : "rgba(244,63,94,0.2)"}`,
    }}>
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.6rem" }}>
        <span style={{ fontSize: "1.5rem" }}>{petEmoji(pet.species)}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>{pet.name}</div>
          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{pet.species || "Mascota"}</div>
        </div>
        {/* x/2 badge */}
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          background: "rgba(0,0,0,0.25)", borderRadius: "10px", padding: "0.3rem 0.6rem",
          minWidth: "48px"
        }}>
          <span style={{ fontSize: "1.1rem", fontWeight: 800, color: progressColor, lineHeight: 1 }}>
            {count}
          </span>
          <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", lineHeight: 1, marginTop: "1px" }}>
            / {MEALS_GOAL}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: "4px", borderRadius: "9999px", background: "rgba(255,255,255,0.08)", marginBottom: "0.6rem", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: "9999px",
          width: `${progress * 100}%`,
          background: progressColor,
          transition: "width 0.4s ease",
        }} />
      </div>

      {/* Status badge */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: done ? "0" : "0.5rem" }}>
        <span style={{
          fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px",
          background: done ? "rgba(16,185,129,0.2)" : count > 0 ? "rgba(245,158,11,0.2)" : "rgba(244,63,94,0.2)",
          color: done ? "#10b981" : count > 0 ? "#f59e0b" : "#f43f5e",
        }}>
          {done ? "✓ Alimentado" : count > 0 ? `⏳ ${MEALS_GOAL - count} comida(s) más` : "⚠ Sin comer"}
        </span>
        {lastRecord && (
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
            Última: {format(parseISO(lastRecord.fedAt), "d MMM · HH:mm", { locale: es })}
          </span>
        )}
      </div>

      {/* Feed button */}
      {!done && (
        <>
          {showNote ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
              <input
                type="text" value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="Nota (ej. comió todo)"
                style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--card-border)", background: "rgba(0,0,0,0.2)", color: "white", fontSize: "0.8rem", width: "100%" }}
              />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button onClick={handleFeed} className="btn-primary" disabled={isPending} style={{ flex: 1, padding: "0.5rem", fontSize: "0.8rem" }}>
                  {isPending ? "..." : "🍖 Registrar"}
                </button>
                <button onClick={() => setShowNote(false)} className="btn-secondary" style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", fontSize: "0.8rem" }}>✕</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowNote(true)} className="btn-primary" disabled={isPending}
              style={{ width: "100%", padding: "0.5rem", fontSize: "0.82rem", marginTop: "0.5rem" }}>
              🍖 Alimentar
            </button>
          )}
        </>
      )}
      {done && (
        <button onClick={() => setShowNote(true)} className="btn-secondary"
          style={{ width: "100%", padding: "0.4rem", fontSize: "0.75rem", marginTop: "0.5rem", borderRadius: "8px" }}>
          + Registrar comida extra
        </button>
      )}
      {done && showNote && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
          <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="Nota (ej. snack de la tarde)"
            style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", border: "1px solid var(--card-border)", background: "rgba(0,0,0,0.2)", color: "white", fontSize: "0.8rem", width: "100%" }}
          />
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button onClick={handleFeed} className="btn-primary" disabled={isPending} style={{ flex: 1, padding: "0.5rem", fontSize: "0.8rem" }}>{isPending ? "..." : "🍖 Registrar"}</button>
            <button onClick={() => setShowNote(false)} className="btn-secondary" style={{ padding: "0.5rem 0.75rem", borderRadius: "8px", fontSize: "0.8rem" }}>✕</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ——————————————————————————
// FEEDING RECORD ROW
// ——————————————————————————
function FeedingRecordRow({ record }: { record: FeedingRecord }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "0.75rem",
      background: "rgba(255,255,255,0.04)", borderRadius: "10px",
      padding: "0.7rem 0.9rem", border: "1px solid var(--card-border)"
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
        background: `hsl(${(record.pet.name.charCodeAt(0) * 7) % 360}, 55%, 38%)`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem"
      }}>
        {petEmoji(record.pet.species)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: "0.875rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {record.pet.name}
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: "0.775rem" }}>
          por <strong>{record.user.name || record.user.username}</strong>
        </div>
        {record.notes && (
          <div style={{ color: "var(--text-muted)", fontSize: "0.75rem", fontStyle: "italic", marginTop: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            "{record.notes}"
          </div>
        )}
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        <div style={{ color: "var(--primary-color)", fontWeight: 800, fontSize: "1rem", fontVariantNumeric: "tabular-nums" }}>
          {format(parseISO(record.fedAt), "HH:mm")}
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: "0.65rem", textTransform: "uppercase" }}>
          {format(parseISO(record.fedAt), "a")}
        </div>
      </div>
    </div>
  );
}

// ——————————————————————————
// INVITE PANEL
// ——————————————————————————
function InvitePanel({ familyId }: { familyId: string }) {
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateCode = async () => {
    setLoading(true);
    const res = await fetch("/api/family/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ familyId }),
    });
    const data = await res.json();
    setCode(data.code);
    setLoading(false);
  };

  const copyCode = () => {
    if (!code) return;
    const inviteUrl = `${window.location.origin}/unirse?codigo=${code}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <p style={{ fontSize: "0.775rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
        Genera un enlace de invitación y compártelo con los miembros de tu familia.
      </p>
      {code ? (
        <>
          <div style={{
            background: "rgba(0,0,0,0.25)", borderRadius: "8px", padding: "0.6rem 0.75rem",
            fontSize: "0.75rem", color: "var(--text-muted)", wordBreak: "break-all",
            border: "1px solid var(--card-border)"
          }}>
            <span style={{ color: "var(--primary-color)", fontWeight: 600 }}>Código: </span>{code}
          </div>
          <button onClick={copyCode} className={copied ? "btn-secondary" : "btn-primary"} style={{ borderRadius: "8px", padding: "0.6rem", fontSize: "0.8rem" }}>
            {copied ? "✓ ¡Copiado!" : "📋 Copiar enlace de invitación"}
          </button>
        </>
      ) : (
        <button onClick={generateCode} disabled={loading} className="btn-secondary" style={{ borderRadius: "8px", padding: "0.6rem", fontSize: "0.8rem" }}>
          {loading ? "Generando..." : "🔗 Generar enlace"}
        </button>
      )}
    </div>
  );
}

// ——————————————————————————
// JOIN FAMILY FORM
// ——————————————————————————
function JoinFamilyForm() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setStatus(null);
    const res = await fetch("/api/family/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setStatus({ type: "success", msg: `¡Te uniste a "${data.familyName}"! Recargando...` });
      setTimeout(() => router.refresh(), 1500);
    } else {
      setStatus({ type: "error", msg: data.message || "Error al unirse" });
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <input
        type="text" value={code} onChange={(e) => setCode(e.target.value)}
        placeholder="Pega el código de invitación"
        style={{ padding: "0.6rem 0.75rem", borderRadius: "8px", border: "1px solid var(--card-border)", background: "rgba(0,0,0,0.2)", color: "white", fontSize: "0.8rem" }}
      />
      {status && (
        <p style={{ fontSize: "0.775rem", color: status.type === "success" ? "#10b981" : "#f43f5e", margin: 0 }}>
          {status.msg}
        </p>
      )}
      <button onClick={handleJoin} disabled={loading || !code.trim()} className="btn-primary" style={{ borderRadius: "8px", padding: "0.6rem", fontSize: "0.8rem" }}>
        {loading ? "Uniéndose..." : "Unirse a familia"}
      </button>
    </div>
  );
}

// ——————————————————————————
// ADD PET FORM
// ——————————————————————————
function AddPetForm({ familyId }: { familyId: string }) {
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={(fd) => startTransition(() => addPet(familyId, fd).then(() => ref.current?.reset()))}
      style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <input type="text" name="name" placeholder="Nombre" required
        style={{ padding: "0.6rem 0.75rem", borderRadius: "8px", border: "1px solid var(--card-border)", background: "rgba(0,0,0,0.2)", color: "white", fontSize: "0.8rem" }} />
      <input type="text" name="species" placeholder="Especie (Perro, Gato…)"
        style={{ padding: "0.6rem 0.75rem", borderRadius: "8px", border: "1px solid var(--card-border)", background: "rgba(0,0,0,0.2)", color: "white", fontSize: "0.8rem" }} />
      <button type="submit" disabled={isPending} className="btn-secondary" style={{ borderRadius: "8px", padding: "0.6rem", fontSize: "0.8rem" }}>
        {isPending ? "Agregando..." : "+ Agregar mascota"}
      </button>
    </form>
  );
}

// ——————————————————————————
// CREATE FAMILY FORM
// ——————————————————————————
function CreateFamilyForm({ compact }: { compact?: boolean }) {
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={(fd) => startTransition(() => createFamily(fd).then(() => ref.current?.reset()))}
      style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
      <input type="text" name="name" placeholder="Nombre de la familia" required
        style={{ padding: "0.6rem 0.75rem", borderRadius: "8px", border: "1px solid var(--card-border)", background: "rgba(0,0,0,0.2)", color: "white", fontSize: "0.8rem" }} />
      <button type="submit" disabled={isPending} className="btn-primary" style={{ borderRadius: "8px", padding: "0.6rem", fontSize: "0.8rem" }}>
        {isPending ? "Creando..." : "Crear familia"}
      </button>
    </form>
  );
}

// ——————————————————————————
// HELPERS
// ——————————————————————————
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--text-muted)", marginBottom: "0.85rem", fontWeight: 700 }}>
      {children}
    </h4>
  );
}

function LegendItem({ color, label, dot }: { color: string; label: string; dot?: boolean }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
      <span style={{
        width: dot ? 8 : 12, height: dot ? 8 : 12, borderRadius: "50%",
        background: dot ? color : "rgba(99,102,241,0.3)",
        border: dot ? "none" : `2px solid ${color}`,
        display: "inline-block", flexShrink: 0
      }} />
      {label}
    </span>
  );
}
