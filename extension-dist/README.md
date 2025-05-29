# NexAPI Detector - Chrome Extension

A comprehensive API monitoring, analytics, and workflow integration tool for developers. This Chrome extension provides real-time detection and analysis of API calls with advanced features including security scanning, documentation generation, and community-driven insights.

## Features

- **Real-time API Monitoring**: Automatically detects and logs API calls across web pages
- **Advanced Analytics**: Performance metrics, response time analysis, and usage patterns
- **Security Scanning**: Identifies vulnerabilities like SQL injection, XSS, and CORS misconfigurations
- **Documentation Generation**: Auto-generates API documentation from discovered endpoints
- **Community Features**: Share discoveries, create playbooks, and collaborate with other developers
- **Export Capabilities**: Export data in JSON and CSV formats
- **Workflow Integration**: Map API dependencies and analyze call patterns

## Installation

### Method 1: Chrome Web Store (Recommended)
*Coming soon - extension will be published to Chrome Web Store*

### Method 2: Manual Installation (Developer Mode)

1. **Download the Extension**
   - Download the `extension-dist` folder from this project
   - Or clone the repository and navigate to the `extension-dist` directory

2. **Enable Developer Mode**
   - Open Chrome and navigate to `chrome://extensions/`
   - Toggle "Developer mode" in the top-right corner

3. **Load the Extension**
   - Click "Load unpacked" button
   - Select the `extension-dist` folder
   - The extension should appear in your extensions list

4. **Pin the Extension**
   - Click the extensions icon in Chrome toolbar (puzzle piece)
   - Find "NexAPI Detector" and click the pin icon to keep it visible

## Usage

### Basic Monitoring

1. **Start Monitoring**
   - Click the NexAPI Detector icon in your Chrome toolbar
   - Navigate to any website with API endpoints
   - The extension will automatically detect and log API calls

2. **View API Calls**
   - Click the extension icon to open the popup
   - Switch to the "Monitor" tab to see detected API calls
   - Each call shows method, URL, status, and timestamp

3. **Analytics**
   - Switch to the "Analytics" tab for performance insights
   - View total requests, unique endpoints, success rates, and response times

### Advanced Features

#### Export Data
- Click "Export" in the Monitor tab for quick JSON export
- Use Settings tab for format-specific exports (JSON/CSV)
- Data includes all captured API call details

#### Settings Configuration
- **Auto-detect API calls**: Toggle automatic detection
- **Capture request headers**: Include headers in captured data
- **Filter out browser extensions**: Exclude extension-related requests

### Full Web Application

For the complete experience with advanced analytics, security scanning, and community features:

1. **Access the Web Interface**
   - The full application provides comprehensive dashboards
   - Includes AI-powered analytics and security insights
   - Community features for sharing discoveries and playbooks

2. **Integration**
   - The Chrome extension works seamlessly with the web application
   - Data captured in the extension can be analyzed in the full interface
   - Advanced workflows and dependency mapping available

## API Detection Patterns

The extension automatically detects API calls based on:

- URLs containing `/api/`, `/graphql`, `/v1/`, `/v2/`, etc.
- Requests with `application/json` content type
- Files ending in `.json`
- RESTful endpoint patterns

**Excluded from detection:**
- Static assets (CSS, JS, images)
- Browser extension requests
- Favicon requests

## Data Privacy

- All data is stored locally in Chrome's storage
- No data is transmitted to external servers without explicit user action
- Users have full control over data export and deletion
- Extension follows Chrome's security best practices

## Troubleshooting

### Extension Not Detecting APIs
1. Ensure the website actually makes API calls
2. Check that Developer mode is enabled
3. Reload the extension if needed
4. Verify the extension has necessary permissions

### Performance Issues
1. Clear old data using the "Clear" button
2. The extension automatically limits stored calls to 100 per tab
3. Close unused tabs to free up memory

### Export Not Working
1. Ensure Chrome has permission to download files
2. Check Chrome's download settings
3. Try different export formats (JSON vs CSV)

## Development

### Building from Source

1. **Prerequisites**
   - Node.js and npm installed
   - Access to the full project repository

2. **Build Process**
   ```bash
   npm install
   npm run build
   ```

3. **Extension Files**
   - All extension files are in the `extension-dist` directory
   - Core files: `manifest.json`, `background.js`, `popup.html`, `popup.js`

### Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Submit a pull request with detailed description

## Support

For issues, feature requests, or questions:
- Check the troubleshooting section above
- Review Chrome extension development documentation
- Ensure all permissions are granted to the extension

## Version History

- **v1.0.0**: Initial release with core monitoring and analytics features

## License

This project is licensed under the MIT License - see the LICENSE file for details.