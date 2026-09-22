# Testing RepoPrep

RepoPrep is an Electron app: a **React + TypeScript** renderer and a **Python**
engine running in a background process. Both halves are exercised below.

## Prerequisites

- **Node.js** >= 20 (for the Electron side)
- **Python** >= 3.8 (for the engine; Python 3.8+ of the standard library only)
- **Windows 10/11** (the target platform; macOS/Linux mostly work for dev)

If `python` on your machine is the Windows Store stub, the engine probes `py`
first, so make sure either `py --version` or `python --version` responds.

## 1. Install and build

```bash
cd electron
npm install
```

Type-check both halves and build the renderer:

```bash
npx tsc -p tsconfig.main.json          # main process + preload + engine.ts
npx tsc --noEmit -p tsconfig.json      # renderer
npm run build                          # tsc + vite build
```

## 2. Run it

```bash
npm run dev        # vite dev server + Electron (hot reload)
```

or, for a production-shaped run:

```bash
npm start          # build, then launch Electron
```

Expect a frame-less window on the navy theme. The Activity log starts empty
with a `—` placeholder.

## 3. Test the engine directly (no UI)

The engine speaks JSON-lines over stdio, so you can drive it from a shell:

```bash
echo {"id":1,"cmd":"ping"} | python ..\engine\server.py
# -> {"id": 1, "type": "pong", "version": "2.2.1"}

echo {"id":2,"cmd":"scan","source":"C:/some/project","include_images":false} | python ..\engine\server.py
```

For a hands-on check, create a temp folder with `node_modules/x.js`,
`__pycache__/y.pyc`, a `package.json`, and a stray `Thumbs.db`, then run a scan
and a clean. Confirm:

- `skipped_dirs` counts the junk dirs, `skipped_files` counts junk files.
- `clean_files` / `clean_size` reflect only the surviving files.
- A clean run into a target folder produces the same folder tree, without the
  junk, and leaves the source untouched.
- A flatten run puts everything flat, renaming collisions as `name__1.ext`.

## 4. Manual test pass (the short version)

| Area | Check |
|---|---|
| Paths | Source/Output pickers open the folder dialog; both fields accept typed paths |
| Scan | With no output path, Scan works from source alone and shows stats |
| Modes | Clean keeps structure, Flatten flattens, Scan Only writes nothing |
| Include images | Off drops `.png/.jpg/...`; on copies them |
| Keep list | Pin a file that would be skipped; it survives the operation |
| Cancel | Start a large clean, hit Cancel — run stops, log says user cancelled |
| Log | Copy / Save buttons work; Open folder jumps to the output |
| Settings | Language switches instantly (EN/AR/RU/ZH, RTL mirrors layout in AR); theme follows system; shortcuts remap and reset |
| Report | "Report an issue" opens the Lidprex report page in your default browser |
| Window | State (size/position/maximized) survives a restart |

## 5. Build the EXE

```bash
npx electron-packager . RepoPrep-Pro --platform=win32 --arch=x64 --icon=icon.ico --out=release
```

Run the produced EXE from a clean copy of a real project (e.g. one with a big
`node_modules`) and watch memory/perf — flattening 100k files is the heaviest
path and where the batch logging + `gc.collect()` in `core.py` earn their keep.

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Window opens but every action errors | Engine couldn't start; set `REPOPREP_PYTHON` to a known-good `python.exe` and retry |
| `tsc` fails in `engine.ts` | You're on an old Node without a current `@types/node`; `npm install` |
| Nothing happens on Run, log stays empty | A previous engine process may be wedged; restart the app (engine is respawned lazily) |
| Arabic/RTL looks off | Known cosmetic area; layout is RTL-ready but not pixel-perfect in every dialog |