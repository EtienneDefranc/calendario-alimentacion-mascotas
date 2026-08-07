"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button 
      onClick={() => signOut({ callbackUrl: '/' })}
      className="btn-secondary"
      style={{ padding: '8px 16px', fontSize: '0.875rem' }}
    >
      Cerrar Sesión
    </button>
  );
}
