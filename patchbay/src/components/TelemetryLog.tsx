import { useEffect, useRef } from 'react';
import type { TelemetryEntry } from '../telemetry';
export { useTelemetry } from '../telemetry';

export function TelemetryLog({ log }: { log: TelemetryEntry[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [log]);
  return (
    <section id="telemetry-section">
      <div className="telemetry-header">
        <span className="label txt-meta">MCP PROTOCOL / TELEMETRY</span>
        <span className="version txt-meta">V.2026</span>
      </div>
      <div id="telemetry-log" ref={ref}>
        {log.slice(-5).map((e, i) => (
          <div className="telemetry-row" key={i}>
            <span className="ts">[{e.ts}]</span>{' '}
            <span className="action">{e.action}</span>{' '}
            <span className="data">&gt; {e.data}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
