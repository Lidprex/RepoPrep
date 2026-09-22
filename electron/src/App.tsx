import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import type {
  Lang,
  LogEntry,
  LogLevel,
  Mode,
  OperationResult,
  ScanStats,
  I18nKey,
  SettingsCat,
} from "./types";
import { i18nDict, fmt } from "./i18n";
import { TitleBar, formatStats } from "./components/TitleBar";
import { LogView } from "./components/LogView";
import { Modal } from "./components/Modal";
import { KeepFilesPicker } from "./components/KeepFilesPicker";
import { SettingsModal } from "./components/SettingsModal";
import { Icon } from "./components/Icon";
import type { Theme } from "./theme";
import { applyTheme, loadTheme, saveTheme, watchSystem } from "./theme";
import type { ShortcutAction, Shortcut } from "./shortcuts";
import { loadShortcuts, saveShortcuts, shortcutMatches, SHORTCUT_DEFAULTS } from "./shortcuts";

type ModalState =
  | { kind: "overwrite"; tgt: string }
  | { kind: "warn"; msg: string }
  | { kind: "err" }
  | { kind: "ok"; copied: number; skipped: number; target: string }
  | { kind: "reset" }
  | { kind: "resetdone" }
  | null;

const MODES: { val: Mode; icon: "trash" | "folderOpen" | "scan"; color: string }[] = [
  { val: "clean", icon: "trash", color: "#4f8eff" },
  { val: "flatten", icon: "folderOpen", color: "#2fe6a0" },
  { val: "scan", icon: "scan", color: "#ffb454" },
];

function defaultTarget(source: string): string {
  const i = Math.max(source.lastIndexOf("\\"), source.lastIndexOf("/"));
  if (i < 0) return `${source}_prepared`;
  return `${source.slice(0, i)}${source.slice(i)}_prepared`;
}

