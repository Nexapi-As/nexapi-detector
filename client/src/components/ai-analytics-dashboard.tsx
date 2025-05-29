import { useState, useEffect } from 'react';
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
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  Target,
  Zap,
  BarChart3,
  Activity,
  Clock,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';

interface ApiUsagePattern {
  endpoint: string;
  method: string;
  frequency: number;
  avgResponseTime: number;
  errorRate: number;
  peakUsageHours: number[];
  trend: 'increasing' | 'decreasing' | 'stable';
  statusDistribution: Record<number, number>;
}

interface AnomalyDetection {
  id: string;
  type: 'performance' | 'usage' | 'error' | 'security';
  severity: 'critical' | 'high' | 'medium' | 'low';
  endpoint: string;
  description: string;
  evidence: any;
  detectedAt: string;
  confidence: number;
  recommendation: string;
}

interface PredictiveInsight {
  id: string;
  type: 'performance_bottleneck' | 'scaling_need' | 'security_risk' | 'optimization_opportunity';
  title: string;
  description: string;
  probability: number;
  impact: 'critical' | 'high' | 'medium' | 'low';
  timeframe: string;
  recommendation: string;
  evidence: any;
  generatedAt: string;
}

interface SmartRecommendation {
  id: string;
  category: 'documentation' | 'testing' | 'security' | 'performance' | 'monitoring';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionItems: string[];
  expectedBenefit: string;
  effort: 'low' | 'medium' | 'high';
  generatedAt: string;
}

interface PerformanceMetrics {
  avgResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number;
  errorRate: number;
  availability: number;
  slowestEndpoints: Array<{ endpoint: string; avgTime: number }>;
  fastestEndpoints: Array<{ endpoint: string; avgTime: number }>;
}

