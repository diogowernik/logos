import { djangoFetch, isSameOrigin, noStoreJson, setAuthToken } from "@/server/django";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return noStoreJson({ detail: "Origem não permitida." }, { status: 403 });
  }
  const payload = await request.json().catch(() => null);
  if (typeof payload?.username !== "string" || typeof payload?.password !== "string" ||
      !payload.username.trim() || !payload.password) {
    return noStoreJson({ detail: "Usuário e senha são obrigatórios." }, { status: 400 });
  }
  try {
    const upstream = await djangoFetch("/auth/token/login/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: payload.username, password: payload.password }),
    });
    if (!upstream.ok) {
      const invalid = [400, 401].includes(upstream.status);
      return noStoreJson({ detail: invalid ? "Usuário ou senha inválidos." : "Não foi possível entrar." },
        { status: invalid ? 401 : 502 });
    }
    const data = await upstream.json().catch(() => null);
    if (typeof data?.auth_token !== "string" || !data.auth_token) {
      return noStoreJson({ detail: "Resposta inválida da API." }, { status: 502 });
    }
    await setAuthToken(data.auth_token);
    return noStoreJson({ ok: true });
  } catch {
    return noStoreJson({ detail: "A API não respondeu." }, { status: 502 });
  }
}
