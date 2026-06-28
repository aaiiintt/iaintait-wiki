// Helper to translate relative media paths in markdown to absolute server route paths
export function translateMediaUrls(body: string): string {
  if (!body) return "";
  return body
    .replace(/(?:\.\.\/)*raw\/media\//g, "/wiki-media/")
    .replace(/(?:\.\.\/)*raw\/assets\//g, "/wiki-assets/")
    .replace(/file:\/\/\/wiki-media\//g, "/wiki-media/")
    .replace(/file:\/\/\/wiki-assets\//g, "/wiki-assets/");
}
