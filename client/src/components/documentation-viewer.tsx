import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, ExternalLink, RefreshCw } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ApiDocumentation {
  id: string;
  title: string;
  description?: string;
  version: string;
  baseUrl: string;
  openApiSpec: any;
  generatedAt: string;
  updatedAt: string;
}

interface ApiEndpoint {
  id: string;
  baseUrl: string;
  path: string;
  method: string;
  summary?: string;
  description?: string;
  parameters: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
    example?: any;
  }>;
  responses: Array<{
    statusCode: number;
    description: string;
    contentType: string;
    schema: any;
  }>;
  tags: string[];
  callCount: number;
  lastSeen: string;
}

export function DocumentationViewer() {
  const [selectedDoc, setSelectedDoc] = useState<string>('');
  const [activeEndpoint, setActiveEndpoint] = useState<string>('');

  const { data: documentations = [], isLoading: docsLoading, refetch: refetchDocs } = useQuery({
    queryKey: ['/api/documentations'],
    queryFn: async () => {
      const response = await apiRequest('/api/documentations');
      return response.json();
    }
  });

  const { data: endpoints = [], isLoading: endpointsLoading } = useQuery({
    queryKey: ['/api/endpoints', selectedDoc],
    queryFn: async () => {
      if (!selectedDoc) return [];
      const response = await apiRequest(`/api/endpoints?baseUrl=${encodeURIComponent(selectedDoc)}`);
      return response.json();
    },
    enabled: !!selectedDoc
  });

  const selectedDocData = Array.isArray(documentations) ? documentations.find(doc => doc.baseUrl === selectedDoc) : undefined;

  const generateDocumentation = async () => {
    try {
      await apiRequest('/api/generate-docs', 'POST');
      refetchDocs();
    } catch (error) {
      console.error('Error generating documentation:', error);
    }
  };

  const exportOpenAPI = () => {
    if (!selectedDocData) return;
    
    const blob = new Blob([JSON.stringify(selectedDocData.openApiSpec, null, 2)], { 
      type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedDocData.title.toLowerCase().replace(/\s+/g, '-')}-openapi.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  };

  const getMethodColor = (method: string) => {
    const colors = {
      GET: 'bg-green-500',
      POST: 'bg-blue-500',
      PUT: 'bg-orange-500',
      DELETE: 'bg-red-500',
      PATCH: 'bg-purple-500'
    };
    return colors[method as keyof typeof colors] || 'bg-gray-500';
  };

  const formatLastSeen = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Less than an hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>API Documentation</span>
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Auto-generated documentation from observed API traffic
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button onClick={generateDocumentation} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-1" />
                Regenerate
              </Button>
              {selectedDocData && (
                <Button onClick={exportOpenAPI} size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Export OpenAPI
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Select value={selectedDoc} onValueChange={setSelectedDoc}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an API to view documentation" />
                </SelectTrigger>
                <SelectContent>
                  {documentations.map((doc) => (
                    <SelectItem key={doc.id} value={doc.baseUrl}>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{doc.title}</span>
                        <Badge variant="outline">{doc.version}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedDocData && (
              <div className="text-sm text-gray-500">
                Last updated: {formatLastSeen(selectedDocData.updatedAt)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Documentation Content */}
      {selectedDocData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Endpoints List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Endpoints</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-96">
                <div className="space-y-2">
                  {endpointsLoading ? (
                    <div className="text-center py-4 text-gray-500">Loading endpoints...</div>
                  ) : endpoints.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">No endpoints found</div>
                  ) : (
                    endpoints.map((endpoint) => (
                      <div
                        key={endpoint.id}
                        className={`p-3 border rounded cursor-pointer transition-colors ${
                          activeEndpoint === endpoint.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => setActiveEndpoint(endpoint.id)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <Badge className={`${getMethodColor(endpoint.method)} text-white text-xs`}>
                            {endpoint.method}
                          </Badge>
                          <div className="text-xs text-gray-500">
                            {endpoint.callCount} calls
                          </div>
                        </div>
                        <p className="text-sm font-mono text-gray-900 break-all">
                          {endpoint.path}
                        </p>
                        {endpoint.summary && (
                          <p className="text-xs text-gray-600 mt-1">{endpoint.summary}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex flex-wrap gap-1">
                            {endpoint.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatLastSeen(endpoint.lastSeen)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Endpoint Details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">
                {activeEndpoint ? 'Endpoint Details' : 'API Overview'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeEndpoint ? (
                <EndpointDetails 
                  endpoint={endpoints.find(e => e.id === activeEndpoint)} 
                />
              ) : (
                <ApiOverview documentation={selectedDocData} endpoints={endpoints} />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Empty State */}
      {!selectedDoc && (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No API Documentation Available
              </h3>
              <p className="text-gray-600 mb-4">
                Documentation will be automatically generated as you browse websites and APIs are detected.
              </p>
              <Button onClick={generateDocumentation}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate Documentation
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface EndpointDetailsProps {
  endpoint?: ApiEndpoint;
}

function EndpointDetails({ endpoint }: EndpointDetailsProps) {
  if (!endpoint) return <div>Select an endpoint to view details</div>;

  return (
    <ScrollArea className="max-h-96">
      <div className="space-y-4">
        {/* Basic Info */}
        <div>
          <div className="flex items-center space-x-2 mb-2">
            <Badge className={`${getMethodColor(endpoint.method)} text-white`}>
              {endpoint.method}
            </Badge>
            <code className="text-sm bg-gray-100 px-2 py-1 rounded">
              {endpoint.path}
            </code>
          </div>
          {endpoint.summary && (
            <h3 className="text-lg font-medium">{endpoint.summary}</h3>
          )}
          {endpoint.description && (
            <p className="text-gray-600 mt-1">{endpoint.description}</p>
          )}
        </div>

        <Separator />

        {/* Parameters */}
        {endpoint.parameters.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Parameters</h4>
            <div className="space-y-2">
              {endpoint.parameters.map((param, index) => (
                <div key={index} className="border rounded p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <code className="text-sm font-medium">{param.name}</code>
                    <Badge variant={param.required ? 'destructive' : 'secondary'} className="text-xs">
                      {param.required ? 'Required' : 'Optional'}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {param.type}
                    </Badge>
                  </div>
                  {param.description && (
                    <p className="text-sm text-gray-600">{param.description}</p>
                  )}
                  {param.example && (
                    <div className="mt-2">
                      <span className="text-xs text-gray-500">Example: </span>
                      <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                        {JSON.stringify(param.example)}
                      </code>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Responses */}
        {endpoint.responses.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Responses</h4>
            <div className="space-y-2">
              {endpoint.responses.map((response, index) => (
                <div key={index} className="border rounded p-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <Badge 
                      className={`text-white ${
                        response.statusCode >= 200 && response.statusCode < 300 ? 'bg-green-500' :
                        response.statusCode >= 400 ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                    >
                      {response.statusCode}
                    </Badge>
                    <span className="text-sm font-medium">{response.description}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Content-Type: {response.contentType}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Statistics */}
        <div>
          <h4 className="font-medium mb-2">Statistics</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-2xl font-bold">{endpoint.callCount}</div>
              <div className="text-sm text-gray-600">Total Calls</div>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm font-medium">{formatLastSeen(endpoint.lastSeen)}</div>
              <div className="text-sm text-gray-600">Last Seen</div>
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}

interface ApiOverviewProps {
  documentation: ApiDocumentation;
  endpoints: ApiEndpoint[];
}

function ApiOverview({ documentation, endpoints }: ApiOverviewProps) {
  const totalCalls = endpoints.reduce((sum, endpoint) => sum + endpoint.callCount, 0);
  const uniqueMethods = [...new Set(endpoints.map(e => e.method))];
  const uniqueTags = [...new Set(endpoints.flatMap(e => e.tags))];

  return (
    <div className="space-y-6">
      {/* API Info */}
      <div>
        <h2 className="text-xl font-semibold mb-2">{documentation.title}</h2>
        {documentation.description && (
          <p className="text-gray-600 mb-4">{documentation.description}</p>
        )}
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span>Version: {documentation.version}</span>
          <span>Base URL: {documentation.baseUrl}</span>
          <span>Last Updated: {formatLastSeen(documentation.updatedAt)}</span>
        </div>
      </div>

      <Separator />

      {/* Statistics */}
      <div>
        <h3 className="text-lg font-medium mb-4">API Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded">
            <div className="text-2xl font-bold text-blue-600">{endpoints.length}</div>
            <div className="text-sm text-blue-600">Endpoints</div>
          </div>
          <div className="bg-green-50 p-4 rounded">
            <div className="text-2xl font-bold text-green-600">{totalCalls}</div>
            <div className="text-sm text-green-600">Total Calls</div>
          </div>
          <div className="bg-purple-50 p-4 rounded">
            <div className="text-2xl font-bold text-purple-600">{uniqueMethods.length}</div>
            <div className="text-sm text-purple-600">HTTP Methods</div>
          </div>
          <div className="bg-orange-50 p-4 rounded">
            <div className="text-2xl font-bold text-orange-600">{uniqueTags.length}</div>
            <div className="text-sm text-orange-600">Categories</div>
          </div>
        </div>
      </div>

      {/* Methods & Tags */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-medium mb-2">HTTP Methods</h4>
          <div className="flex flex-wrap gap-2">
            {uniqueMethods.map((method) => (
              <Badge key={method} className={`${getMethodColor(method)} text-white`}>
                {method}
              </Badge>
            ))}
          </div>
        </div>
        <div>
          <h4 className="font-medium mb-2">Categories</h4>
          <div className="flex flex-wrap gap-2">
            {uniqueTags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function getMethodColor(method: string) {
  const colors = {
    GET: 'bg-green-500',
    POST: 'bg-blue-500',
    PUT: 'bg-orange-500',
    DELETE: 'bg-red-500',
    PATCH: 'bg-purple-500'
  };
  return colors[method as keyof typeof colors] || 'bg-gray-500';
}

function formatLastSeen(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffHours < 1) return 'Less than an hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}