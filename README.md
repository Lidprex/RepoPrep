# RepoPrep

**A clean copy of your project, in seconds.**

RepoPrep v2.2.1 — a desktop tool for Windows that turns a messy project folder
into a clean, portable version of itself. It strips out dependencies, caches,
build output, lock files, and generated artifacts, and leaves you with just the
source — usually shrinking a codebase from **70 MB+ down to a few MB**.

> *Professional project cleaner — by Lidprex Labs.*

---

## Why RepoPrep?

Every real project accumulates the same kind of weight:

- **`node_modules`** holds tens of thousands of files you'll never open.
- **Build output** (`dist/`, `target/`, `build/`, `bin/`, `obj/`) is a copy of
  what your source already says.
- **Caches** (`__pycache__`, `.cache`, `.next`, `.gradle`) eat gigabytes.
- **Lock files, logs, binaries, and vendor folders** add bulk and noise.

RepoPrep scans your project, recognizes what's junk for **224 languages and
frameworks**, and produces a **cleaned copy** containing only what matters.

It runs **100% locally**. Nothing is uploaded, no account is needed, and your
original project is **never modified** — RepoPrep only copies.

---

## Features

### Smart Clean

Copies your project while dropping the junk automatically — `node_modules`,
`venv`, `.git`, `.next`, `target`, `build`, caches, lock files, logs, and
generated artifacts. The folder **structure is preserved**, so project
references stay intact.

### Flatten

Copies every surviving file into **one flat folder** — a single, browseable
view of the whole codebase without the folder nesting. Name collisions are
renamed automatically so nothing is lost.

### Scan Only

Previews exactly what would be skipped **before anything runs**. Writes
nothing — just tells you what it would keep and what it would drop.

### Keep List

Pin file names you want kept even if they'd normally be skipped. Your picks are
**remembered** between sessions.

### Include Images

Images (`.png`, `.jpg`, `.gif`, ...) are dropped by default to keep the output
text-only; flip the toggle to copy them when you need them.

### Project type detection

Detects the kind of project from common manifest files and applies the right
skip rules per language.

---

## What gets cleaned

RepoPrep understands how **224 languages and frameworks** store their junk,
including (to name a few):

| Ecosystem | Examples of what's cleaned |
|---|---|
| **JavaScript / TypeScript** | `node_modules`, `.npm`, `.yarn`, `.cache`, `.parcel-cache`, `.webpack`, `.turbo`, lock files |
| **Python** | `__pycache__`, `.pytest_cache`, `.mypy_cache`, `.tox`, `.venv`, `site-packages`, egg-info |
| **Java / JVM** | `target`, `.gradle`, `build`, `*.iml` (Maven, Gradle, Kotlin, Scala, Clojure) |
| **Go** | `vendor`, `go.sum`, `Gopkg.lock` |
| **Rust** | `target`, `Cargo.lock` |
| **C / C++ / C#** | `CMakeFiles`, `bin`, `obj`, `.vs`, `DerivedData`, compile databases |
| **Swift / Obj-C** | `.build`, `Pods`, `DerivedData`, `Package.resolved` |
| **PHP** | `vendor`, `composer.lock` (Laravel, Symfony, WordPress, Drupal) |
| **Ruby / Rails** | `.bundle`, `vendor/bundle`, `log`, `tmp`, `Gemfile.lock` |
| **Flutter / Dart** | `.dart_tool`, `.flutter-plugins`, `build`, `pubspec.lock` |
| **Mobile** | Android `build`/`.gradle`/`local.properties`, iOS `Pods`, Expo `.expo`, Cordova platforms |
| **Front-end** | Next.js `.next`, Nuxt `.nuxt`, Angular `.angular`, Vue `dist`, SvelteKit `.svelte-kit` |
| **Infra / DevOps** | `.terraform`, `.vagrant`, `charts`, `autom4te.cache`, `.ansible` |
| **Blockchain** | Solidity `artifacts`/`cache`, Cairo `target`, Foundry caches |
| **Game engines** | Unity `Library/Temp/Logs`, Unreal `Intermediate/Binaries/Saved`, Godot `.godot` |
| And **~200 more** — every entry is hand-curated junk lists, nothing that could be real source code. |

