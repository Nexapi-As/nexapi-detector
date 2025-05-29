import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle2, 
  TrendingUp, 
  Eye, 
  Clock,
  ExternalLink
} from 'lucide-react';

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
  detectedAt: string;
}

interface EndpointChange {
  id: string;
  endpoint: string;
  changeType: 'new_endpoint' | 'modified_response' | 'deprecated' | 'breaking_change';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  oldSchema?: any;
  newSchema?: any;
  detectedAt: string;
  impact: string;
}

interface SecuritySummary {
  totalVulnerabilities: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  topVulnerabilityTypes: Array<{ type: string; count: number }>;
}

export function SecurityDashboard() {
  const [selectedVulnerability, setSelectedVulnerability] = useState<SecurityVulnerability | null>(null);
  const [selectedChange, setSelectedChange] = useState<EndpointChange | null>(null);

  const { data: vulnerabilities = [], isLoading: vulnLoading } = useQuery({
    queryKey: ['/api/security/vulnerabilities'],
  });

  const { data: changes = [], isLoading: changesLoading } = useQuery({
    queryKey: ['/api/security/changes'],
  });

  const { data: summary } = useQuery({
    queryKey: ['/api/security/summary'],
  });

  if (vulnLoading || changesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Analyzing security posture...</div>
      </div>
    );
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-4 h-4 text-red-600" />;
      case 'high': return <AlertTriangle className="w-4 h-4 text-orange-600" />;
      case 'medium': return <Info className="w-4 h-4 text-yellow-600" />;
      case 'low': return <Eye className="w-4 h-4 text-blue-600" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSecurityScore = (summary: SecuritySummary) => {
    if (!summary || summary.totalVulnerabilities === 0) return 100;
    
    const weights = { critical: 10, high: 5, medium: 2, low: 1 };
    const totalWeight = 
      summary.criticalCount * weights.critical +
      summary.highCount * weights.high +
      summary.mediumCount * weights.medium +
      summary.lowCount * weights.low;
    
    return Math.max(0, 100 - totalWeight);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Security Dashboard</h2>
          <p className="text-muted-foreground">
            Real-time security scanning and change detection
          </p>
        </div>
        <Button onClick={() => window.location.reload()}>
          <Shield className="w-4 h-4 mr-2" />
          Refresh Scan
        </Button>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Security Score</p>
                <p className="text-2xl font-bold">
                  {summary ? getSecurityScore(summary) : 100}%
                </p>
              </div>
              <Shield className="w-8 h-8 text-green-600" />
            </div>
            <Progress 
              value={summary ? getSecurityScore(summary) : 100} 
              className="mt-3"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Issues</p>
                <p className="text-2xl font-bold">
                  {(vulnerabilities.length || 0) + (changes.length || 0)}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {vulnerabilities.length || 0} vulnerabilities, {changes.length || 0} changes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-red-600">
                  {summary?.criticalCount || 0}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monitored APIs</p>
                <p className="text-2xl font-bold">
                  {new Set([...vulnerabilities, ...changes].map(item => item.endpoint)).size}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="vulnerabilities" className="space-y-4">
        <TabsList>
          <TabsTrigger value="vulnerabilities">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Vulnerabilities ({vulnerabilities.length})
          </TabsTrigger>
          <TabsTrigger value="changes">
            <TrendingUp className="w-4 h-4 mr-2" />
            API Changes ({changes.length})
          </TabsTrigger>
          <TabsTrigger value="remediation">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Remediation Guide
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vulnerabilities" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Security Vulnerabilities</CardTitle>
                <CardDescription>
                  OWASP Top 10 and business logic issues detected
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {vulnerabilities.map((vuln: SecurityVulnerability) => (
                      <Card
                        key={vuln.id}
                        className={`cursor-pointer transition-colors ${
                          selectedVulnerability?.id === vuln.id
                            ? 'ring-2 ring-primary'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedVulnerability(vuln)}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getSeverityIcon(vuln.severity)}
                                <h4 className="font-semibold">{vuln.title}</h4>
                              </div>
                              <Badge className={getSeverityColor(vuln.severity)}>
                                {vuln.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {vuln.description}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <code className="bg-muted px-1 rounded">{vuln.endpoint}</code>
                              {vuln.owaspCategory && (
                                <>
                                  <span>•</span>
                                  <span>{vuln.owaspCategory}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {vulnerabilities.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-600" />
                        No security vulnerabilities detected
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedVulnerability ? selectedVulnerability.title : 'Vulnerability Details'}
                </CardTitle>
                {selectedVulnerability && (
                  <CardDescription>
                    {selectedVulnerability.owaspCategory} • {selectedVulnerability.endpoint}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {selectedVulnerability ? (
                  <VulnerabilityDetails vulnerability={selectedVulnerability} />
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    Select a vulnerability to view detailed analysis and remediation steps
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="changes" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">API Changes</CardTitle>
                <CardDescription>
                  New endpoints and breaking changes detected
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {changes.map((change: EndpointChange) => (
                      <Card
                        key={change.id}
                        className={`cursor-pointer transition-colors ${
                          selectedChange?.id === change.id
                            ? 'ring-2 ring-primary'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedChange(change)}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getSeverityIcon(change.severity)}
                                <h4 className="font-semibold">{getChangeTypeLabel(change.changeType)}</h4>
                              </div>
                              <Badge className={getSeverityColor(change.severity)}>
                                {change.severity}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {change.description}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <code className="bg-muted px-1 rounded">{change.endpoint}</code>
                              <span>•</span>
                              <Clock className="w-3 h-3" />
                              <span>{formatTimestamp(change.detectedAt)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {changes.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-600" />
                        No API changes detected
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedChange ? getChangeTypeLabel(selectedChange.changeType) : 'Change Details'}
                </CardTitle>
                {selectedChange && (
                  <CardDescription>
                    {selectedChange.endpoint} • {formatTimestamp(selectedChange.detectedAt)}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {selectedChange ? (
                  <ChangeDetails change={selectedChange} />
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    Select a change to view detailed impact analysis
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="remediation" className="space-y-4">
          <RemediationGuide 
            vulnerabilities={vulnerabilities} 
            summary={summary}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface VulnerabilityDetailsProps {
  vulnerability: SecurityVulnerability;
}

function VulnerabilityDetails({ vulnerability }: VulnerabilityDetailsProps) {
  return (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{vulnerability.severity.toUpperCase()} Risk</AlertTitle>
        <AlertDescription>
          {vulnerability.description}
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">Technical Details</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Endpoint:</span>
              <code className="block bg-muted p-1 rounded mt-1">{vulnerability.endpoint}</code>
            </div>
            <div>
              <span className="font-medium">Type:</span>
              <span className="block mt-1">{vulnerability.type}</span>
            </div>
            {vulnerability.cwe && (
              <div>
                <span className="font-medium">CWE:</span>
                <span className="block mt-1">{vulnerability.cwe}</span>
              </div>
            )}
            <div>
              <span className="font-medium">Detected:</span>
              <span className="block mt-1">{formatTimestamp(vulnerability.detectedAt)}</span>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="font-semibold mb-2">Evidence</h4>
          <div className="space-y-2">
            {vulnerability.evidence.request && (
              <div>
                <span className="text-sm font-medium">Request:</span>
                <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                  {JSON.stringify(vulnerability.evidence.request, null, 2)}
                </pre>
              </div>
            )}
            {vulnerability.evidence.headers && (
              <div>
                <span className="text-sm font-medium">Headers:</span>
                <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                  {JSON.stringify(vulnerability.evidence.headers, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>

        <Separator />

        <div>
          <h4 className="font-semibold mb-2">Remediation</h4>
          <p className="text-sm">{vulnerability.recommendation}</p>
          
          {vulnerability.owaspCategory && (
            <div className="mt-3">
              <Button variant="outline" size="sm" asChild>
                <a 
                  href={`https://owasp.org/Top10/`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  OWASP Guide
                </a>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ChangeDetailsProps {
  change: EndpointChange;
}

function ChangeDetails({ change }: ChangeDetailsProps) {
  return (
    <div className="space-y-6">
      <Alert>
        <TrendingUp className="h-4 w-4" />
        <AlertTitle>{getChangeTypeLabel(change.changeType)}</AlertTitle>
        <AlertDescription>
          {change.description}
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2">Impact Analysis</h4>
          <p className="text-sm">{change.impact}</p>
        </div>

        <Separator />

        {change.oldSchema && change.newSchema && (
          <div className="space-y-3">
            <h4 className="font-semibold">Schema Changes</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium">Previous Schema:</span>
                <pre className="bg-muted p-2 rounded text-xs overflow-auto mt-1">
                  {JSON.stringify(change.oldSchema, null, 2)}
                </pre>
              </div>
              <div>
                <span className="text-sm font-medium">Current Schema:</span>
                <pre className="bg-muted p-2 rounded text-xs overflow-auto mt-1">
                  {JSON.stringify(change.newSchema, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          Detected: {formatTimestamp(change.detectedAt)}
        </div>
      </div>
    </div>
  );
}

interface RemediationGuideProps {
  vulnerabilities: SecurityVulnerability[];
  summary?: SecuritySummary;
}

function RemediationGuide({ vulnerabilities, summary }: RemediationGuideProps) {
  const priorityActions = vulnerabilities
    .filter(v => v.severity === 'critical' || v.severity === 'high')
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Priority Actions</CardTitle>
          <CardDescription>
            Address these critical and high-severity issues first
          </CardDescription>
        </CardHeader>
        <CardContent>
          {priorityActions.length > 0 ? (
            <div className="space-y-4">
              {priorityActions.map((vuln, index) => (
                <div key={vuln.id} className="flex gap-4 p-4 border rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-sm font-semibold">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold">{vuln.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {vuln.recommendation}
                    </p>
                    <code className="text-xs bg-muted px-1 rounded mt-2 inline-block">
                      {vuln.endpoint}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-600" />
              No critical issues requiring immediate attention
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security Best Practices</CardTitle>
          <CardDescription>
            General recommendations to improve API security
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <h4 className="font-semibold">Authentication & Authorization</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Use OAuth 2.0 or JWT for authentication</li>
                  <li>• Implement proper role-based access control</li>
                  <li>• Validate tokens on every request</li>
                  <li>• Use short-lived tokens with refresh mechanism</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold">Data Protection</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Always use HTTPS for API communication</li>
                  <li>• Sanitize and validate all input data</li>
                  <li>• Implement proper error handling</li>
                  <li>• Never expose sensitive data in URLs</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold">API Security Headers</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Content-Security-Policy</li>
                  <li>• X-Content-Type-Options: nosniff</li>
                  <li>• X-Frame-Options: DENY</li>
                  <li>• Strict-Transport-Security</li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold">Monitoring & Logging</h4>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Log all API access and failures</li>
                  <li>• Implement rate limiting</li>
                  <li>• Monitor for suspicious patterns</li>
                  <li>• Set up real-time alerts</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getChangeTypeLabel(type: string): string {
  switch (type) {
    case 'new_endpoint': return 'New Endpoint';
    case 'modified_response': return 'Response Modified';
    case 'deprecated': return 'Deprecated';
    case 'breaking_change': return 'Breaking Change';
    default: return type;
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffHours < 1) return 'just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}