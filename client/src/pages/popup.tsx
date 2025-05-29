import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Trash2, Globe, RefreshCw, Send, FileText, GitBranch, Users, BarChart3 } from 'lucide-react';
import { ApiCallItem } from '@/components/api-call-item';
import { ApiTester } from '@/components/api-tester';
import { DocumentationViewer } from '@/components/documentation-viewer';
import { WorkflowMapper } from '@/components/workflow-mapper';
import { CommunityDashboard } from '@/components/community-dashboard';
import { AnalyticsDashboard } from '@/components/analytics-dashboard';
import { ChromeAPI } from '@/lib/chrome-api';
import type { ApiCall, ChromeTab, ChromeApiCall } from '@shared/types';

export default function Popup() {
  const [currentTab, setCurrentTab] = useState<ChromeTab | null>(null);
  const [apiCalls, setApiCalls] = useState<ApiCall[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (autoRefresh) {
      cleanup = ChromeAPI.onNewApiCall((newCall) => {
        if (currentTab?.id === newCall.tabId) {
          setApiCalls(prev => {
            // Check if call already exists and update, or add new
            const existingIndex = prev.findIndex(call => call.id === newCall.id);
            if (existingIndex >= 0) {
              const updated = [...prev];
              updated[existingIndex] = newCall;
              return updated;
            }
            return [...prev, newCall];
          });
        }
      });
    }

    return cleanup;
  }, [autoRefresh, currentTab?.id]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const tab = await ChromeAPI.getCurrentTab();
      setCurrentTab(tab);
      
      if (tab?.id) {
        const calls = await ChromeAPI.getTabApiCalls(tab.id);
        setApiCalls(calls);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportJSON = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      tabUrl: currentTab?.url || 'unknown',
      tabTitle: currentTab?.title || 'unknown',
      apiCallsCount: apiCalls.length,
      apiCalls: apiCalls.map(call => ({
        ...call,
        requestHeaders: call.requestHeaders.map((h: any) => ({
          ...h,
          value: h.name.toLowerCase().includes('authorization') ? '***' : h.value
        }))
      }))
    };
    
    const filename = `nexapi-calls-${new Date().toISOString().split('T')[0]}.json`;
    ChromeAPI.downloadJSON(exportData, filename);
  };

  const handleClearAll = async () => {
    if (currentTab?.id) {
      const success = await ChromeAPI.clearTabData(currentTab.id);
      if (success) {
        setApiCalls([]);
      }
    }
  };

  const displayUrl = currentTab?.url 
    ? currentTab.url.replace(/^https?:\/\//, '').substring(0, 40) + '...'
    : 'Loading...';

  return (
    <div className="w-[600px] max-h-[700px] bg-white shadow-lg font-sans">
      {/* Header */}
      <header className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center space-x-2">
          <Globe className="h-4 w-4" />
          <h1 className="text-base font-medium">NexAPI Detector</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className="bg-white bg-opacity-20 text-white px-2 py-1 text-xs font-medium">
            {apiCalls.length}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            className="bg-white bg-opacity-10 hover:bg-opacity-20 p-1.5 h-auto text-white"
            onClick={handleExportJSON}
            title="Export JSON"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* Tab Info */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center space-x-2 text-sm">
          <Globe className="h-4 w-4 text-gray-500" />
          <span className="text-gray-500">Current tab:</span>
          <span className="text-gray-900 font-mono text-xs truncate flex-1">
            {displayUrl}
          </span>
        </div>
      </div>

      {/* Main Content Tabs */}
      <div className="flex-1">
        <Tabs defaultValue="monitor" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="monitor" className="flex items-center space-x-1">
              <Globe className="h-3 w-3" />
              <span>Monitor</span>
            </TabsTrigger>
            <TabsTrigger value="tester" className="flex items-center space-x-1">
              <Send className="h-3 w-3" />
              <span>Tester</span>
            </TabsTrigger>
            <TabsTrigger value="docs" className="flex items-center space-x-1">
              <FileText className="h-3 w-3" />
              <span>Docs</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-1">
              <BarChart3 className="h-3 w-3" />
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="community" className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>Community</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="monitor" className="mt-0">
            {/* API Calls List */}
            <ScrollArea className="max-h-96">
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm">Loading...</span>
                </div>
              ) : apiCalls.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-gray-500">
                  <Globe className="h-4 w-4 mr-2" />
                  <span className="text-sm">No API calls detected</span>
                </div>
              ) : (
                <div>
                  {apiCalls.map((apiCall) => (
                    <ApiCallItem key={apiCall.id} apiCall={apiCall} />
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Footer Actions */}
            <footer className="border-t border-gray-200 bg-white px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-gray-500 hover:text-red-600 h-auto p-0"
                    onClick={handleClearAll}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Clear All
                  </Button>
                  <label className="flex items-center space-x-1 text-xs text-gray-500">
                    <Checkbox
                      checked={autoRefresh}
                      onCheckedChange={(checked) => setAutoRefresh(checked as boolean)}
                      className="h-3 w-3"
                    />
                    <span>Auto-refresh</span>
                  </label>
                </div>
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-xs font-medium h-auto"
                  onClick={handleExportJSON}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Export Report
                </Button>
              </div>
            </footer>
          </TabsContent>

          <TabsContent value="tester" className="mt-0 p-4">
            <ApiTester />
          </TabsContent>

          <TabsContent value="docs" className="mt-0 p-4">
            <DocumentationViewer />
          </TabsContent>

          <TabsContent value="analytics" className="mt-0 p-4">
            <AnalyticsDashboard />
          </TabsContent>

          <TabsContent value="community" className="mt-0 p-4">
            <CommunityDashboard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
