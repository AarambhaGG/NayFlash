import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-dialog";
import type { Distro, DownloadProgress, ChecksumResult } from "../types";

interface DownloadProps {
  distro: Distro;
  onComplete: (isoPath: string) => void;
  onBack: () => void;
}

type Status = "idle" | "downloading" | "verifying" | "done" | "error" | "cancelled";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
}

function formatSpeed(bps: number): string {
  const mbps = bps / (1024 * 1024);
  return `${mbps.toFixed(1)} MB/s`;
}

function formatEta(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) return "--";
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  if (mins < 60) return `${mins}m ${secs}s`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
}

/** Circular progress ring */
function ProgressRing({ percentage, size = 120, stroke = 3 }: { percentage: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="url(#progress-gradient)" strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
          style={{ filter: 'drop-shadow(0 0 6px rgba(0, 212, 255, 0.3))' }}
        />
        <defs>
          <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#00d4ff" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold text-white font-mono">{Math.round(percentage)}</span>
        <span className="text-[10px] text-zinc-500 -mt-0.5">%</span>
      </div>
    </div>
  );
}

export default function Download({ distro, onComplete, onBack }: DownloadProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [checksumResult, setChecksumResult] = useState<ChecksumResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [isoPath, setIsoPath] = useState("");
  const unlistenRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    return () => {
      if (unlistenRef.current) {
        unlistenRef.current();
      }
    };
  }, []);

  const startDownload = async () => {
    setStatus("downloading");
    setProgress(null);
    setErrorMsg("");
    setChecksumResult(null);

    try {
      const unlisten = await listen<DownloadProgress>("download-progress", (event) => {
        setProgress(event.payload);
      });
      unlistenRef.current = unlisten;

      const urlParts = distro.url.split("/");
      const filename = urlParts[urlParts.length - 1] || `${distro.id}.iso`;

      const path = await invoke<string>("start_download", {
        url: distro.url,
        filename,
      });

      unlisten();
      unlistenRef.current = null;
      setIsoPath(path);

      setStatus("verifying");
      const result = await invoke<ChecksumResult>("verify_checksum", {
        filePath: path,
        expectedHash: distro.checksum_sha256,
      });

      setChecksumResult(result);
      setStatus("done");
    } catch (err) {
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
      const errStr = typeof err === "string" ? err : "Download failed";
      if (errStr.includes("cancelled")) {
        setStatus("cancelled");
      } else {
        setErrorMsg(errStr);
        setStatus("error");
      }
    }
  };

  const browseLocalIso = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          { name: "Disk Images", extensions: ["iso", "img", "img.xz"] },
          { name: "All Files", extensions: ["*"] },
        ],
        title: "Select an ISO or disk image",
      });

      if (selected) {
        const path = typeof selected === "string" ? selected : selected;
        setIsoPath(path);

        setStatus("verifying");
        const result = await invoke<ChecksumResult>("verify_checksum", {
          filePath: path,
          expectedHash: distro.checksum_sha256,
        });

        setChecksumResult(result);
        setStatus("done");
      }
    } catch (err) {
      const errStr = typeof err === "string" ? err : "Failed to open file";
      setErrorMsg(errStr);
      setStatus("error");
    }
  };

  const cancelDownload = async () => {
    try {
      await invoke("cancel_download");
    } catch {}
  };

  const pct = progress?.percentage ?? 0;

  return (
    <div className="h-full flex flex-col items-center justify-center px-8 animate-fadeIn">
      <div className="w-full max-w-sm">
        {/* Distro info */}
        <div className="mb-8 text-center">
          <h2 className="text-lg font-bold text-white/90">{distro.name}</h2>
          <p className="text-xs text-zinc-600 font-mono mt-1">{distro.size_gb} GB</p>
        </div>

        {/* Idle state */}
        {status === "idle" && (
          <div className="space-y-3 animate-fadeInUp">
            <button
              onClick={startDownload}
              className="w-full py-3 rounded-xl bg-accent/10 border border-accent/20 text-accent font-semibold text-sm hover:bg-accent/15 hover:border-accent/30 hover:shadow-glow transition-all duration-200 focus-ring"
            >
              Download ISO
            </button>
            <button
              onClick={browseLocalIso}
              className="w-full py-3 rounded-xl glass glass-hover text-white/70 font-medium text-sm transition-all duration-200 focus-ring"
            >
              Use Local ISO
            </button>
            <p className="text-[11px] text-zinc-600 text-center pt-1">
              Downloads to temp directory, or select an existing image
            </p>
          </div>
        )}

        {/* Downloading */}
        {status === "downloading" && (
          <div className="flex flex-col items-center gap-6">
            <ProgressRing percentage={pct} />

            {progress && (
              <div className="w-full space-y-2">
                <div className="flex justify-between text-[11px] font-mono text-zinc-500">
                  <span>{formatBytes(progress.downloaded_bytes)}</span>
                  <span>{formatBytes(progress.total_bytes)}</span>
                </div>
                <div className="flex justify-center gap-4 text-[11px] font-mono text-zinc-600">
                  <span>{formatSpeed(progress.speed_bps)}</span>
                  <span className="text-zinc-700">&middot;</span>
                  <span>{formatEta(progress.eta_seconds)} left</span>
                </div>
              </div>
            )}

            <button
              onClick={cancelDownload}
              className="text-[11px] text-zinc-600 hover:text-red-400 transition-colors font-medium tracking-wide focus-ring rounded px-3 py-1"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Verifying */}
        {status === "verifying" && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin-slow" />
            <p className="text-sm text-zinc-500 font-mono">Verifying checksum</p>
          </div>
        )}

        {/* Done */}
        {status === "done" && checksumResult && (
          <div className="space-y-5 animate-fadeInUp">
            <div className={`flex items-center gap-3 p-3 rounded-xl ${checksumResult.valid ? 'bg-emerald-500/5 border border-emerald-500/10' : 'bg-red-500/5 border border-red-500/10'}`}>
              {checksumResult.valid ? (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(16 185 129)" strokeWidth="2" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                  <span className="text-sm text-emerald-400/90 font-medium">Verified &amp; ready</span>
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(239 68 68)" strokeWidth="2" strokeLinecap="round"><path d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>
                  <span className="text-sm text-red-400/90 font-medium">Checksum mismatch</span>
                </>
              )}
            </div>

            <button
              onClick={() => onComplete(isoPath)}
              className="w-full py-3 rounded-xl bg-accent/10 border border-accent/20 text-accent font-semibold text-sm hover:bg-accent/15 hover:shadow-glow transition-all duration-200 focus-ring"
            >
              Continue to Flash
            </button>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="space-y-5 animate-fadeInUp">
            <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10">
              <p className="text-sm text-red-400/80">{errorMsg}</p>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button onClick={startDownload} className="text-sm text-accent hover:text-accent-50 transition-colors font-medium focus-ring rounded px-2 py-1">
                Retry
              </button>
              <span className="text-zinc-700">&middot;</span>
              <button onClick={browseLocalIso} className="text-sm text-zinc-400 hover:text-white transition-colors font-medium focus-ring rounded px-2 py-1">
                Local ISO
              </button>
              <span className="text-zinc-700">&middot;</span>
              <button onClick={onBack} className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors font-medium focus-ring rounded px-2 py-1">
                Back
              </button>
            </div>
          </div>
        )}

        {/* Cancelled */}
        {status === "cancelled" && (
          <div className="space-y-5 animate-fadeInUp">
            <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/10 text-center">
              <p className="text-sm text-yellow-400/80">Download cancelled</p>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button onClick={startDownload} className="text-sm text-accent hover:text-accent-50 transition-colors font-medium focus-ring rounded px-2 py-1">
                Retry
              </button>
              <span className="text-zinc-700">&middot;</span>
              <button onClick={browseLocalIso} className="text-sm text-zinc-400 hover:text-white transition-colors font-medium focus-ring rounded px-2 py-1">
                Local ISO
              </button>
              <span className="text-zinc-700">&middot;</span>
              <button onClick={onBack} className="text-sm text-zinc-600 hover:text-zinc-400 transition-colors font-medium focus-ring rounded px-2 py-1">
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
