import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Lang, I18nKey, ScanStats, SettingsCat } from "../types";
import { LANG_NAMES } from "../i18n";
import type { Theme } from "../theme";
import type { IconName } from "./Icon";
import { Icon } from "./Icon";

export function formatStats(tpl: string, s: ScanStats): string {
  const size = (n: number) => (n / 1048576).toFixed(1);
  return tpl
    .replace("{type}", s.project_type)
    .replace("{tf}", String(s.total_files))
    .replace("{tm}", size(s.total_size))
    .replace("{cf}", String(s.clean_files))
    .replace("{cm}", size(s.clean_size))
    .replace("{sf}", String(s.skipped_files))
    .replace("{sd}", String(s.skipped_dirs))
    .replace("{sv}", size(s.total_size - s.clean_size));
}

interface TitleBarProps {
  lang: Lang;
  onLang: (l: Lang) => void;
  theme: Theme;
  onTheme: (t: Theme) => void;
  t: (k: I18nKey) => string;
  onOpenSource: () => void;
  onOpenOutput: () => void;
  onExit: () => void;
  onNavigate: (cat: SettingsCat) => void;
  onRequestReset: () => void;
  isMaximized: boolean;
  onToggleLog: () => void;
  showLog: boolean;
}

type MenuOpen = "file" | "help" | null;

interface LeafProps {
  icon: IconName;
  label: string;
  kbd?: string;
  soon?: boolean;
  soonLabel?: string;
  danger?: boolean;
  onClick: () => void;
}

interface BranchProps {
  icon: IconName;
  label: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  children: ReactNode;
}

function Leaf({ icon, label, kbd, soon, soonLabel, danger, onClick }: LeafProps) {
  return (
    <div
      className={`dd-item${danger ? " danger" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <Icon name={icon} size={14} />
      <span className="dd-label">{label}</span>
      {soon && <span className="soon-badge">{soonLabel}</span>}
      {kbd && <span className="dd-kbd">{kbd}</span>}
    </div>
  );
}

function Branch({ icon, label, open: isOpen, onToggle, children }: BranchProps) {
  return (
    <div
      className={`dd-item branch${isOpen ? " open" : ""}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(!isOpen);
      }}
      onMouseEnter={() => onToggle(true)}
      onMouseLeave={() => onToggle(false)}
    >
      <Icon name={icon} size={14} />
      <span className="dd-label">{label}</span>
      <Icon name="chevron" size={13} className="dd-arrow" />
      {isOpen && <div className="submenu">{children}</div>}
    </div>
  );
}

