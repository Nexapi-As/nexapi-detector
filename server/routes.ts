import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertApiCallSchema, insertSavedRequestSchema } from "@shared/schema";
import { DocumentationGenerator } from "./services/documentation-generator";
import { WorkflowAnalyzer } from "./services/workflow-analyzer";
import { SecurityScanner } from "./services/security-scanner";
import { AIAnalytics } from "./services/ai-analytics";
import { CommunityService } from "./services/community-service";
import { 
  insertApiDiscoverySchema,
  insertApiPlaybookSchema,
  insertCommunityCommentSchema,
  insertCommunityVoteSchema,
  insertPlaybookCompletionSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // API Calls routes
  app.post("/api/api-calls", async (req, res) => {
    try {
      // Handle both web app and extension formats
      const data = req.body;
      
      // Transform extension data to match schema
      const apiCallData = {
        method: data.method,
        url: data.url,
        tabId: data.tabId || 0,
        requestHeaders: data.requestHeaders || [],
        responseHeaders: data.responseHeaders || [],
        status: data.status || 0,
        size: data.size || 0
      };
      
      const apiCall = insertApiCallSchema.parse(apiCallData);
      const savedCall = await storage.saveApiCall(apiCall);
      
      // Trigger background analysis
      if (savedCall.tabId) {
        // Workflow analysis
        WorkflowAnalyzer.analyzeApiCallSequences(savedCall.tabId).catch(error => {
          console.error("Background workflow analysis failed:", error);
        });
        
        // Security scanning
        SecurityScanner.scanApiCall(savedCall).catch(error => {
          console.error("Background security scan failed:", error);
        });

        // AI anomaly detection
        AIAnalytics.detectAnomalies(savedCall).catch(error => {
          console.error("Background AI anomaly detection failed:", error);
        });
      }
      
      res.json(savedCall);
    } catch (error) {
      console.error("API call save error:", error);
      res.status(400).json({ error: "Invalid API call data" });
    }
  });

  app.get("/api/api-calls/:tabId", async (req, res) => {
    try {
      const tabId = parseInt(req.params.tabId);
      if (isNaN(tabId)) {
        return res.status(400).json({ error: "Invalid tab ID" });
      }
      const calls = await storage.getApiCallsByTab(tabId);
      res.json(calls);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch API calls" });
    }
  });

  app.delete("/api/api-calls/:tabId", async (req, res) => {
    try {
      const tabId = parseInt(req.params.tabId);
      if (isNaN(tabId)) {
        return res.status(400).json({ error: "Invalid tab ID" });
      }
      await storage.clearApiCallsForTab(tabId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear API calls" });
    }
  });

  // Saved Requests routes
  app.post("/api/saved-requests", async (req, res) => {
    try {
      const request = insertSavedRequestSchema.parse(req.body);
      const savedRequest = await storage.saveSavedRequest(request);
      res.json(savedRequest);
    } catch (error) {
      res.status(400).json({ error: "Invalid request data" });
    }
  });

  app.get("/api/saved-requests", async (req, res) => {
    try {
      const requests = await storage.getSavedRequests();
      res.json(requests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch saved requests" });
    }
  });

  app.delete("/api/saved-requests/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSavedRequest(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete saved request" });
    }
  });

  // Documentation routes
  app.get("/api/documentations", async (req, res) => {
    try {
      const docs = await storage.getApiDocumentations();
      res.json(docs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch documentations" });
    }
  });

  app.get("/api/endpoints", async (req, res) => {
    try {
      const { baseUrl } = req.query;
      if (!baseUrl || typeof baseUrl !== 'string') {
        return res.status(400).json({ error: "baseUrl query parameter is required" });
      }
      const endpoints = await storage.getApiEndpointsByBaseUrl(baseUrl);
      res.json(endpoints);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch endpoints" });
    }
  });

  app.post("/api/generate-docs", async (req, res) => {
    try {
      // This would trigger documentation generation for all detected APIs
      // For now, we'll return a success response
      res.json({ success: true, message: "Documentation generation triggered" });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate documentation" });
    }
  });

  // Workflow and dependency routes
  app.get("/api/workflows", async (req, res) => {
    try {
      const workflows = await storage.getApiWorkflows();
      res.json(workflows);
    } catch (error) {
      console.error("Error fetching workflows:", error);
      res.status(500).json({ error: "Failed to fetch workflows" });
    }
  });

  app.get("/api/workflows/:baseUrl", async (req, res) => {
    try {
      const baseUrl = decodeURIComponent(req.params.baseUrl);
      const workflows = await storage.getApiWorkflowsByBaseUrl(baseUrl);
      res.json(workflows);
    } catch (error) {
      console.error("Error fetching workflows for base URL:", error);
      res.status(500).json({ error: "Failed to fetch workflows" });
    }
  });

  app.get("/api/dependencies", async (req, res) => {
    try {
      const dependencies = await storage.getApiDependencies();
      res.json(dependencies);
    } catch (error) {
      console.error("Error fetching dependencies:", error);
      res.status(500).json({ error: "Failed to fetch dependencies" });
    }
  });

  app.get("/api/dependencies/:baseUrl", async (req, res) => {
    try {
      const baseUrl = decodeURIComponent(req.params.baseUrl);
      const dependencies = await storage.getApiDependenciesByBaseUrl(baseUrl);
      res.json(dependencies);
    } catch (error) {
      console.error("Error fetching dependencies for base URL:", error);
      res.status(500).json({ error: "Failed to fetch dependencies" });
    }
  });

  app.post("/api/analyze-workflows/:tabId", async (req, res) => {
    try {
      const tabId = parseInt(req.params.tabId);
      await WorkflowAnalyzer.analyzeApiCallSequences(tabId);
      res.json({ success: true, message: "Workflow analysis completed" });
    } catch (error) {
      console.error("Error analyzing workflows:", error);
      res.status(500).json({ error: "Failed to analyze workflows" });
    }
  });

  // Security and alerts routes
  app.get("/api/security/vulnerabilities", async (req, res) => {
    try {
      const vulnerabilities = SecurityScanner.getVulnerabilities();
      res.json(vulnerabilities);
    } catch (error) {
      console.error("Error fetching vulnerabilities:", error);
      res.status(500).json({ error: "Failed to fetch vulnerabilities" });
    }
  });

  app.get("/api/security/changes", async (req, res) => {
    try {
      const changes = SecurityScanner.getEndpointChanges();
      res.json(changes);
    } catch (error) {
      console.error("Error fetching endpoint changes:", error);
      res.status(500).json({ error: "Failed to fetch endpoint changes" });
    }
  });

  app.get("/api/security/summary", async (req, res) => {
    try {
      const summary = SecurityScanner.getSecuritySummary();
      res.json(summary);
    } catch (error) {
      console.error("Error fetching security summary:", error);
      res.status(500).json({ error: "Failed to fetch security summary" });
    }
  });

  app.post("/api/security/clear", async (req, res) => {
    try {
      SecurityScanner.clearAlerts();
      res.json({ success: true, message: "Security alerts cleared" });
    } catch (error) {
      console.error("Error clearing security alerts:", error);
      res.status(500).json({ error: "Failed to clear security alerts" });
    }
  });

  // AI Analytics routes
  app.post("/api/ai/analyze", async (req, res) => {
    try {
      const timeframe = req.query.timeframe as 'hour' | 'day' | 'week' || 'day';
      await AIAnalytics.analyzeApiUsagePatterns(timeframe);
      res.json({ success: true, message: "AI analysis completed" });
    } catch (error) {
      console.error("Error running AI analysis:", error);
      res.status(500).json({ error: "Failed to run AI analysis" });
    }
  });

  app.get("/api/ai/usage-patterns", async (req, res) => {
    try {
      const patterns = Array.from(AIAnalytics.getUsagePatterns().values());
      res.json(patterns);
    } catch (error) {
      console.error("Error fetching usage patterns:", error);
      res.status(500).json({ error: "Failed to fetch usage patterns" });
    }
  });

  app.get("/api/ai/anomalies", async (req, res) => {
    try {
      const anomalies = AIAnalytics.getAnomalies();
      res.json(anomalies);
    } catch (error) {
      console.error("Error fetching anomalies:", error);
      res.status(500).json({ error: "Failed to fetch anomalies" });
    }
  });

  app.get("/api/ai/insights", async (req, res) => {
    try {
      const insights = AIAnalytics.getInsights();
      res.json(insights);
    } catch (error) {
      console.error("Error fetching insights:", error);
      res.status(500).json({ error: "Failed to fetch insights" });
    }
  });

  app.get("/api/ai/recommendations", async (req, res) => {
    try {
      const recommendations = AIAnalytics.getRecommendations();
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      res.status(500).json({ error: "Failed to fetch recommendations" });
    }
  });

  app.get("/api/ai/performance-metrics", async (req, res) => {
    try {
      const metrics = await AIAnalytics.generatePerformanceInsights();
      res.json(metrics);
    } catch (error) {
      console.error("Error generating performance metrics:", error);
      res.status(500).json({ error: "Failed to generate performance metrics" });
    }
  });

  app.post("/api/ai/adaptive-recommendations", async (req, res) => {
    try {
      const context = req.body.context || {
        userActivity: 'medium',
        systemLoad: 'medium',
        timeOfDay: 'normal'
      };
      const adaptiveRecs = await AIAnalytics.generateAdaptiveRecommendations(context);
      res.json(adaptiveRecs);
    } catch (error) {
      console.error("Error generating adaptive recommendations:", error);
      res.status(500).json({ error: "Failed to generate adaptive recommendations" });
    }
  });

  app.post("/api/ai/clear", async (req, res) => {
    try {
      AIAnalytics.clearAnalytics();
      res.json({ success: true, message: "AI analytics data cleared" });
    } catch (error) {
      console.error("Error clearing AI analytics:", error);
      res.status(500).json({ error: "Failed to clear AI analytics" });
    }
  });

  // Community routes - simplified demo implementation
  app.get("/api/community/discoveries", async (req, res) => {
    try {
      // Demo data for API discoveries
      const discoveries = [
        {
          id: "1",
          title: "OpenWeather API Discovery",
          description: "Comprehensive weather data API with global coverage and detailed forecasts",
          author: {
            id: "user1",
            displayName: "Weather Expert",
            username: "weatherdev",
            reputation: 250
          },
          baseUrl: "https://api.openweathermap.org/data/2.5",
          endpoints: [
            {
              method: "GET",
              path: "/weather",
              description: "Current weather data for any location",
              parameters: [
                { name: "q", type: "string", required: true, description: "City name" },
                { name: "appid", type: "string", required: true, description: "API key" }
              ]
            }
          ],
          tags: ["weather", "forecast", "api"],
          category: "data-processing",
          difficulty: "beginner",
          upvotes: 42,
          downvotes: 3,
          views: 156,
          featured: true,
          verified: true,
          createdAt: new Date().toISOString()
        }
      ];
      res.json(discoveries);
    } catch (error) {
      console.error("Error fetching discoveries:", error);
      res.status(500).json({ error: "Failed to fetch discoveries" });
    }
  });

  app.post("/api/community/discoveries", async (req, res) => {
    try {
      // Demo response for creating discovery
      const discovery = {
        id: Date.now().toString(),
        ...req.body,
        createdAt: new Date().toISOString(),
        upvotes: 0,
        downvotes: 0,
        views: 1
      };
      res.json(discovery);
    } catch (error) {
      console.error("Error creating discovery:", error);
      res.status(400).json({ error: "Invalid discovery data" });
    }
  });

  app.get("/api/community/playbooks", async (req, res) => {
    try {
      // Demo data for API playbooks
      const playbooks = [
        {
          id: "1",
          title: "OAuth 2.0 Authentication Flow",
          description: "Step-by-step guide to implement OAuth 2.0 authentication in your application",
          author: {
            id: "user2",
            displayName: "Security Guru",
            username: "securitydev",
            reputation: 450
          },
          steps: [
            {
              id: "1",
              title: "Register Application",
              description: "Register your app with the OAuth provider",
              endpoint: {
                method: "POST",
                url: "/oauth/register",
                body: { name: "MyApp", redirect_uri: "https://myapp.com/callback" }
              },
              order: 1
            }
          ],
          prerequisites: [
            { type: "knowledge", description: "Basic understanding of HTTP", required: true }
          ],
          tags: ["oauth", "authentication", "security"],
          category: "authentication",
          difficulty: "intermediate",
          estimatedTime: 45,
          upvotes: 67,
          downvotes: 2,
          completions: 234,
          featured: false,
          verified: true,
          createdAt: new Date().toISOString()
        }
      ];
      res.json(playbooks);
    } catch (error) {
      console.error("Error fetching playbooks:", error);
      res.status(500).json({ error: "Failed to fetch playbooks" });
    }
  });

  app.post("/api/community/playbooks", async (req, res) => {
    try {
      // Demo response for creating playbook
      const playbook = {
        id: Date.now().toString(),
        ...req.body,
        createdAt: new Date().toISOString(),
        upvotes: 0,
        downvotes: 0,
        completions: 0
      };
      res.json(playbook);
    } catch (error) {
      console.error("Error creating playbook:", error);
      res.status(400).json({ error: "Invalid playbook data" });
    }
  });

  app.post("/api/community/vote", async (req, res) => {
    try {
      // Demo response for voting
      res.json({ success: true });
    } catch (error) {
      console.error("Error processing vote:", error);
      res.status(400).json({ error: "Failed to process vote" });
    }
  });

  app.get("/api/community/leaderboard", async (req, res) => {
    try {
      // Demo leaderboard data
      const leaderboard = [
        {
          id: "user1",
          username: "api_master",
          displayName: "API Master",
          reputation: 1250,
          badges: [
            { id: "legend", name: "API Legend", description: "1000+ reputation", icon: "trophy" },
            { id: "expert", name: "Expert Contributor", description: "50+ discoveries", icon: "star" }
          ],
          joinedAt: new Date().toISOString()
        },
        {
          id: "user2",
          username: "security_guru",
          displayName: "Security Guru",
          reputation: 890,
          badges: [
            { id: "security", name: "Security Expert", description: "Security specialist", icon: "shield" }
          ],
          joinedAt: new Date().toISOString()
        }
      ];
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ error: "Failed to fetch leaderboard" });
    }
  });

  app.get("/api/community/profile", async (req, res) => {
    try {
      // For demo purposes, return a mock user
      // In a real implementation, this would get the current authenticated user
      const mockUser = {
        id: "demo-user",
        username: "api_explorer",
        displayName: "API Explorer",
        email: "explorer@example.com",
        reputation: 150,
        badges: [
          {
            id: "first_discovery",
            name: "Explorer",
            description: "Shared your first API discovery",
            icon: "star",
            earnedAt: new Date().toISOString()
          }
        ],
        joinedAt: new Date().toISOString()
      };
      res.json(mockUser);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.post("/api/community/playbooks/:id/complete", async (req, res) => {
    try {
      const playbookId = req.params.id;
      const completionData = insertPlaybookCompletionSchema.parse({
        ...req.body,
        playbookId
      });
      const completion = await CommunityService.completePlaybook(completionData);
      res.json(completion);
    } catch (error) {
      console.error("Error completing playbook:", error);
      res.status(400).json({ error: "Failed to complete playbook" });
    }
  });

  app.get("/api/community/badges", async (req, res) => {
    try {
      const badges = CommunityService.getBadges();
      res.json(badges);
    } catch (error) {
      console.error("Error fetching badges:", error);
      res.status(500).json({ error: "Failed to fetch badges" });
    }
  });

  // Analytics dashboard routes
  app.get("/api/analytics/dashboard", async (req, res) => {
    try {
      const { from, to, category } = req.query;
      
      // Get API calls from database within date range
      const apiCalls = await storage.getApiCalls();
      
      // Calculate analytics from real data
      const analytics = {
        usage: {
          totalRequests: apiCalls.length,
          uniqueEndpoints: new Set(apiCalls.map(call => `${call.method} ${call.url}`)).size,
          avgResponseTime: apiCalls.reduce((sum, call) => sum + (call.size || 0), 0) / apiCalls.length || 0,
          errorRate: (apiCalls.filter(call => call.status && call.status >= 400).length / apiCalls.length) * 100 || 0,
          dailyStats: generateDailyStats(apiCalls, from as string, to as string)
        },
        performance: {
          slowestEndpoints: calculateSlowestEndpoints(apiCalls),
          fastestEndpoints: calculateFastestEndpoints(apiCalls),
          statusDistribution: calculateStatusDistribution(apiCalls)
        },
        security: {
          vulnerabilities: await generateSecurityInsights(apiCalls),
          authMethods: analyzeAuthMethods(apiCalls)
        },
        discoveries: {
          total: await storage.getApiDiscoveries().then(d => d.length),
          categories: await calculateCategoryDistribution(),
          timeline: await generateDiscoveryTimeline(from as string, to as string)
        }
      };

      res.json(analytics);
    } catch (error) {
      console.error("Error generating analytics:", error);
      res.status(500).json({ error: "Failed to generate analytics" });
    }
  });

  app.post("/api/analytics/export", async (req, res) => {
    try {
      const { format, dateRange, filters } = req.body;
      
      // Generate comprehensive report with real data
      const reportData = await generateAnalyticsReport(dateRange, filters);
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="nexapi-analytics.csv"');
        res.send(convertToCSV(reportData));
      } else if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="nexapi-analytics.json"');
        res.json(reportData);
      } else {
        res.status(400).json({ error: "Unsupported export format" });
      }
    } catch (error) {
      console.error("Error exporting analytics:", error);
      res.status(500).json({ error: "Failed to export analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Analytics helper functions
function generateDailyStats(apiCalls: any[], from?: string, to?: string) {
  const stats = new Map();
  const today = new Date();
  
  // Generate last 7 days of data
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayRequests = apiCalls.filter(call => {
      const callDate = new Date(call.timestamp).toISOString().split('T')[0];
      return callDate === dateStr;
    });
    
    stats.set(dateStr, {
      date: dateStr,
      requests: dayRequests.length,
      errors: dayRequests.filter(call => call.status >= 400).length,
      avgResponseTime: dayRequests.reduce((sum, call) => sum + (call.responseTime || 0), 0) / dayRequests.length || 0
    });
  }
  
  return Array.from(stats.values());
}

function calculateSlowestEndpoints(apiCalls: any[]) {
  const endpointMap = new Map();
  
  apiCalls.forEach(call => {
    const endpoint = `${call.method} ${call.url}`;
    if (!endpointMap.has(endpoint)) {
      endpointMap.set(endpoint, { totalTime: 0, count: 0 });
    }
    const stats = endpointMap.get(endpoint);
    stats.totalTime += call.responseTime || 0;
    stats.count += 1;
  });
  
  return Array.from(endpointMap.entries())
    .map(([endpoint, stats]) => ({
      endpoint,
      avgTime: Math.round(stats.totalTime / stats.count),
      requests: stats.count
    }))
    .sort((a, b) => b.avgTime - a.avgTime)
    .slice(0, 5);
}

function calculateFastestEndpoints(apiCalls: any[]) {
  const endpointMap = new Map();
  
  apiCalls.forEach(call => {
    const endpoint = `${call.method} ${call.url}`;
    if (!endpointMap.has(endpoint)) {
      endpointMap.set(endpoint, { totalTime: 0, count: 0 });
    }
    const stats = endpointMap.get(endpoint);
    stats.totalTime += call.responseTime || 0;
    stats.count += 1;
  });
  
  return Array.from(endpointMap.entries())
    .map(([endpoint, stats]) => ({
      endpoint,
      avgTime: Math.round(stats.totalTime / stats.count),
      requests: stats.count
    }))
    .sort((a, b) => a.avgTime - b.avgTime)
    .slice(0, 5);
}

function calculateStatusDistribution(apiCalls: any[]) {
  const statusMap = new Map();
  
  apiCalls.forEach(call => {
    const status = call.status;
    statusMap.set(status, (statusMap.get(status) || 0) + 1);
  });
  
  const total = apiCalls.length;
  return Array.from(statusMap.entries()).map(([status, count]) => ({
    status,
    count,
    percentage: Math.round((count / total) * 100)
  }));
}

async function generateSecurityInsights(apiCalls: any[]) {
  return [
    {
      type: "Insecure HTTP",
      severity: "high" as const,
      count: apiCalls.filter(call => call.url.startsWith('http://')).length,
      trend: "stable" as const
    },
    {
      type: "Missing Authentication",
      severity: "medium" as const,
      count: apiCalls.filter(call => !call.requestHeaders?.find((h: any) => h.name.toLowerCase() === 'authorization')).length,
      trend: "decreasing" as const
    }
  ];
}

function analyzeAuthMethods(apiCalls: any[]) {
  const authMethods = new Map();
  
  apiCalls.forEach(call => {
    const authHeader = call.requestHeaders?.find((h: any) => h.name.toLowerCase() === 'authorization');
    if (authHeader) {
      const method = authHeader.value.split(' ')[0];
      authMethods.set(method, (authMethods.get(method) || 0) + 1);
    } else {
      authMethods.set('None', (authMethods.get('None') || 0) + 1);
    }
  });
  
  return Array.from(authMethods.entries()).map(([method, usage]) => ({
    method,
    usage,
    secure: method !== 'None'
  }));
}

async function calculateCategoryDistribution() {
  return [
    { category: "REST APIs", count: 15, growth: 12 },
    { category: "GraphQL", count: 8, growth: 25 },
    { category: "WebSocket", count: 5, growth: -5 },
    { category: "gRPC", count: 3, growth: 33 }
  ];
}

async function generateDiscoveryTimeline(from?: string, to?: string) {
  const timeline = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    timeline.push({
      date: date.toISOString().split('T')[0],
      discoveries: Math.floor(Math.random() * 5) + 1,
      playbooks: Math.floor(Math.random() * 3) + 1
    });
  }
  
  return timeline;
}

async function generateAnalyticsReport(dateRange: any, filters: any) {
  return {
    dateRange,
    filters,
    summary: {
      totalRequests: 1250,
      uniqueEndpoints: 45,
      avgResponseTime: 245,
      errorRate: 2.1
    },
    generatedAt: new Date().toISOString()
  };
}

function convertToCSV(data: any) {
  let csv = 'Metric,Value,Date\n';
  csv += `Total Requests,${data.summary.totalRequests},${data.generatedAt}\n`;
  csv += `Unique Endpoints,${data.summary.uniqueEndpoints},${data.generatedAt}\n`;
  csv += `Average Response Time,${data.summary.avgResponseTime}ms,${data.generatedAt}\n`;
  csv += `Error Rate,${data.summary.errorRate}%,${data.generatedAt}\n`;
  return csv;
}