The skip rules are conservative by design: **nothing that could ever be genuine
source code is treated as junk.**

---

## Architecture

RepoPrep is two small parts that work together:

```
┌─────────────────────────────┐        ┌──────────────────────────────┐
│   Electron + React UI       │  IPC   │   Python engine (stdlib only)│
│   The window you see        │◄──────►│   scanning + copying engine  │
│   i18n: EN / AR / RU / ZH   │        │   core.py + languages.py    │
└─────────────────────────────┘        └──────────────────────────────┘
```

- **UI** — an Electron + React + TypeScript desktop interface: frameless window,
  live activity log, themes, keyboard shortcuts.
- **Engine** — a small Python server (`engine/server.py`) that does all the
  scanning and copying in a background process. It runs on the **Python
  standard library only** — zero external dependencies.
- The UI speaks to the engine over local IPC; the engine streams progress and
  log lines back in real time.

---

## Local-first and private

- All scanning, cleaning, and flattening happens **on your machine**.
- No telemetry, no analytics, no update check-ins.
- The only outbound action is an explicit click on a link in the About/Report
  pages, which just opens your browser.
- Your source project is **read-only** for RepoPrep — it never deletes,
  moves, or rewrites a single file in it.

---

## Interface languages

RepoPrep ships in **4 languages**, switchable from the title bar or Settings:

- English
- Arabic (RTL-friendly)
- Russian
- Simplified Chinese

---

## Themes and shortcuts

- **Themes** — System / Light / Dark.
- **Shortcuts** — every main action (scan, clean, flatten, cancel, ...) is
  remappable from Settings.

---

## Getting started

### For users

1. Run `RepoPrep Setup 2.2.1.exe`.
2. Pick your language and install location.
3. Open the app, choose a project folder, and hit **Scan** or **Smart Clean**.

### For developers

```bash
cd electron
npm install          # install dependencies (Node 20+)
npm start            # build the TS/TSX, then launch Electron
npm run dist         # build and package the Windows installer (NSIS)
```

The engine is plain Python (stdlib only):

```bash
python engine/server.py --port 8765    # start the engine standalone
```

---

## Requirements

| Component | Requirement |
|---|---|
| OS | Windows 10 / 11 (x64) |
| App | No runtime dependencies — bundled in the installer |
| Engine | Python 3.8+ |

---

## FAQ

**Does RepoPrep modify my original project?**
No. RepoPrep only copies files out to an output folder you choose. Your source
is never touched.

**What counts as junk?**
Dependencies, caches, build output, lock files, logs, and generated artifacts —
the things that bloat a codebase without adding information. The 224 language
profiles decide what's safe to drop.

**Can I stop a long operation?**
Yes — Cancel stops any scan or copy without killing the app.

**Does it upload my code anywhere?**
Never. Everything runs locally.

**I keep files I need even though they'd be skipped — what do I do?**
Add them to your Keep List; RepoPrep will keep them even when they'd normally
be skipped.

---

## Version history

| Version | What changed |
|---|---|
| **v1.1.0** (legacy) | Original release. Built on a single Python `tkinter` file with no installers, no icons and no language selector. Shipped straight from source — clean, simple, one file. |
| **v2.2.0** | Full desktop rework — new folder structure, an official installer, real program icons and a multi-language interface (English / Arabic / Russian / Chinese). First version to ship a signed, polished Windows setup. |
| **v2.2.1** (current) | Current release — rebuilt the UI in Electron + React on top of the Python engine, expanded cleanup to 224 languages and frameworks, flat transparent Logo, signed installer published under the Lidprex name. |

The release archive lives at [repoprep.onrender.com/versions.html](https://repoprep.onrender.com/versions.html).

---

## License

MIT — (c) 2026 Lidprex · [lidprex.onrender.com](https://lidprex.onrender.com)