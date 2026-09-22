import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "./Icon";

interface KeepFilesPickerProps {
  files: string[];
  keep: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
  title: string;
  desc: string;
  placeholder: string;
  noMatches: string;
  empty: string;
  removeLabel: string;
}

const SUGGEST_LIMIT = 14;

export function KeepFilesPicker({
  files,
  keep,
  onChange,
  disabled,
  title,
  desc,
  placeholder,
  noMatches,
  empty,
  removeLabel,
}: KeepFilesPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  const keepSet = useMemo(() => new Set(keep.map((k) => k.toLowerCase())), [keep]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    const available = files.filter((f) => f && !keepSet.has(f.toLowerCase()));
    if (!q) return available.slice(0, SUGGEST_LIMIT);
    const scored = available
      .map((f) => {
        const name = f.toLowerCase();
        let score = 2;
        if (name === q) score = 0;
        else if (name.startsWith(q)) score = 1;
        else if (name.includes(q)) score = 2;
        else return null;
        return { f, score };
      })
      .filter((x): x is { f: string; score: number } => x !== null)
      .sort((a, b) => a.score - b.score || a.f.length - b.f.length)
      .slice(0, SUGGEST_LIMIT)
      .map((x) => x.f);
    return scored;
  }, [files, keepSet, query]);

  function add(name: string) {
    const norm = name.trim();
    if (!norm) return;
    if (!keepSet.has(norm.toLowerCase())) onChange([...keep, norm]);
    setQuery("");
    setIdx(-1);
  }

  function remove(name: string) {
    onChange(keep.filter((k) => k !== name));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !query && keep.length > 0) {
      remove(keep[keep.length - 1]);
      return;
    }
    if (!open || suggestions.length === 0) {
      if (e.key === "Escape") {
        setOpen(false);
        setIdx(-1);
      } else if (e.key === "Enter" && query.trim()) {
        e.preventDefault();
        add(query.trim());
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" || e.key === "Tab") {
      const s = suggestions[idx];
      if (s) {
        e.preventDefault();
        add(s);
      } else if (e.key === "Enter" && query.trim()) {
        e.preventDefault();
        add(query.trim());
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setIdx(-1);
    }
  }

  return (
    <div className="keep-picker">
      <div className="opt-label">{title}</div>
      <div className="opt-hint">{desc}</div>
      <div
        className={`keep-field${open ? " focus" : ""}${disabled ? " disabled" : ""}`}
        onMouseDown={() => inputRef.current?.focus()}
      >
        {keep.map((token) => (
          <span className="keep-token" key={token}>
            <Icon name="doc" size={11} color="var(--accent)" />
            <span>{token}</span>
            <button
              type="button"
              className="keep-token-x"
              disabled={disabled}
              aria-label={removeLabel}
              onMouseDown={(e) => {
                e.preventDefault();
                remove(token);
              }}
            >
              <Icon name="x" size={9} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          disabled={disabled}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setIdx(-1);
            setOpen(true);
          }}
          onBlur={() =>
            window.setTimeout(() => {
              setOpen(false);
              setIdx(-1);
            }, 120)
          }
          onKeyDown={onKeyDown}
          placeholder={keep.length === 0 ? placeholder : ""}
          spellCheck={false}
        />
      </div>
      {open &&
        !disabled &&
        files.length > 0 &&
        suggestions.length > 0 && (
          <div className="keep-suggest">
            {suggestions.map((f, i) => (
              <button
                type="button"
                key={f}
                className={`keep-suggest-item${i === idx ? " active" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(f);
                }}
                onMouseEnter={() => setIdx(i)}
                dir="ltr"
              >
                <Icon name="doc" size={12} color="var(--text-3)" />
                <span className="keep-suggest-name">{f}</span>
                <Icon name="check" size={12} color="var(--accent)" />
              </button>
            ))}
          </div>
        )}
      {open &&
        !disabled &&
        files.length > 0 &&
        query.trim() !== "" &&
        suggestions.length === 0 && (
          <div className="keep-suggest keep-suggest-empty">{noMatches}</div>
        )}
      {files.length === 0 && <div className="opt-hint">{empty}</div>}
    </div>
  );
}