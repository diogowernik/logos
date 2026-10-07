"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/api/client";

export function LogoutButton() {
  const router = useRouter();
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);
  async function logout() {
    setPending(true);
    setError(false);
    try {
      await apiRequest("/api/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch { setError(true); }
    finally { setPending(false); }
  }
  return <div className="session-actions">{error && <span role="alert">Não foi possível sair. </span>}
    <button className="secondary" onClick={logout} disabled={pending}>{pending ? "Saindo…" : "Sair"}</button>
  </div>;
}
