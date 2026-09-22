import { useEffect, useState } from "react";
import type { Lang, I18nKey, SettingsCat } from "../types";
import { LANG_NAMES } from "../i18n";
import type { Theme } from "../theme";
import type { ShortcutAction, ShortcutMap } from "../shortcuts";
import { comboLabel, shortcutFromEvent } from "../shortcuts";
import { SHORTCUT_DEFAULTS } from "../shortcuts";
import type { IconName } from "./Icon";
import { Icon } from "./Icon";
import pkg from "../../package.json";

interface SettingsModalProps {
  lang: Lang;
  onLang: (l: Lang) => void;
  theme: Theme;
  onTheme: (t: Theme) => void;
  shortcuts: ShortcutMap;
  onShortcuts: (s: ShortcutMap) => void;
  initialCat: SettingsCat;
  t: (k: I18nKey) => string;
  onClose: () => void;
  onRequestReset: () => void;
}

interface SideCat {
  id: SettingsCat;
  icon: IconName;
  labelKey: I18nKey;
  soon?: boolean;
}

const GROUP_MAIN: SideCat[] = [
  { id: "general", icon: "gear", labelKey: "cat_general" },
  { id: "shortcuts", icon: "key", labelKey: "cat_shortcuts" },
  { id: "themes", icon: "palette", labelKey: "cat_themes" },
];

const GROUP_TOOLS: SideCat[] = [
  { id: "extensions", icon: "puzzle", labelKey: "cat_extensions", soon: true },
  { id: "profiles", icon: "user", labelKey: "cat_profiles", soon: true },
  { id: "snippets", icon: "code", labelKey: "cat_snippets", soon: true },
  { id: "tasks", icon: "list", labelKey: "cat_tasks", soon: true },
];

const HELP_CAT: SideCat = { id: "help", icon: "help", labelKey: "cat_help" };
const ABOUT_CAT: SideCat = { id: "about", icon: "info", labelKey: "cat_about" };
const REPORT_CAT: SideCat = { id: "report", icon: "bug", labelKey: "cat_report" };

// Report / support links — adjust before shipping
const PARENT_URL = "https://lidprex.onrender.com/";
const SUPPORT_URL = "https://lidprex.onrender.com/support/report?product=repoprep";
const PRODUCT_URL = "https://repoprep.onrender.com/";
const ISSUE_URL = "https://github.com/Lidprex/RepoPrep-Pro/issues/new";
const REPO_URL = "https://github.com/Lidprex/RepoPrep-Pro";
const PRIVACY_URL = "https://repoprep.onrender.com/privacy.html";
  const SECURITY_URL = "https://repoprep.onrender.com/security.html";
  const TERMS_URL = "https://repoprep.onrender.com/terms.html";

interface ContactLink {
  icon: IconName;
  titleKey: I18nKey;
  descKey: I18nKey;
  url: string;
  recommended?: boolean;
}

const CONTACT_LINKS: ContactLink[] = [
  { icon: "help", titleKey: "contact_support_title", descKey: "contact_support_desc", url: SUPPORT_URL, recommended: true },
  { icon: "bug", titleKey: "contact_issue_title", descKey: "contact_issue_desc", url: ISSUE_URL },
  { icon: "code", titleKey: "contact_repo_title", descKey: "contact_repo_desc", url: REPO_URL },
];

interface GuideItem {
  icon: IconName;
  titleKey: I18nKey;
  descKey: I18nKey;
}

const GUIDE_ITEMS: GuideItem[] = [
  { icon: "globe", titleKey: "guide_lang_title", descKey: "guide_lang_d" },
  { icon: "palette", titleKey: "guide_theme_title", descKey: "guide_theme_d" },
  { icon: "folderOpen", titleKey: "guide_paths_title", descKey: "guide_paths_d" },
  { icon: "gem", titleKey: "guide_mode_title", descKey: "guide_mode_d" },
  { icon: "play", titleKey: "guide_run_title", descKey: "guide_run_d" },
  { icon: "key", titleKey: "guide_shortcuts_title", descKey: "guide_shortcuts_d" },
];

