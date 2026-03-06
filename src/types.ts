export interface Distro {
  id: string;
  name: string;
  description: string;
  url: string;
  checksum_sha256: string;
  size_gb: number;
  icon_url: string;
}

export interface Catalog {
  version: number;
  distros: Distro[];
}

export interface DownloadProgress {
  downloaded_bytes: number;
  total_bytes: number;
  speed_bps: number;
  eta_seconds: number;
  percentage: number;
}

export interface ChecksumResult {
  valid: boolean;
  expected: string;
  actual: string;
}

export interface UsbDrive {
  device: string;
  label: string;
  size: string;
  model: string;
}

export interface FlashProgress {
  written_bytes: number;
  total_bytes: number;
  percentage: number;
}
