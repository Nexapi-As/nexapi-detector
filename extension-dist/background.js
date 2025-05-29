// Background service worker for NexAPI Detector

// Configuration
const API_BASE_URL = 'http://localhost:5000';

// Storage for API calls
let apiCalls = new Map();

// Initialize extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('NexAPI Detector installed');
  initializeBackendSync();
});

// Initialize backend synchronization
async function initializeBackendSync() {
  try {
    // Test connection to backend
    const response = await fetch(`${API_BASE_URL}/api/analytics/dashboard`);
    if (response.ok) {
      console.log('Backend connection established');
    }
  } catch (error) {
    console.warn('Backend not available, running in offline mode');
  }
}

// Listen for web requests
chrome.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    // Filter for API-like requests
    if (isAPIRequest(details.url, details.requestHeaders)) {
      const apiCall = {
        id: generateId(),
        method: details.method,
        url: details.url,
        timestamp: new Date().toISOString(),
        tabId: details.tabId,
        requestHeaders: details.requestHeaders || [],
        status: null, // Will be updated in onCompleted
        responseHeaders: [],
        size: 0
      };
      
      // Store the API call
      apiCalls.set(details.requestId, apiCall);
      
      // Save to chrome storage for the specific tab
      saveApiCallToStorage(apiCall);
    }
  },
  { urls: ['<all_urls>'] },
  ['requestHeaders']
);

// Listen for response completion
chrome.webRequest.onCompleted.addListener(
  (details) => {
    const apiCall = apiCalls.get(details.requestId);
    if (apiCall) {
      // Update with response details
      apiCall.status = details.statusCode;
      apiCall.responseHeaders = details.responseHeaders || [];
      
      // Estimate size from content length header
      const contentLengthHeader = details.responseHeaders?.find(
        header => header.name.toLowerCase() === 'content-length'
      );
      apiCall.size = contentLengthHeader ? parseInt(contentLengthHeader.value) : 0;
      
      // Update storage
      saveApiCallToStorage(apiCall);
      
      // Notify popup if it's open
      notifyPopup(apiCall);
      
      // Clean up
      apiCalls.delete(details.requestId);
    }
  },
  { urls: ['<all_urls>'] },
  ['responseHeaders']
);

// Listen for error responses
chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    const apiCall = apiCalls.get(details.requestId);
    if (apiCall) {
      apiCall.status = 0; // Network error
      saveApiCallToStorage(apiCall);
      notifyPopup(apiCall);
      apiCalls.delete(details.requestId);
    }
  },
  { urls: ['<all_urls>'] }
);

// Helper functions
function isAPIRequest(url, headers) {
  // Check if URL looks like an API endpoint
  const apiPatterns = [
    /\/api\//i,
    /\/graphql/i,
    /\.json$/i,
    /\/v\d+\//i,
    /\/rest\//i
  ];
  
  const hasApiPattern = apiPatterns.some(pattern => pattern.test(url));
  
  // Check for JSON content type in headers
  const hasJsonHeader = headers?.some(header => 
    header.name.toLowerCase() === 'content-type' && 
    header.value.includes('application/json')
  );
  
  // Exclude common non-API requests
  const excludePatterns = [
    /\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/i,
    /\/favicon\./i,
    /chrome-extension:/,
    /moz-extension:/,
    /\.hot-update\./
  ];
  
  const isExcluded = excludePatterns.some(pattern => pattern.test(url));
  
  return (hasApiPattern || hasJsonHeader) && !isExcluded;
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

async function saveApiCallToStorage(apiCall) {
  try {
    // Store locally first
    const key = `tab_${apiCall.tabId}`;
    const result = await chrome.storage.local.get([key]);
    const existingCalls = result[key] || [];
    
    // Find existing call and update, or add new one
    const existingIndex = existingCalls.findIndex(call => call.id === apiCall.id);
    if (existingIndex >= 0) {
      existingCalls[existingIndex] = apiCall;
    } else {
      existingCalls.push(apiCall);
    }
    
    // Keep only recent calls (limit to 100 per tab)
    const recentCalls = existingCalls.slice(-100);
    
    await chrome.storage.local.set({ [key]: recentCalls });
    
    // Try to sync with backend for advanced features
    try {
      const response = await fetch(`${API_BASE_URL}/api/api-calls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: apiCall.method,
          url: apiCall.url,
          tabId: apiCall.tabId,
          requestHeaders: apiCall.requestHeaders || [],
          responseHeaders: apiCall.responseHeaders || [],
          status: apiCall.status || 0,
          size: apiCall.size || 0
        })
      });
      
      if (response.ok) {
        console.log('API call synced with backend for advanced analytics');
      }
    } catch (backendError) {
      console.log('Backend sync failed, using local storage only');
    }
    
  } catch (error) {
    console.error('Error saving API call to storage:', error);
  }
}

function notifyPopup(apiCall) {
  // Send message to popup if it's listening
  chrome.runtime.sendMessage({
    type: 'NEW_API_CALL',
    data: apiCall
  }).catch(() => {
    // Popup might not be open, ignore error
  });
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_CURRENT_TAB':
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        sendResponse({ tab: tabs[0] });
      });
      return true; // Will respond asynchronously
      
    case 'CLEAR_TAB_DATA':
      chrome.storage.local.remove([`tab_${message.tabId}`], () => {
        sendResponse({ success: true });
      });
      return true;
      
    case 'GET_TAB_DATA':
      chrome.storage.local.get([`tab_${message.tabId}`], (result) => {
        sendResponse({ calls: result[`tab_${message.tabId}`] || [] });
      });
      return true;
  }
});