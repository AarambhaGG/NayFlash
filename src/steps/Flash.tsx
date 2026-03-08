import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import type { Distro, UsbDrive, FlashProgress } from "../types";

interface FlashProps {
  distro: Distro;
  isoPath: string;
  onReset: () => void;
}

type Status = "selecting" | "confirming" | "flashing" | "done" | "error";

export default function Flash({ distro, isoPath, onReset }: FlashProps) {
  const [drives, setDrives] = useState<UsbDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedDrive, setSelectedDrive] = useState<UsbDrive | null>(null);
  const [status, setStatus] = useState<Status>("selecting");
  const [progress, setProgress] = useState<FlashProgress | null>(null);
  const [flashError, setFlashError] = useState("");
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    loadDrives();
    return () => {
      if (unlistenRef.current) unlistenRef.current();
    };
  }, []);

  const loadDrives = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await invoke<UsbDrive[]>("list_usb_drives");
      setDrives(result);
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to detect USB drives");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (drive: UsbDrive) => {
    setSelectedDrive(drive);
    setStatus("confirming");
  };

  const handleConfirmFlash = async () => {
    if (!selectedDrive) return;
    setStatus("flashing");
    setFlashError("");
    setProgress(null);

    try {
      const unlisten = await listen<FlashProgress>("flash-progress", (event) => {
        setProgress(event.payload);
      });
      unlistenRef.current = unlisten;

      await invoke("flash_iso", {
        isoPath,
        device: selectedDrive.device,
      });

      unlisten();
      unlistenRef.current = null;
      setStatus("done");
    } catch (err) {
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
      setFlashError(typeof err === "string" ? err : "Flash operation failed");
      setStatus("error");
    }
  };

  const pct = progress?.percentage ?? 0;

  return (
    <div className="h-full flex flex-col items-center justify-center px-8 animate-fadeIn">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="text-lg font-bold text-white/90">Flash to USB</h2>
          <p className="text-xs text-zinc-600 font-mono mt-1">{distro.name}</p>
        </div>

        {/* Selecting drive */}
        {status === "selecting" && (
          <div className="space-y-3 animate-fadeInUp">
            {loading ? (
              <div className="flex items-center justify-center gap-3 py-8">
                <div className="w-1.5 h-1.5 rounded-full bg-accent/50 animate-breathe" />
                <p className="text-sm text-zinc-500 font-mono">Scanning drives</p>
              </div>
            ) : error ? (
              <div className="space-y-4 text-center">
                <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                  <p className="text-sm text-red-400/80">{error}</p>
                </div>
                <button onClick={loadDrives} className="text-sm text-accent hover:text-accent-50 transition-colors font-medium focus-ring rounded px-3 py-1">
                  Retry
                </button>
              </div>
            ) : drives.length === 0 ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-zinc-600">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  </svg>
                </div>
                <p className="text-sm text-zinc-500">No USB drives detected</p>
                <p className="text-[11px] text-zinc-700">Insert a drive and refresh</p>
                <button onClick={loadDrives} className="text-sm text-accent hover:text-accent-50 transition-colors font-medium focus-ring rounded px-3 py-1">
                  Refresh
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[11px] text-zinc-600 font-mono tracking-wide">
                    {drives.length} drive{drives.length !== 1 ? "s" : ""}
                  </p>
                  <button onClick={loadDrives} className="text-[11px] text-zinc-600 hover:text-accent transition-colors font-medium focus-ring rounded px-2 py-0.5">
                    Refresh
                  </button>
                </div>
                {drives.map((drive) => (
                  <button
                    key={drive.device}
                    onClick={() => handleSelect(drive)}
                    className="w-full p-3 rounded-xl glass glass-hover transition-all duration-200 text-left group focus-ring"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-white/90 group-hover:text-accent transition-colors duration-200">
                          {drive.label || drive.model}
                        </p>
                        <p className="text-[11px] text-zinc-600 font-mono mt-0.5">
                          {drive.device} &middot; {drive.size}
                        </p>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-zinc-700 group-hover:text-accent/50 transition-colors">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Confirmation */}
        {status === "confirming" && selectedDrive && (
          <div className="space-y-4 animate-fadeInUp">
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
              <div className="flex items-start gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(239 68 68)" strokeWidth="1.5" strokeLinecap="round" className="flex-shrink-0 mt-0.5">
                  <path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                </svg>
                <div>
                  <p className="text-sm font-semibold text-red-400/90">All data will be erased</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-[11px] text-zinc-600">Target drive</p>
                    <p className="text-sm font-mono text-white/80">
                      {selectedDrive.label || selectedDrive.model}
                    </p>
                    <p className="text-[11px] font-mono text-zinc-600">
                      {selectedDrive.device} &middot; {selectedDrive.size}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleConfirmFlash}
              className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-sm hover:bg-red-500/15 hover:border-red-500/30 transition-all duration-200 focus-ring"
            >
              Confirm &amp; Flash
            </button>
            <button
              onClick={() => {
                setSelectedDrive(null);
                setStatus("selecting");
              }}
              className="w-full text-center text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors font-medium py-1 focus-ring rounded"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Flashing */}
        {status === "flashing" && (
          <div className="space-y-6 animate-fadeInUp">
            <div className="text-center space-y-1.5">
              <p className="text-sm font-semibold text-white/90">Writing to disk</p>
              <p className="text-[11px] text-yellow-400/60 font-mono">Do not remove USB drive</p>
            </div>

            <div className="space-y-2">
              <div className="h-1.5 bg-white/[0.04] rounded-full w-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent/60 to-accent rounded-full transition-all duration-500 ease-out progress-glow"
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-mono">
                <span className="text-zinc-500">{pct.toFixed(1)}%</span>
                <span className="text-zinc-600">writing...</span>
              </div>
            </div>
          </div>
        )}

        {/* Done */}
        {status === "done" && (
          <div className="space-y-5 animate-fadeInUp text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center mx-auto">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgb(16 185 129)" strokeWidth="2" strokeLinecap="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-400/90">Flash complete</p>
              <p className="text-[11px] text-zinc-600 mt-1">
                {distro.name} written to {selectedDrive?.device}
              </p>
            </div>
            <p className="text-[11px] text-zinc-700">
              Safe to remove the USB drive and boot from it
            </p>
            <button
              onClick={onReset}
              className="w-full py-3 rounded-xl glass glass-hover text-white/70 font-medium text-sm transition-all duration-200 focus-ring"
            >
              Flash Another
            </button>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="space-y-5 animate-fadeInUp">
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
              <p className="text-sm text-red-400/80">{flashError}</p>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => {
                  setStatus("confirming");
                  setFlashError("");
                }}
                className="text-sm text-accent hover:text-accent-50 transition-colors font-medium focus-ring rounded px-2 py-1"
              >
                Retry
              </button>
              <span className="text-zinc-700">&middot;</span>
              <button
                onClick={() => {
                  setSelectedDrive(null);
                  setStatus("selecting");
                  loadDrives();
                }}
                className="text-sm text-zinc-400 hover:text-white transition-colors font-medium focus-ring rounded px-2 py-1"
              >
                Different Drive
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
