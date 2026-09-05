import { getApiBase } from "./apiBase";

const apiBase = getApiBase();

export type ClassifyListingImageResult = {
  sellCategoryId: string;
  confidence: number;
  briefReason?: string;
};

export function isAiClassificationUnavailable(err: unknown): boolean {
  return err instanceof Error && err.message === "unavailable";
}

export async function classifyListingImage(
  file: File,
  getAccessToken: () => string | null,
): Promise<ClassifyListingImageResult> {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");

  const fd = new FormData();
  fd.append("file", file);

  const res = await fetch(`${apiBase}/me/classify-listing-image`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: fd,
  });

  if (res.status === 503) {
    throw new Error("unavailable");
  }

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const j = (await res.json()) as { detail?: string };
      if (j.detail) detail = j.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }

  return (await res.json()) as ClassifyListingImageResult;
}
