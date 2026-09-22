/// <reference types="vite/client" />

import type { RepoPrepApi } from "../electron/preload";

declare global {
  interface Window {
    repoprep: RepoPrepApi;
  }
}

export {};