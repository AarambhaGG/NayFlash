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
    <div className="h-full flex flex-col items-center justify-center px-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-2xl font-black text-white">Flash to USB</h2>
          <p className="text-sm text-neutral-500 mt-1">{distro.name}</p>
        </div>

        {/* Selecting drive */}
        {status === "selecting" && (
          <div className="space-y-4">
            {loading ? (
              <p className="text-sm text-neutral-500 font-mono">Scanning drives...</p>
            ) : error ? (
              <div className="space-y-3">
                <p className="text-sm text-red-500">{error}</p>
                <button onClick={loadDrives} className="text-sm text-white underline hover:no-underline">
                  Retry
                </button>
              </div>
            ) : drives.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-neutral-500">No USB drives detected.</p>
                <p className="text-xs text-neutral-600">Insert a USB drive and refresh.</p>
                <button onClick={loadDrives} className="text-sm text-white underline hover:no-underline">
                  Refresh
                </button>
              </div>
            ) : (
              <div className="space-y-0 divide-y divide-neutral-800">
                <div className="flex items-center justify-between pb-2">
                  <p className="text-xs text-neutral-600 font-mono">
                    {drives.length} drive{drives.length !== 1 ? "s" : ""}
                  </p>
                  <button onClick={loadDrives} className="text-xs text-neutral-500 hover:text-white">
                    Refresh
                  </button>
                </div>
                {drives.map((drive) => (
                  <button
                    key={drive.device}
                    onClick={() => handleSelect(drive)}
                    className="w-full py-3 text-left hover:text-cyan-400 transition-colors group"
                  >
                    <p className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors">
                      {drive.label || drive.model}
                    </p>
                    <p className="text-xs text-neutral-600 font-mono">
                      {drive.device} · {drive.size}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Confirmation */}
        {status === "confirming" && selectedDrive && (
          <div className="space-y-5">
            <div className="border border-red-900 p-4">
              <p className="text-sm font-bold text-red-500 mb-2">WARNING: ALL DATA WILL BE ERASED</p>
              <p className="text-xs text-neutral-500">Target:</p>
              <p className="text-sm font-bold text-white font-mono mt-1">
                {selectedDrive.label || selectedDrive.model} ({selectedDrive.device}) — {selectedDrive.size}
              </p>
            </div>

            <button
              onClick={handleConfirmFlash}
              className="w-full py-3 bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors"
            >
              Confirm & Flash
            </button>
            <button
              onClick={() => {
                setSelectedDrive(null);
                setStatus("selecting");
              }}
              className="text-sm text-neutral-500 underline hover:no-underline"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Flashing */}
        {status === "flashing" && (
          <div className="space-y-5">
            <p className="text-sm text-white font-bold">Writing...</p>
            <p className="text-xs text-yellow-500">Do not remove the USB drive.</p>

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
          </div>
        )}

        {/* Done */}
        {status === "done" && (
          <div className="space-y-5">
            <p className="text-sm text-green-500 font-bold">
              ✓ Flash complete. {distro.name} written to {selectedDrive?.device}.
            </p>
            <p className="text-xs text-neutral-600">
              You can safely remove the USB drive and boot from it.
            </p>
            <button
              onClick={onReset}
              className="w-full py-3 bg-white text-black font-bold text-sm hover:bg-neutral-200 transition-colors"
            >
              Flash Another
            </button>
          </div>
        )}

        {/* Error */}
        {status === "error" && (
          <div className="space-y-4">
            <p className="text-sm text-red-500">{flashError}</p>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setStatus("confirming");
                  setFlashError("");
                }}
                className="text-sm text-white underline hover:no-underline"
              >
                Retry
              </button>
              <button
                onClick={() => {
                  setSelectedDrive(null);
                  setStatus("selecting");
                  loadDrives();
                }}
                className="text-sm text-neutral-500 underline hover:no-underline"
              >
                Select Different Drive
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
