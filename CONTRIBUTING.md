# Contributing to RepoPrep

Appreciate you wanting to help. This is a small two-part project — an Electron
UI on top of a Python engine — so most contributions land in one of those two
places.

## Project layout

```
App/
├─ engine/                  Python engine (no external deps, stdlib only)
│  ├─ core.py               scan + clean/flatten rules
│  └─ server.py             JSON-lines server over stdio
└─ electron/
   ├─ electron/
   │  ├─ main.ts            main process (window, dialogs, IPC)
   │  ├─ preload.ts         window.repoprep bridge
   │  └─ engine.ts          spawns engine/python, maps events → renderer
   └─ src/
      ├─ App.tsx            the whole main screen
      ├─ components/        TitleBar, SettingsModal, LogView, Modal, Icon, KeepFilesPicker
      ├─ i18n/              en / ar / ru / zh
      └─ theme.ts, shortcuts.ts, types.ts, styles.css
```

## Getting started

```bash
git clone https://github.com/Lidprex/RepoPrep-Pro.git
cd RepoPrep-Pro/App/electron
npm install
npm run dev
```

Requires Node 20+ and Python 3.8+. If your default `python` is a stub, set
`REPOPREP_PYTHON=C:\path\to\python.exe` (the engine will honour it).

## Ways to contribute

- **Bugs / feedback** — use the Report section in the app (Settings →
  Report), which opens the Lidprex report page, or open a GitHub issue with the
  log content from the Activity pane attached. Logs matter; "it broke" without
  a log gets parked.
- **Code** — fork, branch, change, test, PR. Keep the PR small if you can;
  unrelated fixes are best split out.
- **Translations** — `electron/src/i18n/{en,ar,ru,zh}.json` must all keep the
  same keys. When you add a string, add it to every file or the type-check on
  `I18nKey` will complain.

## Working rules

- The UI does no file work. Any new operation goes through the engine process
  over stdio; don't bypass it with fs calls in the renderer.
- The source project must never be modified in place — only copied into the
  output folder. Keep it that way.
- Skip rules live in `core.py` (SKIP_DIRS / SKIP_EXTENSIONS / SKIP_FILES).
  Adding a new junk pattern belongs there, not in the renderer.
- No new runtime dependencies for the Python side. It's stdlib-only on purpose.

## Style

- TypeScript: follow the existing patterns, no inline comments unless they
  explain a non-obvious decision, no formatting wars (the codebase is plain
  TSX + CSS, no Tailwind).
- Python: PEP 8, keep it simple, standard library idioms.
- Commit messages: short imperative lines that say what actually changed.
  Examples: `fix: rename flatten collisions so nothing is overwritten`,
  `feat: add Russian translation`, `refactor: batch engine logging`.

## Before you submit

- [ ] `npx tsc -p tsconfig.main.json` and `npx tsc --noEmit -p tsconfig.json` pass
- [ ] `npm run build` builds clean
- [ ] You ran a scan and at least one clean/flatten against a scratch folder
- [ ] No secrets, tokens, or test files committed

By contributing you agree your changes are covered by the MIT license the
project uses.