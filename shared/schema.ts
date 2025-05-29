import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const apiCalls = pgTable("api_calls", {
  id: text("id").primaryKey(),
  method: text("method").notNull(),
  url: text("url").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  tabId: integer("tab_id").notNull(),
  requestHeaders: jsonb("request_headers").$type<Array<{ name: string; value: string }>>().notNull().default([]),
  responseHeaders: jsonb("response_headers").$type<Array<{ name: string; value: string }>>().notNull().default([]),
  status: integer("status"),
  size: integer("size").notNull().default(0),
});

export const savedRequests = pgTable("saved_requests", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  method: text("method").notNull(),
  url: text("url").notNull(),
  headers: jsonb("headers").$type<Array<{ key: string; value: string }>>().notNull().default([]),
  body: text("body").notNull().default(''),
  authType: text("auth_type").notNull().default('none'),
  authValue: text("auth_value").notNull().default(''),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const apiEndpoints = pgTable("api_endpoints", {
  id: text("id").primaryKey(),
  baseUrl: text("base_url").notNull(),
  path: text("path").notNull(),
  method: text("method").notNull(),
  summary: text("summary"),
  description: text("description"),
  parameters: jsonb("parameters").$type<Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
    example?: any;
  }>>().notNull().default([]),
  requestBody: jsonb("request_body").$type<{
    contentType: string;
    schema: any;
    example?: any;
  }>(),
  responses: jsonb("responses").$type<Array<{
    statusCode: number;
    description: string;
    contentType: string;
    schema: any;
    example?: any;
  }>>().notNull().default([]),
  tags: jsonb("tags").$type<string[]>().notNull().default([]),
  version: text("version").notNull().default('1.0.0'),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
  callCount: integer("call_count").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const apiDocumentations = pgTable("api_documentations", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  version: text("version").notNull().default('1.0.0'),
  baseUrl: text("base_url").notNull(),
  openApiSpec: jsonb("openapi_spec").$type<any>().notNull(),
  asyncApiSpec: jsonb("asyncapi_spec").$type<any>(),
  generatedAt: timestamp("generated_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const apiWorkflows = pgTable("api_workflows", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  baseUrl: text("base_url").notNull(),
  steps: jsonb("steps").$type<Array<{
    id: string;
    endpointId: string;
    order: number;
    dependencies: string[];
    conditions: Array<{
      type: 'header' | 'response' | 'status';
      field: string;
      operator: 'equals' | 'contains' | 'exists';
      value: any;
    }>;
    variables: Array<{
      name: string;
      source: 'response' | 'header' | 'static';
      path: string;
      target: 'header' | 'body' | 'query';
    }>;
  }>>().notNull().default([]),
  frequency: integer("frequency").notNull().default(0),
  lastDetected: timestamp("last_detected").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const apiDependencies = pgTable("api_dependencies", {
  id: text("id").primaryKey(),
  fromEndpointId: text("from_endpoint_id").notNull(),
  toEndpointId: text("to_endpoint_id").notNull(),
  dependencyType: text("dependency_type").notNull(), // 'sequential', 'conditional', 'parallel', 'data_flow'
  confidence: integer("confidence").notNull().default(0), // 0-100
  frequency: integer("frequency").notNull().default(1),
  avgTimeBetween: integer("avg_time_between").notNull().default(0), // milliseconds
  dataFlow: jsonb("data_flow").$type<Array<{
    sourceField: string;
    targetField: string;
    transformation?: string;
  }>>().notNull().default([]),
  conditions: jsonb("conditions").$type<Array<{
    type: 'status' | 'response_data' | 'header';
    field: string;
    operator: string;
    value: any;
  }>>().notNull().default([]),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Community sharing tables
export const communityUsers = pgTable("community_users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull().unique(),
  avatar: text("avatar"),
  bio: text("bio"),
  reputation: integer("reputation").notNull().default(0),
  badges: jsonb("badges").$type<Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: string;
  }>>().default([]),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
  lastActive: timestamp("last_active").notNull().defaultNow(),
});

export const apiDiscoveries = pgTable("api_discoveries", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description").notNull(),
  authorId: text("author_id").notNull().references(() => communityUsers.id),
  baseUrl: text("base_url").notNull(),
  endpoints: jsonb("endpoints").$type<Array<{
    method: string;
    path: string;
    description: string;
    parameters: Array<{
      name: string;
      type: string;
      required: boolean;
      description?: string;
    }>;
    examples: Array<{
      request: any;
      response: any;
    }>;
  }>>().notNull(),
  tags: jsonb("tags").$type<string[]>().default([]),
  category: text("category").notNull(), // 'authentication', 'data-processing', 'integration', 'utility'
  difficulty: text("difficulty").notNull(), // 'beginner', 'intermediate', 'advanced'
  upvotes: integer("upvotes").notNull().default(0),
  downvotes: integer("downvotes").notNull().default(0),
  views: integer("views").notNull().default(0),
  featured: boolean("featured").notNull().default(false),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const apiPlaybooks = pgTable("api_playbooks", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text("title").notNull(),
  description: text("description").notNull(),
  authorId: text("author_id").notNull().references(() => communityUsers.id),
  steps: jsonb("steps").$type<Array<{
    id: string;
    title: string;
    description: string;
    endpoint: {
      method: string;
      url: string;
      headers?: Record<string, string>;
      body?: any;
    };
    expectedResponse: any;
    notes?: string;
    order: number;
  }>>().notNull(),
  prerequisites: jsonb("prerequisites").$type<Array<{
    type: 'api_key' | 'authentication' | 'setup';
    description: string;
    required: boolean;
  }>>().default([]),
  tags: jsonb("tags").$type<string[]>().default([]),
  category: text("category").notNull(),
  difficulty: text("difficulty").notNull(),
  estimatedTime: integer("estimated_time"), // in minutes
  upvotes: integer("upvotes").notNull().default(0),
  downvotes: integer("downvotes").notNull().default(0),
  completions: integer("completions").notNull().default(0),
  featured: boolean("featured").notNull().default(false),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const communityComments = pgTable("community_comments", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  content: text("content").notNull(),
  authorId: text("author_id").notNull().references(() => communityUsers.id),
  targetType: text("target_type").notNull(), // 'discovery' | 'playbook'
  targetId: text("target_id").notNull(),
  parentId: text("parent_id"), // for nested comments
  upvotes: integer("upvotes").notNull().default(0),
  downvotes: integer("downvotes").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const communityVotes = pgTable("community_votes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => communityUsers.id),
  targetType: text("target_type").notNull(), // 'discovery' | 'playbook' | 'comment'
  targetId: text("target_id").notNull(),
  voteType: text("vote_type").notNull(), // 'upvote' | 'downvote'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const communityContributions = pgTable("community_contributions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => communityUsers.id),
  type: text("type").notNull(), // 'discovery', 'playbook', 'comment', 'vote', 'completion'
  targetId: text("target_id").notNull(),
  points: integer("points").notNull().default(0),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const playbookCompletions = pgTable("playbook_completions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").notNull().references(() => communityUsers.id),
  playbookId: text("playbook_id").notNull().references(() => apiPlaybooks.id),
  completedSteps: jsonb("completed_steps").$type<string[]>().default([]),
  status: text("status").notNull().default('in_progress'), // 'in_progress', 'completed', 'abandoned'
  feedback: text("feedback"),
  rating: integer("rating"), // 1-5 stars
  completedAt: timestamp("completed_at"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertApiCallSchema = createInsertSchema(apiCalls).omit({
  timestamp: true,
});

export const insertSavedRequestSchema = createInsertSchema(savedRequests).omit({
  id: true,
  createdAt: true,
});

export const insertApiEndpointSchema = createInsertSchema(apiEndpoints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApiDocumentationSchema = createInsertSchema(apiDocumentations).omit({
  id: true,
  generatedAt: true,
  updatedAt: true,
});

export const insertApiWorkflowSchema = createInsertSchema(apiWorkflows).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApiDependencySchema = createInsertSchema(apiDependencies).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityUserSchema = createInsertSchema(communityUsers).omit({
  id: true,
  joinedAt: true,
  lastActive: true,
});

export const insertApiDiscoverySchema = createInsertSchema(apiDiscoveries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApiPlaybookSchema = createInsertSchema(apiPlaybooks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunityCommentSchema = createInsertSchema(communityComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunityVoteSchema = createInsertSchema(communityVotes).omit({
  id: true,
  createdAt: true,
});

export const insertCommunityContributionSchema = createInsertSchema(communityContributions).omit({
  id: true,
  createdAt: true,
});

export const insertPlaybookCompletionSchema = createInsertSchema(playbookCompletions).omit({
  id: true,
  startedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type ApiCall = typeof apiCalls.$inferSelect;
export type InsertApiCall = z.infer<typeof insertApiCallSchema>;
export type SavedRequest = typeof savedRequests.$inferSelect;
export type InsertSavedRequest = z.infer<typeof insertSavedRequestSchema>;
export type ApiEndpoint = typeof apiEndpoints.$inferSelect;
export type InsertApiEndpoint = z.infer<typeof insertApiEndpointSchema>;
export type ApiDocumentation = typeof apiDocumentations.$inferSelect;
export type InsertApiDocumentation = z.infer<typeof insertApiDocumentationSchema>;
export type ApiWorkflow = typeof apiWorkflows.$inferSelect;
export type InsertApiWorkflow = z.infer<typeof insertApiWorkflowSchema>;
export type ApiDependency = typeof apiDependencies.$inferSelect;
export type InsertApiDependency = z.infer<typeof insertApiDependencySchema>;

// Community types
export type CommunityUser = typeof communityUsers.$inferSelect;
export type InsertCommunityUser = z.infer<typeof insertCommunityUserSchema>;
export type ApiDiscovery = typeof apiDiscoveries.$inferSelect;
export type InsertApiDiscovery = z.infer<typeof insertApiDiscoverySchema>;
export type ApiPlaybook = typeof apiPlaybooks.$inferSelect;
export type InsertApiPlaybook = z.infer<typeof insertApiPlaybookSchema>;
export type CommunityComment = typeof communityComments.$inferSelect;
export type InsertCommunityComment = z.infer<typeof insertCommunityCommentSchema>;
export type CommunityVote = typeof communityVotes.$inferSelect;
export type InsertCommunityVote = z.infer<typeof insertCommunityVoteSchema>;
export type CommunityContribution = typeof communityContributions.$inferSelect;
export type InsertCommunityContribution = z.infer<typeof insertCommunityContributionSchema>;
export type PlaybookCompletion = typeof playbookCompletions.$inferSelect;
export type InsertPlaybookCompletion = z.infer<typeof insertPlaybookCompletionSchema>;
