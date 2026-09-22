import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";

export interface ScanParams {
  source: string;
  includeImages: boolean;
  keepFiles: string[];
}

export interface RunParams {
  source: string;
  target: string;
  mode: "clean" | "flatten" | "scan";
  includeImages: boolean;
  keepFiles: string[];
}

export interface AppEvent {
  type: string;
  [k: string]: unknown;
}

const api = {
  selectSource: (): Promise<string | null> => ipcRenderer.invoke("dialog:source"),
  selectTarget: (): Promise<string | null> => ipcRenderer.invoke("dialog:target"),
  scan: (source: string, includeImages: boolean, keepFiles: string[]) =>
    ipcRenderer.invoke("engine:scan", source, includeImages, keepFiles),
  run: (params: RunParams) => ipcRenderer.invoke("engine:run", params),
  cancel: () => ipcRenderer.send("engine:cancel"),
  openOutput: (target: string) => ipcRenderer.invoke("engine:open", target),
  pathInfo: (target: string) => ipcRenderer.invoke("engine:pathinfo", target),
  openExternal: (url: string) => ipcRenderer.invoke("shell:open-external", url),
  getInstalledLang: (): Promise<string | null> => ipcRenderer.invoke("app:installed-lang"),
  getStartupPath: (): Promise<string | null> => ipcRenderer.invoke("startup:path"),
  winMin: () => ipcRenderer.send("win:min"),
  winMax: () => ipcRenderer.send("win:max"),
  winClose: () => ipcRenderer.send("win:close"),
  onEvent: (cb: (evt: AppEvent) => void): (() => void) => {
    const listener = (_e: IpcRendererEvent, evt: AppEvent) => cb(evt);
    ipcRenderer.on("evt", listener);
    return () => ipcRenderer.removeListener("evt", listener);
  },
};

export type RepoPrepApi = typeof api;

contextBridge.exposeInMainWorld("repoprep", api);