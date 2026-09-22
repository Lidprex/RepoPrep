import * as fs from "node:fs";
import * as path from "node:path";
import { spawn } from "node:child_process";
import { app, BrowserWindow, dialog, ipcMain, Menu, Notification, screen, shell, Tray } from "electron";
import { scanProject, runOperation, cancelCurrent, type OperationRequest, type LogLevel, type OperationResult } from "./engine";

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let running = false;
let isQuitting = false;
let startupPath: string | null = null;
let installedLang: string | null = null;

const APP_LANGS = ["en", "ar", "ru", "zh"] as const;
const APP_ICON = path.join(__dirname, "..", "icon.ico");

interface WindowState {
  x?: number | undefined;
  y?: number | undefined;
  width: number;
  height: number;
  maximized: boolean;
}

const DEFAULT_STATE: WindowState = { width: 1320, height: 840, maximized: false };

/* ---------------------------------------------------------------------------
 * Installer-persisted config — %APPDATA%\RepoPrep\config.json
 * Written by the NSIS installer with the language picked in the installer UI.
 * ------------------------------------------------------------------------- */
function installedConfigPath(): string {
  return path.join(process.env.APPDATA ?? app.getPath("appData"), "RepoPrep", "config.json");
}

function readInstalledLang(): string | null {
  try {
    const cfgPath = installedConfigPath();
    if (!fs.existsSync(cfgPath)) return null;
    const parsed = JSON.parse(fs.readFileSync(cfgPath, "utf8")) as { lang?: unknown };
    const lang = String(parsed.lang ?? "").toLowerCase();
    return (APP_LANGS as readonly string[]).includes(lang) ? lang : null;
  } catch {
    return null;
  }
}

/* Find the folder passed on the command line (Explorer context-menu launch). */
function detectFolderArg(argv: string[]): string | null {
  for (const arg of argv.slice(1)) {
    if (arg.startsWith("-")) continue;
    try {
      if (fs.statSync(arg).isDirectory()) return arg;
    } catch {
      /* not a folder — keep looking */
    }
  }
  return null;
}

function stateFile(): string {
  return path.join(app.getPath("userData"), "window-state.json");
}

/* ---------------------------------------------------------------------------
 * Completion notification — custom distinctive chime always + Windows toast
 * (shown only when the operation finishes while the user stepped away).
 * ------------------------------------------------------------------------- */
let notifySoundPath: string | null = null;

const NOTIFY_TEXTS: Record<string, { title: string; body: string }> = {
  en: { title: "RepoPrep — Done", body: "Operation finished: {copied} files copied, {skipped} skipped." },
  ar: { title: "RepoPrep — اكتمل", body: "اكتملت العملية: {copied} ملفًا نُسخ، {skipped} عنصرًا تجاوز." },
  ru: { title: "RepoPrep — Готово", body: "Операция завершена: {copied} файлов, {skipped} пропущено." },
  zh: { title: "RepoPrep — 完成", body: "操作完成：已复制 {copied} 个文件，跳过 {skipped} 项。" },
};

function resolveNotifySound(): string | null {
  if (notifySoundPath) return notifySoundPath;
  const src = path.join(__dirname, "..", "assets", "notification.wav");
  if (!fs.existsSync(src)) return null;
  // Assets live inside app.asar (not a real path .NET can open), so copy to
  // userData once and play from there.
  const dest = path.join(app.getPath("userData"), "notification.wav");
  try {
    fs.copyFileSync(src, dest);
    notifySoundPath = dest;
  } catch {
    notifySoundPath = null;
  }
  return notifySoundPath;
}

function playNotificationSound(): void {
  const file = resolveNotifySound();
  if (!file) {
    shell.beep();
    return;
  }
  const ps = spawn(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-WindowStyle",
      "Hidden",
      "-Command",
      `(New-Object System.Media.SoundPlayer '${file.replace(/'/g, "''")}').PlaySync()`,
    ],
    { windowsHide: true, stdio: "ignore" }
  );
  ps.unref();
}

