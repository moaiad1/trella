import { getApiBase } from "./apiBase";

export type PublicFeatures = {
  listingCategoryAi: boolean;
};

export async function fetchPublicFeatures(): Promise<PublicFeatures> {
  try {
    const res = await fetch(`${getApiBase()}/features`);
    if (!res.ok) return { listingCategoryAi: false };
    const data = (await res.json()) as Partial<PublicFeatures>;
    return { listingCategoryAi: Boolean(data.listingCategoryAi) };
  } catch {
    return { listingCategoryAi: false };
  }
}
