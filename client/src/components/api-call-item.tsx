import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { ApiCall } from '@shared/types';
import { ChromeAPI } from '@/lib/chrome-api';

interface ApiCallItemProps {
  apiCall: ApiCall;
}

export function ApiCallItem({ apiCall }: ApiCallItemProps) {
  const [showDetails, setShowDetails] = useState(false);

  const methodColor = ChromeAPI.getMethodColor(apiCall.method);
  const statusColor = ChromeAPI.getStatusColor(apiCall.status);
  const formattedTime = ChromeAPI.formatTimestamp(apiCall.timestamp);
  const formattedSize = ChromeAPI.formatSize(apiCall.size);

  const isGraphQL = apiCall.url.includes('/graphql') || 
    apiCall.requestHeaders.some(h => 
      h.name.toLowerCase() === 'content-type' && 
      h.value.includes('application/graphql')
    );

  return (
    <div className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150">
      <div className="px-4 py-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Badge className={`${methodColor} text-white text-xs font-medium px-2 py-1`}>
              {apiCall.method}
            </Badge>
            {isGraphQL && (
              <Badge variant="outline" className="text-xs text-blue-600 bg-blue-50 border-blue-200">
                GraphQL
              </Badge>
            )}
            <span className="text-xs text-gray-500">{formattedTime}</span>
          </div>
          <Badge className={`text-xs px-2 py-1 ${statusColor}`}>
            {apiCall.status || 'Error'}
          </Badge>
        </div>
        
        <div className="mb-2">
          <p className="text-sm font-mono text-gray-900 break-all">
            {apiCall.url.replace(/^https?:\/\/[^\/]+/, '')}
          </p>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">{formattedSize}</span>
          <Dialog open={showDetails} onOpenChange={setShowDetails}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-blue-600 hover:text-blue-700 h-auto p-0"
              >
                View Details
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold text-gray-900">
                  API Call Details
                </DialogTitle>
              </DialogHeader>
              
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Request Info</h3>
                    <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                      <div className="flex items-center space-x-2">
                        <Badge className={`${methodColor} text-white`}>
                          {apiCall.method}
                        </Badge>
                        <Badge className={statusColor}>
                          {apiCall.status || 'Error'}
                        </Badge>
                      </div>
                      <p className="text-sm font-mono break-all">{apiCall.url}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(apiCall.timestamp).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">Size: {formattedSize}</p>
                    </div>
                  </div>
                  
                  {apiCall.requestHeaders.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Request Headers</h3>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="space-y-1">
                          {apiCall.requestHeaders.map((header, index) => (
                            <div key={index} className="text-xs">
                              <span className="font-medium text-gray-700">{header.name}:</span>{' '}
                              <span className="text-gray-600 font-mono">
                                {header.name.toLowerCase().includes('authorization') 
                                  ? '***' 
                                  : header.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {apiCall.responseHeaders.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Response Headers</h3>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="space-y-1">
                          {apiCall.responseHeaders.map((header, index) => (
                            <div key={index} className="text-xs">
                              <span className="font-medium text-gray-700">{header.name}:</span>{' '}
                              <span className="text-gray-600 font-mono">{header.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
