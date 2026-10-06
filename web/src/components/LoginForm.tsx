"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/api/client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      await apiRequest("/api/auth/login", { method: "POST", body: JSON.stringify({
        username: form.get("username"), password: form.get("password"),
      }) });
      router.replace("/");
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível entrar.");
    } finally { setPending(false); }
  }
  return <form onSubmit={submit} className="form-stack">
    <label htmlFor="username">Usuário</label>
    <input id="username" name="username" autoComplete="username" required autoFocus />
    <label htmlFor="password">Senha</label>
    <input id="password" name="password" type="password" autoComplete="current-password" required />
    {error && <p role="alert">{error}</p>}
    <button type="submit" disabled={pending}>{pending ? "Entrando…" : "Entrar"}</button>
  </form>;
}
