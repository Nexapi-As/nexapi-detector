// Popup functionality for NexAPI Detector Chrome Extension

let currentTab = null;
let apiCalls = [];

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    // Get current tab
    try {
        const response = await chrome.runtime.sendMessage({ type: 'GET_CURRENT_TAB' });
        currentTab = response.tab;
        
        // Load API calls for current tab
        await loadApiCalls();
        
        // Set up event listeners
        setupEventListeners();
        
        // Update analytics
        updateAnalytics();
        
    } catch (error) {
        console.error('Error initializing popup:', error);
        showError('Failed to initialize extension');
    }
});

// Set up event listeners
function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            switchTab(e.target.dataset.tab);
        });
    });
    
    // Clear button
    document.getElementById('clear-btn').addEventListener('click', clearApiCalls);
    
    // Export buttons
    document.getElementById('export-btn').addEventListener('click', exportData);
    document.getElementById('export-json').addEventListener('click', () => exportData('json'));
    document.getElementById('export-csv').addEventListener('click', () => exportData('csv'));
    
    // Settings checkboxes
    const settings = ['auto-detect', 'include-headers', 'filter-extensions'];
    settings.forEach(setting => {
        const checkbox = document.getElementById(setting);
        if (checkbox) {
            // Load saved setting
            chrome.storage.local.get([setting], (result) => {
                checkbox.checked = result[setting] !== false;
            });
            
            // Save setting on change
            checkbox.addEventListener('change', () => {
                chrome.storage.local.set({ [setting]: checkbox.checked });
            });
        }
    });
}

// Switch between tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    document.getElementById(`${tabName}-tab`).style.display = 'block';
}

// Load API calls for current tab
async function loadApiCalls() {
    if (!currentTab) return;
    
    try {
        const response = await chrome.runtime.sendMessage({
            type: 'GET_TAB_DATA',
            tabId: currentTab.id
        });
        
        apiCalls = response.calls || [];
        renderApiCalls();
        updateAnalytics();
        
    } catch (error) {
        console.error('Error loading API calls:', error);
        showError('Failed to load API calls');
    }
}

// Render API calls in the UI
function renderApiCalls() {
    const container = document.getElementById('api-calls-container');
    
    if (apiCalls.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L13.09 8.26L21 9L13.09 15.74L12 22L10.91 15.74L3 9L10.91 8.26L12 2Z"/>
                </svg>
                <p>No API calls detected yet</p>
                <p style="font-size: 11px; margin-top: 8px;">Navigate to a website with API endpoints to start monitoring</p>
            </div>
        `;
        return;
    }
    
    // Sort by timestamp (newest first)
    const sortedCalls = [...apiCalls].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    container.innerHTML = sortedCalls.map(call => `
        <div class="api-call">
            <div class="api-call-header">
                <span class="method ${call.method}">${call.method}</span>
                <span class="status ${getStatusClass(call.status)}">${getStatusText(call.status)}</span>
            </div>
            <div class="url">${truncateUrl(call.url)}</div>
            <div class="timestamp">${formatTimestamp(call.timestamp)}</div>
        </div>
    `).join('');
}

// Update analytics display
function updateAnalytics() {
    const totalRequests = apiCalls.length;
    const uniqueEndpoints = new Set(apiCalls.map(call => getBaseUrl(call.url))).size;
    
    const successfulCalls = apiCalls.filter(call => 
        call.status && call.status >= 200 && call.status < 300
    ).length;
    
    const successRate = totalRequests > 0 ? 
        Math.round((successfulCalls / totalRequests) * 100) : 0;
    
    // Calculate average response time (if available)
    const avgResponse = 0; // Placeholder since we don't track response times in this simple version
    
    document.getElementById('total-requests').textContent = totalRequests;
    document.getElementById('unique-endpoints').textContent = uniqueEndpoints;
    document.getElementById('success-rate').textContent = `${successRate}%`;
    document.getElementById('avg-response').textContent = `${avgResponse}ms`;
}

// Clear all API calls for current tab
async function clearApiCalls() {
    if (!currentTab) return;
    
    try {
        await chrome.runtime.sendMessage({
            type: 'CLEAR_TAB_DATA',
            tabId: currentTab.id
        });
        
        apiCalls = [];
        renderApiCalls();
        updateAnalytics();
        
    } catch (error) {
        console.error('Error clearing API calls:', error);
        showError('Failed to clear API calls');
    }
}

// Export data in various formats
function exportData(format = 'json') {
    if (apiCalls.length === 0) {
        showError('No data to export');
        return;
    }
    
    let content, filename, mimeType;
    
    if (format === 'csv') {
        content = convertToCSV(apiCalls);
        filename = `api-calls-${Date.now()}.csv`;
        mimeType = 'text/csv';
    } else {
        content = JSON.stringify(apiCalls, null, 2);
        filename = `api-calls-${Date.now()}.json`;
        mimeType = 'application/json';
    }
    
    // Create download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
    }, () => {
        URL.revokeObjectURL(url);
    });
}

// Convert API calls to CSV format
function convertToCSV(calls) {
    const headers = ['Timestamp', 'Method', 'URL', 'Status', 'Size'];
    const rows = calls.map(call => [
        call.timestamp,
        call.method,
        call.url,
        call.status || 'N/A',
        call.size || 0
    ]);
    
    return [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
}

// Utility functions
function getStatusClass(status) {
    if (!status) return 'pending';
    if (status >= 200 && status < 300) return 'success';
    return 'error';
}

function getStatusText(status) {
    if (!status) return 'Pending';
    return status.toString();
}

function truncateUrl(url) {
    if (url.length <= 50) return url;
    return url.substring(0, 47) + '...';
}

function getBaseUrl(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.origin + urlObj.pathname;
    } catch {
        return url;
    }
}

function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
}

function showError(message) {
    // Simple error display - could be enhanced with better UI
    console.error(message);
    
    // Show error in the container temporarily
    const container = document.getElementById('api-calls-container');
    const originalContent = container.innerHTML;
    
    container.innerHTML = `
        <div style="background: #fee2e2; color: #dc2626; padding: 12px; border-radius: 8px; text-align: center;">
            ${message}
        </div>
    `;
    
    setTimeout(() => {
        container.innerHTML = originalContent;
    }, 3000);
}

// Listen for new API calls from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'NEW_API_CALL' && currentTab && message.data.tabId === currentTab.id) {
        // Add new API call to the list
        apiCalls.push(message.data);
        renderApiCalls();
        updateAnalytics();
    }
});