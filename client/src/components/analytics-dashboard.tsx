import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Shield, 
  Activity,
  Download,
  Filter,
  Calendar,
  BarChart3,
  Globe,
  Zap,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { addDays, format } from 'date-fns';

interface AnalyticsData {
  usage: {
    totalRequests: number;
    uniqueEndpoints: number;
    avgResponseTime: number;
    errorRate: number;
    dailyStats: Array<{
      date: string;
      requests: number;
      errors: number;
      avgResponseTime: number;
    }>;
  };
  performance: {
    slowestEndpoints: Array<{
      endpoint: string;
      avgTime: number;
      requests: number;
    }>;
    fastestEndpoints: Array<{
      endpoint: string;
      avgTime: number;
      requests: number;
    }>;
    statusDistribution: Array<{
      status: number;
      count: number;
      percentage: number;
    }>;
  };
  security: {
    vulnerabilities: Array<{
      type: string;
      severity: 'critical' | 'high' | 'medium' | 'low';
      count: number;
      trend: 'increasing' | 'decreasing' | 'stable';
    }>;
    authMethods: Array<{
      method: string;
      usage: number;
      secure: boolean;
    }>;
  };
  discoveries: {
    total: number;
    categories: Array<{
      category: string;
      count: number;
      growth: number;
    }>;
    timeline: Array<{
      date: string;
      discoveries: number;
      playbooks: number;
    }>;
  };
}

