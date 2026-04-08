import { useCallback, useState } from 'react';

export interface TelemetryEntry {
  ts: string;
  action: string;
  data: string;
}

export interface Telemetry {
  entries: TelemetryEntry[];
  log: (action: string, data: string) => void;
}

export function useTelemetry(): Telemetry {
  const [entries, setEntries] = useState<TelemetryEntry[]>([]);
  const log = useCallback((action: string, data: string) => {
    const ts = new Date().toISOString().substring(11, 23);
    setEntries((es) => [...es, { ts, action, data }].slice(-200));
  }, []);
  return { entries, log };
}
