# ⚡ NayFlash

**Every OS journey begins here.**

A modern 3-step USB flashing tool built with Tauri v2 + React + TypeScript.

## Features

- 🔍 **Browse & Search** — Curated catalog of popular Linux distributions
- 📥 **Download** — Real-time progress with speed, ETA, and SHA256 verification
- ⚡ **Flash** — Write ISOs to USB drives with elevated permissions

## Prerequisites

### Linux (Ubuntu/Debian)

```bash
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev \
  build-essential \
  curl \
  wget \
  file \
  libssl-dev \
  libgtk-3-dev \
  librsvg2-dev \
  libjavascriptcoregtk-4.1-dev \
  libsoup-3.0-dev
```

### Rust

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

### Node.js

Node.js 18+ required. Install via [nvm](https://github.com/nvm-sh/nvm) or your package manager.

## Getting Started

```bash
# Install frontend dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## Tech Stack

| Layer    | Technology              |
|----------|------------------------|
| Frontend | React 18 + TypeScript  |
| Styling  | Tailwind CSS           |
| Backend  | Tauri v2 (Rust)        |
| Bundler  | Vite                   |

## Project Structure

```
nayflash/
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   ├── lib.rs          # Tauri setup + command registration
│   │   ├── catalog.rs      # Catalog fetch + fallback
│   │   ├── downloader.rs   # Download + SHA256 checksum
│   │   └── flasher.rs      # USB detection + flash logic
│   ├── capabilities/       # Tauri v2 permissions
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                    # React frontend
│   ├── App.tsx
│   ├── main.tsx
│   ├── types.ts
│   ├── catalog.json        # Fallback local catalog
│   ├── steps/
│   │   ├── Search.tsx       # Step 1: Browse/search distros
│   │   ├── Download.tsx     # Step 2: Download + verify
│   │   └── Flash.tsx        # Step 3: Flash to USB
│   └── components/
│       ├── SplashScreen.tsx
│       └── StepIndicator.tsx
├── index.html
├── tailwind.config.js
├── vite.config.ts
└── package.json
```

## Supported Platforms

- **Linux** (Ubuntu, Fedora, Debian, etc.)
- **Windows** 10/11

## License

MIT
