import { apiRequest } from "@/api/client";

export function libraryRequest<T>(path: string, method = "GET", data?: unknown) {
  return apiRequest<T>(`/api/library/${path}`, {
    method, ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Não foi possível concluir. Tente novamente.";
}
