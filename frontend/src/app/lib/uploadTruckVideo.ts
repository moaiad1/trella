import { getApiBase } from "./apiBase";

const apiBase = getApiBase();

/** POST multipart to API; returns public path e.g. `/api/uploads/abc.mp4` */
export async function uploadTruckVideo(
  file: File,
  getAccessToken: () => string | null,
): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const token = getAccessToken();
  const headers: HeadersInit = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${apiBase}/trucks/upload-video`, {
    method: "POST",
    headers,
    body: fd,
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || res.statusText);
  }
  const data = (await res.json()) as { url?: string };
  if (!data.url) throw new Error("No URL in response");
  return data.url;
}
