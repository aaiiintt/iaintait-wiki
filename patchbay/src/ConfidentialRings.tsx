/**
 * ConfidentialRings — SVG overlay that draws dashed red rings around
 * confidential project nodes in the Cosmograph canvas.
 *
 * Cosmograph renders in WebGL which doesn't support dashed strokes natively.
 * This component positions an SVG absolutely over the canvas and reads node
 * screen positions from the Cosmograph ref to draw dashed circles on top.
 */
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { CosmographRef } from '@cosmograph/react';
import type { EdgeDatum, NodeDatum } from './graph';

interface Props {
  cosmographRef: RefObject<CosmographRef<NodeDatum, EdgeDatum> | undefined>;
  nodes: NodeDatum[];
  /** Call this to trigger a ring position refresh (e.g. on sim tick or resize) */
  version: number;
}

interface Ring {
  x: number;
  y: number;
  r: number;
}

const RING_COLOUR = '#ff2a00';
const STROKE_WIDTH = 1.8;
const DASH = '4 3';

export function ConfidentialRings({ cosmographRef, nodes, version }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [rings, setRings] = useState<Ring[]>([]);

  const confidentialIds = nodes
    .filter((n) => n.confidential)
    .map((n) => n.id);

  useEffect(() => {
    const cg = cosmographRef.current;
    const svg = svgRef.current;
    if (!cg || !svg || confidentialIds.length === 0) {
      setRings([]);
      return;
    }

    const rect = svg.getBoundingClientRect();
    const next: Ring[] = [];

    for (const id of confidentialIds) {
      try {
        // getNodeScreenPosition returns [x, y] in screen coords.
        const pos = cg.getNodeScreenPosition?.(id);
        if (!pos) continue;
        const [sx, sy] = pos;
        // Convert screen → SVG local coords.
        const x = sx - rect.left;
        const y = sy - rect.top;
        // Match the node's rendered radius — confidential nodes have richness=30,
        // so sizeForRichness(30, 'project') ≈ 3.41 in graph units. Cosmograph
        // maps that to ~6–8 CSS px depending on zoom; 7px is a safe default.
        next.push({ x, y, r: 8 });
      } catch {
        // node not in current view — skip
      }
    }

    setRings(next);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version, confidentialIds.join(',')]);

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      {rings.map((ring, i) => (
        <circle
          key={i}
          cx={ring.x}
          cy={ring.y}
          r={ring.r}
          fill="none"
          stroke={RING_COLOUR}
          strokeWidth={STROKE_WIDTH}
          strokeDasharray={DASH}
        />
      ))}
    </svg>
  );
}
