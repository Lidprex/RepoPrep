# -*- coding: utf-8 -*-
"""
Cleaning rules for RepoPrep, plus scan/run logic.

There's no GUI here on purpose. The Electron app spawns this process and
drives it over stdio JSON lines; all file work happens in this file.

Speed notes: we stream the tree with os.scandir (no giant Path lists), cut
off junk folders the moment we meet them, and skip per-file stats on nothing
but sizes we actually need.
"""

import fnmatch
import gc
import os
import re
import shutil
from pathlib import Path
from datetime import datetime

import languages as langs_db

# ── Generic junk, junk in any project ──────────────────────────────────

SKIP_DIRS = {
    ".git", ".svn", ".hg", ".bzr",
    ".idea", ".vscode", ".vs", ".sublime-project", ".sublime-workspace",
    "__pycache__", ".pytest_cache", ".mypy_cache", ".coverage",
    ".tox", ".hypothesis", ".eggs",
    "node_modules", ".npm", ".yarn", ".pnp", ".pnpm-store",
    "dist", "build", "target", "out", "bin", "obj",
    ".next", ".nuxt", ".gatsby", "next", "nuxt",
    "venv", ".venv", "env", "ENV", "virtualenv",
    ".gradle", ".m2",
    "Pods", ".xcworkspace", ".xcodeproj",
    "site-packages", "dist-packages", ".nyc_output", "coverage",
    ".DS_Store", "__MACOSX",
    ".ipynb_checkpoints", ".dvc", ".dlang",
    "wandb", ".wandb", "mlruns", ".mlflow",
}

SKIP_EXTENSIONS = {
    ".log", ".tmp", ".bak", ".swp", ".swo",
    ".pyc", ".pyo", ".pyd", ".so", ".dll",
    ".class", ".jar", ".o", ".a", ".lib", ".lock",
    ".zip", ".tar", ".gz", ".rar", ".7z", ".exe",
    ".mp4", ".mp3", ".avi", ".mov", ".mkv",
    ".ttf", ".woff", ".woff2", ".eot", ".pdf",
}

SKIP_FILES = {
    ".DS_Store", "Thumbs.db", "desktop.ini",
    "package-lock.json", "yarn.lock", "pnpm-lock.yaml",
    ".env.local", ".env.production", ".env.development",
    ".gitkeep", ".keep",
}

# files that look like credentials — never copied anywhere
SECRET_FILES = {
    ".env", ".npmrc", ".pypirc", ".netrc", ".git-credentials",
    "id_rsa", "id_ed25519", "id_dsa", "id_ecdsa", ".htpasswd",
    "credentials.json", "service-account.json",
    "keystore.jks", "debug.keystore",
}
SECRET_GLOBS = (".env.*", "*.key", "*.pem", "*.p12", "*.pfx", "*.jks", "*.keystore")

IMAGE_EXT = {".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp", ".bmp"}


# ── Pattern helpers ────────────────────────────────────────────────────

def _has_glob(p):
    return any(ch in p for ch in "*?[")


def _SetSpec(patterns):
    """Split a pattern list into exact names + compiled glob regexes."""
    exact = set()
    rxs = []
    for p in patterns:
        if _has_glob(p):
            rxs.append(re.compile(fnmatch.translate(p)))
        else:
            exact.add(p)
    return exact, rxs


def _in_spec(name, spec):
    exact, rxs = spec
    if name in exact:
        return True
    for rx in rxs:
        if rx.match(name):
            return True
    return False


# ── Manifest index ─────────────────────────────────────────────────────

_MANIFEST_EXACT = {}
_MANIFEST_RXS = []
for _lang in langs_db.LANGUAGES:
    _name = _lang[0]
    for _pat in _lang[1]:
        if _has_glob(_pat):
            _MANIFEST_RXS.append((re.compile(fnmatch.translate(_pat)), _name))
        else:
            _MANIFEST_EXACT.setdefault(_pat, _name)


