"use client";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <Box component="main" sx={{ p: 3 }}>
      <Alert
        severity="error"
        action={<Button onClick={reset}>Tentar novamente</Button>}
      >
        Não foi possível carregar. Tente novamente em alguns instantes.
      </Alert>
    </Box>
  );
}
