export function extractSlug(url: string): string | undefined {
  return url.split("/problems/")[1]?.split("/")[0];
}
