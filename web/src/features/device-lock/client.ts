import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

type RegisterOptions = Parameters<typeof startRegistration>[0]["optionsJSON"];
type UnlockOptions = Parameters<typeof startAuthentication>[0]["optionsJSON"];

export async function deviceRequest<T>(action: string, body: object = {}): Promise<T> {
  const response = await fetch(`/api/auth/device-lock/${action}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok) {
    const message = Array.isArray(data) ? data[0] : data?.detail;
    throw new Error(typeof message === "string" ? message : "Não foi possível confirmar. Tente novamente.");
  }
  return data as T;
}

export async function confirmDevice(purpose: "register" | "unlock" | "disable") {
  const { options, challenge_id } = await deviceRequest<{
    options: RegisterOptions | UnlockOptions; challenge_id: string;
  }>(`${purpose}-options`);
  const response = purpose === "register"
    ? await startRegistration({ optionsJSON: options as RegisterOptions })
    : await startAuthentication({ optionsJSON: options as UnlockOptions });
  await deviceRequest(`${purpose}-verify`, { challenge_id, response });
}

export function deviceError(error: unknown) {
  if (error instanceof Error && ["NotAllowedError", "AbortError"].includes(error.name)) {
    return "Confirmação cancelada. Tente novamente ou use sua senha.";
  }
  return error instanceof Error ? error.message : "Não foi possível desbloquear.";
}
