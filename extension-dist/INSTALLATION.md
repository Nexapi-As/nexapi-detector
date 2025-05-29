# NexAPI Detector - Advanced Chrome Extension

## Installation Guide

### Quick Installation Steps

1. **Download Extension Files**
   - You now have the complete Chrome extension in the `extension-dist` folder

2. **Install in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Toggle "Developer mode" ON (top-right corner)
   - Click "Load unpacked"
   - Select the `extension-dist` folder
   - The extension will appear in your extensions list

3. **Pin to Toolbar**
   - Click the extensions puzzle icon in Chrome toolbar
   - Find "NexAPI Detector" and click the pin icon

## Advanced Features

### 🔍 Real-time API Monitoring
- Automatic detection of API calls across all websites
- Real-time performance metrics and success rates
- Tab-based organization of API data
- Comprehensive request/response analysis

### 📊 Advanced Analytics
- Performance insights and optimization recommendations
- Usage pattern analysis with AI-powered suggestions
- Export capabilities (JSON, CSV formats)
- Integration with full analytics dashboard

### 🔒 Security Scanning
- Automated vulnerability detection
- SQL injection and XSS vulnerability scanning
- Authentication and CORS misconfiguration detection
- Real-time security alerts and recommendations

### 📚 Auto-Generated Documentation
- OpenAPI specification generation from detected endpoints
- Interactive API documentation viewer
- Endpoint discovery and cataloging
- Integration with full documentation system

### 🔄 Workflow Analysis
- API dependency mapping and sequence detection
- Automated workflow discovery
- Testing scenario generation
- Visual workflow representation

## Backend Integration

The extension automatically connects to your full NexAPI application backend when available, providing:

- **Enhanced Analytics**: Full dashboard with advanced metrics
- **Security Center**: Comprehensive vulnerability scanning
- **Documentation System**: Complete API documentation generation
- **Workflow Mapper**: Visual API dependency analysis
- **Community Features**: API sharing and collaboration tools

### Local vs Backend Mode

**Local Mode** (when backend unavailable):
- Basic API monitoring and detection
- Local data storage and export
- Core functionality maintained

**Backend Mode** (when connected):
- Full feature set with advanced analytics
- Real-time security scanning
- Automatic documentation generation
- Workflow analysis and mapping
- Data synchronization across devices

## Testing the Extension

1. **Install** the extension following steps above
2. **Navigate** to any website with API endpoints (GitHub, Twitter, REST APIs)
3. **Open** the extension popup to see detected API calls
4. **Explore** different tabs for analytics, security, documentation, and workflows
5. **Connect** to the full application for advanced features

## Package Contents

- `manifest.json` - Extension configuration with full permissions
- `background.js` - Enhanced service worker with backend sync
- `popup-enhanced.html` - Advanced multi-tab interface
- `popup-enhanced.js` - Full feature implementation
- `icon-*.png` - Professional extension icons
- `INSTALLATION.md` - This comprehensive guide
- `README.md` - Complete documentation

## Troubleshooting

**Extension Issues:**
- Ensure Developer mode is enabled in Chrome
- Check all files are present in the extension folder
- Restart Chrome if extension doesn't load

**Connection Issues:**
- Extension works offline with local storage
- Backend connection is optional but provides enhanced features
- Check network connectivity for full feature access

**Detection Issues:**
- Extension monitors HTTP(S) requests automatically
- Some single-page applications may require page refresh
- API patterns are continuously detected as you browse

## Advanced Usage

**For Developers:**
- Use the extension to analyze your own API implementations
- Generate documentation automatically from live endpoints
- Identify security vulnerabilities during development
- Map API dependencies and workflows

**For API Testing:**
- Monitor third-party API integrations
- Analyze performance and reliability metrics
- Export data for further analysis
- Create automated testing scenarios

**For Security Auditing:**
- Scan for common API vulnerabilities
- Monitor authentication and authorization flows
- Detect potential data exposure risks
- Generate security compliance reports