export default function App() {
  const [lang, setLang] = useState<Lang>(() => (localStorage.getItem("lang") as Lang) || "en");
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [shortcuts, setShortcuts] = useState(loadShortcuts);
  const [source, setSource] = useState("");
  const [target, setTarget] = useState("");
  const [sourceErr, setSourceErr] = useState(false);
  const [sourceTouched, setSourceTouched] = useState(false);
  const [mode, setMode] = useState<Mode>("clean");
  const [includeImages, setIncludeImages] = useState(false);
  const [keepFiles, setKeepFiles] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem("repoprep.keep");
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === "string")
        : [];
    } catch {
      return [];
    }
  });
  const [stats, setStats] = useState<ScanStats | null>(null);
  const [statsErr, setStatsErr] = useState<string | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [modal, setModal] = useState<ModalState>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsCat, setSettingsCat] = useState<SettingsCat>("general");
  const [dragActive, setDragActive] = useState(false);
  const [showLog, setShowLog] = useState(true); // التحكم في إظهار/إخفاء الـ Log
  const runReq = useRef<{ source: string; target: string; mode: Mode; includeImages: boolean; keepFiles: string[] } | null>(null);
  const dragDepth = useRef(0);
  const chord = useRef<{ action: ShortcutAction } | null>(null);
  const busyRef = useRef(false);
  const keepRef = useRef<string[]>([]);
  busyRef.current = running || scanning;
  keepRef.current = keepFiles;

  const t = (k: I18nKey) => i18nDict(lang)[k];

  useEffect(() => {
    localStorage.setItem("repoprep.keep", JSON.stringify(keepFiles));
  }, [keepFiles]);

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    document.title = i18nDict(lang).app_title;
    localStorage.setItem("lang", lang);
  }, [lang]);

  /* First launch: adopt the language picked in the NSIS installer
     (persisted to %APPDATA%\RepoPrep\config.json) instead of defaulting to English. */
  useEffect(() => {
    if (localStorage.getItem("lang")) return;
    let cancelled = false;
    window.repoprep
      .getInstalledLang()
      .then((l) => {
        if (!cancelled && l && (l === "en" || l === "ar" || l === "ru" || l === "zh")) {
          setLang(l as Lang);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  /* Launched via Explorer "Open with RepoPrep" — auto-select the passed folder. */
  useEffect(() => {
    let cancelled = false;
    window.repoprep
      .getStartupPath()
      .then((p) => {
        if (!cancelled && p) void trySource(p);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);
    let off: () => void = () => {};
    if (theme === "system") off = watchSystem(() => applyTheme("system"));
    return off;
  }, [theme]);

  useEffect(() => {
    const off = window.repoprep.onEvent((evt) => {
      switch (evt.type) {
        case "max":
          setIsMaximized(Boolean(evt.value));
          break;
        case "log":
          setEntries((prev) => [...prev, { level: evt.level as LogLevel, msg: String(evt.msg) }]);
          break;
        case "progress":
          setProgress(Number(evt.value));
          break;
        case "openPath":
          if (typeof evt.path === "string") void trySource(evt.path);
          break;
        case "done": {
          const r = evt.result as OperationResult | null;
          const req = runReq.current;
          setRunning(false);
          if (r && req) {
            setProgress(100);
            setModal({ kind: "ok", copied: r.copied, skipped: r.skipped, target: req.target });
          } else {
            setProgress(0);
            setModal({ kind: "err" });
          }
          break;
        }
      }
    });
    return off;
  }, []);

  function pushLog(msg: string, level: LogLevel = "INFO") {
    setEntries((prev) => [...prev, { level, msg }]);
  }

  async function runScan(src: string, inc: boolean, keep: string[] = keepRef.current) {
    if (busyRef.current) return;
    if (!src) {
      setSourceErr(true);
      return;
    }
    setScanning(true);
    setStatsErr(null);
    pushLog(fmt(t("scan_start"), { src }), "SCAN");
    try {
      const s = (await window.repoprep.scan(src, inc, keep)) as ScanStats;
      setStats(s);
      const mb = (n: number) => (n / 1048576).toFixed(1);
      pushLog("─".repeat(52), "INFO");
      pushLog(`${t("scan_type")} : ${s.project_type}`, "SCAN");
      pushLog(`${t("scan_total")} : ${s.total_files} files  (${mb(s.total_size)} MB)`, "SCAN");
      pushLog(`${t("scan_after")} : ${s.clean_files} files  (${mb(s.clean_size)} MB)`, "SCAN");
      pushLog(
        `${t("scan_dirs")} : ${s.skipped_dirs}   ${t("scan_files_s")}: ${s.skipped_files}`,
        "SCAN"
      );
      const top: Array<[string, number]> = Object.entries(s.skippable)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);
      for (const [d, sz] of top) pushLog(`  skip  ${d}/  (${mb(sz)} MB)`, "SKIP");
    } catch (e) {
      setStatsErr(String(e));
      pushLog(`Scan error: ${String(e)}`, "ERROR");
    } finally {
      setScanning(false);
    }
  }

  async function trySource(p: string) {
    const info = await window.repoprep.pathInfo(p);
    if (!info.exists || !(info as { isDir?: boolean }).isDir) {
      setModal({ kind: "warn", msg: t("drop_warn") });
      return;
    }
    setSource(p);
    setSourceErr(false);
    setSourceTouched(true);
    if (!target) setTarget(defaultTarget(p));
    await runScan(p, includeImages, keepRef.current);
  }

  async function pickSource() {
    if (busyRef.current) return;
    const p = await window.repoprep.selectSource();
    if (!p) return;
    await trySource(p);
  }

  async function pickTarget() {
    if (busyRef.current) return;
    const p = await window.repoprep.selectTarget();
    if (p) setTarget(p);
  }

  function onToggleImages(checked: boolean) {
    if (busyRef.current) return;
    setIncludeImages(checked);
    if (source) void runScan(source, checked, keepRef.current);
  }

  function handleScan() {
    if (busyRef.current) return;
    void runScan(source, includeImages, keepRef.current);
  }

  async function doRun() {
    if (busyRef.current) return;
    if (!source) {
      setSourceErr(true);
      return;
    }
    if (!target) {
      setModal({ kind: "warn", msg: t("warn_no_tgt") });
      return;
    }
    if (target === source) {
      setModal({ kind: "warn", msg: "Source and output must be different folders." });
      return;
    }
    const keep = keepRef.current;
    runReq.current = { source, target, mode, includeImages, keepFiles: keep };
    setRunning(true);
    setProgress(0);
    pushLog("─".repeat(52), "INFO");
    pushLog(`Mode   : ${mode.toUpperCase()}`, "INFO");
    pushLog(`Source : ${source}`, "INFO");
    pushLog(`Output : ${target}`, "INFO");
    if (keep.length > 0) pushLog(`Keep   : ${keep.join(", ")}`, "INFO");
    try {
      const res = await window.repoprep.run({ source, target, mode, includeImages, keepFiles: keep });
      if (res && (res as { cancelled?: boolean }).cancelled) {
        setRunning(false);
        runReq.current = null;
        setProgress(0);
        pushLog(t("cancel_msg"), "WARN");
      } else if (res && (res as { error: string }).error === "busy") {
        setRunning(false);
        setModal({ kind: "warn", msg: "Another operation is already running." });
      }
    } catch (e) {
      setRunning(false);
      pushLog(`Run error: ${String(e)}`, "ERROR");
    }
  }

  function cancelRun() {
    window.repoprep.cancel();
  }

  function onCardDragEnter(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    dragDepth.current += 1;
    setDragActive(true);
  }

  function onCardDragOver(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function onCardDragLeave(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragActive(false);
  }

  async function onCardDrop(e: DragEvent<HTMLElement>) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    const p = file ? (file as { path?: string }).path : undefined;
    if (p) await trySource(p);
  }

  async function handleRun() {
    if (busyRef.current) return;
    if (mode === "scan") {
      handleScan();
      return;
    }
    if (!source) {
      setSourceErr(true);
      return;
    }
    if (!target) {
      setModal({ kind: "warn", msg: t("warn_no_tgt") });
      return;
    }
    const info = await window.repoprep.pathInfo(target);
    if (info.exists && info.nonEmpty && target !== source) {
      setModal({ kind: "overwrite", tgt: target });
    } else {
      void doRun();
    }
  }

  function clearLog() {
    setEntries([]);
    setProgress(0);
  }

  function openOutput() {
    if (target) void window.repoprep.openOutput(target);
    else setModal({ kind: "warn", msg: t("no_output") });
  }

  function openSettings(cat: SettingsCat = "general") {
    setSettingsCat(cat);
    setSettingsOpen(true);
  }

  function performReset() {
    setTheme("system");
    saveTheme("system");
    setShortcuts(SHORTCUT_DEFAULTS);
    saveShortcuts(SHORTCUT_DEFAULTS);
    setKeepFiles([]);
    localStorage.removeItem("repoprep.keep");
    localStorage.removeItem("repoprep.leftw_pct");
    localStorage.removeItem("repoprep.leftw");
    setSettingsOpen(false);
    setModal({ kind: "resetdone" });
  }

  const handleShortcut = useCallback(
    (action: ShortcutAction) => {
      switch (action) {
        case "run":
          void handleRun();
          break;
        case "scan":
          handleScan();
          break;
        case "open_source":
          void pickSource();
          break;
        case "open_output":
          openOutput();
          break;
        case "clear":
          clearLog();
          break;
        case "settings":
          openSettings("general");
          break;
        case "extensions":
          openSettings("extensions");
          break;
        case "shortcuts":
          openSettings("shortcuts");
          break;
        case "exit":
          window.repoprep.winClose();
          break;
      }
    },
    [source, target, mode, includeImages]
  );

  useEffect(() => {
    if (settingsOpen) return;
    let timer: number | undefined;
    const h = (e: KeyboardEvent) => {
      if (chord.current) {
        const first = chord.current;
        const chordShortcut = shortcuts[first.action].chord;
        if (chordShortcut && shortcutMatches(chordShortcut, e)) {
          window.clearTimeout(timer);
          chord.current = null;
          e.preventDefault();
          handleShortcut(first.action);
          return;
        }
        chord.current = null;
      }
      for (const [action, sc] of Object.entries(shortcuts) as [ShortcutAction, Shortcut][]) {
        if (sc.chord) {
          if (shortcutMatches(sc, e)) {
            e.preventDefault();
            chord.current = { action };
            window.clearTimeout(timer);
            timer = window.setTimeout(() => {
              chord.current = null;
            }, 1200);
            return;
          }
        } else if (shortcutMatches(sc, e)) {
          e.preventDefault();
          handleShortcut(action);
          return;
        }
      }
    };
    window.addEventListener("keydown", h);
    return () => {
      window.removeEventListener("keydown", h);
      window.clearTimeout(timer);
      chord.current = null;
    };
  }, [shortcuts, settingsOpen, handleShortcut]);

  useEffect(() => {
    const prevent = (e: globalThis.DragEvent) => e.preventDefault();
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);

  const statsText = stats
    ? formatStats(t("stats_fmt"), stats)
    : t("stats_default");
  const busy = running || scanning;

  return (
    <div className="app">
      <TitleBar
        lang={lang}
        onLang={setLang}
        theme={theme}
        onTheme={setTheme}
        t={t}
        onOpenSource={() => void pickSource()}
        onOpenOutput={openOutput}
        onExit={() => window.repoprep.winClose()}
        onNavigate={openSettings}
        onRequestReset={() => setModal({ kind: "reset" })}
        isMaximized={isMaximized}
        onToggleLog={() => setShowLog(!showLog)} // تمرير دالة التبديل للـ TitleBar
        showLog={showLog}
      />
      <div className="app-body">
        <div className="left-col">
          {/* Paths */}
          <section
            className={`card${dragActive ? " dragging" : ""}`}
            onDragEnter={onCardDragEnter}
            onDragOver={onCardDragOver}
            onDragLeave={onCardDragLeave}
            onDrop={onCardDrop}
          >
            <h2 className="card-title">
              <Icon name="folderOpen" size={16} /> {t("paths_title")}
            </h2>
            <div className="path-field">
              <label className="path-label">{t("source_label")}</label>
              <div className="path-row">
                <input
                  className={`path-input${source ? "" : " placeholder"}${sourceErr && !source ? " error" : ""}`}
                  value={source}
                  placeholder={source ? "C:\\project" : t("source_hint")}
                  readOnly
                  spellCheck={false}
                  aria-invalid={sourceErr && !source}
                  onClick={() => void pickSource()}
                />
                <button className="browse-btn" onClick={() => void pickSource()} disabled={busy}>
                  <Icon name="folderOpen" size={15} />
                  {t("browse")}
                </button>
              </div>
              {sourceErr && !source && (
                <div className="opt-hint err">
                  <Icon name="info" size={12} /> {t("warn_no_src")}
                </div>
              )}
            </div>
            <div className="path-field">
              <label className="path-label">{t("target_label")}</label>
              <div className="path-row">
                <input
                  className={`path-input${target ? "" : " placeholder"}`}
                  value={target}
                  placeholder="C:\project_prepared"
                  readOnly
                  spellCheck={false}
                />
                <button className="browse-btn" onClick={() => void pickTarget()} disabled={busy}>
                  <Icon name="folder" size={15} />
                  {t("browse")}
                </button>
              </div>
            </div>
          </section>

          {/* Modes */}
          <section className="card">
            <h2 className="card-title">
              <Icon name="gem" size={16} /> {t("modes_title")}
            </h2>
            <div className="mode-grid">
              {MODES.map((m) => (
                <div
                  key={m.val}
                  className={`mode-card${mode === m.val ? " selected" : ""}`}
                  onClick={() => {
                    if (!busy) setMode(m.val);
                  }}
                  role="button"
                  aria-pressed={mode === m.val}
                >
                  <div className="mode-head">
                    <Icon name={m.icon} size={18} color={m.color} />
                    <span className="mode-name">{t(`mode_${m.val}` as I18nKey)}</span>
                    {m.val === "clean" && (
                      <span className="recommended-badge">
                        <Icon name="sparkle" size={11} /> {t("mode_recommended")}
                      </span>
                    )}
                  </div>
                  <p className="mode-desc">
                    {t(`mode_${m.val}_d` as I18nKey)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Options */}
          <section className="card">
            <h2 className="card-title">
              <Icon name="info" size={16} /> {t("options_title")}
            </h2>
            <label className="opt-toggle">
              <input
                type="checkbox"
                checked={includeImages}
                disabled={busy}
                onChange={(e) => onToggleImages(e.target.checked)}
              />
              <span>
                <div className="opt-label">{t("opt_images")}</div>
                <div className="opt-hint">{t("opt_images_hint")}</div>
              </span>
            </label>
            <KeepFilesPicker
              files={stats?.skippable_files ?? []}
              keep={keepFiles}
              onChange={setKeepFiles}
              disabled={busy}
              title={t("keep_title")}
              desc={t("keep_desc")}
              placeholder={t("keep_placeholder")}
              noMatches={t("keep_no_matches")}
              empty={t("keep_empty")}
              removeLabel={t("keep_remove")}
            />
          </section>

          {/* Actions */}
          <section className="card">
            <h2 className="card-title">
              <Icon name="play" size={16} /> {t("actions_title")}
            </h2>
            <div className="btn-row">
              {running ? (
                <button className="btn btn-danger" onClick={cancelRun}>
                  <Icon name="x" size={15} />
                  {t("btn_cancel")}
                </button>
              ) : (
                <button className="btn btn-primary" disabled={busy} onClick={() => void handleRun()}>
                  <Icon name="play" size={15} />
                  {t("btn_run")}
                </button>
              )}
              <button className="btn btn-secondary" disabled={busy} onClick={handleScan}>
                <Icon name="scan" size={15} />
                {t("btn_scan")}
              </button>
              <button
  className="btn btn-ghost btn-ghost-danger"
  disabled={entries.length === 0 || busy}
  onClick={clearLog}
>
  <Icon name="x" size={15} />
  {t("btn_clear")}
</button>

            </div>
            <p className={`stats-line${stats ? "" : statsErr ? " err" : " dim"}`}>
              {scanning ? t("scanning") : (statsErr ?? statsText)}
            </p>
            <div className="progress-track">
              <div
                className="progress-fill"
                style={sourceTouched || progress > 0 ? { width: `${progress}%` } : undefined}
              />
            </div>
            {progress > 0 && (
              <div className="progress-meta">
                {fmt(t("progress_fmt"), {
                  done: Math.round((progress / 100) * (stats?.total_files ?? 0)),
                  total: stats?.total_files ?? 0,
                  pct: progress,
                })}
              </div>
            )}
          </section>
        </div>

        {/* عرض الـ Log فقط لو showLog بـ true */}
        {showLog && (
          <>
            <div className="sash" />
            <LogView
              entries={entries}
              title={t("log_title")}
              openLabel={t("btn_open")}
              copyLabel={t("copy_log")}
              exportLabel={t("export_log")}
              copiedLabel={t("copied")}
              onOpen={openOutput}
              scanning={scanning}
              scanLabel={t("scanning")}
            />
          </>
        )}
      </div>

      {modal?.kind === "overwrite" && (
        <Modal
          icon="err"
          title={t("confirm_overwrite").split("\n")[0] ?? "?"}
          body={t("confirm_overwrite")}
          confirmLabel={t("btn_run")}
          cancelLabel={t("cancel")}
          onConfirm={() => {
            setModal(null);
            void doRun();
          }}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.kind === "warn" && (
        <Modal
          icon="err"
          title={t("fail_title")}
          body={modal.msg}
          confirmLabel={t("close")}
          showCancel={false}
          onConfirm={() => setModal(null)}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.kind === "err" && (
        <Modal
          icon="err"
          title={t("fail_title")}
          body={t("fail_msg")}
          confirmLabel={t("close")}
          showCancel={false}
          onConfirm={() => setModal(null)}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.kind === "ok" && (
        <Modal
          icon="ok"
          title={t("done_title")}
          body={fmt(t("done_msg"), { copied: modal.copied, skipped: modal.skipped })}
          confirmLabel={t("open_folder")}
          cancelLabel={t("cancel")}
          onConfirm={() => {
            void window.repoprep.openOutput(modal.target);
            setModal(null);
          }}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.kind === "reset" && (
        <Modal
          elevated
          icon="err"
          title={t("reset_title")}
          body={t("reset_body")}
          confirmLabel={t("reset_btn")}
          cancelLabel={t("cancel")}
          onConfirm={performReset}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.kind === "resetdone" && (
        <Modal
          elevated
          icon="ok"
          title={t("reset_done_title")}
          body={t("reset_done_body")}
          confirmLabel={t("close")}
          showCancel={false}
          onConfirm={() => setModal(null)}
          onCancel={() => setModal(null)}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          lang={lang}
          onLang={setLang}
          theme={theme}
          onTheme={setTheme}
          shortcuts={shortcuts}
          onShortcuts={(s) => {
            setShortcuts(s);
            saveShortcuts(s);
          }}
          initialCat={settingsCat}
          t={t}
          onClose={() => setSettingsOpen(false)}
          onRequestReset={() => setModal({ kind: "reset" })}
        />
      )}
    </div>
  );
}