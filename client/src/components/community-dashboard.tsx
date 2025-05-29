import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Users, 
  Award, 
  ThumbsUp, 
  ThumbsDown, 
  MessageCircle, 
  Star,
  Trophy,
  Bookmark,
  Share2,
  Eye,
  Clock,
  CheckCircle2,
  Play,
  Book,
  Code,
  Zap,
  Shield,
  Lightbulb
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

// Helper functions for icons and colors
const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'authentication': return <Shield className="w-4 h-4" />;
    case 'data-processing': return <Code className="w-4 h-4" />;
    case 'integration': return <Zap className="w-4 h-4" />;
    case 'utility': return <Lightbulb className="w-4 h-4" />;
    default: return <Book className="w-4 h-4" />;
  }
};

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'beginner': return 'bg-green-100 text-green-800';
    case 'intermediate': return 'bg-yellow-100 text-yellow-800';
    case 'advanced': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

interface CommunityUser {
  id: string;
  username: string;
  displayName: string;
  avatar?: string;
  bio?: string;
  reputation: number;
  badges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: string;
  }>;
  joinedAt: string;
}

interface ApiDiscovery {
  id: string;
  title: string;
  description: string;
  author: CommunityUser;
  baseUrl: string;
  endpoints: Array<{
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
  }>;
  tags: string[];
  category: string;
  difficulty: string;
  upvotes: number;
  downvotes: number;
  views: number;
  featured: boolean;
  verified: boolean;
  createdAt: string;
}

interface ApiPlaybook {
  id: string;
  title: string;
  description: string;
  author: CommunityUser;
  steps: Array<{
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
  }>;
  prerequisites: Array<{
    type: string;
    description: string;
    required: boolean;
  }>;
  tags: string[];
  category: string;
  difficulty: string;
  estimatedTime?: number;
  upvotes: number;
  downvotes: number;
  completions: number;
  featured: boolean;
  verified: boolean;
  createdAt: string;
}

interface CommunityComment {
  id: string;
  content: string;
  author: CommunityUser;
  upvotes: number;
  downvotes: number;
  createdAt: string;
  replies?: CommunityComment[];
}

