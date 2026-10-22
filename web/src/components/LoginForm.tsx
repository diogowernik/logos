"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import { apiRequest } from "@/api/client";

export function LoginForm({ destination = "/" }: { destination?: "/" | "/pwa" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    try {
      await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          username: form.get("username"),
          password: form.get("password"),
        }),
      });
      router.replace(destination);
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Não foi possível entrar.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <Stack component="form" onSubmit={submit} spacing={2}>
      <TextField
        id="username"
        name="username"
        label="Usuário"
        autoComplete="username"
        required
        autoFocus
      />
      <TextField
        id="password"
        name="password"
        label="Senha"
        type="password"
        autoComplete="current-password"
        required
      />
      {error && <Alert severity="error">{error}</Alert>}
      <Button variant="contained" type="submit" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
    </Stack>
  );
}
