import { useEffect, useMemo } from 'react';
import { marked } from 'marked';
import type { Graph, NodeDatum } from './graph';

interface Props {
  node: NodeDatum;
  graph: Graph;
  onClose: () => void;
  onSelect: (node: NodeDatum) => void;
}

// Strip the ## Collaborators and ## References & Media sections — those
// are surfaced separately as chips / source link below.
function trimBody(md: string): string {
  return md
    .replace(/\n##\s+Collaborators[\s\S]*?(?=\n##\s+|$)/g, '\n')
    // Rewrite wiki-relative asset paths to the dev server's symlinked mounts.
    // patchbay/public/wiki-media → ../../raw/media (and likewise wiki-assets).
    .replace(/\.\.\/raw\/media\//g, '/wiki-media/')
    .replace(/\.\.\/raw\/assets\//g, '/wiki-assets/')
    .trim();
}

export function PopCard({ node, graph, onClose, onSelect }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const html = useMemo(() => {
    if (!node.body) return '';
    return marked.parse(trimBody(node.body), { async: false }) as string;
  }, [node.body]);

  // Find connected nodes for chips.
  const connected = graph.edges
    .filter((e) => e.source === node.id || e.target === node.id)
    .map((e) => (e.source === node.id ? e.target : e.source));
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const chips = connected
    .map((id) => byId.get(id))
    .filter((n): n is NodeDatum => !!n);

  return (
    <>
      <div
        className="popcard popcard-docked"
        key={node.id}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="popcard-head">
          <div className={`popcard-kind kind-${node.kind}`}>{node.kind}</div>
          <h2 className="popcard-title">{node.title}</h2>
          {(node.year || node.client || node.role) && (
            <div className="popcard-meta">
              {node.year && <span>{node.year}</span>}
              {node.client && <span>· {node.client}</span>}
              {node.role && <span>{node.role}</span>}
            </div>
          )}
          <button className="popcard-close" onClick={onClose} aria-label="close">×</button>
        </header>

        <div className="popcard-scroll">
          {html ? (
            <div className="popcard-body" dangerouslySetInnerHTML={{ __html: html }} />
          ) : node.desc ? (
            <p className="popcard-desc">{node.desc}</p>
          ) : null}

          {chips.length > 0 && (
            <>
              <div className="popcard-section-label">Connected</div>
              <div className="popcard-chips">
                {chips.slice(0, 40).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`chip chip-${c.kind}`}
                    onClick={() => onSelect(c)}
                  >
                    {c.title}
                  </button>
                ))}
                {chips.length > 40 && (
                  <span className="chip chip-more">+{chips.length - 40}</span>
                )}
              </div>
            </>
          )}
        </div>

        {node.sourceUrls && node.sourceUrls.length > 0 && (
          <footer className="popcard-foot">
            <a className="popcard-link" href={node.sourceUrls[0]} target="_blank" rel="noreferrer">
              open source ↗
            </a>
          </footer>
        )}
      </div>
    </>
  );
}
