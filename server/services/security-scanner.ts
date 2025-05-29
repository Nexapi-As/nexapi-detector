import { ApiCall, ApiEndpoint } from "@shared/schema";
import { storage } from "../storage";

interface SecurityVulnerability {
  id: string;
  type: 'owasp' | 'business_logic' | 'data_exposure' | 'authentication' | 'authorization';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  endpoint: string;
  evidence: {
    request?: any;
    response?: any;
    headers?: Array<{ name: string; value: string }>;
  };
  recommendation: string;
  owaspCategory?: string;
  cwe?: string;
  detectedAt: Date;
}

interface EndpointChange {
  id: string;
  endpoint: string;
  changeType: 'new_endpoint' | 'modified_response' | 'deprecated' | 'breaking_change';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  oldSchema?: any;
  newSchema?: any;
  detectedAt: Date;
  impact: string;
}

export class SecurityScanner {
  private static vulnerabilities: SecurityVulnerability[] = [];
  private static endpointChanges: EndpointChange[] = [];
  private static endpointBaselines = new Map<string, any>();

  static async scanApiCall(apiCall: ApiCall): Promise<void> {
    try {
      // Perform security scans
      const vulnerabilities = await this.detectVulnerabilities(apiCall);
      vulnerabilities.forEach(vuln => this.addVulnerability(vuln));

      // Check for endpoint changes
      const changes = await this.detectEndpointChanges(apiCall);
      changes.forEach(change => this.addEndpointChange(change));

    } catch (error) {
      console.error('Security scanning failed:', error);
    }
  }

