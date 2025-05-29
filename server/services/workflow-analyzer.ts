import { ApiCall, ApiWorkflow, ApiDependency, InsertApiWorkflow, InsertApiDependency } from "@shared/schema";
import { storage } from "../storage";

interface ApiCallSequence {
  calls: ApiCall[];
  tabId: number;
  sessionStart: Date;
  sessionEnd: Date;
}

interface DetectedDependency {
  fromCall: ApiCall;
  toCall: ApiCall;
  timeBetween: number;
  dependencyType: 'sequential' | 'conditional' | 'parallel' | 'data_flow';
  confidence: number;
  dataFlow: Array<{
    sourceField: string;
    targetField: string;
    transformation?: string;
  }>;
  conditions: Array<{
    type: 'status' | 'response_data' | 'header';
    field: string;
    operator: string;
    value: any;
  }>;
}

export class WorkflowAnalyzer {
  private static readonly MAX_SEQUENCE_GAP = 30000; // 30 seconds
  private static readonly MIN_CONFIDENCE_THRESHOLD = 70;
  private static readonly COMMON_AUTH_PATTERNS = [
    'authorization',
    'x-auth-token',
    'x-api-key',
    'bearer',
    'access_token'
  ];

  static async analyzeApiCallSequences(tabId: number): Promise<void> {
    try {
      const apiCalls = await storage.getApiCallsByTab(tabId);
      if (apiCalls.length < 2) return;

      // Group calls into sequences based on timing
      const sequences = this.groupCallsIntoSequences(apiCalls);
      
      for (const sequence of sequences) {
        const dependencies = this.detectDependencies(sequence);
        const workflows = this.identifyWorkflows(sequence, dependencies);
        
        // Store detected dependencies
        for (const dependency of dependencies) {
          await this.storeDependency(dependency);
        }
        
        // Store detected workflows
        for (const workflow of workflows) {
          await this.storeWorkflow(workflow);
        }
      }
    } catch (error) {
      console.error('Error analyzing API call sequences:', error);
    }
  }

  private static groupCallsIntoSequences(apiCalls: ApiCall[]): ApiCallSequence[] {
    const sequences: ApiCallSequence[] = [];
    let currentSequence: ApiCall[] = [];
    let lastCallTime: Date | null = null;

    // Sort calls by timestamp
    const sortedCalls = [...apiCalls].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (const call of sortedCalls) {
      const callTime = new Date(call.timestamp);
      
      if (!lastCallTime || (callTime.getTime() - lastCallTime.getTime()) > this.MAX_SEQUENCE_GAP) {
        // Start new sequence
        if (currentSequence.length > 1) {
          sequences.push({
            calls: currentSequence,
            tabId: call.tabId,
            sessionStart: new Date(currentSequence[0].timestamp),
            sessionEnd: new Date(currentSequence[currentSequence.length - 1].timestamp)
          });
        }
        currentSequence = [call];
      } else {
        currentSequence.push(call);
      }
      
      lastCallTime = callTime;
    }

    // Add final sequence
    if (currentSequence.length > 1) {
      sequences.push({
        calls: currentSequence,
        tabId: currentSequence[0].tabId,
        sessionStart: new Date(currentSequence[0].timestamp),
        sessionEnd: new Date(currentSequence[currentSequence.length - 1].timestamp)
      });
    }

    return sequences;
  }

  private static detectDependencies(sequence: ApiCallSequence): DetectedDependency[] {
    const dependencies: DetectedDependency[] = [];
    const calls = sequence.calls;

    for (let i = 0; i < calls.length - 1; i++) {
      for (let j = i + 1; j < calls.length; j++) {
        const dependency = this.analyzeDependencyBetweenCalls(calls[i], calls[j]);
        if (dependency && dependency.confidence >= this.MIN_CONFIDENCE_THRESHOLD) {
          dependencies.push(dependency);
        }
      }
    }

    return dependencies;
  }

