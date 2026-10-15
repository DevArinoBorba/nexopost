import { Platform, Profile } from './types';

export const PLATFORMS: Platform[] = [
  { id: 'tiktok', name: 'TikTok', icon: 'music', color: '#ff0050', connected: false },
  { id: 'instagram', name: 'Instagram', icon: 'camera', color: '#e4405f', connected: false },
  { id: 'youtube', name: 'YouTube', icon: 'play', color: '#ff0000', connected: false },
  { id: 'facebook', name: 'Facebook', icon: 'thumbs-up', color: '#1877f2', connected: false },
  { id: 'linkedin', name: 'LinkedIn', icon: 'briefcase', color: '#0a66c2', connected: false },
  { id: 'x', name: 'X (Twitter)', icon: 'message-circle', color: '#1da1f2', connected: false },
  { id: 'threads', name: 'Threads', icon: 'at-sign', color: '#000000', connected: false },
  { id: 'pinterest', name: 'Pinterest', icon: 'map-pin', color: '#e60023', connected: false },
  { id: 'reddit', name: 'Reddit', icon: 'bell', color: '#ff4500', connected: false },
  { id: 'bluesky', name: 'Bluesky', icon: 'cloud', color: '#0085ff', connected: false },
  { id: 'discord', name: 'Discord', icon: 'headphones', color: '#5865f2', connected: false },
  { id: 'telegram', name: 'Telegram', icon: 'send', color: '#229ed9', connected: false },
  { id: 'google_business', name: 'Google Business', icon: 'map', color: '#4285f4', connected: false },
  { id: 'mastodon', name: 'Mastodon', icon: 'globe', color: '#6364ff', connected: false },
  { id: 'wordpress', name: 'WordPress', icon: 'file-text', color: '#21759b', connected: false },
  { id: 'whop', name: 'Whop', icon: 'shopping-bag', color: '#ff6243', connected: false },
  { id: 'listmonk', name: 'Listmonk', icon: 'mail', color: '#00a98f', connected: false },
  { id: 'hashnode', name: 'Hashnode', icon: 'hash', color: '#2962ff', connected: false },
  { id: 'devto', name: 'Dev.to', icon: 'code', color: '#0a0a0a', connected: false },
  { id: 'nostr', name: 'Nostr', icon: 'zap', color: '#bf5af2', connected: false },
  { id: 'lemmy', name: 'Lemmy', icon: 'box', color: '#ffd700', connected: false },
];

export const PLATFORM_LIMITS = {
  tiktok: { maxFileSize: '4GB', maxDuration: '10min', supportedFormats: ['mp4', 'mov', 'webm'] },
  instagram: { maxFileSize: '100MB', maxDuration: '90s (Reels)', supportedFormats: ['mp4', 'mov'] },
  youtube: { maxFileSize: '256GB', maxDuration: '12h', supportedFormats: ['mp4', 'mov', 'avi', 'mkv'] },
  facebook: { maxFileSize: '4GB', maxDuration: '4h', supportedFormats: ['mp4', 'mov', 'avi'] },
  linkedin: { maxFileSize: '5GB', maxDuration: '15min', supportedFormats: ['mp4', 'mov'] },
  x: { maxFileSize: '512MB', maxDuration: '140s', supportedFormats: ['mp4', 'mov'] },
  threads: { maxFileSize: '500MB', maxDuration: '10min', supportedFormats: ['mp4', 'mov'] },
  pinterest: { maxFileSize: '2GB', maxDuration: '30min', supportedFormats: ['mp4', 'mov'] },
  reddit: { maxFileSize: '20GB', maxDuration: '15min', supportedFormats: ['mp4', 'mov', 'webm'] },
  bluesky: { maxFileSize: '300MB', maxDuration: '10min', supportedFormats: ['mp4', 'mpeg', 'webm', 'mov'] },
  discord: { maxFileSize: '500MB', maxDuration: '8min', supportedFormats: ['mp4', 'mov', 'webm'] },
  telegram: { maxFileSize: '2GB', maxDuration: '60min', supportedFormats: ['mp4', 'mov', 'avi'] },
  google_business: { maxFileSize: '75MB', maxDuration: '30s', supportedFormats: ['mp4', 'mov'] },
  mastodon: { maxFileSize: '40MB', maxDuration: '300s', supportedFormats: ['mp4', 'webm', 'mov'] },
  wordpress: { maxFileSize: '100MB', maxDuration: '120s', supportedFormats: ['mp4', 'mov', 'avi'] },
};