export function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState({
    from: addDays(new Date(), -30),
    to: new Date()
  });
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedMetric, setSelectedMetric] = useState('requests');

  const { data: analyticsData, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics/dashboard', dateRange, selectedCategory],
  });

  const chartColors = {
    primary: '#3b82f6',
    secondary: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    purple: '#8b5cf6',
    teal: '#14b8a6'
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const exportReport = async (format: 'pdf' | 'csv' | 'json') => {
    const reportData = {
      dateRange,
      selectedCategory,
      analyticsData,
      generatedAt: new Date().toISOString()
    };

    const filename = `nexapi-analytics-${format(dateRange.from, 'yyyy-MM-dd')}-to-${format(dateRange.to, 'yyyy-MM-dd')}.${format}`;
    
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      // Convert analytics data to CSV format
      const csvData = generateCSVReport(analyticsData);
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const generateCSVReport = (data: AnalyticsData | undefined) => {
    if (!data) return '';
    
    let csv = 'Section,Metric,Value,Date\n';
    
    // Usage metrics
    csv += `Usage,Total Requests,${data.usage.totalRequests},${format(new Date(), 'yyyy-MM-dd')}\n`;
    csv += `Usage,Unique Endpoints,${data.usage.uniqueEndpoints},${format(new Date(), 'yyyy-MM-dd')}\n`;
    csv += `Usage,Average Response Time,${data.usage.avgResponseTime}ms,${format(new Date(), 'yyyy-MM-dd')}\n`;
    csv += `Usage,Error Rate,${data.usage.errorRate}%,${format(new Date(), 'yyyy-MM-dd')}\n`;
    
    // Daily stats
    data.usage.dailyStats.forEach(stat => {
      csv += `Daily Stats,Requests,${stat.requests},${stat.date}\n`;
      csv += `Daily Stats,Errors,${stat.errors},${stat.date}\n`;
      csv += `Daily Stats,Avg Response Time,${stat.avgResponseTime}ms,${stat.date}\n`;
    });
    
    return csv;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Comprehensive insights into API usage, performance, and security
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => exportReport('csv')}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => exportReport('json')}>
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters & Date Range
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <DatePickerWithRange
                date={dateRange}
                onDateChange={(range) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                  }
                }}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="rest">REST APIs</SelectItem>
                <SelectItem value="graphql">GraphQL</SelectItem>
                <SelectItem value="websocket">WebSocket</SelectItem>
                <SelectItem value="grpc">gRPC</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Primary Metric" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="requests">Request Volume</SelectItem>
                <SelectItem value="performance">Response Time</SelectItem>
                <SelectItem value="errors">Error Rate</SelectItem>
                <SelectItem value="security">Security Score</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold">{formatNumber(analyticsData?.usage.totalRequests || 0)}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-500">+12.5%</span>
                </div>
              </div>
              <Activity className="w-8 h-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                <p className="text-2xl font-bold">{analyticsData?.usage.avgResponseTime || 0}ms</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingDown className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-500">-5.2%</span>
                </div>
              </div>
              <Clock className="w-8 h-8 text-orange-500/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Error Rate</p>
                <p className="text-2xl font-bold">{analyticsData?.usage.errorRate || 0}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingDown className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-500">-1.8%</span>
                </div>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500/20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Discoveries</p>
                <p className="text-2xl font-bold">{analyticsData?.discoveries.total || 0}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="w-3 h-3 text-green-500" />
                  <span className="text-xs text-green-500">+23.1%</span>
                </div>
              </div>
              <Globe className="w-8 h-8 text-blue-500/20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Detailed Analytics */}
      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usage">Usage Trends</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="discoveries">Community</TabsTrigger>
        </TabsList>

        <TabsContent value="usage" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Request Volume</CardTitle>
                <CardDescription>API requests over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData?.usage.dailyStats || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="requests" 
                      stroke={chartColors.primary} 
                      fill={chartColors.primary}
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Rate Trends</CardTitle>
                <CardDescription>Error rates and response times</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analyticsData?.usage.dailyStats || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="errors" 
                      stroke={chartColors.danger} 
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="avgResponseTime" 
                      stroke={chartColors.secondary} 
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Slowest Endpoints</CardTitle>
                <CardDescription>Endpoints requiring optimization</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {analyticsData?.performance.slowestEndpoints?.map((endpoint, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{endpoint.endpoint}</p>
                          <p className="text-xs text-muted-foreground">{endpoint.requests} requests</p>
                        </div>
                        <Badge variant="destructive">{endpoint.avgTime}ms</Badge>
                      </div>
                    )) || []}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Code Distribution</CardTitle>
                <CardDescription>HTTP response status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analyticsData?.performance.statusDistribution || []}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.status}: ${entry.percentage}%`}
                    >
                      {analyticsData?.performance.statusDistribution?.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.status >= 400 ? chartColors.danger : chartColors.secondary} 
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Vulnerabilities</CardTitle>
                <CardDescription>Detected security issues by severity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData?.security.vulnerabilities?.map((vuln, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Shield className={`w-5 h-5 ${
                          vuln.severity === 'critical' ? 'text-red-500' :
                          vuln.severity === 'high' ? 'text-orange-500' :
                          vuln.severity === 'medium' ? 'text-yellow-500' :
                          'text-blue-500'
                        }`} />
                        <div>
                          <p className="font-medium">{vuln.type}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant={
                              vuln.severity === 'critical' ? 'destructive' :
                              vuln.severity === 'high' ? 'destructive' :
                              'secondary'
                            }>
                              {vuln.severity}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{vuln.count} instances</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {vuln.trend === 'increasing' ? (
                          <TrendingUp className="w-4 h-4 text-red-500" />
                        ) : vuln.trend === 'decreasing' ? (
                          <TrendingDown className="w-4 h-4 text-green-500" />
                        ) : (
                          <div className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  )) || []}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Authentication Methods</CardTitle>
                <CardDescription>Usage of different auth mechanisms</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analyticsData?.security.authMethods || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="method" />
                    <YAxis />
                    <Tooltip />
                    <Bar 
                      dataKey="usage" 
                      fill={(entry: any) => entry.secure ? chartColors.secondary : chartColors.warning}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="discoveries" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Discovery Timeline</CardTitle>
                <CardDescription>Community contributions over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={analyticsData?.discoveries.timeline || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area 
                      type="monotone" 
                      dataKey="discoveries" 
                      stackId="1"
                      stroke={chartColors.primary} 
                      fill={chartColors.primary}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="playbooks" 
                      stackId="1"
                      stroke={chartColors.purple} 
                      fill={chartColors.purple}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Distribution</CardTitle>
                <CardDescription>API discoveries by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData?.discoveries.categories?.map((category, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium">{category.category}</p>
                        <p className="text-sm text-muted-foreground">{category.count} discoveries</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={category.growth > 0 ? 'default' : 'secondary'}>
                          {category.growth > 0 ? '+' : ''}{category.growth}%
                        </Badge>
                        {category.growth > 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-500" />
                        )}
                      </div>
                    </div>
                  )) || []}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}