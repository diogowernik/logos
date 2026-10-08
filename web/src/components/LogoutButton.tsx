"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
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
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      {error && (
        <Typography role="alert" variant="caption">
          Não foi possível sair.
        </Typography>
      )}
      <Button
        color="inherit"
        variant="text"
        onClick={logout}
        disabled={pending}
      >
        {pending ? "Saindo…" : "Sair"}
      </Button>
    </Box>
  );
}
