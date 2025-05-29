import { users, apiCalls, savedRequests, apiEndpoints, apiDocumentations, apiWorkflows, apiDependencies, type User, type InsertUser, type ApiCall, type InsertApiCall, type SavedRequest, type InsertSavedRequest, type ApiEndpoint, type InsertApiEndpoint, type ApiDocumentation, type InsertApiDocumentation, type ApiWorkflow, type InsertApiWorkflow, type ApiDependency, type InsertApiDependency } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // API Calls methods
  saveApiCall(apiCall: InsertApiCall): Promise<ApiCall>;
  getApiCalls(): Promise<ApiCall[]>;
  getApiCallsByTab(tabId: number): Promise<ApiCall[]>;
  clearApiCallsForTab(tabId: number): Promise<void>;
  
  // Saved Requests methods
  saveSavedRequest(request: InsertSavedRequest): Promise<SavedRequest>;
  getSavedRequests(): Promise<SavedRequest[]>;
  deleteSavedRequest(id: string): Promise<void>;
  
  // API Documentation methods
  upsertApiEndpoint(endpoint: InsertApiEndpoint): Promise<ApiEndpoint>;
  getApiEndpointsByBaseUrl(baseUrl: string): Promise<ApiEndpoint[]>;
  upsertApiDocumentation(doc: InsertApiDocumentation): Promise<ApiDocumentation>;
  getApiDocumentations(): Promise<ApiDocumentation[]>;
  getApiDocumentationByBaseUrl(baseUrl: string): Promise<ApiDocumentation | undefined>;
  
  // Workflow and Dependency methods
  upsertApiWorkflow(workflow: InsertApiWorkflow): Promise<ApiWorkflow>;
  getApiWorkflows(): Promise<ApiWorkflow[]>;
  getApiWorkflowsByBaseUrl(baseUrl: string): Promise<ApiWorkflow[]>;
  upsertApiDependency(dependency: InsertApiDependency): Promise<ApiDependency>;
  getApiDependencies(): Promise<ApiDependency[]>;
  getApiDependenciesByBaseUrl(baseUrl: string): Promise<ApiDependency[]>;

  // Community methods (placeholder implementations)
  getApiDiscoveries(filters?: { category?: string; sortBy?: string; search?: string }): Promise<any[]>;
  getApiPlaybooks(filters?: { category?: string; sortBy?: string; search?: string }): Promise<any[]>;
  getTopUsersByReputation(limit: number): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async saveApiCall(apiCall: InsertApiCall): Promise<ApiCall> {
    const [existingCall] = await db
      .select()
      .from(apiCalls)
      .where(eq(apiCalls.id, apiCall.id));

    // Convert header arrays to proper format
    const formattedApiCall = {
      ...apiCall,
      requestHeaders: Array.isArray(apiCall.requestHeaders) 
        ? apiCall.requestHeaders.map((h: any) => ({ name: h.name, value: h.value }))
        : [],
      responseHeaders: Array.isArray(apiCall.responseHeaders)
        ? apiCall.responseHeaders.map((h: any) => ({ name: h.name, value: h.value }))
        : []
    };

    if (existingCall) {
      // Update existing call
      const [updatedCall] = await db
        .update(apiCalls)
        .set(formattedApiCall)
        .where(eq(apiCalls.id, apiCall.id))
        .returning();
      return updatedCall;
    } else {
      // Insert new call
      const [newCall] = await db
        .insert(apiCalls)
        .values(formattedApiCall)
        .returning();
      return newCall;
    }
  }

  async getApiCallsByTab(tabId: number): Promise<ApiCall[]> {
    return await db
      .select()
      .from(apiCalls)
      .where(eq(apiCalls.tabId, tabId))
      .orderBy(desc(apiCalls.timestamp))
      .limit(100);
  }

  async getApiCalls(): Promise<ApiCall[]> {
    return await db
      .select()
      .from(apiCalls)
      .orderBy(desc(apiCalls.timestamp))
      .limit(1000);
  }

  async clearApiCallsForTab(tabId: number): Promise<void> {
    await db.delete(apiCalls).where(eq(apiCalls.tabId, tabId));
  }

  async saveSavedRequest(request: InsertSavedRequest): Promise<SavedRequest> {
    const id = Date.now().toString() + Math.random().toString(36).substr(2);
    const [savedRequest] = await db
      .insert(savedRequests)
      .values({ 
        id,
        name: request.name,
        method: request.method,
        url: request.url,
        headers: request.headers || [],
        body: request.body || '',
        authType: request.authType || 'none',
        authValue: request.authValue || ''
      })
      .returning();
    return savedRequest;
  }

  async getSavedRequests(): Promise<SavedRequest[]> {
    return await db
      .select()
      .from(savedRequests)
      .orderBy(desc(savedRequests.createdAt));
  }

  async deleteSavedRequest(id: string): Promise<void> {
    await db.delete(savedRequests).where(eq(savedRequests.id, id));
  }

  async upsertApiEndpoint(endpoint: InsertApiEndpoint): Promise<ApiEndpoint> {
    const endpointId = `${endpoint.baseUrl}${endpoint.path}:${endpoint.method}`;
    
    const [existingEndpoint] = await db
      .select()
      .from(apiEndpoints)
      .where(eq(apiEndpoints.id, endpointId));

    if (existingEndpoint) {
      // Update existing endpoint
      const [updatedEndpoint] = await db
        .update(apiEndpoints)
        .set({ 
          ...endpoint,
          callCount: existingEndpoint.callCount + 1,
          lastSeen: new Date(),
          updatedAt: new Date()
        })
        .where(eq(apiEndpoints.id, endpointId))
        .returning();
      return updatedEndpoint;
    } else {
      // Insert new endpoint
      const [newEndpoint] = await db
        .insert(apiEndpoints)
        .values({ 
          id: endpointId,
          baseUrl: endpoint.baseUrl,
          path: endpoint.path,
          method: endpoint.method,
          summary: endpoint.summary,
          description: endpoint.description,
          parameters: endpoint.parameters || [],
          requestBody: endpoint.requestBody,
          responses: endpoint.responses || [],
          tags: endpoint.tags || [],
          version: endpoint.version || '1.0.0',
          lastSeen: endpoint.lastSeen || new Date(),
          callCount: endpoint.callCount || 1
        })
        .returning();
      return newEndpoint;
    }
  }

  async getApiEndpointsByBaseUrl(baseUrl: string): Promise<ApiEndpoint[]> {
    return await db
      .select()
      .from(apiEndpoints)
      .where(eq(apiEndpoints.baseUrl, baseUrl))
      .orderBy(desc(apiEndpoints.lastSeen));
  }

  async upsertApiDocumentation(doc: InsertApiDocumentation): Promise<ApiDocumentation> {
    const docId = `${doc.baseUrl}:${doc.version}`;
    
    const [existingDoc] = await db
      .select()
      .from(apiDocumentations)
      .where(eq(apiDocumentations.id, docId));

    if (existingDoc) {
      // Update existing documentation
      const [updatedDoc] = await db
        .update(apiDocumentations)
        .set({ 
          ...doc,
          updatedAt: new Date()
        })
        .where(eq(apiDocumentations.id, docId))
        .returning();
      return updatedDoc;
    } else {
      // Insert new documentation
      const [newDoc] = await db
        .insert(apiDocumentations)
        .values({ 
          id: docId,
          title: doc.title,
          description: doc.description,
          version: doc.version || '1.0.0',
          baseUrl: doc.baseUrl,
          openApiSpec: doc.openApiSpec,
          asyncApiSpec: doc.asyncApiSpec
        })
        .returning();
      return newDoc;
    }
  }

  async getApiDocumentations(): Promise<ApiDocumentation[]> {
    return await db
      .select()
      .from(apiDocumentations)
      .orderBy(desc(apiDocumentations.updatedAt));
  }

  async getApiDocumentationByBaseUrl(baseUrl: string): Promise<ApiDocumentation | undefined> {
    const [doc] = await db
      .select()
      .from(apiDocumentations)
      .where(eq(apiDocumentations.baseUrl, baseUrl))
      .orderBy(desc(apiDocumentations.updatedAt))
      .limit(1);
    return doc || undefined;
  }

  async upsertApiWorkflow(workflow: InsertApiWorkflow): Promise<ApiWorkflow> {
    const workflowId = `${workflow.baseUrl}:${workflow.name.replace(/\s+/g, '-').toLowerCase()}`;
    
    const [existingWorkflow] = await db
      .select()
      .from(apiWorkflows)
      .where(eq(apiWorkflows.id, workflowId));

    if (existingWorkflow) {
      const [updatedWorkflow] = await db
        .update(apiWorkflows)
        .set({ 
          ...workflow,
          frequency: existingWorkflow.frequency + 1,
          lastDetected: new Date(),
          updatedAt: new Date()
        })
        .where(eq(apiWorkflows.id, workflowId))
        .returning();
      return updatedWorkflow;
    } else {
      const [newWorkflow] = await db
        .insert(apiWorkflows)
        .values({ 
          id: workflowId,
          name: workflow.name,
          description: workflow.description,
          baseUrl: workflow.baseUrl,
          steps: workflow.steps || [],
          frequency: workflow.frequency || 1,
          lastDetected: workflow.lastDetected || new Date()
        })
        .returning();
      return newWorkflow;
    }
  }

  async getApiWorkflows(): Promise<ApiWorkflow[]> {
    return await db
      .select()
      .from(apiWorkflows)
      .orderBy(desc(apiWorkflows.frequency), desc(apiWorkflows.lastDetected));
  }

  async getApiWorkflowsByBaseUrl(baseUrl: string): Promise<ApiWorkflow[]> {
    return await db
      .select()
      .from(apiWorkflows)
      .where(eq(apiWorkflows.baseUrl, baseUrl))
      .orderBy(desc(apiWorkflows.frequency));
  }

  async upsertApiDependency(dependency: InsertApiDependency): Promise<ApiDependency> {
    const dependencyId = `${dependency.fromEndpointId}->${dependency.toEndpointId}`;
    
    const [existingDependency] = await db
      .select()
      .from(apiDependencies)
      .where(eq(apiDependencies.id, dependencyId));

    if (existingDependency) {
      const [updatedDependency] = await db
        .update(apiDependencies)
        .set({ 
          ...dependency,
          frequency: existingDependency.frequency + 1,
          avgTimeBetween: Math.round((existingDependency.avgTimeBetween + dependency.avgTimeBetween) / 2),
          lastSeen: new Date()
        })
        .where(eq(apiDependencies.id, dependencyId))
        .returning();
      return updatedDependency;
    } else {
      const [newDependency] = await db
        .insert(apiDependencies)
        .values({ 
          id: dependencyId,
          fromEndpointId: dependency.fromEndpointId,
          toEndpointId: dependency.toEndpointId,
          dependencyType: dependency.dependencyType,
          confidence: dependency.confidence || 0,
          frequency: dependency.frequency || 1,
          avgTimeBetween: dependency.avgTimeBetween || 0,
          dataFlow: dependency.dataFlow || [],
          conditions: dependency.conditions || [],
          lastSeen: dependency.lastSeen || new Date()
        })
        .returning();
      return newDependency;
    }
  }

  async getApiDependencies(): Promise<ApiDependency[]> {
    return await db
      .select()
      .from(apiDependencies)
      .orderBy(desc(apiDependencies.confidence), desc(apiDependencies.frequency));
  }

  async getApiDependenciesByBaseUrl(baseUrl: string): Promise<ApiDependency[]> {
    return await db
      .select()
      .from(apiDependencies)
      .where(
        and(
          eq(apiDependencies.fromEndpointId, baseUrl),
          eq(apiDependencies.toEndpointId, baseUrl)
        )
      )
      .orderBy(desc(apiDependencies.confidence));
  }

  // Community methods - return empty arrays for now
  async getApiDiscoveries(filters?: { category?: string; sortBy?: string; search?: string }): Promise<any[]> {
    return [];
  }

  async getApiPlaybooks(filters?: { category?: string; sortBy?: string; search?: string }): Promise<any[]> {
    return [];
  }

  async getTopUsersByReputation(limit: number): Promise<any[]> {
    return [];
  }
}

export const storage = new DatabaseStorage();
