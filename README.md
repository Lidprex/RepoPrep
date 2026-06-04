# RepoPrep Pro v2.2.0

**Professional Project Cleaner & AI Context Preparer** — Built by [Lidprex Labs](https://lidprex-labs.onrender.com)

> Remove node_modules, flatten codebases for ChatGPT/Claude, and ship clean projects to GitHub — in one click.

---

## What is RepoPrep?

RepoPrep is a standalone Windows tool that cleans project folders and prepares them for AI workflows. It removes junk files (node_modules, venv, __pycache__), flattens your entire codebase into a single folder for uploading to ChatGPT or Claude, and reduces project size from 70MB+ down to a few MB.

Built for developers who work with LLMs and large codebases (100,000+ files).

---

## Download

| Version | Size | Requirements |
|---------|------|--------------|
| [v2.2.0 (Latest)](https://repoprep.onrender.com) | 11MB | None — Standalone EXE |
| v1.1.0 (Legacy) | 70MB | Python 3.10+ |

---

## Why RepoPrep?

- **Before uploading to ChatGPT/Claude** — flatten 500 files into one folder instantly
- **Before pushing to GitHub** — remove build artifacts and secrets
- **Before sharing a project** — reduce size from 70MB to under 15MB automatically

---

## Features

| Feature | v1.1.0 | v2.2.0 |
|---------|--------|--------|
| File Size | 70MB | 11MB |
| Python Required | Yes | No |
| AI Flatten Mode | No | Yes |
| Languages | English | EN, AR, FR, ZH |
| Startup Speed | 3-4s | 0.5s |

### AI Flatten Mode
Copies all source files into a single flat folder — removes folder depth so you can upload an entire project to ChatGPT, Claude, or Gemini in one paste.

### Smart Clean
Automatically removes:
- **Dependencies:** `node_modules`, `venv`, `.gradle`, `site-packages`
- **Builds:** `dist`, `build`, `target`, `bin`, `out`
- **Caches:** `__pycache__`, `.next`, `.nuxt`, `.pytest_cache`
- **Locks:** `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`
- **System/Logs:** `.log`, `.tmp`, `.DS_Store`, `Thumbs.db`

### Operation Modes

| Mode | What it does | Best for |
|------|-------------|----------|
| Flatten & Prepare for AI | Copies all files into one flat folder | ChatGPT / Claude uploads |
| Smart Clean | Removes junk, keeps folder structure | GitHub pushes |
| Scan Only | Analyzes without touching files | Pre-clean check |

---

## Quick Start

```bash
# Run from source
python main.py

# Build .exe (requires pyinstaller)
build.bat
```

## System Requirements

- Windows 10 / 11 (64-bit)
- Standalone .exe — no Python or runtime needed
- 4GB RAM recommended for large projects

---

## Related Tools

- [LidBridge](https://lidbridge.onrender.com) — Clean and push projects to GitHub in one click
- [Lidprex](https://lidprex.onrender.com) — Parent company

---

## License

MIT License — © 2026 Lidprex Labs

*"Building products with reputation, not noise."*
