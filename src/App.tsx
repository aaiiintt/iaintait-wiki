import React, { useState, useEffect } from "react";
import Console from "./features/interrogator/Console";
import AdminDashboard from "./features/system/AdminDashboard";

export default function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Monitor URL changes for lightweight routing
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener("popstate", handleLocationChange);
    return () => {
      window.removeEventListener("popstate", handleLocationChange);
    };
  }, []);

  const handleSelectNode = (id: string) => {
    // Left empty since everything is now conversational within the single-column Console chat thread.
  };

  // Admin routing mapping
  if (currentPath === "/system" || currentPath === "/admin") {
    return <AdminDashboard />;
  }

  return (
    <div className="min-h-screen bg-white text-[#111111] font-sans flex flex-col justify-between">
      {/* 2. Main Chat View (Single-column layout) */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-8 flex flex-col justify-between">
        <Console onSelectNode={handleSelectNode} />
      </main>

      {/* 3. Footer */}
      <footer className="border-t border-[#EAEAEA] py-4 select-none">
        <div className="max-w-2xl mx-auto w-full px-6 flex items-center justify-between text-[10px] text-gray-400 font-mono">
          <span>© {new Date().getFullYear()} Iain Tait. All Rights Reserved.</span>
          <button
            onClick={() => {
              window.history.pushState({}, "", "/system");
              window.dispatchEvent(new PopStateEvent("popstate"));
            }}
            className="hover:underline hover:text-gray-900 cursor-pointer"
          >
            [ system login ]
          </button>
        </div>
      </footer>
    </div>
  );
}
