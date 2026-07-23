export function slugifyLocalBusiness(name: string, ownerId: string) {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 36);
  const suffix = ownerId.replace(/-/g, "").slice(0, 6);
  return base ? `${base}-${suffix}` : `local-${suffix}`;
}
