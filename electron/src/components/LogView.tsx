import { useEffect, useRef, useState } from "react";
import type { LogEntry } from "../types";
import { Icon } from "./Icon";

interface LogViewProps {
  entries: LogEntry[];
  title: string;
  openLabel: string;
  onOpen: () => void;
  copyLabel: string;
  exportLabel: string;
  copiedLabel: string;
  scanning?: boolean;
  scanLabel?: string;
}

export function LogView({
  entries,
  title,
  openLabel,
  onOpen,
  copyLabel,
  exportLabel,
  copiedLabel,
  scanning = false,
  scanLabel = "",
}: LogViewProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const [copied, setCopied] = useState(false);
  const [full, setFull] = useState(false);

  useEffect(() => {
    const el = bodyRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
    const el2 = bodyRef.current;
    if (el2) setFull(el2.scrollHeight > el2.clientHeight + 1);
  }, [entries]);

  const text = entries.map((en) => en.msg).join("\n");

  async function copyLog() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function exportLog() {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "repoprep-log.txt";
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  return (
    <div className="right-col">
      <div className="log-panel">
        <div className="log-head">
          <Icon name="info" size={16} color="#2fe6a0" />
          <span className="log-title">{title}</span>
          <div className="log-tools">
  <button
    className="log-open"
    disabled={entries.length === 0}
    title={copyLabel}
    onClick={() => void copyLog()}
  >
    <Icon name="copy" size={14} />
    <span>{copied ? copiedLabel : copyLabel}</span>
  </button>
  <button
    className="log-open"
    disabled={entries.length === 0}
    title={exportLabel}
    onClick={exportLog}
  >
    <Icon name="save" size={14} />
    <span>{exportLabel}</span>
  </button>
  <button className="log-open" onClick={onOpen} title={openLabel}>
    {/* ضفنا الأيقونة هنا */}
    <Icon name="folderOpen" size={14} />
    <span>{openLabel}</span>
  </button>
</div>
        </div>
        <div
          className={`log-body${full ? " full" : ""}`}
          ref={bodyRef}
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
            setFull(el.scrollHeight > el.clientHeight + 1);
          }}
        >
          {entries.length === 0 && !scanning && <div className="log-line lv-INFO">—</div>}
          {entries.map((en, i) => (
            <div key={i} className={`log-line lv-${en.level}`}>
              {en.msg}
            </div>
          ))}
          {scanning && (
            <div className="log-line lv-SCAN log-scan-line">
              <span className="log-spinner" aria-hidden />
              <span>{scanLabel}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}