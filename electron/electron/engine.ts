/**
 * RepoPrep engine — bridges to the Python engine (App/engine/server.py).
 * The real scan / clean / flatten work happens in Python (engine.core).
 * This module keeps the exact same API the UI expects (scanProject,
 * runOperation) so the renderer never changes.
 */

import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";

export type LogLevel = "INFO" | "COPY" | "SKIP" | "WARN" | "ERROR" | "DONE" | "SCAN";

export interface ScanStats {
  total_files: number;
  clean_files: number;
  skipped_dirs: number;
  skipped_files: number;
  total_size: number;
  clean_size: number;
  project_type: string;
  skippable: Record<string, number>;
  skippable_files: string[];
}

export interface OperationResult {
  copied: number;
  skipped: number;
}

export interface OperationRequest {
  source: string;
  target: string;
  mode: "clean" | "flatten" | "scan";
  includeImages: boolean;
  keepFiles: string[];
}

type LogCb = (msg: string, level: LogLevel) => void;
type ProgressCb = (pct: number) => void;

interface EngineEvent {
  id: number;
  type: string;
  level?: string;
  msg?: string;
  pct?: number;
  ok?: boolean;
  result?: unknown;
}

interface Pending {
  resolve: (ev: EngineEvent) => void;
  reject: (e: Error) => void;
  onEvent?: (ev: EngineEvent) => void;
}

/**
 * Finds a usable Python interpreter. Plain `python` is often the Windows Store
 * alias stub, so we probe `py` (the Python launcher) before falling back.
 * REPOPREP_PYTHON overrides everything; the result is cached.
 */
function probePython(cmd: string): boolean {
  try {
    const r = spawnSync(cmd, ["-S", "-c", "import sys;sys.exit(0)"], {
      encoding: "utf8",
      timeout: 4000,
      windowsHide: true,
    });
    return r.status === 0;
  } catch {
    return false;
  }
}

let pythonExe: string | undefined;

function resolvePython(): string {
  if (pythonExe) return pythonExe;
  const candidates: string[] = [];
  const override = process.env.REPOPREP_PYTHON;
  if (override) candidates.push(override);
  if (process.platform === "win32") candidates.push("py");
  candidates.push("python3", "python");
  for (const c of candidates) {
    if (probePython(c)) {
      pythonExe = c;
      return c;
    }
  }
  pythonExe = "python";
  return pythonExe;
}

const PYTHON = resolvePython();

/**
 * Locates engine/server.py. During development it sits at App/engine/server.py
 * (two levels up from dist-electron). In the packaged app the engine folder is
 * copied to resources/engine by electron-builder's extraResources, so we probe
 * both real-disk candidates. Note: anything inside app.asar is NOT usable here
 * because Python cannot read files out of the asar archive.
 */
function resolveScript(): string {
  const candidates = [
    path.join(__dirname, "..", "..", "engine", "server.py"),
    path.join(process.resourcesPath ?? "", "engine", "server.py"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return candidates[1];
}

const SCRIPT = resolveScript();

let proc: ChildProcess | undefined;
let lines: readline.Interface | undefined;
let seq = 0;
let cancelled = false;
const pending = new Map<number, Pending>();

function failAll(err: Error): void {
  for (const [, p] of pending) p.reject(err);
  pending.clear();
}

function start(): void {
  cancelled = false;
  proc = spawn(PYTHON, [SCRIPT], {
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  lines = readline.createInterface({ input: proc.stdout! });
  lines.on("line", (line) => {
    try {
      handle(JSON.parse(line) as EngineEvent);
    } catch {
      /* ignore malformed lines */
    }
  });
  proc.stderr!.on("data", (d) => {
    const s = String(d).trim();
    if (s) console.warn("[engine]", s);
  });
  proc.on("error", (err) => failAll(err));
  proc.on("exit", () => {
    failAll(new Error(cancelled ? "cancelled" : "engine process exited"));
    proc = undefined;
    lines = undefined;
  });
}

/**
 * Terminates the current Python subprocess mid-operation (user cancel).
 * Returns false when nothing is running to cancel.
 */
export function cancelCurrent(): boolean {
  if (!proc || !proc.pid) return false;
  cancelled = true;
  proc.kill();
  return true;
}

function handle(ev: EngineEvent): void {
  const p = pending.get(ev.id);
  if (!p) return;
  if (ev.type === "log" || ev.type === "progress") {
    p.onEvent?.(ev);
    return;
  }
  pending.delete(ev.id);
  if (ev.type === "error") p.reject(new Error(ev.msg || "engine error"));
  else p.resolve(ev);
}

function send(
  cmd: string,
  payload: Record<string, unknown>,
  onEvent?: (ev: EngineEvent) => void
): Promise<EngineEvent> {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onEvent });
    try {
      if (!proc) start();
      proc!.stdin!.write(`${JSON.stringify({ id, cmd, ...payload })}\n`);
    } catch (e) {
      pending.delete(id);
      reject(e as Error);
    }
  });
}

export async function scanProject(
  sourceDir: string,
  includeImages: boolean = false,
  keepFiles: string[] = []
): Promise<ScanStats> {
  const ev = await send("scan", {
    source: sourceDir,
    include_images: includeImages,
    keep_files: keepFiles,
  });
  return (ev.result as ScanStats) ?? {
    total_files: 0,
    clean_files: 0,
    skipped_dirs: 0,
    skipped_files: 0,
    total_size: 0,
    clean_size: 0,
    project_type: "Generic",
    skippable: {},
    skippable_files: [],
  };
}

export type RunResult = OperationResult | { cancelled: true } | null;

export async function runOperation(
  req: OperationRequest,
  logCb: LogCb,
  progressCb: ProgressCb
): Promise<RunResult> {
  try {
    const ev = await send(
      "run",
      {
        source: req.source,
        target: req.target,
        mode: req.mode,
        include_images: req.includeImages,
        keep_files: req.keepFiles,
      },
      (e) => {
        if (e.type === "log") logCb(String(e.msg ?? ""), (e.level as LogLevel) || "INFO");
        else if (e.type === "progress" && typeof e.pct === "number") progressCb(e.pct);
      }
    );
    return (ev.result as OperationResult) ?? null;
  } catch (e) {
    if (String((e as Error)?.message).toLowerCase().includes("cancelled")) {
      return { cancelled: true };
    }
    return null;
  }
}