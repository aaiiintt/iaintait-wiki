export type NodeKind = 'project' | 'agency' | 'person' | 'industry';

export interface NodeDatum {
  id: string;
  kind: NodeKind;
  title: string;
  richness: number;
  desc?: string;
  year?: number | null;
  role?: string | null;
  client?: string | null;
  slug?: string;
  sourceUrls?: string[];
  body?: string;
  hasProfile?: boolean;
  confidential?: boolean;
  [k: string]: unknown;
}

export interface EdgeDatum {
  source: string;
  target: string;
  kind: 'agency' | 'collab';
  [k: string]: unknown;
}

export interface Graph {
  nodes: NodeDatum[];
  edges: EdgeDatum[];
}

export const COLORS: Record<NodeKind, string> = {
  project:  '#ff2a00',
  agency:   '#0044ff',
  person:   '#00c853',
  industry: '#ffb300',
};

export const EDGE_COLORS: Record<EdgeDatum['kind'], string> = {
  agency: 'rgba(0, 68, 255, 0.55)',
  collab: 'rgba(0, 200, 83, 0.55)',
};

export function sizeForRichness(r: number, kind: NodeKind): number {
  const base = { project: 3, agency: 3, person: 2, industry: 3 }[kind];
  return base + Math.sqrt((r ?? 0) / 180);
}

export async function fetchGraph(): Promise<Graph> {
  const res = await fetch('/graph.json');
  if (!res.ok) throw new Error(`graph.json: ${res.status}`);
  return (await res.json()) as Graph;
}
