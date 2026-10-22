"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogContentText from "@mui/material/DialogContentText";
import DialogTitle from "@mui/material/DialogTitle";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import { DownloadIcon } from "@/components/icons/NavigationIcons";
import { usePwaInstall } from "./PwaProvider";

export function InstallAppButton() {
  const { canInstall, manual, installed, installing, install } = usePwaInstall();
  const [guideOpen, setGuideOpen] = useState(false);
  if (installed || (!canInstall && !manual && !guideOpen)) return null;

  return (
    <>
      {(canInstall || manual) && <Button
          color="inherit"
          variant="text"
          startIcon={<DownloadIcon />}
          disabled={installing}
          onClick={() => {
            if (canInstall) void install().catch(() => setGuideOpen(true));
            else setGuideOpen(true);
          }}
        >
          Instalar books
        </Button>}
      <Dialog open={guideOpen} onClose={() => setGuideOpen(false)} aria-labelledby="pwa-install-title">
        <DialogTitle id="pwa-install-title">Instalar books</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
          <Box component="img" src="/icons/pwa-192.png" width={64} height={64} alt="books" />
          <DialogContentText>
            {manual
              ? "No iPhone ou iPad, abra o books no Safari, toque em Compartilhar e escolha Adicionar à Tela de Início. Depois confirme em Adicionar."
              : "Abra o menu do navegador e procure Instalar app ou Adicionar à Tela de Início."}
          </DialogContentText>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGuideOpen(false)}>Entendi</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
