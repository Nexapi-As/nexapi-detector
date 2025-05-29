export interface ChromeApiCall {
  id: string;
  method: string;
  url: string;
  timestamp: string;
  tabId: number;
  requestHeaders: Array<{ name: string; value: string }>;
  responseHeaders: Array<{ name: string; value: string }>;
  status: number | null;
  size: number;
}

export interface ChromeTab {
  id?: number;
  url?: string;
  title?: string;
}

export interface StorageData {
  [key: string]: ChromeApiCall[];
}

// Re-export ApiCall from schema for backwards compatibility
export type { ApiCall } from "@shared/schema";
