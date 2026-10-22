"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { platformAuthenticatorIsAvailable } from "@simplewebauthn/browser";
import { LockIcon } from "@/components/icons/NavigationIcons";
import GlobalStyles from "@mui/material/GlobalStyles";
import { deviceLockStyles } from "@/theme/device-lock";
import {
  Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle,
  FormControlLabel, IconButton, Stack, Switch, TextField, Tooltip, Typography,
} from "@mui/material";
import { LogoutButton } from "@/components/LogoutButton";
import { confirmDevice, deviceError, deviceRequest } from "./client";

type LockContextValue = { enabled: boolean; supported: boolean; setEnabled: (value: boolean) => void };
const LockContext = createContext<LockContextValue | null>(null);

export function DeviceLockProvider({ children, initialEnabled }: {
  children: ReactNode; initialEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [locked, setLocked] = useState(initialEnabled);
  const [hasUnlocked, setHasUnlocked] = useState(!initialEnabled);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    let active = true;
    if (window.isSecureContext && "PublicKeyCredential" in window) {
      void platformAuthenticatorIsAvailable().then((value) => {
        if (active) setSupported(value);
      }).catch(() => {});
    }
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    // Hide before the next browser paint, including when entering the back/forward cache.
    const lock = () => { flushSync(() => setLocked(true)); };
    const visibility = () => { if (document.visibilityState === "hidden") lock(); };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", lock);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", lock);
    };
  }, [enabled]);

  const isLocked = enabled && locked;
  useLayoutEffect(() => {
    if (isLocked) document.body.setAttribute("data-books-locked", "true");
    else document.body.removeAttribute("data-books-locked");
    return () => document.body.removeAttribute("data-books-locked");
  }, [isLocked]);
  const changeEnabled = (value: boolean) => {
    setEnabled(value);
    setLocked(value && document.visibilityState === "hidden");
  };
  return <LockContext.Provider value={{ enabled, supported, setEnabled: changeEnabled }}>
    <GlobalStyles styles={deviceLockStyles} />
    <div hidden={isLocked} inert={isLocked}>
      {hasUnlocked && children}
    </div>
    {isLocked && <UnlockScreen supported={supported} onUnlocked={() => {
      if (document.visibilityState !== "hidden") {
        setHasUnlocked(true);
        setLocked(false);
      }
    }} />}
  </LockContext.Provider>;
}

function UnlockScreen({ supported, onUnlocked }: {
  supported: boolean; onUnlocked: () => void;
}) {
  const busyRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [passwordMode, setPasswordMode] = useState(false);
  const [password, setPassword] = useState("");

  async function unlock(withPassword = false) {
    if (busyRef.current) return;
    busyRef.current = true;
    setPending(true); setError("");
    try {
      if (withPassword) await deviceRequest("password-unlock", { password });
      else await confirmDevice("unlock");
      setPassword("");
      onUnlocked();
    } catch (err) { setError(deviceError(err)); }
    finally { busyRef.current = false; setPending(false); }
  }

  return <Dialog open fullScreen data-books-lock-root="true" aria-labelledby="device-unlock-title">
    <DialogTitle id="device-unlock-title">books bloqueado</DialogTitle>
    <DialogContent><Stack spacing={2}>
      {error && <Alert severity="warning" onClose={() => setError("")}>{error}</Alert>}
      {passwordMode || !supported ? <Stack component="form" spacing={2}
        onSubmit={(event) => { event.preventDefault(); void unlock(true); }}>
        <TextField label="Senha" type="password" autoComplete="current-password" value={password}
          onChange={(event) => setPassword(event.target.value)} disabled={pending} autoFocus fullWidth />
        <Button variant="contained" type="submit" disabled={pending || !password}>
          {pending ? "Confirmando…" : "Desbloquear"}
        </Button>
      </Stack> : <Button fullWidth variant="contained" startIcon={<LockIcon />}
        disabled={pending} onClick={() => void unlock()}>{pending ? "Confirmando…" : "Desbloquear"}</Button>}
      {supported && <Button disabled={pending} onClick={() => { setError(""); setPasswordMode(!passwordMode); }}>
        {passwordMode ? "Usar desbloqueio do dispositivo" : "Usar senha"}
      </Button>}
      <LogoutButton />
    </Stack></DialogContent>
  </Dialog>;
}

export function DeviceLockAction() {
  const context = useContext(LockContext);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [passwordMode, setPasswordMode] = useState(false);
  if (!context || (!context.supported && !context.enabled)) return null;
  const { enabled, setEnabled } = context;

  async function toggle(withPassword = false) {
    setPending(true); setError("");
    try {
      if (withPassword) await deviceRequest("password-unlock", { password, disable: true });
      else await confirmDevice(enabled ? "disable" : "register");
      setEnabled(!enabled);
      setPassword(""); setPasswordMode(false);
    } catch (err) { setError(deviceError(err)); }
    finally { setPending(false); }
  }
  const close = () => { if (!pending) { setOpen(false); setPassword(""); setPasswordMode(false); setError(""); } };
  return <>
    <Tooltip title="Desbloqueio do app"><IconButton aria-label="Desbloqueio do app" color="inherit"
      onClick={() => setOpen(true)}><LockIcon /></IconButton></Tooltip>
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <DialogTitle>Desbloqueio do app</DialogTitle>
      <DialogContent><Stack spacing={2}>
        <FormControlLabel label="Exigir desbloqueio neste dispositivo" control={
          <Switch checked={enabled} disabled={pending} onChange={() => void toggle()} />
        } />
        <Typography variant="body2" color="text.secondary">Face ID, Touch ID ou código do aparelho.</Typography>
        {error && <Alert severity="warning" onClose={() => setError("")}>{error}</Alert>}
        {enabled && error && !passwordMode && <Button onClick={() => setPasswordMode(true)}>Desativar com senha</Button>}
        {passwordMode && <Stack component="form" spacing={1} onSubmit={(event) => { event.preventDefault(); void toggle(true); }}>
          <TextField label="Senha" type="password" autoComplete="current-password" value={password}
            onChange={(event) => setPassword(event.target.value)} disabled={pending} />
          <Button type="submit" disabled={pending || !password}>Desativar</Button>
        </Stack>}
      </Stack></DialogContent>
      <DialogActions><Button disabled={pending} onClick={close}>Fechar</Button></DialogActions>
    </Dialog>
  </>;
}