export function AIAnalyticsDashboard() {
  const [analysisTimeframe, setAnalysisTimeframe] = useState<'hour' | 'day' | 'week'>('day');
  const [selectedInsight, setSelectedInsight] = useState<PredictiveInsight | null>(null);
  const [selectedRecommendation, setSelectedRecommendation] = useState<SmartRecommendation | null>(null);

  const { data: usagePatterns = [], isLoading: patternsLoading, refetch: refetchPatterns } = useQuery({
    queryKey: ['/api/ai/usage-patterns', analysisTimeframe],
  });

  const { data: anomalies = [], isLoading: anomaliesLoading } = useQuery({
    queryKey: ['/api/ai/anomalies'],
  });

  const { data: insights = [], isLoading: insightsLoading } = useQuery({
    queryKey: ['/api/ai/insights'],
  });

  const { data: recommendations = [], isLoading: recommendationsLoading } = useQuery({
    queryKey: ['/api/ai/recommendations'],
  });

  const { data: performanceMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['/api/ai/performance-metrics'],
  });

  const runAnalysis = async () => {
    try {
      await fetch(`/api/ai/analyze?timeframe=${analysisTimeframe}`, { method: 'POST' });
      refetchPatterns();
    } catch (error) {
      console.error('Failed to run AI analysis:', error);
    }
  };

  if (patternsLoading || anomaliesLoading || insightsLoading || recommendationsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Analyzing API patterns with AI...</div>
      </div>
    );
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return <ArrowUp className="w-4 h-4 text-green-600" />;
      case 'decreasing': return <ArrowDown className="w-4 h-4 text-red-600" />;
      case 'stable': return <Minus className="w-4 h-4 text-blue-600" />;
      default: return <Minus className="w-4 h-4" />;
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

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'high': return <Target className="w-4 h-4 text-orange-600" />;
      case 'medium': return <Activity className="w-4 h-4 text-yellow-600" />;
      case 'low': return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Intelligent insights and predictive analysis of your API ecosystem
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select 
            value={analysisTimeframe} 
            onChange={(e) => setAnalysisTimeframe(e.target.value as 'hour' | 'day' | 'week')}
            className="px-3 py-1 border rounded-md bg-background"
          >
            <option value="hour">Last Hour</option>
            <option value="day">Last Day</option>
            <option value="week">Last Week</option>
          </select>
          <Button onClick={runAnalysis}>
            <Brain className="w-4 h-4 mr-2" />
            Run AI Analysis
          </Button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">API Health Score</p>
                <p className="text-2xl font-bold">
                  {performanceMetrics ? Math.round(performanceMetrics.availability) : 0}%
                </p>
              </div>
              <Activity className="w-8 h-8 text-green-600" />
            </div>
            <Progress 
              value={performanceMetrics ? performanceMetrics.availability : 0} 
              className="mt-3"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Anomalies Detected</p>
                <p className="text-2xl font-bold">{anomalies.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {anomalies.filter((a: AnomalyDetection) => a.severity === 'critical').length} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Predictive Insights</p>
                <p className="text-2xl font-bold">{insights.length}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {insights.filter((i: PredictiveInsight) => i.impact === 'high').length} high impact
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Smart Recommendations</p>
                <p className="text-2xl font-bold">{recommendations.length}</p>
              </div>
              <Lightbulb className="w-8 h-8 text-purple-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {recommendations.filter((r: SmartRecommendation) => r.priority === 'high').length} high priority
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="patterns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="patterns">
            <BarChart3 className="w-4 h-4 mr-2" />
            Usage Patterns
          </TabsTrigger>
          <TabsTrigger value="anomalies">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Anomaly Detection
          </TabsTrigger>
          <TabsTrigger value="insights">
            <TrendingUp className="w-4 h-4 mr-2" />
            Predictive Insights
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            <Lightbulb className="w-4 h-4 mr-2" />
            Smart Recommendations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="patterns" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">API Usage Patterns</CardTitle>
                <CardDescription>
                  AI-analyzed traffic patterns and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {usagePatterns.map((pattern: ApiUsagePattern) => (
                      <Card key={`${pattern.method}-${pattern.endpoint}`} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{pattern.method}</Badge>
                                {getTrendIcon(pattern.trend)}
                                <code className="text-sm">{pattern.endpoint}</code>
                              </div>
                              <Badge className={getSeverityColor(pattern.errorRate > 0.1 ? 'high' : 'low')}>
                                {Math.round(pattern.errorRate * 100)}% errors
                              </Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm text-muted-foreground">
                              <div>
                                <span className="font-medium">Frequency:</span>
                                <span className="block">{pattern.frequency} calls</span>
                              </div>
                              <div>
                                <span className="font-medium">Avg Response:</span>
                                <span className="block">{Math.round(pattern.avgResponseTime)}ms</span>
                              </div>
                              <div>
                                <span className="font-medium">Peak Hours:</span>
                                <span className="block">{pattern.peakUsageHours.join(', ')}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {usagePatterns.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        No usage patterns detected yet. Run AI analysis to discover patterns.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Metrics</CardTitle>
                <CardDescription>
                  Real-time performance analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                {metricsLoading ? (
                  <div className="text-center text-muted-foreground py-8">Loading metrics...</div>
                ) : performanceMetrics ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Avg Response Time</span>
                          <span className="text-sm font-medium">{Math.round(performanceMetrics.avgResponseTime)}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">95th Percentile</span>
                          <span className="text-sm font-medium">{Math.round(performanceMetrics.p95ResponseTime)}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">99th Percentile</span>
                          <span className="text-sm font-medium">{Math.round(performanceMetrics.p99ResponseTime)}ms</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Throughput</span>
                          <span className="text-sm font-medium">{performanceMetrics.throughput} req/min</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Error Rate</span>
                          <span className="text-sm font-medium">{Math.round(performanceMetrics.errorRate * 100)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Availability</span>
                          <span className="text-sm font-medium">{Math.round(performanceMetrics.availability)}%</span>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Slowest Endpoints</h4>
                      {performanceMetrics.slowestEndpoints.slice(0, 3).map((endpoint, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <code className="text-xs bg-muted px-1 rounded">{endpoint.endpoint}</code>
                          <span className="text-red-600">{Math.round(endpoint.avgTime)}ms</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    No performance data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Detected Anomalies</CardTitle>
                <CardDescription>
                  AI-powered anomaly detection alerts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {anomalies.map((anomaly: AnomalyDetection) => (
                      <Alert key={anomaly.id} className={`border-l-4 ${
                        anomaly.severity === 'critical' ? 'border-l-red-500' :
                        anomaly.severity === 'high' ? 'border-l-orange-500' :
                        anomaly.severity === 'medium' ? 'border-l-yellow-500' :
                        'border-l-blue-500'
                      }`}>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle className="flex items-center justify-between">
                          <span>{anomaly.type.toUpperCase()} Anomaly</span>
                          <div className="flex items-center gap-2">
                            <Badge className={getSeverityColor(anomaly.severity)}>
                              {anomaly.severity}
                            </Badge>
                            <Badge variant="outline">
                              {Math.round(anomaly.confidence * 100)}% confidence
                            </Badge>
                          </div>
                        </AlertTitle>
                        <AlertDescription className="mt-2">
                          <div className="space-y-2">
                            <p>{anomaly.description}</p>
                            <code className="text-xs bg-muted px-1 rounded">{anomaly.endpoint}</code>
                            <p className="text-sm font-medium text-blue-600">
                              Recommendation: {anomaly.recommendation}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Detected: {new Date(anomaly.detectedAt).toLocaleString()}
                            </p>
                          </div>
                        </AlertDescription>
                      </Alert>
                    ))}
                    {anomalies.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-600" />
                        No anomalies detected
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Anomaly Trends</CardTitle>
                <CardDescription>
                  Historical anomaly patterns and analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-600">
                        {anomalies.filter((a: AnomalyDetection) => a.type === 'performance').length}
                      </p>
                      <p className="text-sm text-muted-foreground">Performance</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">
                        {anomalies.filter((a: AnomalyDetection) => a.type === 'error').length}
                      </p>
                      <p className="text-sm text-muted-foreground">Error</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-yellow-600">
                        {anomalies.filter((a: AnomalyDetection) => a.type === 'usage').length}
                      </p>
                      <p className="text-sm text-muted-foreground">Usage</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600">
                        {anomalies.filter((a: AnomalyDetection) => a.type === 'security').length}
                      </p>
                      <p className="text-sm text-muted-foreground">Security</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Predictive Insights</CardTitle>
                <CardDescription>
                  AI-generated predictions and forecasts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {insights.map((insight: PredictiveInsight) => (
                      <Card
                        key={insight.id}
                        className={`cursor-pointer transition-colors ${
                          selectedInsight?.id === insight.id
                            ? 'ring-2 ring-primary'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedInsight(insight)}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold">{insight.title}</h4>
                              <div className="flex items-center gap-2">
                                <Badge className={getSeverityColor(insight.impact)}>
                                  {insight.impact}
                                </Badge>
                                <Badge variant="outline">
                                  {Math.round(insight.probability * 100)}%
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {insight.description}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span>{insight.timeframe}</span>
                              <span>•</span>
                              <span>{insight.type.replace('_', ' ')}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {insights.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        No predictive insights available yet
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedInsight ? selectedInsight.title : 'Insight Details'}
                </CardTitle>
                {selectedInsight && (
                  <CardDescription>
                    {selectedInsight.type.replace('_', ' ')} • {selectedInsight.timeframe}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {selectedInsight ? (
                  <div className="space-y-4">
                    <Alert>
                      <TrendingUp className="h-4 w-4" />
                      <AlertTitle>Prediction</AlertTitle>
                      <AlertDescription>
                        {selectedInsight.description}
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <h4 className="font-semibold">Probability & Impact</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-muted-foreground">Probability</span>
                          <Progress value={selectedInsight.probability * 100} className="mt-1" />
                          <span className="text-xs text-muted-foreground">
                            {Math.round(selectedInsight.probability * 100)}%
                          </span>
                        </div>
                        <div>
                          <span className="text-sm text-muted-foreground">Impact Level</span>
                          <div className="mt-1">
                            <Badge className={getSeverityColor(selectedInsight.impact)}>
                              {selectedInsight.impact}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2">Recommended Actions</h4>
                      <p className="text-sm">{selectedInsight.recommendation}</p>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Generated: {new Date(selectedInsight.generatedAt).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    Select a predictive insight to view detailed analysis
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Smart Recommendations</CardTitle>
                <CardDescription>
                  AI-powered optimization suggestions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {recommendations.map((rec: SmartRecommendation) => (
                      <Card
                        key={rec.id}
                        className={`cursor-pointer transition-colors ${
                          selectedRecommendation?.id === rec.id
                            ? 'ring-2 ring-primary'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedRecommendation(rec)}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getPriorityIcon(rec.priority)}
                                <h4 className="font-semibold">{rec.title}</h4>
                              </div>
                              <Badge className={getSeverityColor(rec.priority)}>
                                {rec.priority}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {rec.description}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline">{rec.category}</Badge>
                              <span>•</span>
                              <Badge variant="outline">{rec.effort} effort</Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {recommendations.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        No recommendations available yet
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedRecommendation ? selectedRecommendation.title : 'Recommendation Details'}
                </CardTitle>
                {selectedRecommendation && (
                  <CardDescription>
                    {selectedRecommendation.category} • {selectedRecommendation.effort} effort
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {selectedRecommendation ? (
                  <div className="space-y-4">
                    <Alert>
                      <Lightbulb className="h-4 w-4" />
                      <AlertTitle>Recommendation</AlertTitle>
                      <AlertDescription>
                        {selectedRecommendation.description}
                      </AlertDescription>
                    </Alert>

                    <div>
                      <h4 className="font-semibold mb-2">Action Items</h4>
                      <ul className="space-y-1">
                        {selectedRecommendation.actionItems.map((item, index) => (
                          <li key={index} className="text-sm flex items-start gap-2">
                            <CheckCircle2 className="w-3 h-3 mt-1 text-green-600 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2">Expected Benefits</h4>
                      <p className="text-sm">{selectedRecommendation.expectedBenefit}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Priority:</span>
                        <Badge className={`ml-2 ${getSeverityColor(selectedRecommendation.priority)}`}>
                          {selectedRecommendation.priority}
                        </Badge>
                      </div>
                      <div>
                        <span className="font-medium">Implementation Effort:</span>
                        <Badge variant="outline" className="ml-2">
                          {selectedRecommendation.effort}
                        </Badge>
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Generated: {new Date(selectedRecommendation.generatedAt).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    Select a recommendation to view implementation details
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}