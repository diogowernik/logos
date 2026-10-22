import { cookies } from "next/headers";
import { deviceLockCookie } from "@/features/device-lock/preferences";
import { djangoFetch, fetchCurrentUser, getAuthToken, isSameOrigin, noStoreJson } from "@/server/django";

const actions = new Set([
  "register-options", "register-verify", "unlock-options", "unlock-verify",
  "disable-options", "disable-verify", "password-unlock",
]);

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  if (!isSameOrigin(request)) return noStoreJson({ detail: "Origem não permitida." }, { status: 403 });
  const { action } = await context.params;
  if (!actions.has(action)) return noStoreJson({}, { status: 404 });
  const input: unknown = await request.json().catch(() => null);
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return noStoreJson({ detail: "Requisição inválida." }, { status: 400 });
  }
  try {
    const user = await fetchCurrentUser();
    const token = await getAuthToken();
    if (!user || !token) return noStoreJson({ detail: "Sua sessão expirou. Entre novamente." }, { status: 401 });
    const jar = await cookies();
    const cookieName = deviceLockCookie(user.id);
    const upstream = await djangoFetch(`/api/device-security/${action}/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Token ${token}` },
      body: JSON.stringify({
        ...input,
        // Browser identity and device binding come from trusted request/cookie data.
        origin: new URL(request.headers.get("origin") ?? request.headers.get("referer")!).origin,
        credential_id: jar.get(cookieName)?.value,
      }),
    });
    const data = await upstream.json().catch(() => null) as {
      enabled?: boolean; credential_id?: string; detail?: unknown;
    } | null;
    if (!upstream.ok) return noStoreJson(data, { status: upstream.status });
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid confirmation");
    if ((action === "register-verify" && typeof data.credential_id === "string" && data.credential_id)
      || data.enabled === false) {
      jar.set(cookieName, data.enabled === false ? "" : data.credential_id!, {
        httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/",
        maxAge: data.enabled === false ? 0 : 60 * 60 * 24 * 365,
      });
    }
    delete data.credential_id;
    return noStoreJson(data);
  } catch {
    return noStoreJson({ detail: "Não foi possível confirmar. Tente novamente." }, { status: 502 });
  }
}
