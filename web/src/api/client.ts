export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly fieldErrors: Record<string, string[]> = {},
  ) { super(message); }
}

type FieldLabels = Readonly<Record<string, string>>;
const fallbackMessage = "Não foi possível concluir a solicitação.";

function responseError(payload: unknown, status: number, labels: FieldLabels): ApiError {
  const errors = new Map<string, string[]>();
  function collect(value: unknown, path = "") {
    if (typeof value === "string" && value.trim()) {
      errors.set(path, [...(errors.get(path) ?? []), value]);
    } else if (Array.isArray(value)) {
      value.forEach((entry, index) => collect(entry,
        typeof entry === "object" && entry !== null ? `${path}[${index}]` : path));
    } else if (value && typeof value === "object") {
      Object.entries(value).forEach(([key, entry]) => collect(entry,
        ["detail", "non_field_errors"].includes(key) ? path : path ? `${path}.${key}` : key));
    }
  }
  collect(payload);
  const message = [...errors].map(([field, messages]) => {
    const label = labels[field] ?? field.replaceAll("_", " ");
    return `${label ? `${label}: ` : ""}${messages.join(" ")}`;
  }).join(" ");
  return new ApiError(message || fallbackMessage, status,
    Object.fromEntries([...errors].filter(([field]) => field)));
}

async function request(path: string, init: RequestInit = {}, fieldLabels: FieldLabels = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(path, { ...init, headers, credentials: "same-origin" });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw responseError(data, response.status, fieldLabels);
  }
  return response;
}

export async function apiRequest<T>(path: string, init?: RequestInit, fieldLabels?: FieldLabels): Promise<T> {
  const response = await request(path, init, fieldLabels);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function downloadRequest(path: string, init?: RequestInit, fieldLabels?: FieldLabels): Promise<Blob> {
  return (await request(path, init, fieldLabels)).blob();
}
