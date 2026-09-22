# Security Policy

RepoPrep is a local desktop tool: it reads a project folder, copies a filtered
version out, and writes it to the output folder you choose. It doesn't phone
home, it doesn't upload your code, and it never deletes anything from your
source project. That stays true — and if something ever breaks it, that's a
security issue worth telling us about.

## Reporting a vulnerability

**Don't open a public GitHub issue for security problems.** Send a private
report instead:

- Report page: <https://lidprex.onrender.com/support/report?product=repoprep>
- Email: [support.lidprex@gmail.com](mailto:support.lidprex@gmail.com)

Try to include:

- What you did and what happened
- A minimal way to reproduce it (folder layout can be enough)
- What the potential impact is
- A suggested fix if you have one

We read these promptly and will work with you before anything goes public.

## Supported versions

| Version | Supported |
|---|---|
| v2.2.x | Yes |
| v2.1.x and older | No |

The current release is **v2.2.1**.

## What the app does (and doesn't do)

### Local-first

- All scanning, cleaning, and flattening happens on your machine via the local
  Python engine (`engine/core.py`).
- There are no telemetry, analytics, or update checks in the app.
- The only network navigation is an explicit click on a link in the
  About/Report pages, which just opens your browser.

### Source safety

- The engine copies (`shutil.copy2`) files into the output folder only.
- The original project is never modified in place — "Scan Only" doesn't even
  write to the output folder.

### Files that never leave the project

The skip rules in `core.py` are also a privacy feature: dependency folders,
build output, caches, lock files, archives, and environment files
(`.env.local`, `.env.production`, `.env.development`) are dropped before
anything is copied, so credentials and generated artifacts don't end up in the
cleaned copy or a paste into an LLM.

### Keeping the engine honest

- The UI has no file access path of its own; everything goes through the engine
  process over stdio.
- `REPOPREP_PYTHON` lets users point at a specific interpreter, but the engine
  itself runs from the code you deploy with the app — there's no remote code
  execution surface.

## Build integrity

- Releases are tagged and published from this repository source.
- The Windows EXE is built from the same `npm run build` pipeline used locally.
- Always prefer the official download page over third-party mirrors.

## If you find something

Ping the report page or email above. Include "security" in the subject if you
can. Even if it turns out to be a false positive, we'd rather know than miss
it.