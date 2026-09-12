let csrf = "";
const apiBase = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api`;
export function setCsrf(value: string) {
  csrf = value;
}
export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("content-type"))
    headers.set("content-type", "application/json");
  if (
    options.method &&
    !["GET", "HEAD"].includes(options.method.toUpperCase()) &&
    csrf
  )
    headers.set("x-csrf-token", csrf);
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers,
    credentials: "same-origin",
  });
  if (response.status === 204) return undefined as T;
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok) {
    const data = type.includes("json") ? await response.json() : {};
    throw new Error(data.message ?? "Noe gikk galt.");
  }
  return (
    type.includes("json") ? response.json() : response.blob()
  ) as Promise<T>;
}
export async function download(path: string, filename: string) {
  const blob = await api<Blob>(path);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