export const MOCK_PROFILE: Profile = {
  id: '1',
  name: 'John Doe',
  username: 'johndoe',
  email: 'john@example.com',
  plan: 'professional',
  apiKey: 'up_sk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop',
};

export const MOCK_SOCIAL_ACCOUNTS = [
  { id: '1', platform: 'tiktok', username: '@johndoe', connected: true, connectedAt: '2024-01-15', capabilities: ['publish', 'analytics', 'comments'] },
  { id: '2', platform: 'instagram', username: '@johndoe', connected: true, connectedAt: '2024-01-10', capabilities: ['publish', 'analytics', 'stories', 'reels'] },
  { id: '3', platform: 'youtube', username: 'John Doe Channel', connected: true, connectedAt: '2024-01-05', capabilities: ['publish', 'analytics'] },
  { id: '4', platform: 'facebook', username: 'John Doe Page', connected: true, connectedAt: '2024-01-20', capabilities: ['publish', 'analytics'] },
  { id: '5', platform: 'linkedin', username: 'John Doe', connected: false, connectedAt: '', capabilities: [] },
  { id: '6', platform: 'x', username: '@johndoe', connected: true, connectedAt: '2024-02-01', capabilities: ['publish', 'analytics'] },
];

export const MOCK_POSTS = [
  { id: '1', title: 'Morning Routine 2024', description: 'My daily morning routine', platform: ['tiktok', 'instagram', 'youtube'], status: 'published', publishedDate: '2024-03-15T10:30:00Z', views: 15420, likes: 2340, comments: 89, shares: 156 },
  { id: '2', title: 'Product Launch Announcement', description: 'Exciting news!', platform: ['facebook', 'linkedin', 'x'], status: 'scheduled', scheduledDate: '2024-03-20T14:00:00Z', views: 0, likes: 0, comments: 0, shares: 0 },
  { id: '3', title: 'Behind the Scenes', description: 'How we make our videos', platform: ['tiktok', 'instagram'], status: 'published', publishedDate: '2024-03-10T08:00:00Z', views: 8932, likes: 1203, comments: 45, shares: 78 },
  { id: '4', title: 'Weekly Q&A', description: 'Answering your questions', platform: ['youtube', 'facebook'], status: 'draft', views: 0, likes: 0, comments: 0, shares: 0 },
];

export const MOCK_ANALYTICS = [
  { date: '2024-03-01', views: 1240, likes: 340, comments: 45, shares: 23, followers: 12450 },
  { date: '2024-03-02', views: 1890, likes: 420, comments: 67, shares: 34, followers: 12480 },
  { date: '2024-03-03', views: 2100, likes: 510, comments: 78, shares: 45, followers: 12520 },
  { date: '2024-03-04', views: 1560, likes: 380, comments: 56, shares: 28, followers: 12550 },
  { date: '2024-03-05', views: 2340, likes: 580, comments: 89, shares: 56, followers: 12600 },
  { date: '2024-03-06', views: 2780, likes: 690, comments: 102, shares: 67, followers: 12650 },
  { date: '2024-03-07', views: 3120, likes: 780, comments: 115, shares: 78, followers: 12720 },
  { date: '2024-03-08', views: 2890, likes: 720, comments: 98, shares: 65, followers: 12780 },
  { date: '2024-03-09', views: 3450, likes: 860, comments: 124, shares: 89, followers: 12850 },
  { date: '2024-03-10', views: 4120, likes: 1020, comments: 156, shares: 102, followers: 12940 },
  { date: '2024-03-11', views: 3890, likes: 970, comments: 143, shares: 94, followers: 13020 },
  { date: '2024-03-12', views: 4560, likes: 1140, comments: 167, shares: 112, followers: 13110 },
  { date: '2024-03-13', views: 5230, likes: 1310, comments: 189, shares: 134, followers: 13220 },
  { date: '2024-03-14', views: 4890, likes: 1220, comments: 178, shares: 123, followers: 13310 },
  { date: '2024-03-15', views: 5670, likes: 1420, comments: 205, shares: 145, followers: 13420 },
];

