import { useEffect, useMemo, useRef, useState } from 'react';
import { Cosmograph, type CosmographRef } from '@cosmograph/react';
import { COLORS, EDGE_COLORS, fetchGraph, sizeForRichness, type EdgeDatum, type Graph, type NodeDatum, type NodeKind } from './graph';
import { PopCard } from './PopCard';
import { ConfidentialRings } from './ConfidentialRings';
import { TelemetryLog } from './components/TelemetryLog';
import { useTelemetry } from './telemetry';

const IAIN_ID = 'person:iain_tait';

export function Patchbay() {
  const ref = useRef<CosmographRef<NodeDatum, EdgeDatum>>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [graph, setGraph] = useState<Graph | null>(null);
  const [selected, setSelected] = useState<NodeDatum | null>(null);
  const [query, setQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window === 'undefined' ? true : window.innerWidth >= 800
  );
  const [enabled, setEnabled] = useState<Record<NodeKind, boolean>>({
    project: true,
    agency: true,
    industry: true,
    person: false,
  });
  const telemetry = useTelemetry();

  const view = useMemo(() => {
    if (!graph) return null;

    // Iain is the centre of the universe — always present, never filtered.
    const visible = new Set<string>();
    for (const n of graph.nodes) {
      if (!enabled[n.kind]) continue;
      // For people, only include those with a real profile file.
      if (n.kind === 'person' && !n.hasProfile) continue;
      visible.add(n.id);
    }
    visible.add(IAIN_ID);

    const nodes = graph.nodes.filter((n) => visible.has(n.id));

    // Adjacency over the *original* graph so we can bridge through hidden nodes.
    const adj = new Map<string, Set<string>>();
    for (const e of graph.edges) {
      if (!adj.has(e.source)) adj.set(e.source, new Set());
      if (!adj.has(e.target)) adj.set(e.target, new Set());
      adj.get(e.source)!.add(e.target);
      adj.get(e.target)!.add(e.source);
    }

    const edges: EdgeDatum[] = [];
    const seen = new Set<string>();
    const addEdge = (a: string, b: string, kind: EdgeDatum['kind']) => {
      if (a === b) return;
      const k = a < b ? `${a}|${b}|${kind}` : `${b}|${a}|${kind}`;
      if (seen.has(k)) return;
      seen.add(k);
      edges.push({ source: a, target: b, kind });
    };

    // 1. Pass-through edges where both endpoints are visible.
    for (const e of graph.edges) {
      if (visible.has(e.source) && visible.has(e.target)) {
        addEdge(e.source, e.target, e.kind);
      }
    }
    // 2. Bridge edges through every hidden node — if A — hidden — B, connect A↔B.
    //    This is what makes "people only" turn into a real social graph: people
    //    who shared a (now-hidden) project become directly linked.
    for (const n of graph.nodes) {
      if (visible.has(n.id)) continue;
      const neigh = [...(adj.get(n.id) || [])].filter((id) => visible.has(id));
      for (let i = 0; i < neigh.length; i++) {
        for (let j = i + 1; j < neigh.length; j++) {
          addEdge(neigh[i], neigh[j], 'collab');
        }
      }
    }
    return { nodes, edges };
  }, [graph, enabled]);

  const toggle = (k: NodeKind) => {
    setEnabled((prev) => {
      const next = { ...prev, [k]: !prev[k] };
      telemetry.log('VIEW', `${k} ${next[k] ? 'on' : 'off'}`);
      return next;
    });
  };

  useEffect(() => {
    fetchGraph()
      .then((g) => {
        setGraph(g);
        const counts = g.nodes.reduce<Record<string, number>>((a, n) => {
          a[n.kind] = (a[n.kind] || 0) + 1;
          return a;
        }, {});
        telemetry.log(
          'LOAD',
          `${g.nodes.length} nodes (${Object.entries(counts).map(([k, v]) => `${v} ${k}`).join(', ')}), ${g.edges.length} edges`
        );
      })
      .catch((e) => telemetry.log('ERROR', String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reframe whenever the visible set changes. We do an early fit (so the user
  // sees something centered immediately) plus a late fit after the simulation
  // has had time to actually settle — without the late fit the cluster drifts.
  useEffect(() => {
    const cg = ref.current;
    if (!cg || !view) return;
    const refit = () => { try { cg.fitView(600); } catch { /* noop */ } };
    // Early fit so the user sees something centred immediately, then a late
    // fit after the simulation has actually settled.
    const t1 = setTimeout(refit, 400);
    const t2 = setTimeout(refit, 1800);
    const t3 = setTimeout(refit, 3500);
    const t4 = setTimeout(refit, 6000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [view]);

  useEffect(() => {
    const cg = ref.current;
    if (!cg || !graph) return;
    const q = query.trim().toLowerCase();
    if (!q) {
      cg.unselectNodes();
      return;
    }
    const matched = graph.nodes.filter(
      (n) => n.title.toLowerCase().includes(q) || (n.desc ?? '').toLowerCase().includes(q)
    );
    cg.selectNodes(matched);
    telemetry.log('SEARCH', `"${query}" → ${matched.length}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, graph]);

  const [pendingNavigate, setPendingNavigate] = useState<NodeDatum | null>(null);
  // Incremented to trigger ring position refresh after sim ticks or resizes.
  const [ringVersion, setRingVersion] = useState(0);

  const selectNode = (node: NodeDatum | undefined) => {
    const cg = ref.current;
    if (!node || !graph || !cg) {
      setSelected(null);
      return;
    }
    setSelected(node);
    telemetry.log('SELECT', node.title);
    // If the target's category is currently filtered out, switch it on first
    // and defer the actual pan/zoom until the view re-renders with that node
    // present. Iain is always visible regardless of toggle state.
    if (!enabled[node.kind] && node.id !== IAIN_ID) {
      setEnabled((prev) => ({ ...prev, [node.kind]: true }));
      setPendingNavigate(node);
      telemetry.log('VIEW', `${node.kind} on (auto)`);
      return;
    }
    try {
      const adj = cg.getAdjacentNodes?.(node.id) ?? [];
      const ids = [node.id, ...adj.map((n) => (n as NodeDatum).id)];
      cg.fitViewByNodeIds(ids, 500);
      cg.focusNode?.(node);
    } catch { /* noop */ }
  };

  // When a chip click forced a category on, finish the navigation as soon as
  // the new view contains the target node.
  useEffect(() => {
    if (!pendingNavigate || !view) return;
    const present = view.nodes.some((n) => n.id === pendingNavigate.id);
    if (!present) return;
    const cg = ref.current;
    if (!cg) return;
    // Cosmograph needs a tick to register the new nodes in its internal store.
    const t = setTimeout(() => {
      try {
        const adj = cg.getAdjacentNodes?.(pendingNavigate.id) ?? [];
        const ids = [pendingNavigate.id, ...adj.map((n) => (n as NodeDatum).id)];
        cg.fitViewByNodeIds(ids, 500);
        cg.focusNode?.(pendingNavigate);
      } catch { /* noop */ }
      setPendingNavigate(null);
    }, 120);
    return () => clearTimeout(t);
  }, [view, pendingNavigate]);


  if (!graph || !view) return null;

  return (
    <main className="app">
      <section id="viz-container" ref={containerRef}>
        <div className={`cg-stage ${selected ? 'shifted' : ''}`}>
        <Cosmograph
          ref={ref}
          nodes={view.nodes}
          links={view.edges}
          nodeLabelAccessor={(n) => n.title}
          hoveredNodeLabelClassName="cg-label"
          nodeLabelClassName="cg-label"
          nodeColor={(n) => {
            if (n.id === IAIN_ID) return '#000';
            if (n.confidential) return '#ffffff';
            return COLORS[n.kind];
          }}
          nodeSize={(n) =>
            n.id === IAIN_ID ? 7 : sizeForRichness(n.richness ?? 0, n.kind)
          }
          linkColor={(e) => EDGE_COLORS[e.kind] ?? '#888'}
          linkWidth={1.4}
          backgroundColor="#f4f1ec"
          nodeGreyoutOpacity={0.08}
          linkGreyoutOpacity={0.05}
          showDynamicLabels={false}
          showHoveredNodeLabel
          showLabelsFor={selected ? [selected] : []}
          simulationGravity={0.15}
          simulationRepulsion={1.2}
          simulationFriction={0.85}
          simulationLinkSpring={1.0}
          simulationLinkDistance={8}
          simulationDecay={1500}
          fitViewOnInit
          onClick={selectNode}
          onNodeMouseOver={(node) => {
            if (node) telemetry.log('HOVER', node.title);
          }}
          onSimulationEnd={() => setRingVersion((v) => v + 1)}
        />
        <ConfidentialRings
          cosmographRef={ref}
          nodes={view.nodes}
          version={ringVersion}
        />
        </div>
        <div className="toolbar">
          <input
            className="search"
            placeholder="search the archive…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {selected && (
          <PopCard
            node={selected}
            graph={graph}
            onSelect={selectNode}
            onClose={() => {
              setSelected(null);
              try { ref.current?.focusNode?.(undefined); } catch { /* noop */ }
            }}
          />
        )}
      </section>
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen((o) => !o)}
        aria-label="toggle panel"
      >
        {sidebarOpen ? '×' : '≡'}
      </button>
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="filter-panel">
          <div className="filter-label">show</div>
          {(['project', 'agency', 'industry', 'person'] as NodeKind[]).map((k) => (
            <label key={k} className={`filter-row ${enabled[k] ? 'on' : ''}`}>
              <span className="swatch" style={{ background: COLORS[k] }} />
              <span className="filter-name">{
                k === 'person' ? 'people'
                  : k === 'agency' ? 'agencies'
                  : k === 'industry' ? 'industry'
                  : 'projects'
              }</span>
              <input
                type="checkbox"
                checked={enabled[k]}
                onChange={() => toggle(k)}
              />
            </label>
          ))}
        </div>
        <TelemetryLog log={telemetry.entries} />
      </aside>
    </main>
  );
}
