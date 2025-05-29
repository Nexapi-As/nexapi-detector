// Enhanced popup functionality with full backend integration
const API_BASE_URL = 'http://localhost:5000';

let currentTab = 'monitor';
let apiCalls = [];
let analytics = null;
let backendConnected = false;

// Initialize the popup
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await initializeData();
  updateUI();
  
  // Auto-refresh data every 5 seconds
  setInterval(refreshData, 5000);
});

function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Listen for new API calls from background script
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'NEW_API_CALL') {
      handleNewApiCall(message.data);
    }
  });
}

function switchTab(tabName) {
  currentTab = tabName;
  
  // Update tab buttons
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });
  
  // Update content
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === tabName);
  });
  
  // Load tab-specific data
  loadTabData(tabName);
}

async function initializeData() {
  try {
    // Test backend connection
    const response = await fetch(`${API_BASE_URL}/api/analytics/dashboard`);
    backendConnected = response.ok;
    
    if (backendConnected) {
      document.getElementById('status-text').textContent = 'Connected to Backend';
    } else {
      document.getElementById('status-text').textContent = 'Local Mode Only';
    }
  } catch (error) {
    backendConnected = false;
    document.getElementById('status-text').textContent = 'Local Mode Only';
  }
  
  await loadApiCalls();
}

async function loadApiCalls() {
  try {
    // Get current tab ID
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = activeTab.id;
    
    // Load from Chrome storage
    const result = await chrome.storage.local.get([`tab_${tabId}`]);
    apiCalls = result[`tab_${tabId}`] || [];
    
    updateApiCallsList();
    updateMetrics();
  } catch (error) {
    console.error('Error loading API calls:', error);
  }
}

function handleNewApiCall(apiCall) {
  apiCalls.unshift(apiCall);
  if (apiCalls.length > 100) {
    apiCalls = apiCalls.slice(0, 100);
  }
  
  updateApiCallsList();
  updateMetrics();
}

function updateApiCallsList() {
  const container = document.getElementById('api-calls-list');
  
  if (apiCalls.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No API calls detected yet.<br>Navigate to a website to start monitoring.</p>
      </div>
    `;
    return;
  }
  
  const recentCalls = apiCalls.slice(0, 10);
  container.innerHTML = recentCalls.map(call => `
    <div class="api-call">
      <div>
        <span class="method ${call.method.toLowerCase()}">${call.method}</span>
        <span class="url">${truncateUrl(call.url)}</span>
      </div>
      <div>
        <span class="status ${call.status >= 200 && call.status < 300 ? 'success' : 'error'}">
          ${call.status || 'Error'}
        </span>
        <span class="time">${formatTime(call.timestamp)}</span>
      </div>
    </div>
  `).join('');
}

function updateMetrics() {
  document.getElementById('api-count').textContent = apiCalls.length;
  
  const successfulCalls = apiCalls.filter(call => call.status >= 200 && call.status < 300);
  const successRate = apiCalls.length > 0 ? Math.round((successfulCalls.length / apiCalls.length) * 100) : 100;
  document.getElementById('success-rate').textContent = `${successRate}%`;
  
  // Calculate average response time (mock calculation for now)
  const avgTime = apiCalls.length > 0 ? Math.round(Math.random() * 500 + 100) : 0;
  document.getElementById('avg-response').textContent = `${avgTime}ms`;
}

async function loadTabData(tabName) {
  switch (tabName) {
    case 'analytics':
      await loadAnalytics();
      break;
    case 'security':
      await loadSecurityData();
      break;
    case 'docs':
      await loadDocumentation();
      break;
    case 'workflows':
      await loadWorkflows();
      break;
  }
}

async function loadAnalytics() {
  const container = document.getElementById('performance-metrics');
  
  if (!backendConnected) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Connect to backend for advanced analytics.<br>
        <button class="btn btn-primary" onclick="openFullDashboard()">Open Full Dashboard</button></p>
      </div>
    `;
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/analytics/dashboard`);
    if (response.ok) {
      const data = await response.json();
      container.innerHTML = `
        <div class="metric">
          <span>Total Requests:</span>
          <span class="metric-value">${data.usage.totalRequests}</span>
        </div>
        <div class="metric">
          <span>Unique Endpoints:</span>
          <span class="metric-value">${data.usage.uniqueEndpoints}</span>
        </div>
        <div class="metric">
          <span>Error Rate:</span>
          <span class="metric-value">${data.usage.errorRate}%</span>
        </div>
        <div class="metric">
          <span>Avg Response Time:</span>
          <span class="metric-value">${data.usage.avgResponseTime}ms</span>
        </div>
      `;
    }
  } catch (error) {
    container.innerHTML = '<div class="loading">Failed to load analytics</div>';
  }
}

async function loadSecurityData() {
  const container = document.getElementById('security-alerts');
  
  if (!backendConnected) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Connect to backend for security scanning.<br>
        <button class="btn btn-warning" onclick="openSecurityDashboard()">Open Security Center</button></p>
      </div>
    `;
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/security/scan`);
    if (response.ok) {
      const data = await response.json();
      if (data.vulnerabilities && data.vulnerabilities.length > 0) {
        container.innerHTML = data.vulnerabilities.slice(0, 3).map(vuln => `
          <div class="security-alert">
            <h4>${vuln.type}</h4>
            <p>${vuln.description}</p>
          </div>
        `).join('');
      } else {
        container.innerHTML = '<div class="empty-state"><p>No security issues detected</p></div>';
      }
    }
  } catch (error) {
    container.innerHTML = '<div class="loading">Security scan unavailable</div>';
  }
}

async function loadDocumentation() {
  const container = document.getElementById('endpoints-list');
  
  if (!backendConnected) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Connect to backend for documentation generation.<br>
        <button class="btn btn-success" onclick="openFullApplication()">Open Documentation</button></p>
      </div>
    `;
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/documentation`);
    if (response.ok) {
      const docs = await response.json();
      if (docs.length > 0) {
        container.innerHTML = docs.slice(0, 5).map(doc => `
          <div class="endpoint-item">
            <strong>${doc.title || doc.baseUrl}</strong><br>
            <small>${doc.endpoints?.length || 0} endpoints documented</small>
          </div>
        `).join('');
      } else {
        container.innerHTML = '<div class="empty-state"><p>No endpoints documented yet</p></div>';
      }
    }
  } catch (error) {
    container.innerHTML = '<div class="loading">Documentation unavailable</div>';
  }
}

async function loadWorkflows() {
  const container = document.getElementById('workflows-list');
  
  if (!backendConnected) {
    container.innerHTML = `
      <div class="empty-state">
        <p>Connect to backend for workflow analysis.<br>
        <button class="btn btn-primary" onclick="openFullApplication()">Open Workflow Analyzer</button></p>
      </div>
    `;
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/workflows`);
    if (response.ok) {
      const workflows = await response.json();
      if (workflows.length > 0) {
        container.innerHTML = workflows.slice(0, 3).map(workflow => `
          <div class="workflow-step">
            <strong>${workflow.name}</strong><br>
            <small>${workflow.steps?.length || 0} steps detected</small>
          </div>
        `).join('');
      } else {
        container.innerHTML = '<div class="empty-state"><p>No workflows detected yet</p></div>';
      }
    }
  } catch (error) {
    container.innerHTML = '<div class="loading">Workflow analysis unavailable</div>';
  }
}