function GuideRich({ text }: { text: string }) {
  const parts = text.split(/<code>([\s\S]*?)<\/code>/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? <code key={i}>{p}</code> : <span key={i}>{p}</span>
      )}
    </>
  );
}

const ACTIONS: ShortcutAction[] = [
  "run",
  "scan",
  "open_source",
  "open_output",
  "clear",
  "settings",
  "extensions",
  "shortcuts",
  "exit",
];

export function SettingsModal({
  lang,
  onLang,
  theme,
  onTheme,
  shortcuts,
  onShortcuts,
  initialCat,
  t,
  onClose,
  onRequestReset,
}: SettingsModalProps) {
  const [cat, setCat] = useState<SettingsCat>(initialCat);
  const [capturing, setCapturing] = useState<ShortcutAction | null>(null);
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    setCat(initialCat);
  }, [initialCat]);

  useEffect(() => {
    if (!langOpen) return;
    const h = (e: MouseEvent) => {
      const target = e.target as Node;
      if (target instanceof HTMLElement && target.closest(".custom-select")) return;
      setLangOpen(false);
    };
    window.addEventListener("mousedown", h);
    return () => window.removeEventListener("mousedown", h);
  }, [langOpen]);

  useEffect(() => {
    if (!langOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setLangOpen(false);
        return;
      }
      const langs = Object.keys(LANG_NAMES) as Lang[];
      const idx = langs.indexOf(lang);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        onLang(langs[(idx + 1) % langs.length]);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        onLang(langs[(idx - 1 + langs.length) % langs.length]);
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [langOpen, lang, onLang]);

  useEffect(() => {
    if (!capturing) return;
    const h = (e: KeyboardEvent) => {
      e.preventDefault();
      if (e.code === "Escape" && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        setCapturing(null);
        return;
      }
      const next = shortcutFromEvent(e);
      if (!next) return;
      onShortcuts({ ...shortcuts, [capturing]: next });
      setCapturing(null);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [capturing, shortcuts, onShortcuts]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal settings" onClick={(e) => e.stopPropagation()}>
        <div className="settings-head">
          <span className="settings-title">{t("menu_preferences")}</span>
          <button className="win-btn settings-close" onClick={onClose}>
            <Icon name="x" size={17} />
          </button>
        </div>

        <div className="settings-body">
          <nav className="settings-side">
            <span className="side-group">{t("sect_main")}</span>
            {GROUP_MAIN.map((c) => (
              <button
                key={c.id}
                className={`side-item${cat === c.id ? " active" : ""}`}
                onClick={() => setCat(c.id)}
              >
                <Icon name={c.icon} size={16} />
                <span className="side-label">{t(c.labelKey)}</span>
              </button>
            ))}
            <span className="side-group">{t("sect_tools")}</span>
            {GROUP_TOOLS.map((c) => (
              <button
                key={c.id}
                className={`side-item${cat === c.id ? " active" : ""}`}
                onClick={() => setCat(c.id)}
              >
                <Icon name={c.icon} size={16} />
                <span className="side-label">{t(c.labelKey)}</span>
                {c.soon && <span className="soon-badge">{t("soon_badge")}</span>}
              </button>
            ))}
            <span className="side-group">{t("sect_help")}</span>
            <button
              className={`side-item${cat === HELP_CAT.id ? " active" : ""}`}
              onClick={() => setCat(HELP_CAT.id)}
            >
              <Icon name={HELP_CAT.icon} size={16} />
              <span className="side-label">{t(HELP_CAT.labelKey)}</span>
            </button>
            <div className="side-spacer" />
            <span className="side-group">{t("sect_more")}</span>
            <button
              className={`side-item${cat === ABOUT_CAT.id ? " active" : ""}`}
              onClick={() => setCat(ABOUT_CAT.id)}
            >
              <Icon name={ABOUT_CAT.icon} size={16} />
              <span className="side-label">{t(ABOUT_CAT.labelKey)}</span>
            </button>
            <button
              className={`side-item${cat === REPORT_CAT.id ? " active" : ""}`}
              onClick={() => setCat(REPORT_CAT.id)}
            >
              <Icon name={REPORT_CAT.icon} size={16} />
              <span className="side-label">{t(REPORT_CAT.labelKey)}</span>
            </button>
            <button className="side-item reset" onClick={onRequestReset}>
              <Icon name="reset" size={16} />
              <span className="side-label">{t("reset_btn")}</span>
            </button>
          </nav>

          <div className="settings-main">
            {/* General */}
            {cat === "general" && (
              <>
                <div className="set-group">
                  <div className="set-label">{t("set_language")}</div>
                  <div className="custom-select">
                    <button
                      className={`custom-select-trigger${langOpen ? " open" : ""}`}
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={langOpen}
                      onClick={() => setLangOpen(!langOpen)}
                    >
                      <span>{LANG_NAMES[lang]}</span>
                      <Icon name="chevronDown" size={14} />
                    </button>
                    {langOpen && (
                      <div className="custom-select-menu" role="listbox">
                        {Object.keys(LANG_NAMES).map((l) => (
                          <button
                            key={l}
                            type="button"
                            role="option"
                            aria-selected={lang === l}
                            className={`custom-select-item${lang === l ? " selected" : ""}`}
                            onClick={() => {
                              onLang(l as Lang);
                              setLangOpen(false);
                            }}
                          >
                            <span>{LANG_NAMES[l as Lang]}</span>
                            {lang === l && <Icon name="check" size={14} />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="set-group">
                  <div className="set-label">{t("set_theme")}</div>
                  <div className="radio-row">
                    {(["system", "light", "dark"] as const).map((th) => (
                      <label key={th} className="radio">
                        <input
                          type="radio"
                          name="theme_general"
                          checked={theme === th}
                          onChange={() => onTheme(th)}
                        />
                        <span>{t(`theme_${th}` as I18nKey)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="set-group">
                  <div className="set-label">{t("reset_btn")}</div>
                  <p className="set-hint">{t("reset_desc")}</p>
                  <button className="btn btn-ghost btn-block" onClick={onRequestReset}>
                    <Icon name="reset" size={14} />
                    {t("reset_btn")}
                  </button>
                </div>
              </>
            )}

            {/* Shortcuts */}
            {cat === "shortcuts" && (
              <>
                <p className="set-hint">{t("sc_capture")}</p>
                <div className="sc-list">
                  {ACTIONS.map((a) => (
                    <div key={a} className={`sc-row${capturing === a ? " capturing" : ""}`}>
                      <span className="sc-act">{t(`scaction_${a}` as I18nKey)}</span>
                      <span className="sc-keys">{comboLabel(shortcuts[a])}</span>
                      <button
                        className="btn btn-small"
                        disabled={capturing !== null && capturing !== a}
                        onClick={() => {
                          if (capturing === a) return;
                          setCapturing(a);
                        }}
                      >
                        {capturing === a ? t("sc_press") : t("sc_set")}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="set-group" style={{ marginTop: 16 }}>
                  <button
                    className="btn btn-ghost btn-block"
                    onClick={() => {
                      onShortcuts({ ...SHORTCUT_DEFAULTS });
                    }}
                  >
                    <Icon name="reset" size={14} />
                    {t("reset_btn")}
                  </button>
                </div>
              </>
            )}

            {/* Themes */}
            {cat === "themes" && (
              <>
                {(["system", "light", "dark"] as const).map((th) => (
                  <div
                    key={th}
                    className={`theme-card${theme === th ? " selected" : ""}`}
                    onClick={() => onTheme(th)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onTheme(th);
                      }
                    }}
                  >
                    <Icon
                      name={th === "system" ? "monitor" : th === "light" ? "sun" : "moon"}
                      size={20}
                      className="theme-icon"
                    />
                    <span className="theme-name">{t(`theme_${th}` as I18nKey)}</span>
                    {theme === th && (
                      <span className="theme-check">
                        <Icon name="check" size={14} />
                      </span>
                    )}
                  </div>
                ))}
              </>
            )}

            {/* Extensions placeholder */}
            {cat === "extensions" && (
              <div className="placeholder-panel">
                <Icon name="puzzle" size={32} />
                <div className="placeholder-title">{t("ext_title")}</div>
                <div className="placeholder-note">{t("ext_note")}</div>
              </div>
            )}

            {/* Profiles placeholder */}
            {cat === "profiles" && (
              <div className="placeholder-panel">
                <Icon name="user" size={32} />
                <div className="placeholder-title">{t("prof_title")}</div>
                <div className="placeholder-note">{t("prof_note")}</div>
              </div>
            )}

            {/* Snippets placeholder */}
            {cat === "snippets" && (
              <div className="placeholder-panel">
                <Icon name="code" size={32} />
                <div className="placeholder-title">{t("snp_title")}</div>
                <div className="placeholder-note">{t("snp_note")}</div>
              </div>
            )}

            {/* Tasks placeholder */}
            {cat === "tasks" && (
              <div className="placeholder-panel">
                <Icon name="list" size={32} />
                <div className="placeholder-title">{t("task_title")}</div>
                <div className="placeholder-note">{t("task_note")}</div>
              </div>
            )}

            {/* Help */}
            {cat === "help" && (
              <>
                <div className="guide-section">
                  <div className="guide-title">
                    <Icon name="doc" size={16} />
                    {t("guide_title")}
                  </div>
                  <p className="set-hint">{t("guide_note")}</p>
                  <div className="guide-list">
                    {GUIDE_ITEMS.map((g) => (
                      <div key={g.titleKey} className="guide-card">
                        <span className="guide-icon">
                          <Icon name={g.icon} size={16} />
                        </span>
                        <div className="guide-body">
                          <div className="guide-name">{t(g.titleKey)}</div>
                          <div className="guide-desc">
                            <GuideRich text={t(g.descKey)} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button className="btn btn-ghost btn-block" onClick={onRequestReset}>
                  <Icon name="reset" size={14} />
                  {t("reset_btn")}
                </button>
              </>
            )}

            {/* About — separate page */}
            {cat === "about" && (
              <div className="help-page">
                <div className="about-card">
                  <img className="about-card-logo" src="logo.png" alt="" draggable={false} />
                  <div className="about-card-name">{t("app_name")}</div>
                  <div className="about-card-sub">{t("built_by")} Lidprex</div>
                  <div className="about-card-rows">
                    <div className="about-card-row">
                      <span className="about-card-key">{t("info_publisher")}</span>
                      <span className="about-card-val">Lidprex</span>
                    </div>
                    <div className="about-card-row">
                      <span className="about-card-key">{t("info_version")}</span>
                      <span className="about-card-val">v{pkg.version}</span>
                    </div>
                    <div className="about-card-row">
                      <span className="about-card-key">{t("info_license")}</span>
                      <span className="about-card-val">{pkg.license}</span>
                    </div>
                  </div>
                  <p className="about-card-desc">{t("about_description")}</p>
                  <div className="contact-list about-card-links">
                    <div className="contact-row">
                      <span className="contact-icon">
                        <Icon name="globe" size={15} />
                      </span>
                      <div className="contact-body">
                        <div className="contact-name">{t("contact_website_title")}</div>
                        <div className="contact-desc">{t("contact_website_desc")}</div>
                      </div>
                      <button
                        className="btn btn-small btn-secondary"
                        onClick={() => void window.repoprep.openExternal(PARENT_URL)}
                      >
                        {t("help_open")}
                      </button>
                    </div>
                    <div className="contact-row">
                      <span className="contact-icon">
                        <Icon name="info" size={15} />
                      </span>
                      <div className="contact-body">
                        <div className="contact-name">{t("contact_product_title")}</div>
                        <div className="contact-desc">{t("contact_product_desc")}</div>
                      </div>
                      <button
                        className="btn btn-small btn-secondary"
                        onClick={() => void window.repoprep.openExternal(PRODUCT_URL)}
                      >
                        {t("help_open")}
                      </button>
                    </div>
                    <div className="contact-row">
                      <span className="contact-icon">
                        <Icon name="code" size={15} />
                      </span>
                      <div className="contact-body">
                        <div className="contact-name">{t("contact_repo_title")}</div>
                        <div className="contact-desc">{t("contact_repo_desc")}</div>
                      </div>
                      <button
                        className="btn btn-small btn-secondary"
                        onClick={() => void window.repoprep.openExternal(REPO_URL)}
                      >
                        {t("help_open")}
                      </button>
                    </div>
                  </div>
                  <div className="legal-divider">{t("legal_title")}</div>
                  <div className="contact-list about-card-links">
                    <div className="contact-row">
                      <span className="contact-icon">
                        <Icon name="doc" size={15} />
                      </span>
                      <div className="contact-body">
                        <div className="contact-name">{t("legal_privacy_title")}</div>
                        <div className="contact-desc">{t("legal_privacy_desc")}</div>
                      </div>
                      <button
                        className="btn btn-small btn-secondary"
                        onClick={() => void window.repoprep.openExternal(PRIVACY_URL)}
                      >
                        {t("help_open")}
                      </button>
                    </div>
                    <div className="contact-row">
                      <span className="contact-icon">
                        <Icon name="doc" size={15} />
                      </span>
                      <div className="contact-body">
                        <div className="contact-name">{t("legal_terms_title")}</div>
                        <div className="contact-desc">{t("legal_terms_desc")}</div>
                      </div>
                      <button
                        className="btn btn-small btn-secondary"
                        onClick={() => void window.repoprep.openExternal(TERMS_URL)}
                      >
                        {t("help_open")}
                      </button>
                    </div>
                    <div className="contact-row">
                      <span className="contact-icon">
                        <Icon name="shield" size={15} />
                      </span>
                      <div className="contact-body">
                        <div className="contact-name">{t("legal_security_title")}</div>
                        <div className="contact-desc">{t("legal_security_desc")}</div>
                      </div>
                      <button
                        className="btn btn-small btn-secondary"
                        onClick={() => void window.repoprep.openExternal(SECURITY_URL)}
                      >
                        {t("help_open")}
                      </button>
                    </div>
                  </div>
                  <p className="about-card-rights">{t("about_rights")}</p>
                </div>
              </div>
            )}

            {/* Report Issue — separate page */}
            {cat === "report" && (
              <div className="help-page">
                <div className="report-head">
                  <div className="report-title">
                    <Icon name="bug" size={18} />
                    {t("help_report_title")}
                  </div>
                  <p className="report-note">{t("help_report_note")}</p>
                </div>
                <div className="contact-list">
                  {CONTACT_LINKS.map((c) => (
                    <div key={c.titleKey} className="contact-row">
                      <span className="contact-icon">
                        <Icon name={c.icon} size={15} />
                      </span>
                      <div className="contact-body">
                        <div className="contact-name">
                          {t(c.titleKey)}
                          {c.recommended && (
                            <span className="recommended-badge">
                              <Icon name="sparkle" size={11} /> {t("mode_recommended")}
                            </span>
                          )}
                        </div>
                        <div className="contact-desc">{t(c.descKey)}</div>
                      </div>
                      <button
                        className="btn btn-small btn-secondary"
                        onClick={() => void window.repoprep.openExternal(c.url)}
                      >
                        {t("help_open")}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}