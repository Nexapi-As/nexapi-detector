import Anthropic from '@anthropic-ai/sdk';
import { ApiCall, ApiEndpoint } from "@shared/schema";
import { storage } from "../storage";

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ApiUsagePattern {
  endpoint: string;
  method: string;
  frequency: number;
  avgResponseTime: number;
  errorRate: number;
  peakUsageHours: number[];
  commonUserAgents: string[];
  statusDistribution: Record<number, number>;
  trend: 'increasing' | 'decreasing' | 'stable';
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

interface AnomalyDetection {
  id: string;
  type: 'performance' | 'usage' | 'error' | 'security';
  severity: 'critical' | 'high' | 'medium' | 'low';
  endpoint: string;
  description: string;
  evidence: any;
  detectedAt: Date;
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
  generatedAt: Date;
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
  generatedAt: Date;
}

export class AIAnalytics {
  private static usagePatterns: Map<string, ApiUsagePattern> = new Map();
  private static anomalies: AnomalyDetection[] = [];
  private static insights: PredictiveInsight[] = [];
  private static recommendations: SmartRecommendation[] = [];

  static async analyzeApiUsagePatterns(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<void> {
    try {
      // Get recent API calls based on timeframe
      const hoursBack = timeframe === 'hour' ? 1 : timeframe === 'day' ? 24 : 168;
      const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);
      
      // For now, we'll simulate getting recent calls - in a real implementation,
      // you'd add a timestamp filter to your storage methods
      const allCalls = await this.getRecentApiCalls(cutoffTime);
      
      if (allCalls.length === 0) return;

      // Group calls by endpoint
      const endpointGroups = this.groupCallsByEndpoint(allCalls);
      
      // Analyze each endpoint
      for (const [endpointKey, calls] of endpointGroups.entries()) {
        const pattern = await this.analyzeEndpointPattern(endpointKey, calls);
        this.usagePatterns.set(endpointKey, pattern);
      }

      // Generate AI insights
      await this.generateAIInsights(Array.from(this.usagePatterns.values()));
      
    } catch (error) {
      console.error('Failed to analyze API usage patterns:', error);
    }
  }

  private static async getRecentApiCalls(cutoffTime: Date): Promise<ApiCall[]> {
    // This is a simplified version - in practice, you'd want to filter by timestamp
    // For now, we'll get all calls and filter them
    const allCalls: ApiCall[] = [];
    
    // Get calls from different tabs (this is a simplified approach)
    for (let tabId = 1; tabId <= 10; tabId++) {
      try {
        const tabCalls = await storage.getApiCallsByTab(tabId);
        allCalls.push(...tabCalls.filter(call => new Date(call.timestamp) >= cutoffTime));
      } catch (error) {
        // Tab doesn't exist or no calls, continue
      }
    }
    
    return allCalls;
  }

  private static groupCallsByEndpoint(calls: ApiCall[]): Map<string, ApiCall[]> {
    const groups = new Map<string, ApiCall[]>();
    
    for (const call of calls) {
      const key = `${call.method}:${new URL(call.url).pathname}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(call);
    }
    
    return groups;
  }

  private static async analyzeEndpointPattern(endpointKey: string, calls: ApiCall[]): Promise<ApiUsagePattern> {
    const [method, path] = endpointKey.split(':');
    
    // Calculate basic metrics
    const frequency = calls.length;
    const avgResponseTime = calls.reduce((sum, call) => sum + (call.size || 0), 0) / calls.length;
    const errorCalls = calls.filter(call => call.status && call.status >= 400);
    const errorRate = errorCalls.length / calls.length;
    
    // Analyze temporal patterns
    const hourlyUsage = new Array(24).fill(0);
    calls.forEach(call => {
      const hour = new Date(call.timestamp).getHours();
      hourlyUsage[hour]++;
    });
    
    const peakUsageHours = hourlyUsage
      .map((usage, hour) => ({ hour, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 3)
      .map(item => item.hour);

    // Analyze status distribution
    const statusDistribution: Record<number, number> = {};
    calls.forEach(call => {
      if (call.status) {
        statusDistribution[call.status] = (statusDistribution[call.status] || 0) + 1;
      }
    });

    // Determine trend (simplified)
    const trend = this.calculateTrend(calls);

    return {
      endpoint: path,
      method,
      frequency,
      avgResponseTime,
      errorRate,
      peakUsageHours,
      commonUserAgents: [], // Would extract from headers in real implementation
      statusDistribution,
      trend
    };
  }

  private static calculateTrend(calls: ApiCall[]): 'increasing' | 'decreasing' | 'stable' {
    if (calls.length < 10) return 'stable';
    
    const midpoint = Math.floor(calls.length / 2);
    const firstHalf = calls.slice(0, midpoint);
    const secondHalf = calls.slice(midpoint);
    
    const firstHalfRate = firstHalf.length;
    const secondHalfRate = secondHalf.length;
    
    const change = (secondHalfRate - firstHalfRate) / firstHalfRate;
    
    if (change > 0.2) return 'increasing';
    if (change < -0.2) return 'decreasing';
    return 'stable';
  }

  private static async generateAIInsights(patterns: ApiUsagePattern[]): Promise<void> {
    try {
      const prompt = `Analyze the following API usage patterns and provide insights:

${JSON.stringify(patterns, null, 2)}

Please provide:
1. Performance bottleneck predictions
2. Scaling recommendations
3. Security risk assessments
4. Optimization opportunities

Format your response as JSON with the following structure:
{
  "anomalies": [
    {
      "type": "performance|usage|error|security",
      "severity": "critical|high|medium|low",
      "endpoint": "endpoint_path",
      "description": "detailed description",
      "confidence": 0.85,
      "recommendation": "actionable recommendation"
    }
  ],
  "insights": [
    {
      "type": "performance_bottleneck|scaling_need|security_risk|optimization_opportunity",
      "title": "insight title",
      "description": "detailed description",
      "probability": 0.75,
      "impact": "critical|high|medium|low",
      "timeframe": "next 24 hours|next week|next month",
      "recommendation": "actionable recommendation"
    }
  ],
  "recommendations": [
    {
      "category": "documentation|testing|security|performance|monitoring",
      "priority": "critical|high|medium|low",
      "title": "recommendation title",
      "description": "detailed description",
      "actionItems": ["action 1", "action 2"],
      "expectedBenefit": "expected outcome",
      "effort": "low|medium|high"
    }
  ]
}`;

      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });

      const aiAnalysis = JSON.parse(response.content[0].text);
      
      // Process anomalies
      if (aiAnalysis.anomalies) {
        for (const anomaly of aiAnalysis.anomalies) {
          this.anomalies.push({
            id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: anomaly.type,
            severity: anomaly.severity,
            endpoint: anomaly.endpoint,
            description: anomaly.description,
            evidence: patterns.find(p => p.endpoint === anomaly.endpoint),
            detectedAt: new Date(),
            confidence: anomaly.confidence,
            recommendation: anomaly.recommendation
          });
        }
      }

      // Process insights
      if (aiAnalysis.insights) {
        for (const insight of aiAnalysis.insights) {
          this.insights.push({
            id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: insight.type,
            title: insight.title,
            description: insight.description,
            probability: insight.probability,
            impact: insight.impact,
            timeframe: insight.timeframe,
            recommendation: insight.recommendation,
            evidence: patterns,
            generatedAt: new Date()
          });
        }
      }

      // Process recommendations
      if (aiAnalysis.recommendations) {
        for (const rec of aiAnalysis.recommendations) {
          this.recommendations.push({
            id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            category: rec.category,
            priority: rec.priority,
            title: rec.title,
            description: rec.description,
            actionItems: rec.actionItems,
            expectedBenefit: rec.expectedBenefit,
            effort: rec.effort,
            generatedAt: new Date()
          });
        }
      }

    } catch (error) {
      console.error('Failed to generate AI insights:', error);
    }
  }

  static async detectAnomalies(apiCall: ApiCall): Promise<void> {
    try {
      // Real-time anomaly detection
      const endpointKey = `${apiCall.method}:${new URL(apiCall.url).pathname}`;
      const pattern = this.usagePatterns.get(endpointKey);
      
      if (!pattern) return; // No baseline pattern yet
      
      // Check for response time anomalies
      if (apiCall.size && apiCall.size > pattern.avgResponseTime * 3) {
        this.anomalies.push({
          id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'performance',
          severity: 'high',
          endpoint: pattern.endpoint,
          description: `Response time ${apiCall.size}ms is 3x higher than average ${pattern.avgResponseTime}ms`,
          evidence: { currentCall: apiCall, baseline: pattern },
          detectedAt: new Date(),
          confidence: 0.9,
          recommendation: 'Investigate database queries, external service calls, or server load'
        });
      }

      // Check for error rate spikes
      if (apiCall.status && apiCall.status >= 400 && pattern.errorRate < 0.1) {
        this.anomalies.push({
          id: `anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'error',
          severity: 'medium',
          endpoint: pattern.endpoint,
          description: `Error response (${apiCall.status}) on endpoint with low error rate (${pattern.errorRate * 100}%)`,
          evidence: { currentCall: apiCall, baseline: pattern },
          detectedAt: new Date(),
          confidence: 0.8,
          recommendation: 'Check for service degradation or input validation issues'
        });
      }

    } catch (error) {
      console.error('Failed to detect anomalies:', error);
    }
  }

  static async generatePerformanceInsights(): Promise<PerformanceMetrics> {
    try {
      const patterns = Array.from(this.usagePatterns.values());
      
      if (patterns.length === 0) {
        return {
          avgResponseTime: 0,
          p95ResponseTime: 0,
          p99ResponseTime: 0,
          throughput: 0,
          errorRate: 0,
          availability: 100,
          slowestEndpoints: [],
          fastestEndpoints: []
        };
      }

      const responseTimes = patterns.map(p => p.avgResponseTime);
      const totalFrequency = patterns.reduce((sum, p) => sum + p.frequency, 0);
      const totalErrors = patterns.reduce((sum, p) => sum + (p.frequency * p.errorRate), 0);

      // Calculate percentiles
      responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(responseTimes.length * 0.95);
      const p99Index = Math.floor(responseTimes.length * 0.99);

      // Find slowest and fastest endpoints
      const sortedBySpeed = [...patterns].sort((a, b) => b.avgResponseTime - a.avgResponseTime);
      
      return {
        avgResponseTime: responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length,
        p95ResponseTime: responseTimes[p95Index] || 0,
        p99ResponseTime: responseTimes[p99Index] || 0,
        throughput: totalFrequency,
        errorRate: totalErrors / totalFrequency,
        availability: ((totalFrequency - totalErrors) / totalFrequency) * 100,
        slowestEndpoints: sortedBySpeed.slice(0, 5).map(p => ({
          endpoint: `${p.method} ${p.endpoint}`,
          avgTime: p.avgResponseTime
        })),
        fastestEndpoints: sortedBySpeed.slice(-5).reverse().map(p => ({
          endpoint: `${p.method} ${p.endpoint}`,
          avgTime: p.avgResponseTime
        }))
      };

    } catch (error) {
      console.error('Failed to generate performance insights:', error);
      throw error;
    }
  }

  static async generateAdaptiveRecommendations(context: {
    userActivity: 'high' | 'medium' | 'low';
    systemLoad: 'high' | 'medium' | 'low';
    timeOfDay: 'peak' | 'normal' | 'off-peak';
  }): Promise<SmartRecommendation[]> {
    try {
      const patterns = Array.from(this.usagePatterns.values());
      const currentAnomalies = this.anomalies.slice(-10); // Recent anomalies
      
      const prompt = `Based on the following context and API patterns, provide adaptive monitoring and optimization recommendations:

Context:
- User Activity: ${context.userActivity}
- System Load: ${context.systemLoad} 
- Time of Day: ${context.timeOfDay}

Recent API Patterns:
${JSON.stringify(patterns.slice(0, 10), null, 2)}

Recent Anomalies:
${JSON.stringify(currentAnomalies, null, 2)}

Provide recommendations that adapt to the current context. For example:
- During high load: focus on performance optimization
- During low activity: suggest maintenance tasks
- During peak hours: emphasize monitoring
- During off-peak: recommend testing and documentation

Format as JSON array of recommendations with category, priority, title, description, actionItems, expectedBenefit, and effort.`;

      const response = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      });

      const adaptiveRecs = JSON.parse(response.content[0].text);
      
      return adaptiveRecs.map((rec: any) => ({
        id: `adaptive-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        category: rec.category,
        priority: rec.priority,
        title: rec.title,
        description: rec.description,
        actionItems: rec.actionItems,
        expectedBenefit: rec.expectedBenefit,
        effort: rec.effort,
        generatedAt: new Date()
      }));

    } catch (error) {
      console.error('Failed to generate adaptive recommendations:', error);
      return [];
    }
  }

  // Getter methods for accessing stored data
  static getUsagePatterns(): Map<string, ApiUsagePattern> {
    return this.usagePatterns;
  }

  static getAnomalies(): AnomalyDetection[] {
    return this.anomalies;
  }

  static getInsights(): PredictiveInsight[] {
    return this.insights;
  }

  static getRecommendations(): SmartRecommendation[] {
    return this.recommendations;
  }

  static clearAnalytics(): void {
    this.usagePatterns.clear();
    this.anomalies.length = 0;
    this.insights.length = 0;
    this.recommendations.length = 0;
  }
}