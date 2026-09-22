# RepoPrep — Electron UI

The RepoPrep desktop interface: **Electron + React + TypeScript (TSX)** in a custom, frame-less window. File processing is handled by the Python engine (`App/engine/server.py` + `core.py`), spawned by `electron/engine.ts`.

## Layout

```
electron/
├─ electron/
│  ├─ main.ts       Electron main process (frame-less window, IPC, dialogs)
│  ├─ preload.ts    contextBridge API exposed as window.repoprep
│  └─ engine.ts     spawns the Python engine (App/engine/server.py)
├─ src/
│  ├─ App.tsx       main UI (paths, modes, options, actions, log)
│  ├─ styles.css    navy/blue theme, responsive layout, RTL-ready
│  ├─ i18n.ts       en / ar / ru / zh
│  └─ components/   TitleBar, LogView, Modal, Icon
├─ public/logo.png  in-app logo
├─ index.html
├─ vite.config.ts   (base './' so the built UI loads from file://)
├─ tsconfig.main.json / tsconfig.json
└─ package.json
```

## Commands

```bash
npm install          # install deps (Node 20+)
npm run build        # tsc (main/preload) + vite build (renderer)
npm start            # build, then launch Electron
npm run dev          # vite dev server + Electron (hot reload)
```

Type-checks:

```bash
npx tsc -p tsconfig.main.json      # main process
npx tsc --noEmit -p tsconfig.json  # renderer
```

## Features

- Frame-less custom title bar with logo, language switcher, and min/max/close buttons (drag anywhere on the bar, double-click to maximize).
- Three modes: **Smart Clean** (recommended, default, preserves folder structure), **Flatten** (flat single folder), **Scan Only** (preview without copying).
- Include-images option; live progress bar; streaming activity log with colored levels.
- Fully local — no network calls. All file work happens in the Python engine subprocess.

## Packaging the EXE

```bash
npx electron-packager . RepoPrep --platform=win32 --arch=x64 --icon=icon.ico --out=release
```

The ProductName is `RepoPrep`; version is defined in `package.json`.