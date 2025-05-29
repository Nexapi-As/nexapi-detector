import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Send, Save, Loader2, Plus, Trash2 } from 'lucide-react';
import { ChromeAPI } from '@/lib/chrome-api';

interface SavedRequest {
  id: string;
  name: string;
  method: string;
  url: string;
  headers: Array<{ key: string; value: string }>;
  body: string;
  authType: string;
  authValue: string;
}

interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  time: number;
  size: number;
}

export function ApiTester() {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState<Array<{ key: string; value: string }>>([
    { key: '', value: '' }
  ]);
  const [body, setBody] = useState('');
  const [authType, setAuthType] = useState('none');
  const [authValue, setAuthValue] = useState('');
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [savedRequests, setSavedRequests] = useState<SavedRequest[]>([]);
  const [requestName, setRequestName] = useState('');

  // Load saved requests on mount
  useEffect(() => {
    const loadSavedRequests = async () => {
      try {
        if (typeof window !== 'undefined' && (window as any).chrome?.storage) {
          const result = await (window as any).chrome.storage.local.get(['saved_requests']);
          if (result.saved_requests) {
            setSavedRequests(result.saved_requests);
          }
        }
      } catch (error) {
        console.error('Error loading saved requests:', error);
      }
    };
    loadSavedRequests();
  }, []);

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...headers];
    updated[index][field] = value;
    setHeaders(updated);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const buildHeaders = (): Record<string, string> => {
    const result: Record<string, string> = {};
    
    // Add custom headers
    headers.forEach(({ key, value }) => {
      if (key.trim() && value.trim()) {
        result[key.trim()] = value.trim();
      }
    });

    // Add auth header
    if (authType === 'bearer' && authValue.trim()) {
      result['Authorization'] = `Bearer ${authValue.trim()}`;
    } else if (authType === 'basic' && authValue.trim()) {
      result['Authorization'] = `Basic ${btoa(authValue.trim())}`;
    } else if (authType === 'api-key' && authValue.trim()) {
      result['X-API-Key'] = authValue.trim();
    }

    // Add content type for body requests
    if (['POST', 'PUT', 'PATCH'].includes(method) && body.trim()) {
      if (!result['Content-Type']) {
        try {
          JSON.parse(body);
          result['Content-Type'] = 'application/json';
        } catch {
          result['Content-Type'] = 'text/plain';
        }
      }
    }

    return result;
  };

  const sendRequest = async () => {
    if (!url.trim()) return;

    setIsLoading(true);
    const startTime = Date.now();

    try {
      const requestHeaders = buildHeaders();
      const requestOptions: RequestInit = {
        method,
        headers: requestHeaders,
      };

      if (['POST', 'PUT', 'PATCH'].includes(method) && body.trim()) {
        requestOptions.body = body;
      }

      const response = await fetch(url, requestOptions);
      const endTime = Date.now();
      
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const responseText = await response.text();
      const responseSize = new Blob([responseText]).size;

      setResponse({
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseText,
        time: endTime - startTime,
        size: responseSize
      });
    } catch (error) {
      setResponse({
        status: 0,
        statusText: 'Network Error',
        headers: {},
        body: error instanceof Error ? error.message : 'Unknown error',
        time: Date.now() - startTime,
        size: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveRequest = async () => {
    if (!requestName.trim() || !url.trim()) return;

    const newRequest: SavedRequest = {
      id: Date.now().toString(),
      name: requestName.trim(),
      method,
      url,
      headers: headers.filter(h => h.key.trim()),
      body,
      authType,
      authValue
    };

    const updated = [...savedRequests, newRequest];
    setSavedRequests(updated);
    
    // Save to Chrome storage
    try {
      if (typeof window !== 'undefined' && window.chrome?.storage) {
        await window.chrome.storage.local.set({ 'saved_requests': updated });
      }
      setRequestName('');
    } catch (error) {
      console.error('Error saving request:', error);
    }
  };

  const loadRequest = (request: SavedRequest) => {
    setMethod(request.method);
    setUrl(request.url);
    setHeaders(request.headers.length > 0 ? request.headers : [{ key: '', value: '' }]);
    setBody(request.body);
    setAuthType(request.authType);
    setAuthValue(request.authValue);
  };

  const formatResponseBody = (body: string, contentType: string): string => {
    try {
      if (contentType.includes('application/json')) {
        return JSON.stringify(JSON.parse(body), null, 2);
      }
    } catch {
      // Not JSON, return as is
    }
    return body;
  };

  const getStatusColor = (status: number): string => {
    if (status >= 200 && status < 300) return 'bg-green-100 text-green-800';
    if (status >= 300 && status < 400) return 'bg-blue-100 text-blue-800';
    if (status >= 400 && status < 500) return 'bg-orange-100 text-orange-800';
    if (status >= 500) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Send className="h-5 w-5" />
            <span>API Request Tester</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Request Builder */}
          <div className="flex space-x-2">
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
                <SelectItem value="PUT">PUT</SelectItem>
                <SelectItem value="PATCH">PATCH</SelectItem>
                <SelectItem value="DELETE">DELETE</SelectItem>
                <SelectItem value="HEAD">HEAD</SelectItem>
                <SelectItem value="OPTIONS">OPTIONS</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Enter API URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={sendRequest} disabled={isLoading || !url.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send
            </Button>
          </div>

          <Tabs defaultValue="headers" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="headers">Headers</TabsTrigger>
              <TabsTrigger value="body">Body</TabsTrigger>
              <TabsTrigger value="auth">Auth</TabsTrigger>
              <TabsTrigger value="saved">Saved</TabsTrigger>
            </TabsList>

            <TabsContent value="headers" className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Request Headers</Label>
                <Button variant="outline" size="sm" onClick={addHeader}>
                  <Plus className="h-3 w-3 mr-1" />
                  Add Header
                </Button>
              </div>
              <ScrollArea className="max-h-48">
                {headers.map((header, index) => (
                  <div key={index} className="flex space-x-2 mb-2">
                    <Input
                      placeholder="Header name"
                      value={header.key}
                      onChange={(e) => updateHeader(index, 'key', e.target.value)}
                      className="flex-1"
                    />
                    <Input
                      placeholder="Header value"
                      value={header.value}
                      onChange={(e) => updateHeader(index, 'value', e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeHeader(index)}
                      disabled={headers.length === 1}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="body">
              <Label>Request Body</Label>
              <Textarea
                placeholder="Enter request body (JSON, XML, etc.)"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="min-h-32 font-mono text-sm"
              />
            </TabsContent>

            <TabsContent value="auth" className="space-y-4">
              <div>
                <Label>Authentication Type</Label>
                <Select value={authType} onValueChange={setAuthType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Auth</SelectItem>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                    <SelectItem value="api-key">API Key</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {authType !== 'none' && (
                <div>
                  <Label>
                    {authType === 'bearer' && 'Bearer Token'}
                    {authType === 'basic' && 'Username:Password'}
                    {authType === 'api-key' && 'API Key'}
                  </Label>
                  <Input
                    type={authType === 'bearer' || authType === 'api-key' ? 'password' : 'text'}
                    placeholder={
                      authType === 'bearer' ? 'Enter bearer token...' :
                      authType === 'basic' ? 'username:password' :
                      'Enter API key...'
                    }
                    value={authValue}
                    onChange={(e) => setAuthValue(e.target.value)}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="saved" className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  placeholder="Request name..."
                  value={requestName}
                  onChange={(e) => setRequestName(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={saveRequest} disabled={!requestName.trim() || !url.trim()}>
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
              </div>
              <ScrollArea className="max-h-48">
                <div className="space-y-2">
                  {savedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-2 border rounded cursor-pointer hover:bg-gray-50"
                      onClick={() => loadRequest(request)}
                    >
                      <div>
                        <p className="font-medium text-sm">{request.name}</p>
                        <p className="text-xs text-gray-500">
                          <Badge className={ChromeAPI.getMethodColor(request.method)} variant="secondary">
                            {request.method}
                          </Badge>
                          <span className="ml-2">{request.url}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Response Display */}
      {response && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Response</span>
              <div className="flex items-center space-x-2">
                <Badge className={getStatusColor(response.status)}>
                  {response.status} {response.statusText}
                </Badge>
                <span className="text-sm text-gray-500">
                  {response.time}ms • {ChromeAPI.formatSize(response.size)}
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="body" className="w-full">
              <TabsList>
                <TabsTrigger value="body">Response Body</TabsTrigger>
                <TabsTrigger value="headers">Response Headers</TabsTrigger>
              </TabsList>

              <TabsContent value="body">
                <ScrollArea className="max-h-96">
                  <pre className="text-sm bg-gray-50 p-3 rounded border overflow-x-auto">
                    {formatResponseBody(response.body, response.headers['content-type'] || '')}
                  </pre>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="headers">
                <ScrollArea className="max-h-96">
                  <div className="space-y-1">
                    {Object.entries(response.headers).map(([key, value]) => (
                      <div key={key} className="text-sm">
                        <span className="font-medium text-gray-700">{key}:</span>{' '}
                        <span className="text-gray-600 font-mono">{value}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}