function notifyOperationDone(result: OperationResult): void {
  const target = win;
  const away = !target || target.isDestroyed() || !target.isFocused();

  // The chime always plays on completion — even when the window is focused.
  // This is the app's primary "operation finished" cue; the silent toast is
  // reserved for when the user stepped away from the window.
  playNotificationSound();

  if (!away) return;

  if (Notification.isSupported()) {
    const lang = (installedLang && installedLang in NOTIFY_TEXTS ? installedLang : "en") as keyof typeof NOTIFY_TEXTS;
    const txt = NOTIFY_TEXTS[lang];
    const body = txt.body
      .replace("{copied}", String(result.copied))
      .replace("{skipped}", String(result.skipped));
    const notification = new Notification({
      title: txt.title,
      body,
      silent: true, // the custom chime already played — avoid the system sound
    });
    notification.on("click", () => showWindow());
    notification.show();
  }
}

function loadWindowState(): WindowState {
  try {
    const parsed = JSON.parse(fs.readFileSync(stateFile(), "utf8")) as WindowState;
    return {
      width: Math.max(parsed.width ?? 1320, 1040),
      height: Math.max(parsed.height ?? 840, 680),
      maximized: Boolean(parsed.maximized),
      x: typeof parsed.x === "number" ? parsed.x : undefined,
      y: typeof parsed.y === "number" ? parsed.y : undefined,
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function stateInWorkArea(state: WindowState): boolean {
  if (state.x === undefined || state.y === undefined) return true;
  try {
    const wa = screen.getDisplayMatching({
      x: state.x,
      y: state.y,
      width: state.width,
      height: state.height,
    }).workArea;
    return (
      state.x < wa.x + wa.width - 80 &&
      state.y < wa.y + wa.height - 80 &&
      state.x + state.width > wa.x + 80 &&
      state.y + state.height > wa.y + 80
    );
  } catch {
    return false;
  }
}

function saveWindowState(): void {
  if (!win || win.isDestroyed()) return;
  const b = win.isMaximized() ? win.getNormalBounds() : win.getBounds();
  const state: WindowState = {
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    maximized: win.isMaximized(),
  };
  try {
    fs.writeFileSync(stateFile(), JSON.stringify(state));
  } catch {
    /* ignore — non-fatal */
  }
}

function showWindow(): void {
  if (!win || win.isDestroyed()) {
    createWindow();
    return;
  }
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function createTray(): void {
  tray = new Tray(APP_ICON);
  tray.setToolTip("RepoPrep — clean & flatten codebases");

  const menu = Menu.buildFromTemplate([
    {
      label: "Show RepoPrep",
      click: () => showWindow(),
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
  tray.on("click", () => showWindow());
}

/* Called when a folder arrives from the context menu on an already-running app. */
function handleOpenPath(p: string): void {
  if (win && !win.isDestroyed()) {
    showWindow();
    win.webContents.send("evt", { type: "openPath", path: p });
    return;
  }
  startupPath = p;
}

function createWindow(): void {
  const st = loadWindowState();
  const usePos = stateInWorkArea(st);
  const startHidden = process.argv.includes("--hidden");

  win = new BrowserWindow({
    x: usePos ? st.x : undefined,
    y: usePos ? st.y : undefined,
    width: st.width,
    height: st.height,
    minWidth: 1040,
    minHeight: 680,
    frame: false,
    backgroundColor: "#0a0e15",
    show: false,
    icon: APP_ICON,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.once("ready-to-show", () => {
    if (st.maximized) win?.maximize();
    if (!startHidden) win?.show();
  });
  win.on("closed", () => {
    win = null;
  });
  win.on("maximize", () => win?.webContents.send("evt", { type: "max", value: true }));
  win.on("unmaximize", () => win?.webContents.send("evt", { type: "max", value: false }));

  let saveTimer: NodeJS.Timeout | undefined;
  const scheduleSave = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveWindowState, 400);
  };
  win.on("resize", scheduleSave);
  win.on("move", scheduleSave);

  /* Close hides to tray instead of quitting; only tray "Quit" exits for real. */
  win.on("close", (e) => {
    saveWindowState();
    if (!isQuitting) {
      e.preventDefault();
      win?.hide();
    }
  });

  win.loadFile(path.join(__dirname, "..", "dist", "index.html"));
}

function pickDir(title: string): Promise<string | null> {
  if (!win) return Promise.resolve(null);
  return dialog
    .showOpenDialog(win, { title, properties: ["openDirectory", "createDirectory"] })
    .then((res) => (res.canceled || res.filePaths.length === 0 ? null : res.filePaths[0]));
}

/* ---------------------------------------------------------------------------
 * Single instance: a second launch (e.g. from Explorer) focuses the existing
 * window instead of starting a second process.
 * ------------------------------------------------------------------------- */
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (_event, argv) => {
    const p = detectFolderArg(argv);
    if (p) handleOpenPath(p);
    else showWindow();
  });

  app.whenReady().then(() => {
    app.setAppUserModelId("com.lidprex.repoprep");

    installedLang = readInstalledLang();
    startupPath = detectFolderArg(process.argv);

    /* Auto-start on Windows login. Args keep it minimized into the tray. */
    if (app.isPackaged) {
      app.setLoginItemSettings({
        openAtLogin: true,
        path: process.execPath,
        args: ["--hidden"],
      });
    }

    createTray();
    createWindow();

    ipcMain.handle("dialog:source", () => pickDir("Source — project folder"));
    ipcMain.handle("dialog:target", () => pickDir("Output — where results will be saved"));
    ipcMain.handle("engine:scan", (_e, src: string, includeImages: boolean, keepFiles: string[]) =>
      scanProject(src, includeImages, keepFiles ?? [])
    );
    ipcMain.handle("engine:open", (_e, p: string) => shell.openPath(p).then(() => true));
    ipcMain.handle("shell:open-external", (_e, url: string) => shell.openExternal(url));
    ipcMain.handle("engine:pathinfo", async (_e, p: string) => {
      try {
        const st = await fs.promises.stat(p);
        if (!st.isDirectory()) return { exists: true, isDir: false, nonEmpty: false };
        const items = await fs.promises.readdir(p);
        return { exists: true, isDir: true, nonEmpty: items.length > 0 };
      } catch {
        return { exists: false, isDir: false, nonEmpty: false };
      }
    });

    ipcMain.handle("app:installed-lang", () => installedLang);
    ipcMain.handle("startup:path", () => startupPath);

    ipcMain.handle("engine:run", async (_e, req: OperationRequest) => {
      if (running) return { error: "busy" };
      running = true;
      try {
        const target = win;
        const send = (evt: { type: string; [k: string]: unknown }) =>
          target?.webContents.send("evt", evt);
        const result = await runOperation(
          req,
          (msg, level) => send({ type: "log", level: level as LogLevel, msg }),
          (pct) => send({ type: "progress", value: pct })
        );
        if (result && (result as { cancelled?: boolean }).cancelled) {
          return result;
        }
        send({ type: "done", result });
        if (result && "copied" in result) {
          notifyOperationDone(result as OperationResult);
        }
        return result;
      } finally {
        running = false;
      }
    });

    ipcMain.on("win:min", () => win?.minimize());
    ipcMain.on("engine:cancel", () => {
      cancelCurrent();
    });
    ipcMain.on("win:max", () => {
      if (!win) return;
      if (win.isMaximized()) win.unmaximize();
      else win.maximize();
    });
    ipcMain.on("win:close", () => win?.close());
  });

  app.on("before-quit", () => {
    isQuitting = true;
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}