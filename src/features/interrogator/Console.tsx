import React, { useState, useEffect, useRef } from "react";
import { marked } from "marked";
import { Command } from "cmdk";

interface ActionStep {
  step: string;
  command?: string;
  query?: string;
  status?: string;
  records_found?: number;
  records?: string[];
}

interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

interface SimulatedLogs {
  system: string;
  actions: ActionStep[];
}

interface SearchResponse {
  query: string;
  type: string;
  terminalLogs: SimulatedLogs;
  agentResponse: string;
  targetProjectSlug?: string;
  wikiResults?: Array<{
    id: string;
    title: string;
    kind: string;
    year?: number | null;
    desc?: string | null;
    slug?: string | null;
  }>;
  tokenUsage?: TokenUsage;
  suggestedQuestions?: string[];
}

interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  timestamp: Date;
  terminalLogs?: SimulatedLogs;
  tokenUsage?: TokenUsage;
  suggestedQuestions?: string[];
}

interface ConsoleProps {
  onSelectNode: (id: string) => void;
}

function getDbIdFromHref(href: string): string | null {
  try {
    const url = new URL(href);
    const pathname = url.pathname;
    const parts = pathname.split("/").filter(Boolean);

    const kindMap = {
      projects: "project",
      collaborators: "person",
      agencies: "agency",
      industry: "industry"
    };

    const kindFolderIdx = parts.findIndex(p => p in kindMap);
    if (kindFolderIdx !== -1) {
      const folder = parts[kindFolderIdx] as keyof typeof kindMap;
      const kind = kindMap[folder];
      const slugParts = parts.slice(kindFolderIdx + 1);
      const slug = slugParts.join("/").replace(".md", "");
      return `${kind}:${slug}`;
    }
  } catch (err) {
    const kindMap = {
      projects: "project",
      collaborators: "person",
      agencies: "agency",
      industry: "industry"
    };
    for (const folder of Object.keys(kindMap) as Array<keyof typeof kindMap>) {
      if (href.includes(`/${folder}/`)) {
        const parts = href.split(`/${folder}/`);
        const filename = parts[parts.length - 1] || "";
        const slug = filename.replace(".md", "");
        return `${kindMap[folder]}:${slug}`;
      }
    }
  }
  return null;
}

const DEFAULT_SUGGESTIONS = [
  "Tell me about the most awarded project in the archive.",
  "What is FOOD's philosophy on emerging technology and AI?",
  "Write a limerick about Iain's Shoreditch basement era."
];