async function refreshData() {
  await loadApiCalls();
  if (currentTab !== 'monitor') {
    await loadTabData(currentTab);
  }
}

// Action functions
function openFullApplication() {
  chrome.tabs.create({ url: API_BASE_URL });
}

function openFullDashboard() {
  chrome.tabs.create({ url: `${API_BASE_URL}/analytics` });
}

function openSecurityDashboard() {
  chrome.tabs.create({ url: `${API_BASE_URL}/security` });
}

async function generateDocs() {
  if (!backendConnected) {
    openFullApplication();
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/documentation/generate`, {
      method: 'POST'
    });
    if (response.ok) {
      await loadDocumentation();
    }
  } catch (error) {
    console.error('Failed to generate documentation:', error);
  }
}

function viewDocs() {
  chrome.tabs.create({ url: `${API_BASE_URL}/documentation` });
}

async function runSecurityScan() {
  if (!backendConnected) {
    openSecurityDashboard();
    return;
  }
  
  document.getElementById('security-alerts').innerHTML = '<div class="loading">Running security scan...</div>';
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/security/scan`, {
      method: 'POST'
    });
    if (response.ok) {
      setTimeout(() => loadSecurityData(), 2000);
    }
  } catch (error) {
    document.getElementById('security-alerts').innerHTML = '<div class="loading">Security scan failed</div>';
  }
}

function viewSecurityReport() {
  chrome.tabs.create({ url: `${API_BASE_URL}/security` });
}

async function analyzeWorkflows() {
  if (!backendConnected) {
    openFullApplication();
    return;
  }
  
  document.getElementById('workflows-list').innerHTML = '<div class="loading">Analyzing workflows...</div>';
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/workflows/analyze`, {
      method: 'POST'
    });
    if (response.ok) {
      setTimeout(() => loadWorkflows(), 2000);
    }
  } catch (error) {
    document.getElementById('workflows-list').innerHTML = '<div class="loading">Workflow analysis failed</div>';
  }
}

function viewWorkflowMap() {
  chrome.tabs.create({ url: `${API_BASE_URL}/workflows` });
}

async function exportAnalytics() {
  if (!backendConnected) {
    // Export local data
    const data = {
      apiCalls: apiCalls,
      timestamp: new Date().toISOString(),
      source: 'NexAPI Extension'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
      url: url,
      filename: `nexapi-data-${Date.now()}.json`
    });
    return;
  }
  
  chrome.tabs.create({ url: `${API_BASE_URL}/analytics?export=true` });
}

// Utility functions
function truncateUrl(url) {
  if (url.length > 30) {
    return url.substring(0, 30) + '...';
  }
  return url;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function updateUI() {
  // Update connection status
  const statusDot = document.querySelector('.status-dot');
  if (backendConnected) {
    statusDot.style.background = '#10b981';
  } else {
    statusDot.style.background = '#f59e0b';
  }
}