import { customAlphabet } from "nanoid";

const createRandomSlug = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 16);

export function createShareSlug(): string {
  return createRandomSlug();
}

export function normalizeSlug(value: FormDataEntryValue | string | null): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const candidate = value.trim();
  const fromUrl = candidate.match(/\/a\/([^/?#]+)/)?.[1] ?? candidate;
  const slug = fromUrl.toLowerCase();

  return /^[a-z0-9_-]{10,80}$/.test(slug) ? slug : null;
}