export default function Console({ onSelectNode }: ConsoleProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "agent",
      text: `Welcome to the Iain Tait career archive—a knowledge base spanning 25 years of [digital innovation](file:///digital_innovation.md), [creative campaigns](file:///creative_campaigns.md), [patents](file:///patents.md), and leadership at [POKE](file:///agencies/poke_london.md), [W+K](file:///wieden_and_kennedy.md), [Google](file:///agencies/google_creative_lab.md), and [FOOD](file:///agencies/food.md).

Want to use this data elsewhere? You can connect this database directly to your own local AI agent (like Claude Desktop or Cursor). Check the [MCP Server Connection Guide](file:///industry/mcp.md) to set it up for real-time queries.

To get started, run a command, ask a question, or select a topic below.`,
      timestamp: new Date(),
    }
  ]);
  const [loading, setLoading] = useState(false);
  const [activeLogs, setActiveLogs] = useState<SimulatedLogs | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [sessionStats, setSessionStats] = useState({
    input: 0,
    output: 0,
    total: 0,
    cost: 0
  });

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [autocompleteResults, setAutocompleteResults] = useState<any[]>([]);

  // Toggle the menu when ⌘K or / is pressed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || e.key === "/") {
        if (e.key === "/") {
          if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
            return;
          }
        }
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Debounced fetch for autocomplete
  useEffect(() => {
    if (!search.trim()) {
      setAutocompleteResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/autocomplete?q=${encodeURIComponent(search)}`);
        if (res.ok) {
          const data = await res.json();
          setAutocompleteResults(data.results || []);
        }
      } catch (e) {
        console.error("Autocomplete fetch failed:", e);
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [search]);

  const executeCommand = (query: string, text?: string) => {
    setOpen(false);
    setSearch("");
    
    if (query === "Connect to MCP") {
      const userMsg: Message = {
        id: `user-${Date.now()}`,
        sender: "user",
        text: "Connect to MCP",
        timestamp: new Date()
      };
      const agentMsg: Message = {
        id: `agent-${Date.now()}`,
        sender: "agent",
        text: "To connect your own AI tools directly to this knowledge base, please see the [MCP Server Connection Guide](file:///industry/mcp.md) for simple, step-by-step instructions on how to connect to the server.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, userMsg, agentMsg]);
      return;
    }

    handleSearch(query, text);
  };

  // Auto-scroll new content to top under the sticky query bar
  useEffect(() => {
    if (messages.length > 1 || loading) {
      scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [messages, loading]);

  async function handleSearch(q: string, displayText?: string) {
    if (!q.trim() || loading) return;

    // 1. Add User Message (use displayText for clean rendering if provided, e.g. from links)
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: displayText || q,
      timestamp: new Date()
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setActiveLogs(null);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data: SearchResponse = await res.json();
        
        // Set loading logs temporarily to show "thinking" tool execution
        if (data.terminalLogs) {
          setActiveLogs(data.terminalLogs);
        }

        const usage = data.tokenUsage || { input: 0, output: 0, total: 0 };
        const currentCost = (usage.input * 0.000000075) + (usage.output * 0.000000300);

        setSessionStats((prev) => ({
          input: prev.input + usage.input,
          output: prev.output + usage.output,
          total: prev.total + usage.total,
          cost: prev.cost + currentCost
        }));

        // Add Agent Response
        const agentMsg: Message = {
          id: `agent-${Date.now()}`,
          sender: "agent",
          text: data.agentResponse,
          timestamp: new Date(),
          terminalLogs: data.terminalLogs,
          tokenUsage: usage,
          suggestedQuestions: data.suggestedQuestions
        };
        
        // Small delay to simulate active tool traversal and model synthesis
        setTimeout(() => {
          setMessages((prev) => [...prev, agentMsg]);
          setLoading(false);
          setActiveLogs(null);
        }, 1200);
      } else {
        throw new Error("API Connection error");
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: "agent",
          text: `> **Agent:** "Connection to the Vertex AI agent has collapsed. Please re-run the transaction."`,
          timestamp: new Date()
        }
      ]);
      setLoading(false);
    }
  }

  // Removed old form handleSubmit since we use executeCommand from cmdk

  // Intercept local Markdown links inside chat bubbles to drive conversational search
  const handleContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const anchor = target.closest("a");
    if (anchor) {
      const href = anchor.getAttribute("href");
      if (href && href.startsWith("file:///")) {
        e.preventDefault();
        const dbId = getDbIdFromHref(href);
        const text = anchor.innerText || anchor.textContent || "View details";
        
        if (dbId) {
          handleSearch(dbId, text);
        } else {
          // Fallback to old slug extraction
          const parts = href.split("/");
          const filename = parts[parts.length - 1] || "";
          const slug = filename.replace(".md", "");
          
          // Convert underscore slug back into a clean readable query
          const queryTerm = slug
            .replace(/_/g, " ")
            .replace("wk ", "")
            .replace("poke ", "")
            .replace("food ", "");
          
          handleSearch(queryTerm, text);
        }
      }
    }
  };

  // Configure marked custom renderer for the inline agent outputs
  const renderer = new marked.Renderer();
  
  renderer.heading = ({ text }) => {
    // Parse markdown links in headings to render them as clean, clickable anchors rather than raw text
    let processedText = text;
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    processedText = processedText.replace(linkRegex, (match, linkText, href) => {
      return `<a href="${href}" class="underline hover:text-gray-600 font-bold">${linkText}</a>`;
    });
    return `<h4 class="font-mono text-xs font-bold text-gray-900 mt-4 mb-2">// ${processedText}</h4>`;
  };

  renderer.image = ({ href, title, text }) => {
    let cleanHref = href;
    // Route local media paths relative to the Hono static media server
    if (cleanHref.includes("raw/media/")) {
      const parts = cleanHref.split("raw/media/");
      cleanHref = `http://localhost:8787/wiki-media/${parts[parts.length - 1]}`;
    } else if (cleanHref.includes("raw/assets/")) {
      const parts = cleanHref.split("raw/assets/");
      cleanHref = `http://localhost:8787/wiki-assets/${parts[parts.length - 1]}`;
    }
    return `<img src="${cleanHref}" alt="${text || ""}" title="${title || ""}" class="max-w-full my-4 border border-gray-100 block" />`;
  };

  const lastActionStep = activeLogs && activeLogs.actions && activeLogs.actions.length > 0
    ? activeLogs.actions[activeLogs.actions.length - 1]?.step
    : null;

  const lastAgentMsg = [...messages].reverse().find(m => m.sender === "agent");
  const currentSuggestions = lastAgentMsg?.suggestedQuestions || DEFAULT_SUGGESTIONS;

  return (
    <div className="flex-1 flex flex-col justify-between min-h-[70vh] font-mono relative">
      {/* Anchored Header Unit (Sticky Top) */}
      <div className="sticky top-0 bg-white z-10 pb-4 border-b border-gray-200 mb-6 pt-2">
        {/* 0. Session Resource usage banner */}
        <div className="text-[10px] text-gray-400 pb-2 mb-3 flex justify-between select-none">
          <span>TOKENS: {sessionStats.total.toLocaleString()} ({sessionStats.input.toLocaleString()} IN | {sessionStats.output.toLocaleString()} OUT)</span>
          <span>EST. COST: ${sessionStats.cost.toFixed(6)}</span>
        </div>

        {/* 3. Global Command Palette Trigger */}
        <button
          onClick={() => setOpen(true)}
          disabled={loading}
          className="mcp-trigger flex items-center gap-3 w-full text-left cursor-text disabled:opacity-50"
        >
          <span className="text-[11px] font-bold text-gray-900 select-none">IAINTAIT_MCP:</span>
          <span className="flex-1 text-[11px] text-gray-400 truncate flex items-center font-mono">
            {loading ? (
              "Waiting for response…"
            ) : (
              <>
                Ask me anything...
                <span className="mcp-cursor ml-1 text-gray-400">▊</span>
              </>
            )}
          </span>
          <span className="text-[10px] text-gray-400 bg-gray-100 border border-gray-200 px-1.5 py-0.5 font-mono select-none hidden sm:inline-block">
            ⌘&nbsp;K
          </span>
        </button>

        {/* CMD K Palette Modal */}
        <Command.Dialog 
          open={open} 
          onOpenChange={setOpen} 
          label="Global Command Menu"
          loop
        >
          <div className="cmdk-input-wrapper">
            <span className="cmdk-input-prefix">IAINTAIT_MCP:</span>
            <Command.Input 
              value={search} 
              onValueChange={setSearch} 
              placeholder="Ask me anything..." 
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <Command.List>
            <Command.Empty>No results found.</Command.Empty>

            {!search.trim() && (
              <>
                <Command.Group heading="NAVIGATE">
                  <Command.Item onSelect={() => executeCommand("Connect to MCP")}>Connect to MCP <span className="cmd-meta">Execute ↵</span></Command.Item>
                  <Command.Item onSelect={() => executeCommand("About")}>About <span className="cmd-meta">Jump to ↵</span></Command.Item>
                  <Command.Item onSelect={() => executeCommand("Agencies & Eras")}>Agencies & Eras <span className="cmd-meta">Jump to ↵</span></Command.Item>
                  <Command.Item onSelect={() => executeCommand("Projects & Campaigns")}>Projects & Campaigns <span className="cmd-meta">Jump to ↵</span></Command.Item>
                  <Command.Item onSelect={() => executeCommand("Talks & Podcasts")}>Talks & Podcasts <span className="cmd-meta">Jump to ↵</span></Command.Item>
                  <Command.Item onSelect={() => executeCommand("Collaborators")}>Collaborators <span className="cmd-meta">Jump to ↵</span></Command.Item>
                </Command.Group>
                
                <Command.Group heading="QUICK ACTIONS">
                  <Command.Item onSelect={() => executeCommand("surprise_me", "I'm feeling lucky")}>I'm feeling lucky <span className="cmd-meta">Execute ↵</span></Command.Item>
                  <Command.Item onSelect={() => executeCommand("Working with Iain")}>Working with Iain <span className="cmd-meta">Execute ↵</span></Command.Item>
                </Command.Group>
              </>
            )}

            {search.trim() && autocompleteResults.length > 0 && (
              <Command.Group heading="ARCHIVE NODES">
                {autocompleteResults.map(node => (
                  <Command.Item key={node.id} onSelect={() => executeCommand(node.id, node.title)}>
                    {node.title} <span className="text-gray-400 capitalize text-[10px] ml-2">({node.kind})</span>
                    <span className="cmd-meta">Jump to ↵</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {search.trim() && (
              <Command.Group heading="CONVERSATIONAL SEARCH">
                <Command.Item onSelect={() => executeCommand(search)}>
                  Ask AI: "{search}" <span className="cmd-meta">Execute ↵</span>
                </Command.Item>
              </Command.Group>
            )}
          </Command.List>
        </Command.Dialog>
      </div>

      {/* 1. Chat Message History Thread */}
      <div 
        onClick={handleContentClick}
        className="flex-1 flex flex-col gap-8 mb-6 overflow-y-auto pr-1"
      >
        {messages.map((m, index) => {
          const isTarget = !loading && index === messages.length - 1;
          return (
            <div 
              key={m.id} 
              ref={isTarget ? scrollRef : null}
              className={`flex flex-col gap-1.5 scroll-mt-36 ${m.sender === "user" ? "items-end" : "items-start"}`}
            >
            {/* Sender Identifier */}
            <span className="text-[10px] text-gray-400 select-none">
              {m.sender === "user" ? "YOU" : "_aaiiintt"}
            </span>

            {/* Bubble Content */}
            <div 
              className={`max-w-[90%] text-xs leading-relaxed ${
                m.sender === "user" 
                  ? "bg-gray-100 text-gray-900 px-4 py-2.5 rounded-none border border-gray-200" 
                  : "bg-white text-gray-800"
              }`}
            >
              {m.sender === "user" ? (
                <p className="whitespace-pre-wrap">{m.text}</p>
              ) : (
                <div 
                  className="prose max-w-none font-mono"
                  dangerouslySetInnerHTML={{ __html: marked.parse(m.text, { renderer }) }}
                />
              )}
            </div>

            {/* Tool Executions expander (Agent message details) */}
            {m.sender === "agent" && m.terminalLogs && m.terminalLogs.actions && (
              <details className="text-[9px] text-gray-400 select-none mt-1 hover:text-gray-700 cursor-pointer">
                <summary>[ view execution logs ]</summary>
                <div className="pl-4 border-l border-gray-200 mt-1 flex flex-col gap-1 text-[8px] text-gray-500 font-mono">
                  <div>System: {m.terminalLogs.system}</div>
                  {m.terminalLogs.actions.map((act, idx) => (
                    <div key={idx}>
                      ▶ {act.step} {act.query && `with input: ${act.query}`}
                    </div>
                  ))}
                  {m.tokenUsage && m.tokenUsage.total > 0 && (
                    <div className="mt-1 pt-1 border-t border-gray-100 text-[8px] text-gray-400">
                      Request usage: {m.tokenUsage.total.toLocaleString()} tokens ({m.tokenUsage.input.toLocaleString()} IN | {m.tokenUsage.output.toLocaleString()} OUT)
                      <br />
                      Request cost: ${((m.tokenUsage.input * 0.000000075) + (m.tokenUsage.output * 0.000000300)).toFixed(6)}
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        );
        })}

        {/* Thinking Indicator / Loading state */}
        {loading && (
          <div ref={scrollRef} className="flex flex-col gap-1.5 items-start scroll-mt-36">
            <span className="text-[10px] text-gray-400 select-none">_aaiiintt</span>
            <div className="flex flex-col gap-1">
              <div className="text-gray-400 animate-pulse text-xs">
                ▒ Thinking...
              </div>
              {lastActionStep && (
                <div className="text-[9px] text-gray-400 font-mono border-l border-gray-200 pl-3">
                  System call: {lastActionStep}...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. Suggested Prompts (Renders at the bottom of the page, below the chat messages) */}
      {!loading && currentSuggestions.length > 0 && (
        <div className="flex flex-col gap-2 mt-4 mb-4 select-none w-full border-t border-gray-100 pt-4">
          <div className="text-[9px] text-gray-400 uppercase tracking-wider">// Suggested next questions</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 w-full">
            {currentSuggestions.map((q) => (
              <button
                key={q}
                onClick={() => handleSearch(q)}
                className="text-left text-[10px] p-3 border border-gray-200 hover:border-gray-900 hover:text-black text-gray-500 transition-all cursor-pointer bg-white font-mono leading-snug"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
