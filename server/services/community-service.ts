import { 
  CommunityUser, 
  InsertCommunityUser,
  ApiDiscovery,
  InsertApiDiscovery,
  ApiPlaybook,
  InsertApiPlaybook,
  CommunityComment,
  InsertCommunityComment,
  CommunityVote,
  InsertCommunityVote,
  CommunityContribution,
  InsertCommunityContribution,
  PlaybookCompletion,
  InsertPlaybookCompletion
} from "@shared/schema";
import { storage } from "../storage";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  criteria: {
    type: 'reputation' | 'discoveries' | 'playbooks' | 'comments' | 'votes' | 'completions';
    threshold: number;
  };
}

interface PointsConfig {
  discovery_create: number;
  playbook_create: number;
  comment_create: number;
  vote_give: number;
  vote_receive_upvote: number;
  vote_receive_downvote: number;
  playbook_complete: number;
  discovery_featured: number;
  playbook_featured: number;
}

export class CommunityService {
  private static readonly BADGES: Badge[] = [
    {
      id: 'first_discovery',
      name: 'Explorer',
      description: 'Shared your first API discovery',
      icon: 'star',
      criteria: { type: 'discoveries', threshold: 1 }
    },
    {
      id: 'discovery_master',
      name: 'Discovery Master',
      description: 'Shared 10 API discoveries',
      icon: 'trophy',
      criteria: { type: 'discoveries', threshold: 10 }
    },
    {
      id: 'first_playbook',
      name: 'Guide Creator',
      description: 'Created your first API playbook',
      icon: 'award',
      criteria: { type: 'playbooks', threshold: 1 }
    },
    {
      id: 'playbook_expert',
      name: 'Playbook Expert',
      description: 'Created 5 API playbooks',
      icon: 'trophy',
      criteria: { type: 'playbooks', threshold: 5 }
    },
    {
      id: 'helpful_commenter',
      name: 'Helpful Voice',
      description: 'Posted 25 helpful comments',
      icon: 'star',
      criteria: { type: 'comments', threshold: 25 }
    },
    {
      id: 'reputation_100',
      name: 'Rising Star',
      description: 'Earned 100 reputation points',
      icon: 'star',
      criteria: { type: 'reputation', threshold: 100 }
    },
    {
      id: 'reputation_500',
      name: 'Community Leader',
      description: 'Earned 500 reputation points',
      icon: 'award',
      criteria: { type: 'reputation', threshold: 500 }
    },
    {
      id: 'reputation_1000',
      name: 'API Legend',
      description: 'Earned 1000 reputation points',
      icon: 'trophy',
      criteria: { type: 'reputation', threshold: 1000 }
    },
    {
      id: 'active_voter',
      name: 'Community Curator',
      description: 'Cast 50 votes to help curate content',
      icon: 'star',
      criteria: { type: 'votes', threshold: 50 }
    },
    {
      id: 'playbook_champion',
      name: 'Playbook Champion',
      description: 'Completed 10 community playbooks',
      icon: 'award',
      criteria: { type: 'completions', threshold: 10 }
    }
  ];

  private static readonly POINTS: PointsConfig = {
    discovery_create: 20,
    playbook_create: 30,
    comment_create: 5,
    vote_give: 1,
    vote_receive_upvote: 10,
    vote_receive_downvote: -2,
    playbook_complete: 15,
    discovery_featured: 50,
    playbook_featured: 75
  };

  static async createUser(userData: InsertCommunityUser): Promise<CommunityUser> {
    try {
      const user = await storage.createCommunityUser(userData);
      
      // Award first-time user badge
      await this.awardBadge(user.id, 'Welcome to the community!');
      
      return user;
    } catch (error) {
      console.error('Failed to create community user:', error);
      throw error;
    }
  }

  static async createDiscovery(discoveryData: InsertApiDiscovery): Promise<ApiDiscovery> {
    try {
      const discovery = await storage.createApiDiscovery(discoveryData);
      
      // Award points to the author
      await this.awardPoints(
        discoveryData.authorId,
        'discovery',
        discovery.id,
        this.POINTS.discovery_create,
        `Created API discovery: ${discovery.title}`
      );

      // Check for badge eligibility
      await this.checkBadgeEligibility(discoveryData.authorId);

      return discovery;
    } catch (error) {
      console.error('Failed to create discovery:', error);
      throw error;
    }
  }

  static async createPlaybook(playbookData: InsertApiPlaybook): Promise<ApiPlaybook> {
    try {
      const playbook = await storage.createApiPlaybook(playbookData);
      
      // Award points to the author
      await this.awardPoints(
        playbookData.authorId,
        'playbook',
        playbook.id,
        this.POINTS.playbook_create,
        `Created API playbook: ${playbook.title}`
      );

      // Check for badge eligibility
      await this.checkBadgeEligibility(playbookData.authorId);

      return playbook;
    } catch (error) {
      console.error('Failed to create playbook:', error);
      throw error;
    }
  }

