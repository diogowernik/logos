import { NextRequest } from "next/server";
import { djangoFetch, getAuthToken, isSameOrigin, noStoreJson } from "@/server/django";

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!["GET", "HEAD"].includes(request.method) && !isSameOrigin(request)) {
    return noStoreJson({ detail: "Origem não permitida." }, { status: 403 });
  }
  const token = await getAuthToken();
  if (!token) return noStoreJson({ detail: "Entre para continuar." }, { status: 401 });
  const { path } = await context.params;
  try {
    const upstream = await djangoFetch(`/api/library/${path.map(encodeURIComponent).join("/")}/${request.nextUrl.search}`, {
      method: request.method,
      headers: { Authorization: `Token ${token}`, "Content-Type": "application/json" },
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.text(),
    });
    const headers = new Headers({ "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      "Cache-Control": "private, no-store", "Vary": "Cookie" });
    return new Response(upstream.status === 204 ? null : await upstream.text(), { status: upstream.status, headers });
  } catch {
    return noStoreJson({ detail: "A API não respondeu. Tente novamente." }, { status: 502 });
  }
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