export const MOCK_AUDIENCE = {
  countries: [
    { country: 'US', percentage: 0.35 },
    { country: 'UK', percentage: 0.18 },
    { country: 'ES', percentage: 0.12 },
    { country: 'MX', percentage: 0.10 },
    { country: 'BR', percentage: 0.08 },
  ],
  cities: [
    { city: 'New York', percentage: 0.08 },
    { city: 'London', percentage: 0.06 },
    { city: 'Los Angeles', percentage: 0.05 },
    { city: 'Madrid', percentage: 0.04 },
    { city: 'Mexico City', percentage: 0.03 },
  ],
  ages: [
    { age: '18-24', percentage: 0.32 },
    { age: '25-34', percentage: 0.41 },
    { age: '35-44', percentage: 0.18 },
    { age: '45-54', percentage: 0.06 },
    { age: '55+', percentage: 0.03 },
  ],
  genders: [
    { gender: 'female', percentage: 0.58 },
    { gender: 'male', percentage: 0.40 },
    { gender: 'other', percentage: 0.02 },
  ],
  activityByHour: [
    { hour: '0', followersOnline: 120 },
    { hour: '1', followersOnline: 80 },
    { hour: '2', followersOnline: 50 },
    { hour: '3', followersOnline: 30 },
    { hour: '4', followersOnline: 25 },
    { hour: '5', followersOnline: 40 },
    { hour: '6', followersOnline: 120 },
    { hour: '7', followersOnline: 350 },
    { hour: '8', followersOnline: 680 },
    { hour: '9', followersOnline: 890 },
    { hour: '10', followersOnline: 1020 },
    { hour: '11', followersOnline: 1150 },
    { hour: '12', followersOnline: 1280 },
    { hour: '13', followersOnline: 1190 },
    { hour: '14', followersOnline: 1050 },
    { hour: '15', followersOnline: 980 },
    { hour: '16', followersOnline: 890 },
    { hour: '17', followersOnline: 920 },
    { hour: '18', followersOnline: 1150 },
    { hour: '19', followersOnline: 1380 },
    { hour: '20', followersOnline: 1420 },
    { hour: '21', followersOnline: 1290 },
    { hour: '22', followersOnline: 890 },
    { hour: '23', followersOnline: 540 },
  ],
};

export const MOCK_QUEUE = [
  { id: '1', scheduledTime: '2024-03-18T09:00:00Z', posts: [], maxPosts: 3, filledPosts: 1 },
  { id: '2', scheduledTime: '2024-03-18T12:00:00Z', posts: [], maxPosts: 3, filledPosts: 2 },
  { id: '3', scheduledTime: '2024-03-18T15:00:00Z', posts: [], maxPosts: 3, filledPosts: 0 },
  { id: '4', scheduledTime: '2024-03-18T18:00:00Z', posts: [], maxPosts: 3, filledPosts: 1 },
  { id: '5', scheduledTime: '2024-03-18T21:00:00Z', posts: [], maxPosts: 3, filledPosts: 0 },
];

export const PLANS = [
  { id: 'free', name: 'Free', price: 0, features: ['3 social accounts', '10 posts/month', 'Basic analytics'] },
  { id: 'professional', name: 'Professional', price: 15, features: ['10 social accounts', '100 posts/month', 'Advanced analytics', 'AI Shorts (10 analyses)'] },
  { id: 'advanced', name: 'Advanced', price: 29, features: ['25 social accounts', '500 posts/month', 'Advanced analytics', 'AI Shorts (300 analyses)', 'AutoDM'] },
  { id: 'business', name: 'Business', price: 79, features: ['Unlimited accounts', 'Unlimited posts', 'Full analytics suite', 'AI Shorts (1000 analyses)', 'AutoDM', 'Priority support'] },
];