def detect_languages(source):
    """Best-guess list of languages in a folder (root-level manifests)."""
    counts = {}
    try:
        it = os.scandir(source)
    except OSError:
        return []
    with it:
        for e in it:
            try:
                if not e.is_file(follow_symlinks=False):
                    continue
            except OSError:
                continue
            name = e.name
            hit = _MANIFEST_EXACT.get(name)
            if hit:
                counts[hit] = counts.get(hit, 0) + 1
                continue
            for rx, lang in _MANIFEST_RXS:
                if rx.match(name):
                    counts[lang] = counts.get(lang, 0) + 1
                    break
    if not counts:
        return []
    return [k for k, _ in sorted(counts.items(), key=lambda kv: kv[1],
                                 reverse=True)]


def detect_type(path):
    langs = detect_languages(str(path))
    return langs[0] if langs else "Generic"


def _lang_junk(langs):
    dirs, files = set(), set()
    for name in langs:
        info = langs_db.NAME_TO_LANG.get(name)
        if not info:
            continue
        dirs.update(info[2])
        files.update(info[3])
    return dirs, files


# ── Tree walking ───────────────────────────────────────────────────────

def _walk(root, dir_exact, dir_rxs):
    """Stream the tree, pruning junk folders.

    Yields ("f", rel_parts, abs_path) for files and
           ("d", rel_parts, abs_path) for junk folders (not walked into).
    """
    stack = [(root, ())]
    while stack:
        cur, parts = stack.pop()
        try:
            it = os.scandir(cur)
        except OSError:
            continue
        with it:
            for e in it:
                name = e.name
                rel = parts + (name,)
                try:
                    if e.is_file(follow_symlinks=False):
                        yield "f", rel, e.path
                        continue
                    if not e.is_dir(follow_symlinks=False):
                        continue
                except OSError:
                    continue
                if name in dir_exact or any(rx.match(name) for rx in dir_rxs):
                    yield "d", rel, e.path
                else:
                    stack.append((e.path, rel))


def _count_deep(root):
    """Count files under a folder without stat-ing or building objects."""
    total = 0
    stack = [root]
    while stack:
        cur = stack.pop()
        try:
            it = os.scandir(cur)
        except OSError:
            continue
        with it:
            for e in it:
                try:
                    if e.is_file(follow_symlinks=False):
                        total += 1
                    elif e.is_dir(follow_symlinks=False):
                        stack.append(e.path)
                except OSError:
                    continue
    return total


_DIR_STAT_CAP = 20000


def _dir_stats(root):
    """file count + byte size for a folder, capped so scans stay quick."""
    files = 0
    size = 0
    stack = [root]
    while stack and files < _DIR_STAT_CAP:
        cur = stack.pop()
        try:
            it = os.scandir(cur)
        except OSError:
            continue
        with it:
            for e in it:
                if files >= _DIR_STAT_CAP:
                    break
                try:
                    if e.is_file(follow_symlinks=False):
                        files += 1
                        size += e.stat().st_size
                    elif e.is_dir(follow_symlinks=False):
                        stack.append(e.path)
                except OSError:
                    continue
    return files, size


# ── Scan / run ─────────────────────────────────────────────────────────

def scan_project(source_dir, include_images=False, keep_files=None):
    root = str(source_dir)
    langs = detect_languages(root)
    lang_dirs, lang_files = _lang_junk(langs)
    dir_spec = _SetSpec(SKIP_DIRS | lang_dirs)
    file_spec = _SetSpec(SKIP_FILES | lang_files | SECRET_FILES)
    skip_ext = SKIP_EXTENSIONS | (set() if include_images else IMAGE_EXT)
    keep = set(keep_files or [])

    stats = {
        "total_files": 0, "clean_files": 0,
        "skipped_dirs": 0, "skipped_files": 0,
        "total_size": 0, "clean_size": 0,
        "project_type": langs[0] if langs else "Generic",
        "langs": langs,
        "skippable": {}, "skippable_files": [],
    }
    seen_dirs = set()
    deletable = set()

    for kind, parts, path in _walk(root, *dir_spec):
        name = parts[-1]
        if kind == "d":
            stats["skipped_dirs"] += 1
            if name not in seen_dirs:
                seen_dirs.add(name)
                files, size = _dir_stats(path)
                stats["skippable"][name] = size
                stats["total_files"] += files
                stats["total_size"] += size
            continue

        try:
            size = os.path.getsize(path)
        except OSError:
            size = 0
        stats["total_files"] += 1
        stats["total_size"] += size

        skip = _in_spec(name, file_spec) or Path(name).suffix.lower() in skip_ext
        if name in keep:
            skip = False
        if skip:
            stats["skipped_files"] += 1
            if Path(name).suffix.lower() not in IMAGE_EXT:
                deletable.add(name)
        else:
            stats["clean_files"] += 1
            stats["clean_size"] += size

    stats["skippable_files"] = sorted(deletable)
    return stats