  static async vote(voteData: InsertCommunityVote): Promise<void> {
    try {
      // Check if user already voted on this target
      const existingVote = await storage.getUserVote(voteData.userId, voteData.targetType, voteData.targetId);
      
      if (existingVote) {
        // Update existing vote
        if (existingVote.voteType !== voteData.voteType) {
          await storage.updateVote(existingVote.id, voteData.voteType);
          
          // Update vote counts
          await this.updateVoteCounts(voteData.targetType, voteData.targetId);
          
          // Award/remove points for the content author
          await this.handleVotePointsChange(voteData, existingVote.voteType);
        }
      } else {
        // Create new vote
        await storage.createVote(voteData);
        
        // Update vote counts
        await this.updateVoteCounts(voteData.targetType, voteData.targetId);
        
        // Award points to voter
        await this.awardPoints(
          voteData.userId,
          'vote',
          voteData.targetId,
          this.POINTS.vote_give,
          `Voted on ${voteData.targetType}`
        );

        // Award/remove points for the content author
        await this.handleVotePoints(voteData);
      }

      // Check badge eligibility for voter
      await this.checkBadgeEligibility(voteData.userId);

    } catch (error) {
      console.error('Failed to process vote:', error);
      throw error;
    }
  }

  static async completePlaybook(completionData: InsertPlaybookCompletion): Promise<PlaybookCompletion> {
    try {
      const completion = await storage.createPlaybookCompletion(completionData);
      
      // Award points for completion
      await this.awardPoints(
        completionData.userId,
        'completion',
        completionData.playbookId,
        this.POINTS.playbook_complete,
        `Completed playbook`
      );

      // Increment completion count on playbook
      await storage.incrementPlaybookCompletions(completionData.playbookId);

      // Check badge eligibility
      await this.checkBadgeEligibility(completionData.userId);

      return completion;
    } catch (error) {
      console.error('Failed to complete playbook:', error);
      throw error;
    }
  }

  static async createComment(commentData: InsertCommunityComment): Promise<CommunityComment> {
    try {
      const comment = await storage.createComment(commentData);
      
      // Award points for commenting
      await this.awardPoints(
        commentData.authorId,
        'comment',
        comment.id,
        this.POINTS.comment_create,
        `Posted comment`
      );

      // Check badge eligibility
      await this.checkBadgeEligibility(commentData.authorId);

      return comment;
    } catch (error) {
      console.error('Failed to create comment:', error);
      throw error;
    }
  }

  static async getLeaderboard(limit: number = 20): Promise<CommunityUser[]> {
    try {
      return await storage.getTopUsersByReputation(limit);
    } catch (error) {
      console.error('Failed to get leaderboard:', error);
      throw error;
    }
  }

  static async getUserStats(userId: string): Promise<{
    discoveries: number;
    playbooks: number;
    comments: number;
    votes: number;
    completions: number;
    rank: number;
  }> {
    try {
      const [discoveries, playbooks, comments, votes, completions, rank] = await Promise.all([
        storage.getUserDiscoveryCount(userId),
        storage.getUserPlaybookCount(userId),
        storage.getUserCommentCount(userId),
        storage.getUserVoteCount(userId),
        storage.getUserCompletionCount(userId),
        storage.getUserRank(userId)
      ]);

      return {
        discoveries,
        playbooks,
        comments,
        votes,
        completions,
        rank
      };
    } catch (error) {
      console.error('Failed to get user stats:', error);
      throw error;
    }
  }

  private static async awardPoints(
    userId: string,
    type: string,
    targetId: string,
    points: number,
    description: string
  ): Promise<void> {
    try {
      // Create contribution record
      const contribution: InsertCommunityContribution = {
        userId,
        type,
        targetId,
        points,
        description
      };

      await storage.createContribution(contribution);

      // Update user reputation
      await storage.updateUserReputation(userId, points);

    } catch (error) {
      console.error('Failed to award points:', error);
    }
  }

  private static async handleVotePoints(voteData: InsertCommunityVote): Promise<void> {
    try {
      // Get the content author
      const contentAuthor = await this.getContentAuthor(voteData.targetType, voteData.targetId);
      
      if (contentAuthor && contentAuthor !== voteData.userId) {
        const points = voteData.voteType === 'upvote' 
          ? this.POINTS.vote_receive_upvote 
          : this.POINTS.vote_receive_downvote;

        await this.awardPoints(
          contentAuthor,
          'vote_received',
          voteData.targetId,
          points,
          `Received ${voteData.voteType} on ${voteData.targetType}`
        );

        // Check badge eligibility for content author
        await this.checkBadgeEligibility(contentAuthor);
      }
    } catch (error) {
      console.error('Failed to handle vote points:', error);
    }
  }

