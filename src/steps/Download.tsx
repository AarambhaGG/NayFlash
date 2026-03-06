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

        // Verify checksum for local file too
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
    <div className="h-full flex flex-col items-center justify-center px-8">
      <div className="w-full max-w-md">
        {/* Distro info */}
        <div className="mb-8">
          <h2 className="text-2xl font-black text-white">{distro.name}</h2>
          <p className="text-sm text-neutral-500 font-mono mt-1">{distro.size_gb} GB</p>
        </div>

        {/* Idle state */}
        {status === "idle" && (
          <div className="space-y-4">
            <button
              onClick={startDownload}
              className="w-full py-3 bg-white text-black font-bold text-sm hover:bg-neutral-200 transition-colors"
            >
              Download ISO
            </button>
            <button
              onClick={browseLocalIso}
              className="w-full py-3 border border-neutral-700 text-white font-bold text-sm hover:bg-neutral-900 transition-colors"
            >
              Use Local ISO
            </button>
            <p className="text-xs text-neutral-600">
              Download saves to temp directory, or browse for an existing .iso file.
            </p>
          </div>
        )}

        {/* Downloading */}
        {status === "downloading" && (
          <div className="space-y-5">
            <div>
              <div className="h-1 bg-neutral-800 w-full">
                <div
                  className="h-full bg-white transition-all duration-300 ease-out"
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <p className="mt-2 text-sm font-bold text-white font-mono">
                {pct.toFixed(1)}%
              </p>
            </div>

            {progress && (
              <div className="flex gap-6 text-xs font-mono text-neutral-500">
                <span>{formatBytes(progress.downloaded_bytes)} / {formatBytes(progress.total_bytes)}</span>
                <span>{formatSpeed(progress.speed_bps)}</span>
                <span>ETA {formatEta(progress.eta_seconds)}</span>
              </div>
            )}

            <button
              onClick={cancelDownload}
              className="text-xs text-red-500 hover:text-red-400 font-bold uppercase tracking-wide"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Verifying */}
        {status === "verifying" && (
          <p className="text-sm text-neutral-500 font-mono">Verifying SHA256...</p>
        )}

        {/* Done */}
        {status === "done" && checksumResult && (
          <div className="space-y-5">
            {checksumResult.valid ? (
              <p className="text-sm text-green-500 font-bold">
                ✓ Checksum verified. Download complete.
              </p>
            ) : (
              <p className="text-sm text-red-500 font-bold">
                ✗ Checksum mismatch. File may be corrupted.
              </p>
            )}

            <button
              onClick={() => onComplete(isoPath)}
              className="w-full py-3 bg-white text-black font-bold text-sm hover:bg-neutral-200 transition-colors"
            >
              Continue to Flash →
            </button>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="space-y-4">
            <p className="text-sm text-red-500">{errorMsg}</p>
            <div className="flex gap-4">
              <button onClick={startDownload} className="text-sm text-white underline hover:no-underline">
                Retry
              </button>
              <button onClick={browseLocalIso} className="text-sm text-white underline hover:no-underline">
                Use Local ISO
              </button>
              <button onClick={onBack} className="text-sm text-neutral-500 underline hover:no-underline">
                Go Back
              </button>
            </div>
          </div>
        )}

        {/* Cancelled */}
        {status === "cancelled" && (
          <div className="space-y-4">
            <p className="text-sm text-yellow-500">Download cancelled.</p>
            <div className="flex gap-4">
              <button onClick={startDownload} className="text-sm text-white underline hover:no-underline">
                Retry
              </button>
              <button onClick={browseLocalIso} className="text-sm text-white underline hover:no-underline">
                Use Local ISO
              </button>
              <button onClick={onBack} className="text-sm text-neutral-500 underline hover:no-underline">
                Go Back
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