export function CommunityDashboard() {
  const [activeTab, setActiveTab] = useState('discoveries');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ApiDiscovery | ApiPlaybook | null>(null);

  const queryClient = useQueryClient();

  const { data: discoveries = [], isLoading: discoveriesLoading } = useQuery({
    queryKey: ['/api/community/discoveries', selectedCategory, sortBy, searchQuery],
  });

  const { data: playbooks = [], isLoading: playbooksLoading } = useQuery({
    queryKey: ['/api/community/playbooks', selectedCategory, sortBy, searchQuery],
  });

  const { data: leaderboard = [], isLoading: leaderboardLoading } = useQuery({
    queryKey: ['/api/community/leaderboard'],
  });

  const { data: currentUser } = useQuery({
    queryKey: ['/api/community/profile'],
  });

  const voteMutation = useMutation({
    mutationFn: ({ targetType, targetId, voteType }: { targetType: string; targetId: string; voteType: string }) =>
      apiRequest(`/api/community/vote`, {
        method: 'POST',
        body: { targetType, targetId, voteType },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community'] });
    },
  });

  const handleVote = (targetType: string, targetId: string, voteType: 'upvote' | 'downvote') => {
    voteMutation.mutate({ targetType, targetId, voteType });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'authentication': return <Shield className="w-4 h-4" />;
      case 'data-processing': return <Code className="w-4 h-4" />;
      case 'integration': return <Zap className="w-4 h-4" />;
      case 'utility': return <Lightbulb className="w-4 h-4" />;
      default: return <Book className="w-4 h-4" />;
    }
  };

  const getBadgeIcon = (badgeIcon: string) => {
    switch (badgeIcon) {
      case 'trophy': return <Trophy className="w-4 h-4" />;
      case 'star': return <Star className="w-4 h-4" />;
      case 'award': return <Award className="w-4 h-4" />;
      default: return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Community Knowledge Base</h2>
          <p className="text-muted-foreground">
            Share discoveries, learn from others, and build together
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Share2 className="w-4 h-4 mr-2" />
                Share Discovery
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Share Your API Discovery</DialogTitle>
                <DialogDescription>
                  Help the community by sharing an interesting API or workflow you've discovered
                </DialogDescription>
              </DialogHeader>
              <CreateDiscoveryForm onClose={() => setShowCreateDialog(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* User Stats */}
      {currentUser && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">{currentUser.displayName}</h3>
                  <p className="text-sm text-muted-foreground">@{currentUser.username}</p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{currentUser.reputation}</p>
                  <p className="text-sm text-muted-foreground">Reputation</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{currentUser.badges?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Badges</p>
                </div>
              </div>
            </div>
            {currentUser.badges && currentUser.badges.length > 0 && (
              <div className="mt-4 flex items-center gap-2">
                {currentUser.badges.slice(0, 5).map((badge) => (
                  <Badge key={badge.id} variant="outline" className="flex items-center gap-1">
                    {getBadgeIcon(badge.icon)}
                    {badge.name}
                  </Badge>
                ))}
                {currentUser.badges.length > 5 && (
                  <Badge variant="outline">+{currentUser.badges.length - 5} more</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <Input
          placeholder="Search discoveries and playbooks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="authentication">Authentication</SelectItem>
            <SelectItem value="data-processing">Data Processing</SelectItem>
            <SelectItem value="integration">Integration</SelectItem>
            <SelectItem value="utility">Utility</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="upvotes">Most Upvoted</SelectItem>
            <SelectItem value="completions">Most Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="discoveries">
            <Book className="w-4 h-4 mr-2" />
            API Discoveries ({discoveries.length})
          </TabsTrigger>
          <TabsTrigger value="playbooks">
            <Play className="w-4 h-4 mr-2" />
            Playbooks ({playbooks.length})
          </TabsTrigger>
          <TabsTrigger value="leaderboard">
            <Trophy className="w-4 h-4 mr-2" />
            Leaderboard
          </TabsTrigger>
        </TabsList>

        <TabsContent value="discoveries" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {discoveriesLoading ? (
                <div className="text-center py-8">Loading discoveries...</div>
              ) : discoveries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No discoveries found. Be the first to share!
                </div>
              ) : (
                discoveries.map((discovery: ApiDiscovery) => (
                  <DiscoveryCard
                    key={discovery.id}
                    discovery={discovery}
                    onVote={handleVote}
                    onClick={() => setSelectedItem(discovery)}
                    isSelected={selectedItem?.id === discovery.id}
                  />
                ))
              )}
            </div>
            <div>
              {selectedItem && 'endpoints' in selectedItem ? (
                <DiscoveryDetails discovery={selectedItem as ApiDiscovery} />
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  Select a discovery to view details
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="playbooks" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              {playbooksLoading ? (
                <div className="text-center py-8">Loading playbooks...</div>
              ) : playbooks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No playbooks found. Create one to get started!
                </div>
              ) : (
                playbooks.map((playbook: ApiPlaybook) => (
                  <PlaybookCard
                    key={playbook.id}
                    playbook={playbook}
                    onVote={handleVote}
                    onClick={() => setSelectedItem(playbook)}
                    isSelected={selectedItem?.id === playbook.id}
                  />
                ))
              )}
            </div>
            <div>
              {selectedItem && 'steps' in selectedItem ? (
                <PlaybookDetails playbook={selectedItem as ApiPlaybook} />
              ) : (
                <div className="text-center text-muted-foreground py-12">
                  Select a playbook to view details
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="leaderboard" className="space-y-4">
          <LeaderboardView leaderboard={leaderboard} isLoading={leaderboardLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface DiscoveryCardProps {
  discovery: ApiDiscovery;
  onVote: (targetType: string, targetId: string, voteType: 'upvote' | 'downvote') => void;
  onClick: () => void;
  isSelected: boolean;
}

function DiscoveryCard({ discovery, onVote, onClick, isSelected }: DiscoveryCardProps) {
  return (
    <Card 
      className={`cursor-pointer transition-colors ${isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{discovery.title}</CardTitle>
              {discovery.featured && <Star className="w-4 h-4 text-yellow-500" />}
              {discovery.verified && <CheckCircle2 className="w-4 h-4 text-green-500" />}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>by {discovery.author.displayName}</span>
              <span>•</span>
              <Eye className="w-3 h-3" />
              <span>{discovery.views} views</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getCategoryIcon(discovery.category)}
            <Badge className={getDifficultyColor(discovery.difficulty)}>
              {discovery.difficulty}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {discovery.description}
        </p>
        
        <div className="flex items-center gap-2 flex-wrap">
          {discovery.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {discovery.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{discovery.tags.length - 3} more
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{discovery.endpoints.length} endpoints</span>
            <span>•</span>
            <span>{new Date(discovery.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onVote('discovery', discovery.id, 'upvote');
              }}
              className="px-2"
            >
              <ThumbsUp className="w-3 h-3 mr-1" />
              {discovery.upvotes}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onVote('discovery', discovery.id, 'downvote');
              }}
              className="px-2"
            >
              <ThumbsDown className="w-3 h-3 mr-1" />
              {discovery.downvotes}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface PlaybookCardProps {
  playbook: ApiPlaybook;
  onVote: (targetType: string, targetId: string, voteType: 'upvote' | 'downvote') => void;
  onClick: () => void;
  isSelected: boolean;
}

function PlaybookCard({ playbook, onVote, onClick, isSelected }: PlaybookCardProps) {
  return (
    <Card 
      className={`cursor-pointer transition-colors ${isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted/50'}`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{playbook.title}</CardTitle>
              {playbook.featured && <Star className="w-4 h-4 text-yellow-500" />}
              {playbook.verified && <CheckCircle2 className="w-4 h-4 text-green-500" />}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>by {playbook.author.displayName}</span>
              <span>•</span>
              <Play className="w-3 h-3" />
              <span>{playbook.completions} completions</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getCategoryIcon(playbook.category)}
            <Badge className={getDifficultyColor(playbook.difficulty)}>
              {playbook.difficulty}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {playbook.description}
        </p>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{playbook.estimatedTime || 30} min</span>
          </div>
          <span>•</span>
          <span>{playbook.steps.length} steps</span>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          {playbook.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {playbook.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{playbook.tags.length - 3} more
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {new Date(playbook.createdAt).toLocaleDateString()}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onVote('playbook', playbook.id, 'upvote');
              }}
              className="px-2"
            >
              <ThumbsUp className="w-3 h-3 mr-1" />
              {playbook.upvotes}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onVote('playbook', playbook.id, 'downvote');
              }}
              className="px-2"
            >
              <ThumbsDown className="w-3 h-3 mr-1" />
              {playbook.downvotes}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DiscoveryDetails({ discovery }: { discovery: ApiDiscovery }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{discovery.title}</CardTitle>
        <CardDescription>{discovery.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold mb-2">Base URL</h4>
              <code className="bg-muted p-2 rounded block text-sm">
                {discovery.baseUrl}
              </code>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Endpoints ({discovery.endpoints.length})</h4>
              <div className="space-y-4">
                {discovery.endpoints.map((endpoint, index) => (
                  <Card key={index} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{endpoint.method}</Badge>
                          <code className="text-sm">{endpoint.path}</code>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {endpoint.description}
                        </p>
                        {endpoint.parameters.length > 0 && (
                          <div>
                            <h5 className="text-sm font-medium mb-1">Parameters:</h5>
                            <ul className="text-xs space-y-1">
                              {endpoint.parameters.map((param, paramIndex) => (
                                <li key={paramIndex} className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {param.type}
                                  </Badge>
                                  <code>{param.name}</code>
                                  {param.required && <span className="text-red-500">*</span>}
                                  {param.description && (
                                    <span className="text-muted-foreground">- {param.description}</span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function PlaybookDetails({ playbook }: { playbook: ApiPlaybook }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{playbook.title}</CardTitle>
        <CardDescription>{playbook.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-6">
            {playbook.prerequisites.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Prerequisites</h4>
                <ul className="space-y-1">
                  {playbook.prerequisites.map((prereq, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                      {prereq.description}
                      {prereq.required && <span className="text-red-500">*</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h4 className="font-semibold mb-3">Steps ({playbook.steps.length})</h4>
              <div className="space-y-4">
                {playbook.steps.map((step, index) => (
                  <Card key={step.id} className="border-l-4 border-l-green-500">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{index + 1}</Badge>
                          <h5 className="font-medium">{step.title}</h5>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {step.description}
                        </p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{step.endpoint.method}</Badge>
                            <code className="text-sm bg-muted p-1 rounded">
                              {step.endpoint.url}
                            </code>
                          </div>
                          {step.endpoint.headers && Object.keys(step.endpoint.headers).length > 0 && (
                            <div>
                              <span className="text-xs font-medium">Headers:</span>
                              <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                                {JSON.stringify(step.endpoint.headers, null, 2)}
                              </pre>
                            </div>
                          )}
                          {step.endpoint.body && (
                            <div>
                              <span className="text-xs font-medium">Body:</span>
                              <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto">
                                {JSON.stringify(step.endpoint.body, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                        {step.notes && (
                          <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded">
                            💡 {step.notes}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function LeaderboardView({ leaderboard, isLoading }: { leaderboard: CommunityUser[]; isLoading: boolean }) {
  if (isLoading) {
    return <div className="text-center py-8">Loading leaderboard...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {leaderboard.map((user, index) => (
        <Card key={user.id} className={index < 3 ? 'ring-2 ring-yellow-200' : ''}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                {index < 3 && (
                  <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{index + 1}</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{user.displayName}</h3>
                <p className="text-sm text-muted-foreground">@{user.username}</p>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-yellow-500" />
                    <span className="text-sm font-medium">{user.reputation}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Award className="w-3 h-3 text-blue-500" />
                    <span className="text-sm">{user.badges.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CreateDiscoveryForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    baseUrl: '',
    category: '',
    difficulty: '',
    tags: '',
  });

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest('/api/community/discoveries', {
        method: 'POST',
        body: data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/community/discoveries'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      endpoints: [], // Would be populated from API analysis
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Title</label>
        <Input
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Give your discovery a catchy title"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe what makes this API interesting or useful"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Base URL</label>
        <Input
          value={formData.baseUrl}
          onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
          placeholder="https://api.example.com"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Category</label>
          <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="authentication">Authentication</SelectItem>
              <SelectItem value="data-processing">Data Processing</SelectItem>
              <SelectItem value="integration">Integration</SelectItem>
              <SelectItem value="utility">Utility</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium">Difficulty</label>
          <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Select difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Beginner</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <label className="text-sm font-medium">Tags</label>
        <Input
          value={formData.tags}
          onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          placeholder="rest, json, authentication (comma-separated)"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? 'Creating...' : 'Share Discovery'}
        </Button>
      </div>
    </form>
  );
}