  private static async handleVotePointsChange(
    newVote: InsertCommunityVote,
    oldVoteType: string
  ): Promise<void> {
    try {
      const contentAuthor = await this.getContentAuthor(newVote.targetType, newVote.targetId);
      
      if (contentAuthor && contentAuthor !== newVote.userId) {
        // Remove old vote points
        const oldPoints = oldVoteType === 'upvote' 
          ? -this.POINTS.vote_receive_upvote 
          : -this.POINTS.vote_receive_downvote;

        // Add new vote points
        const newPoints = newVote.voteType === 'upvote' 
          ? this.POINTS.vote_receive_upvote 
          : this.POINTS.vote_receive_downvote;

        const totalPoints = oldPoints + newPoints;

        await this.awardPoints(
          contentAuthor,
          'vote_changed',
          newVote.targetId,
          totalPoints,
          `Vote changed from ${oldVoteType} to ${newVote.voteType}`
        );

        await this.checkBadgeEligibility(contentAuthor);
      }
    } catch (error) {
      console.error('Failed to handle vote points change:', error);
    }
  }

  private static async getContentAuthor(targetType: string, targetId: string): Promise<string | null> {
    try {
      switch (targetType) {
        case 'discovery':
          const discovery = await storage.getApiDiscoveryById(targetId);
          return discovery?.authorId || null;
        case 'playbook':
          const playbook = await storage.getApiPlaybookById(targetId);
          return playbook?.authorId || null;
        case 'comment':
          const comment = await storage.getCommentById(targetId);
          return comment?.authorId || null;
        default:
          return null;
      }
    } catch (error) {
      console.error('Failed to get content author:', error);
      return null;
    }
  }

  private static async updateVoteCounts(targetType: string, targetId: string): Promise<void> {
    try {
      const voteCounts = await storage.getVoteCounts(targetType, targetId);
      
      switch (targetType) {
        case 'discovery':
          await storage.updateDiscoveryVotes(targetId, voteCounts.upvotes, voteCounts.downvotes);
          break;
        case 'playbook':
          await storage.updatePlaybookVotes(targetId, voteCounts.upvotes, voteCounts.downvotes);
          break;
        case 'comment':
          await storage.updateCommentVotes(targetId, voteCounts.upvotes, voteCounts.downvotes);
          break;
      }
    } catch (error) {
      console.error('Failed to update vote counts:', error);
    }
  }

  private static async checkBadgeEligibility(userId: string): Promise<void> {
    try {
      const user = await storage.getCommunityUserById(userId);
      if (!user) return;

      const stats = await this.getUserStats(userId);
      const currentBadgeIds = user.badges.map(b => b.id);

      for (const badge of this.BADGES) {
        if (currentBadgeIds.includes(badge.id)) continue;

        let qualifies = false;
        
        switch (badge.criteria.type) {
          case 'reputation':
            qualifies = user.reputation >= badge.criteria.threshold;
            break;
          case 'discoveries':
            qualifies = stats.discoveries >= badge.criteria.threshold;
            break;
          case 'playbooks':
            qualifies = stats.playbooks >= badge.criteria.threshold;
            break;
          case 'comments':
            qualifies = stats.comments >= badge.criteria.threshold;
            break;
          case 'votes':
            qualifies = stats.votes >= badge.criteria.threshold;
            break;
          case 'completions':
            qualifies = stats.completions >= badge.criteria.threshold;
            break;
        }

        if (qualifies) {
          await this.awardBadge(userId, badge.description, badge);
        }
      }
    } catch (error) {
      console.error('Failed to check badge eligibility:', error);
    }
  }

  private static async awardBadge(
    userId: string, 
    reason: string, 
    badge?: Badge
  ): Promise<void> {
    try {
      if (badge) {
        const badgeData = {
          id: badge.id,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          earnedAt: new Date().toISOString()
        };

        await storage.addUserBadge(userId, badgeData);

        // Award bonus points for earning badge
        await this.awardPoints(
          userId,
          'badge',
          badge.id,
          25,
          `Earned badge: ${badge.name}`
        );
      }
    } catch (error) {
      console.error('Failed to award badge:', error);
    }
  }

  static async featureContent(
    contentType: 'discovery' | 'playbook',
    contentId: string,
    featured: boolean
  ): Promise<void> {
    try {
      let authorId: string | null = null;
      let points = 0;

      if (contentType === 'discovery') {
        await storage.updateDiscoveryFeatured(contentId, featured);
        const discovery = await storage.getApiDiscoveryById(contentId);
        authorId = discovery?.authorId || null;
        points = this.POINTS.discovery_featured;
      } else {
        await storage.updatePlaybookFeatured(contentId, featured);
        const playbook = await storage.getApiPlaybookById(contentId);
        authorId = playbook?.authorId || null;
        points = this.POINTS.playbook_featured;
      }

      if (authorId && featured) {
        await this.awardPoints(
          authorId,
          'featured',
          contentId,
          points,
          `${contentType} was featured by moderators`
        );

        await this.checkBadgeEligibility(authorId);
      }
    } catch (error) {
      console.error('Failed to feature content:', error);
      throw error;
    }
  }

  static getBadges(): Badge[] {
    return this.BADGES;
  }

  static getPointsConfig(): PointsConfig {
    return this.POINTS;
  }
}