def run_operation(source_dir, target_dir, mode, include_images=False,
                  log_cb=None, progress_cb=None, keep_files=None):
    source = str(source_dir)
    target = str(target_dir)
    langs = detect_languages(source)
    lang_dirs, lang_files = _lang_junk(langs)
    dir_spec = _SetSpec(SKIP_DIRS | lang_dirs)
    file_spec = _SetSpec(SKIP_FILES | lang_files | SECRET_FILES)
    skip_ext = SKIP_EXTENSIONS | (set() if include_images else IMAGE_EXT)
    keep = set(keep_files or [])

    def log(msg, level="INFO"):
        if log_cb:
            log_cb(f"[{datetime.now().strftime('%H:%M:%S')}]  {msg}", level)

    if not os.path.exists(source):
        log("Source folder not found.", "ERROR")
        return False
    try:
        os.makedirs(target, exist_ok=True)
    except OSError as e:
        log(f"Cannot create output: {e}", "ERROR")
        return False

    # Work out the total (and junk-folder file counts) once so the
    # progress bar can be honest without a giant in-memory file list.
    total = 0
    junk_counts = {}
    for kind, parts, path in _walk(source, *dir_spec):
        if kind == "f":
            total += 1
        else:
            c = _count_deep(path)
            junk_counts[path] = c
            total += c

    copied = 0
    skipped = 0
    done = 0
    name_cnt = {}

    def unique(fname):
        if fname not in name_cnt:
            name_cnt[fname] = 0
            return fname
        name_cnt[fname] += 1
        stem, ext = os.path.splitext(fname)
        return f"{stem}__{name_cnt[fname]}{ext}"

    log(f"Found {total} files — processing...", "INFO")

    skipped_dirs_logged = set()
    BATCH = 75
    last_log = 0

    for kind, parts, path in _walk(source, *dir_spec):
        name = parts[-1]
        if kind == "d":
            if name not in skipped_dirs_logged:
                skipped_dirs_logged.add(name)
                log(f"Skip  {name}/  (directory skipped)", "SKIP")
            c = junk_counts.get(path, _count_deep(path))
            skipped += c
            done += c
            if progress_cb and total > 0:
                progress_cb(int(done / total * 100))
            continue

        skip = _in_spec(name, file_spec) or Path(name).suffix.lower() in skip_ext
        if name in keep:
            skip = False
        done += 1

        if skip:
            skipped += 1
        else:
            if mode == "flatten":
                dest = os.path.join(target, unique(name))
            else:
                dest = os.path.join(target, *parts)
                os.makedirs(os.path.dirname(dest), exist_ok=True)
            try:
                shutil.copy2(path, dest)
                copied += 1
            except OSError as e:
                log(f"Error {name}: {e}", "WARN")
                skipped += 1

        if progress_cb and total > 0:
            progress_cb(int(done / total * 100))

        if done - last_log >= BATCH:
            log(f"Progress  {done}/{total}  —  copied {copied}, skipped {skipped}", "INFO")
            last_log = done
            gc.collect()

    if progress_cb and total > 0:
        progress_cb(100)
    log(f"Done — {copied} copied, {skipped} skipped.", "DONE")
    return {"copied": copied, "skipped": skipped}