  private static analyzeDependencyBetweenCalls(fromCall: ApiCall, toCall: ApiCall): DetectedDependency | null {
    const timeBetween = new Date(toCall.timestamp).getTime() - new Date(fromCall.timestamp).getTime();
    
    // Skip if calls are too far apart
    if (timeBetween > this.MAX_SEQUENCE_GAP) return null;

    let confidence = 0;
    let dependencyType: 'sequential' | 'conditional' | 'parallel' | 'data_flow' = 'sequential';
    const dataFlow: Array<{ sourceField: string; targetField: string; transformation?: string; }> = [];
    const conditions: Array<{ type: 'status' | 'response_data' | 'header'; field: string; operator: string; value: any; }> = [];

    // Analyze URL patterns
    const urlSimilarity = this.calculateUrlSimilarity(fromCall.url, toCall.url);
    confidence += urlSimilarity * 20;

    // Analyze authentication flow
    if (this.isAuthenticationFlow(fromCall, toCall)) {
      confidence += 40;
      dependencyType = 'data_flow';
      
      // Detect auth token flow
      const authTokenFlow = this.detectAuthTokenFlow(fromCall, toCall);
      if (authTokenFlow) {
        dataFlow.push(authTokenFlow);
        confidence += 20;
      }
    }

    // Analyze CRUD patterns
    if (this.isCrudPattern(fromCall, toCall)) {
      confidence += 30;
      dependencyType = 'sequential';
    }

    // Analyze data dependencies
    const dataflowAnalysis = this.analyzeDataFlow(fromCall, toCall);
    if (dataflowAnalysis.length > 0) {
      confidence += 25;
      dependencyType = 'data_flow';
      dataFlow.push(...dataflowAnalysis);
    }

    // Analyze conditional dependencies
    const conditionalAnalysis = this.analyzeConditionalDependency(fromCall, toCall);
    if (conditionalAnalysis.length > 0) {
      confidence += 15;
      dependencyType = 'conditional';
      conditions.push(...conditionalAnalysis);
    }

    // Check for parallel execution patterns
    if (timeBetween < 1000 && this.areSimilarEndpoints(fromCall, toCall)) {
      dependencyType = 'parallel';
      confidence += 10;
    }

    return confidence >= this.MIN_CONFIDENCE_THRESHOLD ? {
      fromCall,
      toCall,
      timeBetween,
      dependencyType,
      confidence: Math.min(confidence, 100),
      dataFlow,
      conditions
    } : null;
  }

  private static calculateUrlSimilarity(url1: string, url2: string): number {
    try {
      const u1 = new URL(url1);
      const u2 = new URL(url2);
      
      if (u1.hostname !== u2.hostname) return 0;
      
      const path1 = u1.pathname.split('/').filter(Boolean);
      const path2 = u2.pathname.split('/').filter(Boolean);
      
      let commonSegments = 0;
      const maxLength = Math.max(path1.length, path2.length);
      
      for (let i = 0; i < Math.min(path1.length, path2.length); i++) {
        if (path1[i] === path2[i]) commonSegments++;
      }
      
      return maxLength > 0 ? commonSegments / maxLength : 0;
    } catch {
      return 0;
    }
  }

  private static isAuthenticationFlow(fromCall: ApiCall, toCall: ApiCall): boolean {
    const authEndpoints = ['/login', '/auth', '/signin', '/token', '/oauth'];
    const fromIsAuth = authEndpoints.some(endpoint => fromCall.url.includes(endpoint));
    
    if (!fromIsAuth) return false;

    // Check if toCall has auth headers that fromCall response might provide
    const toCallAuthHeaders = toCall.requestHeaders.filter(h => 
      this.COMMON_AUTH_PATTERNS.some(pattern => 
        h.name.toLowerCase().includes(pattern)
      )
    );

    return toCallAuthHeaders.length > 0;
  }

  private static detectAuthTokenFlow(fromCall: ApiCall, toCall: ApiCall) {
    // Look for token in fromCall response headers that might be used in toCall
    const authHeader = toCall.requestHeaders.find(h => 
      this.COMMON_AUTH_PATTERNS.some(pattern => 
        h.name.toLowerCase().includes(pattern)
      )
    );

    if (authHeader) {
      return {
        sourceField: 'response.token',
        targetField: `headers.${authHeader.name}`,
        transformation: 'bearer_prefix'
      };
    }

    return null;
  }

  private static isCrudPattern(fromCall: ApiCall, toCall: ApiCall): boolean {
    const crudSequences = [
      ['POST', 'GET'],
      ['PUT', 'GET'],
      ['DELETE', 'GET'],
      ['POST', 'PUT'],
      ['GET', 'PUT'],
      ['GET', 'DELETE']
    ];

    return crudSequences.some(([first, second]) => 
      fromCall.method === first && toCall.method === second
    );
  }

  private static analyzeDataFlow(fromCall: ApiCall, toCall: ApiCall) {
    const dataFlow: Array<{ sourceField: string; targetField: string; transformation?: string; }> = [];
    
    // Analyze URL patterns for ID propagation
    const fromUrlParts = fromCall.url.split('/');
    const toUrlParts = toCall.url.split('/');
    
    // Look for IDs that might be passed between calls
    const idPattern = /^[a-f0-9-]{20,}|^\d+$/;
    
    for (const fromPart of fromUrlParts) {
      if (idPattern.test(fromPart)) {
        for (const toPart of toUrlParts) {
          if (fromPart === toPart) {
            dataFlow.push({
              sourceField: `url.path.${fromPart}`,
              targetField: `url.path.${toPart}`
            });
          }
        }
      }
    }

    return dataFlow;
  }

