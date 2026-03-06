import { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Catalog, Distro } from "../types";

interface SearchProps {
  onSelect: (distro: Distro) => void;
}

export default function Search({ onSelect }: SearchProps) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadCatalog();
  }, []);

  const loadCatalog = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await invoke<Catalog>("fetch_catalog");
      setCatalog(data);
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to load catalog");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!catalog) return [];
    const q = search.toLowerCase().trim();
    if (!q) return catalog.distros;
    return catalog.distros.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q)
    );
  }, [catalog, search]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-neutral-500 text-sm font-mono">Loading catalog...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-red-500 text-sm">{error}</p>
        <button
          onClick={loadCatalog}
          className="text-sm text-white underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search bar */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-neutral-800">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full px-0 py-1 bg-transparent border-b border-neutral-700 text-white placeholder-neutral-600 focus:outline-none focus:border-white text-sm font-mono"
        />
        <p className="mt-2 text-xs text-neutral-600 font-mono">
          {filtered.length} distro{filtered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Distro list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-neutral-600 text-sm">No results.</p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800">
            {filtered.map((distro) => (
              <button
                key={distro.id}
                onClick={() => onSelect(distro)}
                className="w-full text-left px-6 py-4 hover:bg-neutral-900 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors">
                      {distro.name}
                    </h3>
                    <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                      {distro.description}
                    </p>
                  </div>
                  <span className="ml-4 text-xs text-neutral-600 font-mono flex-shrink-0">
                    {distro.size_gb} GB →
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
