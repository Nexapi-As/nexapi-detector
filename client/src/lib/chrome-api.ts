import type { ApiCall, ChromeTab } from '@shared/types';

export class ChromeAPI {
  static async getCurrentTab(): Promise<ChromeTab | null> {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        return null;
      }
      
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_CURRENT_TAB' }, (response) => {
          resolve(response?.tab || null);
        });
      });
    } catch (error) {
      console.error('Error getting current tab:', error);
      return null;
    }
  }

  static async getTabApiCalls(tabId: number): Promise<ApiCall[]> {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        return [];
      }
      
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_TAB_DATA', tabId }, (response) => {
          resolve(response?.calls || []);
        });
      });
    } catch (error) {
      console.error('Error getting tab API calls:', error);
      return [];
    }
  }

  static async clearTabData(tabId: number): Promise<boolean> {
    try {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        return false;
      }
      
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'CLEAR_TAB_DATA', tabId }, (response) => {
          resolve(response?.success || false);
        });
      });
    } catch (error) {
      console.error('Error clearing tab data:', error);
      return false;
    }
  }

  static onNewApiCall(callback: (apiCall: ApiCall) => void): () => void {
    if (typeof chrome === 'undefined' || !chrome.runtime) {
      return () => {};
    }

    const listener = (message: any) => {
      if (message.type === 'NEW_API_CALL') {
        callback(message.data);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }

  static downloadJSON(data: any, filename: string): void {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }

  static formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  static formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  static getMethodColor(method: string): string {
    const colors = {
      GET: 'bg-green-500',
      POST: 'bg-blue-500', 
      PUT: 'bg-orange-500',
      DELETE: 'bg-red-500',
      PATCH: 'bg-purple-500',
      OPTIONS: 'bg-gray-500',
      HEAD: 'bg-gray-400'
    };
    return colors[method as keyof typeof colors] || 'bg-gray-500';
  }

  static getStatusColor(status: number | null): string {
    if (!status) return 'bg-gray-500';
    if (status >= 200 && status < 300) return 'bg-gray-100 text-gray-700';
    if (status >= 300 && status < 400) return 'bg-blue-100 text-blue-700';
    if (status >= 400 && status < 500) return 'bg-orange-100 text-orange-700';
    if (status >= 500) return 'bg-red-500 text-white';
    return 'bg-gray-100 text-gray-700';
  }
}