export function TitleBar({
  lang,
  onLang,
  theme,
  onTheme,
  t,
  onOpenSource,
  onOpenOutput,
  onExit,
  onNavigate,
  onRequestReset,
  isMaximized,
  onToggleLog,
  showLog,
}: TitleBarProps) {
  const [open, setOpen] = useState<MenuOpen>(null);
  const [pref, setPref] = useState(false);
  const [subOpen, setSubOpen] = useState<"lang" | "theme" | null>(null);
  const leaveTimer = useRef<number | undefined>(undefined);
  const navRef = useRef<HTMLDivElement | null>(null);

  function resetMenus() {
    setOpen(null);
    setPref(false);
    setSubOpen(null);
  }

  const scheduleClose = () => {
    window.clearTimeout(leaveTimer.current);
    leaveTimer.current = window.setTimeout(() => {
      setOpen((cur) => {
        if (cur !== "file" && cur !== "help") return cur;
        setPref(false);
        setSubOpen(null);
        return null;
      });
    }, 150);
  };

  const cancelClose = () => window.clearTimeout(leaveTimer.current);

  useEffect(() => {
    return () => window.clearTimeout(leaveTimer.current);
  }, []);

  useEffect(() => {
    const el = navRef.current;
    if (!el || !open) return;
    const onLeave = () => {
      cancelClose();
      scheduleClose();
    };
    const onEnter = () => cancelClose();
    el.addEventListener("mouseleave", onLeave);
    el.addEventListener("mouseenter", onEnter);
    return () => {
      el.removeEventListener("mouseleave", onLeave);
      el.removeEventListener("mouseenter", onEnter);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") resetMenus();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open]);

  function pick(m: MenuOpen) {
    setOpen((cur) => (cur === m ? null : m));
    setPref(false);
    setSubOpen(null);
  }

  const goCat = (cat: SettingsCat) => () => {
    resetMenus();
    onNavigate(cat);
  };

  const langSub = (
    <>
      {Object.keys(LANG_NAMES).map((l) => (
        <div
          key={l}
          className={`dd-item${lang === l ? " checked" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            resetMenus();
            onLang(l as Lang);
          }}
        >
          <span className="dd-label">{LANG_NAMES[l as Lang]}</span>
          {lang === l && <Icon name="check" size={12} />}
        </div>
      ))}
    </>
  );

  const themeSub = (
    <>
      {(["system", "light", "dark"] as const).map((th) => (
        <div
          key={th}
          className={`dd-item${theme === th ? " checked" : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            resetMenus();
            onTheme(th);
          }}
        >
          <Icon name={th === "system" ? "monitor" : th === "light" ? "sun" : "moon"} size={13} />
          <span className="dd-label">{t(`theme_${th}` as I18nKey)}</span>
          {theme === th && <Icon name="check" size={12} />}
        </div>
      ))}
    </>
  );

  const prefsSub = (
    <>
      <Leaf
        icon="user"
        label={t("pref_profiles")}
        soon
        soonLabel={t("soon_badge")}
        onClick={goCat("profiles")}
      />
      <Leaf
        icon="gear"
        label={t("pref_settings")}
        kbd={t("pref_kbd_settings")}
        onClick={goCat("general")}
      />
      <Leaf
        icon="puzzle"
        label={t("pref_extensions")}
        kbd={t("pref_kbd_extensions")}
        soon
        soonLabel={t("soon_badge")}
        onClick={goCat("extensions")}
      />
      <Leaf
        icon="key"
        label={t("pref_shortcuts")}
        kbd={t("pref_kbd_shortcuts")}
        onClick={goCat("shortcuts")}
      />
      <Leaf
        icon="code"
        label={t("pref_snippets")}
        soon
        soonLabel={t("soon_badge")}
        onClick={goCat("snippets")}
      />
      <Leaf
        icon="list"
        label={t("pref_tasks")}
        soon
        soonLabel={t("soon_badge")}
        onClick={goCat("tasks")}
      />
      <div className="dd-sep" />
      <Branch
        icon="globe"
        label={t("set_language")}
        open={subOpen === "lang"}
        onToggle={(o) => setSubOpen(o ? "lang" : null)}
      >
        {langSub}
      </Branch>
      <Branch
        icon="palette"
        label={t("pref_themes")}
        open={subOpen === "theme"}
        onToggle={(o) => setSubOpen(o ? "theme" : null)}
      >
        {themeSub}
      </Branch>
    </>
  );

  const win = (action: () => void) => () => {
    resetMenus();
    action();
  };

  return (
    <div className="titlebar" onDoubleClick={() => window.repoprep.winMax()}>
      <div className="titlebar-logo-box">
        <img className="titlebar-logo" src="logo.png" alt="" draggable={false} />
      </div>
      <span className="titlebar-title">{t("app_name")}</span>

      <nav className="menus" ref={navRef}>
        <div className="menu-wrap" onMouseEnter={() => open && open !== "file" && pick("file")}>
          <button className={`menu-btn${open === "file" ? " open" : ""}`} onClick={() => pick("file")}>
            {t("menu_file")}
          </button>
          {open === "file" && (
            <>
              <div
                className="menu-backdrop"
                onMouseEnter={scheduleClose}
                onClick={() => pick(null)}
              />
              <div className="dropdown">
                <Leaf
                  icon="folderOpen"
                  label={t("file_open_source")}
                  onClick={() => {
                    resetMenus();
                    onOpenSource();
                  }}
                />
                <Leaf
                  icon="folder"
                  label={t("file_open_output")}
                  onClick={() => {
                    resetMenus();
                    onOpenOutput();
                  }}
                />
                <div className="dd-sep" />
                <Branch
                  icon="gear"
                  label={t("menu_preferences")}
                  open={pref}
                  onToggle={(o) => {
                    setPref(o);
                    if (!o) setSubOpen(null);
                  }}
                >
                  {prefsSub}
                </Branch>
                <Leaf
                  icon="gear"
                  label={t("pref_settings")}
                  kbd={t("pref_kbd_settings")}
                  onClick={goCat("general")}
                />
                <div className="dd-sep" />
                <Leaf
                  icon="power"
                  label={t("file_exit")}
                  danger
                  onClick={() => {
                    resetMenus();
                    onExit();
                  }}
                />
              </div>
            </>
          )}
        </div>

        <div className="menu-wrap" onMouseEnter={() => open && open !== "help" && pick("help")}>
          <button className={`menu-btn${open === "help" ? " open" : ""}`} onClick={() => pick("help")}>
            {t("menu_help")}
          </button>
          {open === "help" && (
            <>
              <div
                className="menu-backdrop"
                onMouseEnter={scheduleClose}
                onClick={() => pick(null)}
              />
              <div className="dropdown">
                <Leaf icon="help" label={t("help_shortcuts")} onClick={goCat("shortcuts")} />
                <Leaf icon="info" label={t("help_about")} onClick={goCat("about")} />
                <div className="dd-sep" />
                <Leaf
                  icon="reset"
                  label={t("help_reset")}
                  danger
                  onClick={() => {
                    resetMenus();
                    onRequestReset();
                  }}
                />
                <Leaf icon="bug" label={t("help_report")} onClick={goCat("report")} />
              </div>
            </>
          )}
        </div>
      </nav>

      <div className="titlebar-spacer" />

      <div className="win-btns">
        <button
          className={`win-btn${showLog ? "" : " muted"}`}
          title={showLog ? t("hide_log") : t("show_log")}
          onClick={win(onToggleLog)}
        >
          <Icon name="list" size={13} />
        </button>
        <button className="win-btn" title={t("minimize")} onClick={win(() => window.repoprep.winMin())}>
          <Icon name="minus" size={14} />
        </button>
        <button
          className="win-btn"
          title={isMaximized ? t("restore") : t("maximize")}
          onClick={win(() => window.repoprep.winMax())}
        >
          <Icon name={isMaximized ? "restore" : "square"} size={isMaximized ? 13 : 12} />
        </button>
        <button className="win-btn close" title={t("close")} onClick={win(() => window.repoprep.winClose())}>
          <Icon name="x" size={15} />
        </button>
      </div>
    </div>
  );
}