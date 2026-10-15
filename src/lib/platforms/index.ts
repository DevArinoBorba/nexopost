import type { SocialProvider } from './types';
import { youtubeProvider } from './youtube';
import { facebookProvider } from './facebook';
import { instagramProvider } from './instagram';
import { tiktokProvider } from './tiktok';

export const providers: Record<string, SocialProvider> = {
  youtube: youtubeProvider,
  facebook: facebookProvider,
  instagram: instagramProvider,
  tiktok: tiktokProvider,
};

export function getProvider(id: string): SocialProvider | null {
  return providers[id] || null;
}

export function listProviders() {
  return Object.values(providers).map((p) => ({
    id: p.id,
    name: p.name,
    supports: p.supports,
    configured: p.isConfigured(),
  }));
}

export * from './types';
