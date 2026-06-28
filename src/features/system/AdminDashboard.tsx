import React, { useEffect, useState } from "react";
import { marked } from "marked";

interface AgentRoute {
  id: number;
  keyphrase: string;
  simulatedStepsJson: string;
  agentResponseMarkdown: string;
  targetProjectSlug?: string | null;
}

interface DiagnosticsData {
  stats: {
    totalNodes: number;
    totalEdges: number;
    totalTonePrompts: number;
  };
  issues: {
    orphans: Array<{ id: string; title: string; kind: string }>;
    deadLinks: Array<{ edgeId: number; source: string; target: string; kind: string }>;
  };
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"tone" | "sync" | "diagnostics">("tone");
  
  // Sync States
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  // Diagnostics States
  const [diagData, setDiagData] = useState<DiagnosticsData | null>(null);
  const [loadingDiag, setLoadingDiag] = useState(false);

  // Tone Playground States
  const [routes, setRoutes] = useState<AgentRoute[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [keyphrase, setKeyphrase] = useState("");
  const [stepsJson, setStepsJson] = useState("");
  const [responseMarkdown, setResponseMarkdown] = useState("");
  const [targetSlug, setTargetSlug] = useState("");
  const [savingTone, setSavingTone] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Initial loads
  useEffect(() => {
    loadToneRoutes();
    loadDiagnostics();
  }, []);

  async function loadToneRoutes() {
    try {
      const res = await fetch("/api/system/tone");
      if (res.ok) {
        const data = await res.json();
        setRoutes(data);
        if (data.length > 0 && selectedRouteId === null) {
          selectRoute(data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load tone routes:", err);
    }
  }

  async function loadDiagnostics() {
    setLoadingDiag(true);
    try {
      const res = await fetch("/api/system/diagnostics");
      if (res.ok) {
        const data = await res.json();
        setDiagData(data);
      }
    } catch (err) {
      console.error("Failed to load diagnostics:", err);
    } finally {
      setLoadingDiag(false);
    }
  }

  const selectRoute = (route: AgentRoute) => {
    setSelectedRouteId(route.id);
    setKeyphrase(route.keyphrase);
    setStepsJson(route.simulatedStepsJson);
    setResponseMarkdown(route.agentResponseMarkdown);
    setTargetSlug(route.targetProjectSlug || "");
    setSaveMsg(null);
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    const r = routes.find((route) => route.id === id);
    if (r) selectRoute(r);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/system/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncMsg("Obsidian files parsed & SQLite database re-synced successfully!");
        loadDiagnostics();
        loadToneRoutes();
      } else {
        throw new Error(data.error || "Sync error");
      }
    } catch (err: any) {
      setSyncMsg(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveTone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRouteId) return;
    setSavingTone(true);
    setSaveMsg(null);

    // Validate Steps JSON
    try {
      JSON.parse(stepsJson);
    } catch (err) {
      setSaveMsg("Error: Invalid JSON syntax in simulated steps.");
      setSavingTone(false);
      return;
    }

    try {
      const res = await fetch("/api/system/tone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedRouteId,
          keyphrase,
          simulatedStepsJson: stepsJson,
          agentResponseMarkdown: responseMarkdown,
          targetProjectSlug: targetSlug,
        }),
      });

      if (res.ok) {
        setSaveMsg("Agent tone updated and committed to SQLite!");
        // Refresh local memory list
        setRoutes((prev) =>
          prev.map((r) =>
            r.id === selectedRouteId
              ? {
                  ...r,
                  keyphrase,
                  simulatedStepsJson: stepsJson,
                  agentResponseMarkdown: responseMarkdown,
                  targetProjectSlug: targetSlug || null,
                }
              : r
          )
        );
      } else {
        throw new Error("Failed to write to database");
      }
    } catch (err: any) {
      setSaveMsg(`Save failed: ${err.message}`);
    } finally {
      setSavingTone(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-[#111111] font-sans flex flex-col">
      {/* Header (Fastidious pixel-grid style) */}
      <header className="border-b border-[#EAEAEA] py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-mono text-sm bg-[#111111] text-white px-2 py-0.5 select-none">SYSTEM</span>
          <h1 className="text-sm font-bold tracking-wider font-mono">CORE DIAGNOSTICS & PLAYGROUND</h1>
        </div>
        <a href="/" className="font-mono text-xs hover:underline">← Exit System Console</a>
      </header>

      {/* Tabs */}
      <div className="border-b border-[#EAEAEA] bg-gray-50 flex">
        <button
          onClick={() => setActiveTab("tone")}
          className={`px-6 py-3 font-mono text-xs border-r border-[#EAEAEA] transition-all hover:bg-white ${
            activeTab === "tone" ? "bg-white font-bold border-b-2 border-b-[#111111]" : "text-gray-500"
          }`}
        >
          // Agent Tone Playground
        </button>
        <button
          onClick={() => setActiveTab("sync")}
          className={`px-6 py-3 font-mono text-xs border-r border-[#EAEAEA] transition-all hover:bg-white ${
            activeTab === "sync" ? "bg-white font-bold border-b-2 border-b-[#111111]" : "text-gray-500"
          }`}
        >
          // Obsidian DB Sync
        </button>
        <button
          onClick={() => setActiveTab("diagnostics")}
          className={`px-6 py-3 font-mono text-xs border-r border-[#EAEAEA] transition-all hover:bg-white ${
            activeTab === "diagnostics" ? "bg-white font-bold border-b-2 border-b-[#111111]" : "text-gray-500"
          }`}
        >
          // Graph Diagnostics ({diagData?.issues.orphans.length || 0} issues)
        </button>
      </div>

      <div className="flex-1 p-6 md:p-10 max-w-7xl mx-full w-full">
        {/* TONE TAB */}
        {activeTab === "tone" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Editor form */}
            <div className="flex flex-col gap-6">
              <div className="border border-[#EAEAEA] p-5">
                <h3 className="font-mono text-xs font-bold mb-4 uppercase text-gray-500">// select agent route intent</h3>
                <select
                  value={selectedRouteId || ""}
                  onChange={handleSelectChange}
                  className="w-full text-xs font-mono border border-[#EAEAEA] p-2 bg-white"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      Intent keyword: "{r.keyphrase}"
                    </option>
                  ))}
                </select>
              </div>

              {selectedRouteId && (
                <form onSubmit={handleSaveTone} className="flex flex-col gap-5 border border-[#111111] p-6 bg-white">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[10px] text-gray-500 uppercase">Trigger Keyphrase</label>
                    <input
                      type="text"
                      value={keyphrase}
                      onChange={(e) => setKeyphrase(e.target.value)}
                      className="border border-[#EAEAEA] text-xs font-mono p-2"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[10px] text-gray-500 uppercase">Target Project Slug (Optional)</label>
                    <input
                      type="text"
                      value={targetSlug}
                      onChange={(e) => setTargetSlug(e.target.value)}
                      className="border border-[#EAEAEA] text-xs font-mono p-2"
                      placeholder="e.g. google_racer"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[10px] text-gray-500 uppercase">Simulated Terminal Actions (JSON Array)</label>
                    <textarea
                      value={stepsJson}
                      onChange={(e) => setStepsJson(e.target.value)}
                      rows={5}
                      className="border border-[#EAEAEA] text-xs font-mono p-2 leading-relaxed bg-[#FAFAFA]"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[10px] text-gray-500 uppercase">Agent Response Copy (Markdown)</label>
                    <textarea
                      value={responseMarkdown}
                      onChange={(e) => setResponseMarkdown(e.target.value)}
                      rows={12}
                      className="border border-[#EAEAEA] text-xs font-mono p-2 leading-relaxed bg-[#FAFAFA]"
                      required
                    />
                  </div>

                  {saveMsg && (
                    <div className="font-mono text-xs p-3 bg-gray-50 border border-[#EAEAEA] text-[#111111] select-none">
                      {saveMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={savingTone}
                    className="bg-[#111111] hover:bg-gray-800 text-white font-mono text-xs uppercase py-3 disabled:bg-gray-300"
                  >
                    {savingTone ? "Writing records..." : "Commit Tone Update"}
                  </button>
                </form>
              )}
            </div>

            {/* Live preview */}
            <div className="flex flex-col gap-4 border border-[#EAEAEA] p-6 bg-gray-50">
              <h3 className="font-mono text-xs font-bold text-gray-500 uppercase border-b border-[#EAEAEA] pb-3 mb-2">
                // Live UI Presentation Preview
              </h3>

              {/* Mock Terminal Output */}
              <div className="border border-[#111111] bg-[#111111] text-[#A6E22E] p-4 font-mono text-xs select-none">
                <div className="text-gray-500 border-b border-gray-800 pb-1 mb-2">CONSOLE: Interrogation Logs</div>
                {(() => {
                  try {
                    const stepsObj = JSON.parse(stepsJson);
                    const acts = Array.isArray(stepsObj) ? stepsObj : stepsObj.actions || [];
                    return acts.map((s: any, idx: number) => (
                      <div key={idx} className="mb-1 flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">▶</span>
                          <span className="text-white font-semibold">{s.step}</span>
                          {s.status && (
                            <span className={s.status === "FAILED" ? "text-red-500" : "text-green-500"}>
                              [{s.status}]
                            </span>
                          )}
                        </div>
                        {s.command && <div className="pl-6 text-gray-400">$ {s.command}</div>}
                        {s.query && <div className="pl-6 text-gray-400">SQL: {s.query}</div>}
                        {s.records_found !== undefined && (
                          <div className="pl-6 text-blue-400">Records: {s.records_found}</div>
                        )}
                        {s.records && <div className="pl-6 text-blue-400">Matches: [{s.records.join(", ")}]</div>}
                      </div>
                    ));
                  } catch {
                    return <div className="text-red-500">// Invalid JSON structure inside Simulated steps</div>;
                  }
                })()}
              </div>

              {/* Agent Witty Card rendering */}
              <div className="border border-[#EAEAEA] p-6 bg-white flex flex-col gap-4">
                <div
                  className="prose prose-sm text-gray-800 text-xs md:text-sm"
                  dangerouslySetInnerHTML={{ __html: marked.parse(responseMarkdown || "") }}
                />
                {targetSlug && (
                  <button className="font-mono text-xs border border-[#111111] text-center py-2 bg-white pointer-events-none opacity-60 select-none">
                    Examine record: {targetSlug}.md
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SYNC TAB */}
        {activeTab === "sync" && (
          <div className="max-w-xl border border-[#111111] p-8 bg-white flex flex-col gap-6">
            <h3 className="font-mono text-xs font-bold text-gray-500 uppercase border-b border-[#EAEAEA] pb-3">
              // Obsidian File Ingestion Sync
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              This action walks your local career archive markdown directories (projects, collaborators, agencies, industry), parses their properties and references, maps their relational links, and fully repopulates your SQLite database.
            </p>
            {syncMsg && (
              <div className="font-mono text-xs p-4 bg-gray-50 border border-[#EAEAEA] text-[#111111] select-none">
                {syncMsg}
              </div>
            )}
            <button
              onClick={handleSync}
              disabled={syncing}
              className="bg-[#111111] hover:bg-gray-800 text-white font-mono text-xs uppercase py-4 disabled:bg-gray-300 transition-all select-none"
            >
              {syncing ? "Parsing Obsidian Vault..." : "Trigger Manual DB Sync"}
            </button>
          </div>
        )}

        {/* DIAGNOSTICS TAB */}
        {activeTab === "diagnostics" && (
          <div className="flex flex-col gap-8">
            {/* Stats grid */}
            {diagData && (
              <div className="grid grid-cols-3 border border-[#EAEAEA] bg-gray-50 divide-x divide-[#EAEAEA]">
                <div className="p-6 text-center">
                  <div className="text-2xl font-bold tracking-tight">{diagData.stats.totalNodes}</div>
                  <div className="font-mono text-[10px] text-gray-500 uppercase mt-1">Total Nodes</div>
                </div>
                <div className="p-6 text-center">
                  <div className="text-2xl font-bold tracking-tight">{diagData.stats.totalEdges}</div>
                  <div className="font-mono text-[10px] text-gray-500 uppercase mt-1">Total Edges</div>
                </div>
                <div className="p-6 text-center">
                  <div className="text-2xl font-bold tracking-tight">{diagData.stats.totalTonePrompts}</div>
                  <div className="font-mono text-[10px] text-gray-500 uppercase mt-1">Agent Routes</div>
                </div>
              </div>
            )}

            {loadingDiag ? (
              <div className="font-mono text-xs text-gray-400 py-8 animate-pulse">Running graph query linters...</div>
            ) : diagData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Orphans */}
                <div className="border border-[#EAEAEA] p-6 bg-white flex flex-col">
                  <h3 className="font-mono text-xs font-bold text-gray-500 uppercase border-b border-[#EAEAEA] pb-3 mb-4 flex items-center justify-between">
                    <span>Orphan Nodes (No Connections)</span>
                    <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px]">
                      {diagData.issues.orphans.length}
                    </span>
                  </h3>
                  {diagData.issues.orphans.length === 0 ? (
                    <div className="text-xs font-mono text-gray-400 select-none">No orphan nodes found. Graph is completely interconnected!</div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto flex flex-col gap-2">
                      {diagData.issues.orphans.map((node) => (
                        <div key={node.id} className="p-3 border border-gray-100 text-xs">
                          <span className="font-mono text-[9px] uppercase bg-gray-50 text-gray-400 px-1.5 py-0.5 mr-2">
                            {node.kind}
                          </span>
                          <span className="font-semibold text-gray-900">{node.title}</span>
                          <span className="font-mono text-gray-400 ml-2">({node.id})</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dead links */}
                <div className="border border-[#EAEAEA] p-6 bg-white flex flex-col">
                  <h3 className="font-mono text-xs font-bold text-gray-500 uppercase border-b border-[#EAEAEA] pb-3 mb-4 flex items-center justify-between">
                    <span>Dead Link References (Orphaned Edges)</span>
                    <span className="bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded text-[10px]">
                      {diagData.issues.deadLinks.length}
                    </span>
                  </h3>
                  {diagData.issues.deadLinks.length === 0 ? (
                    <div className="text-xs font-mono text-gray-400 select-none">No dead links found. All Obsidian paths are verified!</div>
                  ) : (
                    <div className="max-h-96 overflow-y-auto flex flex-col gap-2">
                      {diagData.issues.deadLinks.map((edge) => (
                        <div key={edge.edgeId} className="p-3 border border-red-50 text-xs flex flex-col gap-1">
                          <div className="font-mono text-[9px] uppercase text-red-500">Broken Relation: {edge.kind}</div>
                          <div className="flex flex-wrap gap-1 items-center">
                            <span className="font-semibold text-gray-700">{edge.source}</span>
                            <span className="text-gray-400">→</span>
                            <span className="font-semibold text-red-600 underline">{edge.target}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
