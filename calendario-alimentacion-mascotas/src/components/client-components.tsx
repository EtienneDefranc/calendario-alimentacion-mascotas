"use client";

import { useTransition, useRef } from "react";
import { createFamily, addPet, feedPet } from "@/app/actions";

export function CreateFamilyForm() {
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  return (
    <div className="glass" style={{ padding: '2rem', marginTop: '2rem' }}>
      <h3 style={{ marginBottom: '1rem' }}>Crear nueva Familia</h3>
      <form ref={ref} action={(formData) => {
        startTransition(() => {
          createFamily(formData).then(() => ref.current?.reset());
        });
      }} style={{ display: 'flex', gap: '1rem' }}>
        <input 
          type="text" 
          name="name" 
          placeholder="Nombre de la familia" 
          required 
          style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
        />
        <button type="submit" className="btn-primary" disabled={isPending}>
          {isPending ? 'Creando...' : 'Crear'}
        </button>
      </form>
    </div>
  );
}

export function AddPetForm({ familyId }: { familyId: string }) {
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form ref={ref} action={(formData) => {
        startTransition(() => {
          addPet(familyId, formData).then(() => ref.current?.reset());
        });
      }} style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
      <input 
        type="text" 
        name="name" 
        placeholder="Nombre de la mascota" 
        required 
        style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
      />
      <input 
        type="text" 
        name="species" 
        placeholder="Especie (Perro, Gato...)" 
        style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--card-border)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
      />
      <button type="submit" className="btn-secondary" disabled={isPending}>
        {isPending ? 'Agregando...' : '+ Mascota'}
      </button>
    </form>
  );
}

export function FeedButton({ petId }: { petId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button 
      onClick={() => startTransition(() => feedPet(petId))} 
      className="btn-primary"
      disabled={isPending}
      style={{ width: '100%', marginTop: '1rem', padding: '1rem' }}
    >
      {isPending ? 'Registrando...' : '¡Alimentar ahora! 🍖'}
    </button>
  );
}
