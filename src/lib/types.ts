// Platform types
export interface Platform {
  id: string;
  name: string;
  icon: string;
  color: string;
  connected: boolean;
  username?: string;
  capabilities?: string[];
}

export interface SocialAccount {
  id: string;
  platform: string;
  username: string;
  connected: boolean;
  connectedAt: string;
  profileImage?: string;
  capabilities?: string[];
  expiresAt?: string;
}

export interface Post {
  id: string;
  title: string;
  description?: string;
  platform: string[];
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  scheduledDate?: string;
  publishedDate?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
}

export interface ScheduledPost extends Post {
  scheduledDate: string;
  timezone?: string;
}

export interface Analytics {
  date: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  followers: number;
}

export interface AudienceInsight {
  country: string;
  percentage: number;
}

export interface AudienceData {
  countries: AudienceInsight[];
  cities: AudienceInsight[];
  ages: { age: string; percentage: number }[];
  genders: { gender: string; percentage: number }[];
  activityByHour: { hour: string; followersOnline: number }[];
}

export interface AutoDMMonitor {
  id: string;
  postUrl: string;
  replyMessage: string;
  profileUsername: string;
  status: 'running' | 'paused' | 'stopped' | 'expired';
  totalComments: number;
  newComments: number;
  successfulReplies: number;
  failedReplies: number;
  createdAt: string;
  lastCheck: string;
}

export interface AIAnalysisResult {
  platform: string;
  title?: string;
  description?: string;
  caption?: string;
  hashtags?: string[];
}

export interface QueueSlot {
  id: string;
  scheduledTime: string;
  posts: Post[];
  maxPosts: number;
  filledPosts: number;
}

export interface Profile {
  id: string;
  name: string;
  username: string;
  email: string;
  plan: 'free' | 'professional' | 'advanced' | 'business';
  apiKey: string;
  avatar?: string;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: string;
  read: boolean;
}

export interface UploadJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  platform: string[];
  postId?: string;
  error?: string;
  createdAt: string;
}
