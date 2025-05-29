import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { GitBranch, ArrowRight, Clock, Zap, Network, Play, AlertCircle } from 'lucide-react';

interface ApiWorkflow {
  id: string;
  name: string;
  description?: string;
  baseUrl: string;
  steps: Array<{
    id: string;
    endpointId: string;
    order: number;
    dependencies: string[];
    conditions: Array<{
      type: 'header' | 'response' | 'status';
      field: string;
      operator: string;
      value: any;
    }>;
    variables: Array<{
      name: string;
      source: 'response' | 'header' | 'static';
      path: string;
      target: 'header' | 'body' | 'query';
    }>;
  }>;
  frequency: number;
  lastDetected: string;
}

interface ApiDependency {
  id: string;
  fromEndpointId: string;
  toEndpointId: string;
  dependencyType: 'sequential' | 'conditional' | 'parallel' | 'data_flow';
  confidence: number;
  frequency: number;
  avgTimeBetween: number;
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
  lastSeen: string;
}

export function WorkflowMapper() {
  const [selectedWorkflow, setSelectedWorkflow] = useState<ApiWorkflow | null>(null);
  const [selectedBaseUrl, setSelectedBaseUrl] = useState<string>('');

  const { data: workflows = [], isLoading: workflowsLoading } = useQuery({
    queryKey: ['/api/workflows'],
  });

  const { data: dependencies = [], isLoading: dependenciesLoading } = useQuery({
    queryKey: ['/api/dependencies'],
  });

  const { data: workflowsByUrl = [] } = useQuery({
    queryKey: ['/api/workflows', selectedBaseUrl],
    enabled: !!selectedBaseUrl,
  });

  const { data: dependenciesByUrl = [] } = useQuery({
    queryKey: ['/api/dependencies', selectedBaseUrl],
    enabled: !!selectedBaseUrl,
  });

  const baseUrls = Array.from(new Set(workflows.map((w: ApiWorkflow) => w.baseUrl)));

  if (workflowsLoading || dependenciesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Analyzing API dependencies...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">API Workflow Mapper</h2>
          <p className="text-muted-foreground">
            Visualize API dependencies and discover multi-step workflows
          </p>
        </div>
        <Button onClick={() => window.location.reload()}>
          <Zap className="w-4 h-4 mr-2" />
          Refresh Analysis
        </Button>
      </div>

      <Tabs defaultValue="workflows" className="space-y-4">
        <TabsList>
          <TabsTrigger value="workflows">
            <GitBranch className="w-4 h-4 mr-2" />
            Workflows ({workflows.length})
          </TabsTrigger>
          <TabsTrigger value="dependencies">
            <Network className="w-4 h-4 mr-2" />
            Dependencies ({dependencies.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-lg">Detected Workflows</CardTitle>
                <CardDescription>
                  Auto-discovered API call sequences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {workflows.map((workflow: ApiWorkflow) => (
                      <Card
                        key={workflow.id}
                        className={`cursor-pointer transition-colors ${
                          selectedWorkflow?.id === workflow.id
                            ? 'ring-2 ring-primary'
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedWorkflow(workflow)}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold">{workflow.name}</h4>
                              <Badge variant="secondary">
                                {workflow.steps.length} steps
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {workflow.description}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{workflow.frequency}x detected</span>
                              <span>•</span>
                              <span>{formatLastDetected(workflow.lastDetected)}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {workflows.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                        No workflows detected yet. Browse some APIs to discover patterns.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">
                  {selectedWorkflow ? selectedWorkflow.name : 'Workflow Details'}
                </CardTitle>
                {selectedWorkflow && (
                  <CardDescription>
                    {selectedWorkflow.description} • {selectedWorkflow.baseUrl}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {selectedWorkflow ? (
                  <WorkflowDetails workflow={selectedWorkflow} />
                ) : (
                  <div className="text-center text-muted-foreground py-12">
                    Select a workflow to view its details and execution flow
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dependencies" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">API Dependencies</CardTitle>
                <CardDescription>
                  Detected relationships between API calls
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {dependencies.map((dependency: ApiDependency) => (
                      <DependencyCard key={dependency.id} dependency={dependency} />
                    ))}
                    {dependencies.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        <Network className="w-8 h-8 mx-auto mb-2" />
                        No dependencies detected yet.
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Dependency Graph</CardTitle>
                <CardDescription>
                  Visual representation of API relationships
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DependencyGraph dependencies={dependencies} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface WorkflowDetailsProps {
  workflow: ApiWorkflow;
}

function WorkflowDetails({ workflow }: WorkflowDetailsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold">{workflow.steps.length}</div>
          <div className="text-sm text-muted-foreground">Steps</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">{workflow.frequency}</div>
          <div className="text-sm text-muted-foreground">Frequency</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold">
            {Math.round((workflow.steps.filter(s => s.conditions.length > 0).length / workflow.steps.length) * 100)}%
          </div>
          <div className="text-sm text-muted-foreground">Conditional</div>
        </div>
      </div>

      <Separator />

      <div>
        <h4 className="font-semibold mb-4">Workflow Steps</h4>
        <div className="space-y-3">
          {workflow.steps
            .sort((a, b) => a.order - b.order)
            .map((step, index) => (
              <div key={step.id} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-2 py-1 rounded text-sm">
                      {step.endpointId}
                    </code>
                    {step.conditions.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        Conditional
                      </Badge>
                    )}
                  </div>
                  
                  {step.conditions.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Conditions:</strong>{' '}
                      {step.conditions.map(c => `${c.field} ${c.operator} ${c.value}`).join(', ')}
                    </div>
                  )}
                  
                  {step.variables.length > 0 && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Data Flow:</strong>{' '}
                      {step.variables.map(v => `${v.path} → ${v.target}`).join(', ')}
                    </div>
                  )}
                </div>
                {index < workflow.steps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-muted-foreground mt-2" />
                )}
              </div>
            ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm">
          <Play className="w-4 h-4 mr-2" />
          Test Workflow
        </Button>
        <Button variant="outline" size="sm">
          Export Definition
        </Button>
      </div>
    </div>
  );
}

interface DependencyCardProps {
  dependency: ApiDependency;
}

function DependencyCard({ dependency }: DependencyCardProps) {
  const getDependencyColor = (type: string) => {
    switch (type) {
      case 'sequential': return 'bg-blue-100 text-blue-800';
      case 'conditional': return 'bg-yellow-100 text-yellow-800';
      case 'parallel': return 'bg-green-100 text-green-800';
      case 'data_flow': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Badge className={getDependencyColor(dependency.dependencyType)}>
            {dependency.dependencyType.replace('_', ' ')}
          </Badge>
          <div className="text-sm text-muted-foreground">
            {dependency.confidence}% confidence
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <code className="bg-muted px-2 py-1 rounded text-xs">
              {dependency.fromEndpointId}
            </code>
            <ArrowRight className="w-4 h-4 text-muted-foreground" />
            <code className="bg-muted px-2 py-1 rounded text-xs">
              {dependency.toEndpointId}
            </code>
          </div>
        </div>

        {dependency.dataFlow.length > 0 && (
          <div className="text-sm">
            <strong>Data Flow:</strong>{' '}
            {dependency.dataFlow.map(df => 
              `${df.sourceField} → ${df.targetField}`
            ).join(', ')}
          </div>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{dependency.frequency}x seen</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {dependency.avgTimeBetween}ms avg
          </span>
        </div>
      </div>
    </Card>
  );
}

interface DependencyGraphProps {
  dependencies: ApiDependency[];
}

function DependencyGraph({ dependencies }: DependencyGraphProps) {
  if (dependencies.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <Network className="w-12 h-12 mx-auto mb-4 opacity-50" />
        No dependencies to visualize
      </div>
    );
  }

  // Create a simple node-link visualization
  const nodes = new Set<string>();
  dependencies.forEach(dep => {
    nodes.add(dep.fromEndpointId);
    nodes.add(dep.toEndpointId);
  });

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Showing {nodes.size} endpoints with {dependencies.length} dependencies
      </div>
      
      <ScrollArea className="h-[400px]">
        <div className="space-y-2">
          {Array.from(nodes).map(node => (
            <div key={node} className="p-3 border rounded-lg">
              <div className="font-mono text-sm">{node}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {dependencies.filter(d => d.fromEndpointId === node).length} outgoing •{' '}
                {dependencies.filter(d => d.toEndpointId === node).length} incoming
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function formatLastDetected(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffHours < 1) return 'just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}