  private static analyzeConditionalDependency(fromCall: ApiCall, toCall: ApiCall) {
    const conditions: Array<{ type: 'status' | 'response_data' | 'header'; field: string; operator: string; value: any; }> = [];
    
    // Common conditional patterns
    if (fromCall.status && fromCall.status >= 200 && fromCall.status < 300) {
      conditions.push({
        type: 'status',
        field: 'statusCode',
        operator: 'equals',
        value: fromCall.status
      });
    }

    return conditions;
  }

  private static areSimilarEndpoints(call1: ApiCall, call2: ApiCall): boolean {
    try {
      const url1 = new URL(call1.url);
      const url2 = new URL(call2.url);
      
      // Same base path with different query params or IDs
      const basePath1 = url1.pathname.replace(/\/\d+/g, '/:id');
      const basePath2 = url2.pathname.replace(/\/\d+/g, '/:id');
      
      return basePath1 === basePath2;
    } catch {
      return false;
    }
  }

  private static identifyWorkflows(sequence: ApiCallSequence, dependencies: DetectedDependency[]): InsertApiWorkflow[] {
    const workflows: InsertApiWorkflow[] = [];
    
    // Group dependencies into workflow patterns
    const workflowMap = new Map<string, DetectedDependency[]>();
    
    for (const dependency of dependencies) {
      const baseUrl = new URL(dependency.fromCall.url).origin;
      if (!workflowMap.has(baseUrl)) {
        workflowMap.set(baseUrl, []);
      }
      workflowMap.get(baseUrl)!.push(dependency);
    }

    for (const [baseUrl, deps] of workflowMap) {
      if (deps.length >= 2) {
        const workflow = this.createWorkflowFromDependencies(baseUrl, deps);
        workflows.push(workflow);
      }
    }

    return workflows;
  }

  private static createWorkflowFromDependencies(baseUrl: string, dependencies: DetectedDependency[]): InsertApiWorkflow {
    const steps = dependencies.map((dep, index) => ({
      id: `step_${index}`,
      endpointId: `${baseUrl}${new URL(dep.fromCall.url).pathname}:${dep.fromCall.method}`,
      order: index,
      dependencies: index > 0 ? [`step_${index - 1}`] : [],
      conditions: dep.conditions,
      variables: dep.dataFlow.map(flow => ({
        name: flow.sourceField,
        source: 'response' as const,
        path: flow.sourceField,
        target: 'header' as const
      }))
    }));

    // Determine workflow name based on patterns
    const workflowName = this.generateWorkflowName(dependencies);

    return {
      name: workflowName,
      description: `Auto-detected workflow with ${steps.length} steps`,
      baseUrl,
      steps,
      frequency: 1,
      lastDetected: new Date()
    };
  }

  private static generateWorkflowName(dependencies: DetectedDependency[]): string {
    const methods = dependencies.map(d => d.fromCall.method);
    const hasAuth = dependencies.some(d => this.isAuthenticationFlow(d.fromCall, d.toCall));
    
    if (hasAuth) {
      return 'Authentication Flow';
    }
    
    if (methods.includes('POST') && methods.includes('GET')) {
      return 'Create and Fetch Flow';
    }
    
    if (methods.includes('GET') && methods.includes('PUT')) {
      return 'Fetch and Update Flow';
    }
    
    if (methods.includes('GET') && methods.includes('DELETE')) {
      return 'Fetch and Delete Flow';
    }
    
    return `API Workflow (${methods.join(' → ')})`;
  }

  private static async storeDependency(dependency: DetectedDependency): Promise<void> {
    try {
      const fromEndpointId = `${new URL(dependency.fromCall.url).origin}${new URL(dependency.fromCall.url).pathname}:${dependency.fromCall.method}`;
      const toEndpointId = `${new URL(dependency.toCall.url).origin}${new URL(dependency.toCall.url).pathname}:${dependency.toCall.method}`;

      const dependencyData: InsertApiDependency = {
        fromEndpointId,
        toEndpointId,
        dependencyType: dependency.dependencyType,
        confidence: dependency.confidence,
        frequency: 1,
        avgTimeBetween: dependency.timeBetween,
        dataFlow: dependency.dataFlow,
        conditions: dependency.conditions,
        lastSeen: new Date()
      };

      await storage.upsertApiDependency(dependencyData);
    } catch (error) {
      console.error('Error storing dependency:', error);
    }
  }

  private static async storeWorkflow(workflow: InsertApiWorkflow): Promise<void> {
    try {
      await storage.upsertApiWorkflow(workflow);
    } catch (error) {
      console.error('Error storing workflow:', error);
    }
  }
}