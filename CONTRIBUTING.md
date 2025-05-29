# Contributing to NexAPI Detector

Thank you for your interest in contributing to NexAPI Detector! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository on GitHub
2. Clone your fork locally
3. Create a new branch for your feature or bug fix
4. Make your changes
5. Test your changes thoroughly
6. Submit a pull request

## Development Setup

### Prerequisites
- Node.js 18 or higher
- PostgreSQL database
- Chrome browser (for extension testing)

### Local Development
```bash
# Clone your fork
git clone https://github.com/yourusername/nexapi-detector.git
cd nexapi-detector

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configurations

# Set up database
npm run db:push

# Start development server
npm run dev
```

## Project Structure

- `client/` - React frontend application
- `server/` - Express backend with TypeScript
- `shared/` - Shared types and database schemas
- `extension-dist/` - Chrome extension package

## Code Style

- Use TypeScript for all new code
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Use Prettier for code formatting
- Follow React hooks patterns for frontend components

## Testing

- Test your changes in both web application and Chrome extension
- Verify database migrations work correctly
- Test API endpoints with proper error handling
- Ensure security features function as expected

## Submitting Changes

1. Create a descriptive branch name (e.g., `feature/security-scanner-improvements`)
2. Write clear commit messages
3. Include tests for new functionality
4. Update documentation as needed
5. Submit a pull request with a clear description

## Areas for Contribution

- Security vulnerability detection improvements
- New analytics and visualization features
- Chrome extension enhancements
- Documentation and user guides
- Performance optimizations
- Community features

## Questions?

Feel free to open an issue for questions or discussion about potential contributions.