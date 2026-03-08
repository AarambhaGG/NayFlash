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
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-accent/50 animate-breathe" />
          <p className="text-zinc-500 text-sm font-mono">Loading catalog</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-5 px-6">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgb(239 68 68)" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
          </svg>
        </div>
        <p className="text-red-400/80 text-sm">{error}</p>
        <button
          onClick={loadCatalog}
          className="text-sm text-accent hover:text-accent-50 transition-colors font-medium focus-ring rounded px-3 py-1"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Search bar */}
      <div className="flex-shrink-0 px-6 pt-5 pb-4">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search distros..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-accent/30 focus:bg-white/[0.04] text-sm transition-all duration-200"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          )}
        </div>
        <p className="mt-2.5 text-[11px] text-zinc-600 font-mono tracking-wide">
          {filtered.length} distro{filtered.length !== 1 ? "s" : ""} available
        </p>
      </div>

      {/* Distro grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <p className="text-zinc-600 text-sm">No matches found</p>
            <p className="text-zinc-700 text-xs">Try a different search term</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 stagger-children">
            {filtered.map((distro) => (
              <button
                key={distro.id}
                onClick={() => onSelect(distro)}
                className="group text-left p-4 rounded-xl glass glass-hover transition-all duration-200 hover:shadow-glow-sm focus-ring"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-[13px] text-white/90 group-hover:text-accent transition-colors duration-200 truncate">
                      {distro.name}
                    </h3>
                    <p className="mt-1.5 text-[11px] text-zinc-500 leading-relaxed line-clamp-2">
                      {distro.description}
                    </p>
                  </div>
                  <span className="flex-shrink-0 mt-0.5 text-[10px] text-zinc-600 font-mono bg-white/[0.03] px-1.5 py-0.5 rounded-md">
                    {distro.size_gb}G
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="w-1 h-1 rounded-full bg-accent/60" />
                  <span className="text-[10px] text-accent/70 font-medium tracking-wide">Select</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
