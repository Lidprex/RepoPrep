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

export type Mode = "clean" | "flatten" | "scan";

export type LogLevel = "INFO" | "COPY" | "SKIP" | "WARN" | "ERROR" | "DONE" | "SCAN";

export interface LogEntry {
  level: LogLevel;
  msg: string;
}

export interface OperationResult {
  copied: number;
  skipped: number;
}

export type Lang = "en" | "ar" | "ru" | "zh";

export type SettingsCat =
  | "general"
  | "shortcuts"
  | "themes"
  | "extensions"
  | "profiles"
  | "snippets"
  | "tasks"
  | "help"
  | "about"
  | "report";

export type I18nKey = keyof (typeof import("./i18n"))["en"];