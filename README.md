# NexAPI Detector

A comprehensive API monitoring, analytics, and workflow integration platform designed for developers. Monitor APIs in real-time, generate documentation automatically, detect security vulnerabilities, and analyze API workflows.

## Features

### 🔍 Real-time API Monitoring
- Automatic detection and tracking of API calls across all websites
- Performance metrics and response time analysis
- Success rate monitoring and error tracking
- Tab-based organization of API data

### 📊 Advanced Analytics Dashboard
- Performance insights and optimization recommendations
- Usage pattern analysis with AI-powered suggestions
- Historical data visualization and trending
- Export capabilities (JSON, CSV formats)

### 🔒 Security Vulnerability Scanner
- Automated detection of SQL injection vulnerabilities
- XSS (Cross-Site Scripting) vulnerability scanning
- Authentication and authorization flaw detection
- CORS misconfiguration identification
- Real-time security alerts and recommendations

### 📚 Auto-Generated Documentation
- OpenAPI specification generation from detected endpoints
- Interactive API documentation viewer
- Endpoint discovery and cataloging
- Request/response schema analysis

### 🔄 API Workflow Analysis
- Dependency mapping between API endpoints
- Sequence pattern detection and visualization
- Automated testing scenario generation
- Workflow optimization recommendations

### 👥 Community Features
- API discovery sharing platform
- Community-driven playbook creation
- User reputation and badge system
- Collaborative API testing and documentation

## Architecture

### Web Application
- **Frontend**: React with TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Analytics**: AI-powered insights and anomaly detection
- **Security**: Comprehensive vulnerability scanning engine

### Chrome Extension
- **Manifest V3** compliant Chrome extension
- Real-time API call interception and analysis
- Seamless integration with web application backend
- Local storage with optional cloud synchronization
- Multi-tab interface with advanced features

## Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Chrome browser (for extension)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/nexapi-detector.git
   cd nexapi-detector
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database URL and other configurations
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Install Chrome Extension** (Optional)
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `extension-dist` folder

## Usage

### Web Application
1. Open your browser and navigate to `http://localhost:5000`
2. Start browsing websites with APIs to begin monitoring
3. Use the dashboard to view analytics, security reports, and documentation
4. Create and share API discoveries with the community

### Chrome Extension
1. Install the extension and pin it to your toolbar
2. Navigate to any website with API endpoints
3. Click the extension icon to view real-time monitoring
4. Access advanced features through integration with the web application

## API Endpoints

### Core API Routes
- `GET /api/analytics/dashboard` - Analytics overview
- `POST /api/api-calls` - Save API call data
- `GET /api/documentation` - Generated documentation
- `POST /api/security/scan` - Security vulnerability scan
- `GET /api/workflows` - API workflow analysis

### Community Features
- `GET /api/community/discoveries` - Browse API discoveries
- `POST /api/community/playbooks` - Create testing playbooks
- `GET /api/community/leaderboard` - User rankings

## Development

### Project Structure
```
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Application pages
│   │   └── lib/            # Utilities and configurations
├── server/                 # Express backend application
│   ├── routes.ts           # API route definitions
│   ├── storage.ts          # Database interface
│   └── services/           # Business logic services
├── shared/                 # Shared types and schemas
├── extension-dist/         # Chrome extension package
└── README.md
```

### Key Technologies
- **Frontend**: React, TypeScript, Tailwind CSS, Tanstack Query
- **Backend**: Express.js, TypeScript, Drizzle ORM
- **Database**: PostgreSQL
- **Extension**: Chrome Extension API, Manifest V3
- **Analytics**: Custom AI analytics engine
- **Security**: Automated vulnerability detection

### Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security Features

### Vulnerability Detection
- **SQL Injection**: Pattern-based detection in query parameters
- **XSS Vulnerabilities**: Script injection analysis
- **Authentication Flaws**: Weak authentication mechanism detection
- **CORS Issues**: Cross-origin policy misconfiguration detection
- **Data Exposure**: Sensitive information leak detection

### Privacy & Security
- Local-first data storage with optional cloud sync
- Encrypted data transmission
- No tracking or analytics collection
- User data remains private and secure

## Chrome Extension Features

### Real-time Monitoring
- Automatic API call detection across all websites
- Performance metrics and success rate tracking
- Tab-based data organization
- Local storage with export capabilities

### Advanced Integration
- Seamless connection to web application backend
- Enhanced analytics when connected
- Security scanning integration
- Documentation generation access

### Installation Guide
1. Download the extension files from the `extension-dist` folder
2. Open Chrome and go to `chrome://extensions/`
3. Toggle "Developer mode" ON
4. Click "Load unpacked" and select the extension folder
5. Pin the extension to your toolbar for easy access

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, feature requests, or bug reports:
- Open an issue on GitHub
- Check the documentation in the `/docs` folder
- Review the installation guide in `extension-dist/INSTALLATION.md`

## Roadmap

- [ ] Enhanced AI-powered API recommendations
- [ ] Integration with popular API testing tools
- [ ] Advanced workflow automation features
- [ ] Enterprise-grade security scanning
- [ ] Mobile application companion
- [ ] API marketplace integration

---

Built with ❤️ for the developer community. Monitor APIs, stay secure, and build better applications.# nexapi-detector