  private static async detectVulnerabilities(apiCall: ApiCall): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];
    const endpointId = `${new URL(apiCall.url).pathname}:${apiCall.method}`;

    // OWASP A01: Broken Access Control
    vulnerabilities.push(...this.checkBrokenAccessControl(apiCall, endpointId));

    // OWASP A02: Cryptographic Failures
    vulnerabilities.push(...this.checkCryptographicFailures(apiCall, endpointId));

    // OWASP A03: Injection
    vulnerabilities.push(...this.checkInjectionFlaws(apiCall, endpointId));

    // OWASP A04: Insecure Design
    vulnerabilities.push(...this.checkInsecureDesign(apiCall, endpointId));

    // OWASP A05: Security Misconfiguration
    vulnerabilities.push(...this.checkSecurityMisconfiguration(apiCall, endpointId));

    // OWASP A06: Vulnerable Components
    vulnerabilities.push(...this.checkVulnerableComponents(apiCall, endpointId));

    // OWASP A07: Identification and Authentication Failures
    vulnerabilities.push(...this.checkAuthenticationFailures(apiCall, endpointId));

    // OWASP A08: Software and Data Integrity Failures
    vulnerabilities.push(...this.checkIntegrityFailures(apiCall, endpointId));

    // OWASP A09: Security Logging and Monitoring Failures
    vulnerabilities.push(...this.checkLoggingFailures(apiCall, endpointId));

    // OWASP A10: Server-Side Request Forgery
    vulnerabilities.push(...this.checkSSRFVulnerabilities(apiCall, endpointId));

    // Business Logic Flaws
    vulnerabilities.push(...this.checkBusinessLogicFlaws(apiCall, endpointId));

    return vulnerabilities;
  }

  private static checkBrokenAccessControl(apiCall: ApiCall, endpointId: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check for missing authentication
    const hasAuth = apiCall.requestHeaders.some(h => 
      ['authorization', 'x-auth-token', 'x-api-key'].includes(h.name.toLowerCase())
    );

    if (!hasAuth && apiCall.method !== 'GET') {
      vulnerabilities.push({
        id: `${endpointId}-missing-auth`,
        type: 'authorization',
        severity: 'high',
        title: 'Missing Authentication',
        description: 'Endpoint accepts requests without authentication headers',
        endpoint: endpointId,
        evidence: { headers: apiCall.requestHeaders },
        recommendation: 'Implement proper authentication mechanisms (OAuth, JWT, API keys)',
        owaspCategory: 'A01 - Broken Access Control',
        cwe: 'CWE-862',
        detectedAt: new Date()
      });
    }

    // Check for potential IDOR (Insecure Direct Object Reference)
    const hasNumericId = /\/\d+(?:\/|$)/.test(apiCall.url);
    const hasUuidId = /\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:\/|$)/i.test(apiCall.url);
    
    if ((hasNumericId || hasUuidId) && ['GET', 'PUT', 'DELETE'].includes(apiCall.method)) {
      vulnerabilities.push({
        id: `${endpointId}-potential-idor`,
        type: 'authorization',
        severity: 'medium',
        title: 'Potential IDOR Vulnerability',
        description: 'Endpoint exposes direct object references that may be manipulated',
        endpoint: endpointId,
        evidence: { request: { url: apiCall.url, method: apiCall.method } },
        recommendation: 'Implement proper authorization checks and use indirect object references',
        owaspCategory: 'A01 - Broken Access Control',
        cwe: 'CWE-639',
        detectedAt: new Date()
      });
    }

    return vulnerabilities;
  }

  private static checkCryptographicFailures(apiCall: ApiCall, endpointId: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check for HTTP instead of HTTPS
    if (apiCall.url.startsWith('http://')) {
      vulnerabilities.push({
        id: `${endpointId}-insecure-transport`,
        type: 'data_exposure',
        severity: 'high',
        title: 'Insecure Transport',
        description: 'API communication over unencrypted HTTP',
        endpoint: endpointId,
        evidence: { request: { url: apiCall.url } },
        recommendation: 'Use HTTPS for all API communications to encrypt data in transit',
        owaspCategory: 'A02 - Cryptographic Failures',
        cwe: 'CWE-319',
        detectedAt: new Date()
      });
    }

    // Check for sensitive data in URL parameters
    const url = new URL(apiCall.url);
    const sensitiveParams = ['password', 'token', 'key', 'secret', 'api_key', 'access_token'];
    
    for (const [param, value] of url.searchParams.entries()) {
      if (sensitiveParams.some(sensitive => param.toLowerCase().includes(sensitive))) {
        vulnerabilities.push({
          id: `${endpointId}-sensitive-data-url`,
          type: 'data_exposure',
          severity: 'high',
          title: 'Sensitive Data in URL',
          description: `Sensitive parameter '${param}' exposed in URL`,
          endpoint: endpointId,
          evidence: { request: { url: apiCall.url } },
          recommendation: 'Move sensitive data to request headers or body, never expose in URLs',
          owaspCategory: 'A02 - Cryptographic Failures',
          cwe: 'CWE-598',
          detectedAt: new Date()
        });
      }
    }

    return vulnerabilities;
  }

  private static checkInjectionFlaws(apiCall: ApiCall, endpointId: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check for potential SQL injection patterns in URL parameters
    const url = new URL(apiCall.url);
    const sqlInjectionPatterns = [
      /['";]|--|\*|union|select|insert|update|delete|drop|exec|script/i
    ];

    for (const [param, value] of url.searchParams.entries()) {
      if (sqlInjectionPatterns.some(pattern => pattern.test(value))) {
        vulnerabilities.push({
          id: `${endpointId}-potential-sql-injection`,
          type: 'owasp',
          severity: 'high',
          title: 'Potential SQL Injection',
          description: `Suspicious SQL keywords detected in parameter '${param}'`,
          endpoint: endpointId,
          evidence: { request: { url: apiCall.url } },
          recommendation: 'Use parameterized queries and input validation to prevent SQL injection',
          owaspCategory: 'A03 - Injection',
          cwe: 'CWE-89',
          detectedAt: new Date()
        });
      }
    }

    // Check for XSS patterns in responses
    if (apiCall.responseBody) {
      const xssPatterns = [
        /<script[^>]*>.*?<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi
      ];

      const hasXSSPattern = xssPatterns.some(pattern => pattern.test(apiCall.responseBody));
      if (hasXSSPattern) {
        vulnerabilities.push({
          id: `${endpointId}-potential-xss`,
          type: 'owasp',
          severity: 'medium',
          title: 'Potential XSS Vulnerability',
          description: 'Response contains potentially dangerous script content',
          endpoint: endpointId,
          evidence: { response: apiCall.responseBody },
          recommendation: 'Sanitize and encode all user input before rendering in responses',
          owaspCategory: 'A03 - Injection',
          cwe: 'CWE-79',
          detectedAt: new Date()
        });
      }
    }

    return vulnerabilities;
  }

  private static checkInsecureDesign(apiCall: ApiCall, endpointId: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check for verbose error messages
    if (apiCall.status && apiCall.status >= 400 && apiCall.responseBody) {
      const verboseErrorPatterns = [
        /stack trace/i,
        /exception/i,
        /error.*line \d+/i,
        /sql.*error/i,
        /database.*error/i
      ];

      if (verboseErrorPatterns.some(pattern => pattern.test(apiCall.responseBody))) {
        vulnerabilities.push({
          id: `${endpointId}-verbose-errors`,
          type: 'data_exposure',
          severity: 'medium',
          title: 'Verbose Error Messages',
          description: 'API exposes sensitive system information in error responses',
          endpoint: endpointId,
          evidence: { response: apiCall.responseBody },
          recommendation: 'Implement generic error messages and log detailed errors server-side only',
          owaspCategory: 'A04 - Insecure Design',
          cwe: 'CWE-209',
          detectedAt: new Date()
        });
      }
    }

    return vulnerabilities;
  }

  private static checkSecurityMisconfiguration(apiCall: ApiCall, endpointId: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check for missing security headers
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'strict-transport-security',
      'content-security-policy'
    ];

    const missingHeaders = securityHeaders.filter(header => 
      !apiCall.responseHeaders.some(h => h.name.toLowerCase() === header)
    );

    if (missingHeaders.length > 0) {
      vulnerabilities.push({
        id: `${endpointId}-missing-security-headers`,
        type: 'owasp',
        severity: 'medium',
        title: 'Missing Security Headers',
        description: `Missing security headers: ${missingHeaders.join(', ')}`,
        endpoint: endpointId,
        evidence: { headers: apiCall.responseHeaders },
        recommendation: 'Implement all recommended security headers to prevent common attacks',
        owaspCategory: 'A05 - Security Misconfiguration',
        cwe: 'CWE-16',
        detectedAt: new Date()
      });
    }

    // Check for CORS misconfiguration
    const corsHeader = apiCall.responseHeaders.find(h => 
      h.name.toLowerCase() === 'access-control-allow-origin'
    );

    if (corsHeader && corsHeader.value === '*') {
      vulnerabilities.push({
        id: `${endpointId}-cors-wildcard`,
        type: 'owasp',
        severity: 'medium',
        title: 'Overly Permissive CORS',
        description: 'CORS policy allows requests from any origin (*)',
        endpoint: endpointId,
        evidence: { headers: [corsHeader] },
        recommendation: 'Configure CORS to allow only trusted domains',
        owaspCategory: 'A05 - Security Misconfiguration',
        cwe: 'CWE-346',
        detectedAt: new Date()
      });
    }

    return vulnerabilities;
  }

  private static checkVulnerableComponents(apiCall: ApiCall, endpointId: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check for server version disclosure
    const serverHeader = apiCall.responseHeaders.find(h => 
      h.name.toLowerCase() === 'server'
    );

    if (serverHeader && /\d+\.\d+/.test(serverHeader.value)) {
      vulnerabilities.push({
        id: `${endpointId}-server-version-disclosure`,
        type: 'data_exposure',
        severity: 'low',
        title: 'Server Version Disclosure',
        description: `Server version exposed: ${serverHeader.value}`,
        endpoint: endpointId,
        evidence: { headers: [serverHeader] },
        recommendation: 'Remove or obfuscate server version information',
        owaspCategory: 'A06 - Vulnerable and Outdated Components',
        cwe: 'CWE-200',
        detectedAt: new Date()
      });
    }

    return vulnerabilities;
  }

  private static checkAuthenticationFailures(apiCall: ApiCall, endpointId: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check for weak authentication schemes
    const authHeader = apiCall.requestHeaders.find(h => 
      h.name.toLowerCase() === 'authorization'
    );

    if (authHeader) {
      const authValue = authHeader.value.toLowerCase();
      
      // Check for Basic Auth
      if (authValue.startsWith('basic ')) {
        vulnerabilities.push({
          id: `${endpointId}-basic-auth`,
          type: 'authentication',
          severity: 'medium',
          title: 'Basic Authentication Used',
          description: 'API uses Basic Authentication which transmits credentials in base64',
          endpoint: endpointId,
          evidence: { headers: [authHeader] },
          recommendation: 'Use more secure authentication methods like OAuth 2.0 or JWT',
          owaspCategory: 'A07 - Identification and Authentication Failures',
          cwe: 'CWE-307',
          detectedAt: new Date()
        });
      }

      // Check for JWT without proper claims
      if (authValue.startsWith('bearer ')) {
        const token = authValue.substring(7);
        if (token.includes('.')) {
          try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (!payload.exp) {
              vulnerabilities.push({
                id: `${endpointId}-jwt-no-expiry`,
                type: 'authentication',
                severity: 'medium',
                title: 'JWT Without Expiration',
                description: 'JWT token does not include expiration claim',
                endpoint: endpointId,
                evidence: { headers: [authHeader] },
                recommendation: 'Include expiration (exp) claim in all JWT tokens',
                owaspCategory: 'A07 - Identification and Authentication Failures',
                cwe: 'CWE-613',
                detectedAt: new Date()
              });
            }
          } catch (error) {
            // Invalid JWT format
          }
        }
      }
    }

    return vulnerabilities;
  }

  private static checkIntegrityFailures(apiCall: ApiCall, endpointId: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check for unsigned content
    const contentType = apiCall.responseHeaders.find(h => 
      h.name.toLowerCase() === 'content-type'
    );

    if (contentType && contentType.value.includes('application/json') && apiCall.responseBody) {
      const hasSignature = apiCall.responseHeaders.some(h => 
        h.name.toLowerCase().includes('signature') || h.name.toLowerCase().includes('digest')
      );

      if (!hasSignature) {
        vulnerabilities.push({
          id: `${endpointId}-unsigned-content`,
          type: 'owasp',
          severity: 'low',
          title: 'Unsigned API Response',
          description: 'API response lacks integrity verification mechanisms',
          endpoint: endpointId,
          evidence: { headers: apiCall.responseHeaders },
          recommendation: 'Implement response signing or checksums for data integrity',
          owaspCategory: 'A08 - Software and Data Integrity Failures',
          cwe: 'CWE-353',
          detectedAt: new Date()
        });
      }
    }

    return vulnerabilities;
  }

  private static checkLoggingFailures(apiCall: ApiCall, endpointId: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check for lack of rate limiting evidence
    const hasRateLimitHeaders = apiCall.responseHeaders.some(h => 
      ['x-ratelimit-limit', 'x-rate-limit-limit', 'ratelimit-limit'].includes(h.name.toLowerCase())
    );

    if (!hasRateLimitHeaders && ['POST', 'PUT', 'DELETE'].includes(apiCall.method)) {
      vulnerabilities.push({
        id: `${endpointId}-no-rate-limiting`,
        type: 'owasp',
        severity: 'medium',
        title: 'No Rate Limiting',
        description: 'API endpoint lacks rate limiting protection',
        endpoint: endpointId,
        evidence: { headers: apiCall.responseHeaders },
        recommendation: 'Implement rate limiting to prevent abuse and DoS attacks',
        owaspCategory: 'A09 - Security Logging and Monitoring Failures',
        cwe: 'CWE-770',
        detectedAt: new Date()
      });
    }

    return vulnerabilities;
  }

  private static checkSSRFVulnerabilities(apiCall: ApiCall, endpointId: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check for URL parameters that might be used for SSRF
    const url = new URL(apiCall.url);
    const ssrfParams = ['url', 'uri', 'link', 'redirect', 'callback', 'webhook'];

    for (const [param, value] of url.searchParams.entries()) {
      if (ssrfParams.some(ssrfParam => param.toLowerCase().includes(ssrfParam))) {
        if (value.startsWith('http://') || value.startsWith('https://')) {
          vulnerabilities.push({
            id: `${endpointId}-potential-ssrf`,
            type: 'owasp',
            severity: 'high',
            title: 'Potential SSRF Vulnerability',
            description: `Parameter '${param}' accepts URLs and may be vulnerable to SSRF`,
            endpoint: endpointId,
            evidence: { request: { url: apiCall.url } },
            recommendation: 'Validate and restrict URLs to trusted domains, use allowlists',
            owaspCategory: 'A10 - Server-Side Request Forgery',
            cwe: 'CWE-918',
            detectedAt: new Date()
          });
        }
      }
    }

    return vulnerabilities;
  }

  private static checkBusinessLogicFlaws(apiCall: ApiCall, endpointId: string): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check for potential privilege escalation
    if (apiCall.url.includes('/admin') || apiCall.url.includes('/user') && apiCall.method === 'PUT') {
      vulnerabilities.push({
        id: `${endpointId}-privilege-escalation`,
        type: 'business_logic',
        severity: 'high',
        title: 'Potential Privilege Escalation',
        description: 'Endpoint may allow unauthorized privilege changes',
        endpoint: endpointId,
        evidence: { request: { url: apiCall.url, method: apiCall.method } },
        recommendation: 'Implement proper authorization checks for privilege changes',
        owaspCategory: 'Business Logic',
        cwe: 'CWE-269',
        detectedAt: new Date()
      });
    }

    // Check for mass assignment vulnerabilities
    if (['POST', 'PUT', 'PATCH'].includes(apiCall.method) && apiCall.requestBody) {
      try {
        const body = JSON.parse(apiCall.requestBody);
        const sensitiveFields = ['role', 'admin', 'permissions', 'status', 'approved'];
        
        const hasSensitiveFields = sensitiveFields.some(field => 
          Object.keys(body).some(key => key.toLowerCase().includes(field))
        );

        if (hasSensitiveFields) {
          vulnerabilities.push({
            id: `${endpointId}-mass-assignment`,
            type: 'business_logic',
            severity: 'medium',
            title: 'Potential Mass Assignment',
            description: 'Request body contains sensitive fields that may be mass assigned',
            endpoint: endpointId,
            evidence: { request: body },
            recommendation: 'Use explicit field allowlists to prevent mass assignment vulnerabilities',
            owaspCategory: 'Business Logic',
            cwe: 'CWE-915',
            detectedAt: new Date()
          });
        }
      } catch (error) {
        // Not JSON or parsing failed
      }
    }

    return vulnerabilities;
  }

  private static async detectEndpointChanges(apiCall: ApiCall): Promise<EndpointChange[]> {
    const changes: EndpointChange[] = [];
    const endpointKey = `${new URL(apiCall.url).pathname}:${apiCall.method}`;
    
    // Get existing endpoint data
    const existingEndpoints = await storage.getApiEndpointsByBaseUrl(new URL(apiCall.url).origin);
    const existingEndpoint = existingEndpoints.find(ep => 
      ep.path === new URL(apiCall.url).pathname && ep.method === apiCall.method
    );

    if (!existingEndpoint) {
      // New endpoint detected
      changes.push({
        id: `${endpointKey}-new`,
        endpoint: endpointKey,
        changeType: 'new_endpoint',
        severity: 'medium',
        description: `New API endpoint discovered: ${apiCall.method} ${new URL(apiCall.url).pathname}`,
        detectedAt: new Date(),
        impact: 'New functionality may introduce security risks or breaking changes'
      });
    } else {
      // Check for response schema changes
      if (apiCall.responseBody && existingEndpoint.responses.length > 0) {
        try {
          const currentResponse = JSON.parse(apiCall.responseBody);
          const storedResponse = existingEndpoint.responses[0];
          
          // Simple change detection - compare keys
          const currentKeys = this.extractJsonKeys(currentResponse);
          const storedKeys = this.extractJsonKeys(storedResponse.schema);
          
          const newKeys = currentKeys.filter(key => !storedKeys.includes(key));
          const removedKeys = storedKeys.filter(key => !currentKeys.includes(key));
          
          if (newKeys.length > 0 || removedKeys.length > 0) {
            const severity = removedKeys.length > 0 ? 'high' : 'medium';
            changes.push({
              id: `${endpointKey}-schema-change`,
              endpoint: endpointKey,
              changeType: removedKeys.length > 0 ? 'breaking_change' : 'modified_response',
              severity,
              description: `Response schema changed. New fields: ${newKeys.join(', ')}. Removed fields: ${removedKeys.join(', ')}`,
              oldSchema: storedResponse.schema,
              newSchema: currentResponse,
              detectedAt: new Date(),
              impact: removedKeys.length > 0 ? 'Breaking change - may cause client applications to fail' : 'Non-breaking change - clients should handle gracefully'
            });
          }
        } catch (error) {
          // Not JSON or parsing failed
        }
      }
    }

    return changes;
  }

  private static extractJsonKeys(obj: any, prefix = ''): string[] {
    const keys: string[] = [];
    
    if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        keys.push(fullKey);
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          keys.push(...this.extractJsonKeys(value, fullKey));
        }
      }
    }
    
    return keys;
  }

  private static addVulnerability(vulnerability: SecurityVulnerability): void {
    const existing = this.vulnerabilities.find(v => v.id === vulnerability.id);
    if (!existing) {
      this.vulnerabilities.push(vulnerability);
      this.notifySecurityAlert(vulnerability);
    }
  }

  private static addEndpointChange(change: EndpointChange): void {
    const existing = this.endpointChanges.find(c => c.id === change.id);
    if (!existing) {
      this.endpointChanges.push(change);
      this.notifyChangeAlert(change);
    }
  }

  private static notifySecurityAlert(vulnerability: SecurityVulnerability): void {
    console.warn(`🚨 Security Alert: ${vulnerability.title} - ${vulnerability.endpoint}`);
    console.warn(`Severity: ${vulnerability.severity.toUpperCase()}`);
    console.warn(`Recommendation: ${vulnerability.recommendation}`);
  }

  private static notifyChangeAlert(change: EndpointChange): void {
    console.info(`📡 API Change Detected: ${change.description}`);
    console.info(`Impact: ${change.impact}`);
  }

  static getVulnerabilities(): SecurityVulnerability[] {
    return this.vulnerabilities;
  }

  static getEndpointChanges(): EndpointChange[] {
    return this.endpointChanges;
  }

  static clearAlerts(): void {
    this.vulnerabilities.length = 0;
    this.endpointChanges.length = 0;
  }

  static getSecuritySummary(): {
    totalVulnerabilities: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    topVulnerabilityTypes: Array<{ type: string; count: number }>;
  } {
    const vulnsBySeverity = this.vulnerabilities.reduce((acc, vuln) => {
      acc[vuln.severity] = (acc[vuln.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const vulnsByType = this.vulnerabilities.reduce((acc, vuln) => {
      acc[vuln.type] = (acc[vuln.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topVulnerabilityTypes = Object.entries(vulnsByType)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalVulnerabilities: this.vulnerabilities.length,
      criticalCount: vulnsBySeverity.critical || 0,
      highCount: vulnsBySeverity.high || 0,
      mediumCount: vulnsBySeverity.medium || 0,
      lowCount: vulnsBySeverity.low || 0,
      topVulnerabilityTypes
    };
  }
}