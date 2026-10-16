import { validTokenSet } from '@/lib/publish';
import { type Account } from '@/lib/db';
import { GRAPH } from './meta';

const COUNTRY_NAMES: Record<string, string> = {
  BR: 'Brasil',
  PT: 'Portugal',
  US: 'Estados Unidos',
  AO: 'Angola',
  MZ: 'Moçambique',
  ES: 'Espanha',
  FR: 'França',
  IT: 'Itália',
  DE: 'Alemanha',
  GB: 'Reino Unido',
  CA: 'Canadá',
  AR: 'Argentina',
  UY: 'Uruguai',
  CL: 'Chile',
  PY: 'Paraguai',
  JP: 'Japão',
};

export interface PlatformLiveAudience {
  platform: string;
  accountHandle?: string;
  accountName?: string;
  avatarUrl?: string;
  followers: number;
  totalViews?: number;
  mediaCount?: number;
  isRealData: boolean;
  notes?: string;
  genderData?: { name: string; percentage: number; color: string }[];
  ageData?: { age: string; percentage: number; female: number; male: number }[];
  topCountries?: { country: string; code: string; percentage: number; followers: number }[];
  topCities?: { city: string; state: string; percentage: number }[];
  activityHeatmap?: { day: string; dayIndex: number; hours: { hour: string; intensity: number }[] }[];
}

/** Busca dados reais do YouTube Channels API */
export async function getLiveYouTubeAudience(account: Account): Promise<PlatformLiveAudience | null> {
  try {
    const tokens = await validTokenSet(account);
    const res = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;

    const subscribers = Number(item.statistics?.subscriberCount) || 0;
    const views = Number(item.statistics?.viewCount) || 0;
    const videos = Number(item.statistics?.videoCount) || 0;

    return {
      platform: 'youtube',
      accountHandle: item.snippet?.customUrl || account.handle || undefined,
      accountName: item.snippet?.title || account.display_name || undefined,
      avatarUrl: item.snippet?.thumbnails?.medium?.url || account.avatar_url || undefined,
      followers: subscribers,
      totalViews: views,
      mediaCount: videos,
      isRealData: true,
      notes: `Canal oficial com ${views.toLocaleString('pt-BR')} visualizações totais e ${videos} vídeos publicados.`,
    };
  } catch (err) {
    console.error('Erro ao consultar YouTube Analytics:', err);
    return null;
  }
}

/** Busca dados reais do Instagram via Meta Graph API */
export async function getLiveInstagramAudience(account: Account): Promise<PlatformLiveAudience | null> {
  try {
    const tokens = await validTokenSet(account);
    if (!account.external_id) return null;

    // Perfil básico
    const profileRes = await fetch(
      `${GRAPH}/${account.external_id}?${new URLSearchParams({
        fields: 'id,username,name,profile_picture_url,followers_count,media_count',
        access_token: tokens.access_token,
      })}`
    );
    const profileData = await profileRes.json();
    const followers = Number(profileData.followers_count) || 0;
    const mediaCount = Number(profileData.media_count) || 0;

    // Tenta obter Insights demográficos da Meta
    let genderData: PlatformLiveAudience['genderData'] = undefined;
    let ageData: PlatformLiveAudience['ageData'] = undefined;
    let topCountries: PlatformLiveAudience['topCountries'] = undefined;
    let topCities: PlatformLiveAudience['topCities'] = undefined;
    let notes = 'Métricas reais sincronizadas com o Instagram.';

    try {
      const insightsRes = await fetch(
        `${GRAPH}/${account.external_id}/insights?${new URLSearchParams({
          metric: 'audience_gender_age,audience_country,audience_city',
          period: 'lifetime',
          access_token: tokens.access_token,
        })}`
      );
      const insightsJson = await insightsRes.json();

      if (insightsJson.data && Array.isArray(insightsJson.data)) {
        for (const metric of insightsJson.data) {
          const values = metric.values?.[0]?.value || {};
          const totalVal = Object.values(values).reduce((a: number, b: any) => a + Number(b), 0);

          if (metric.name === 'audience_gender_age' && totalVal > 0) {
            let fem = 0;
            let masc = 0;
            let outro = 0;
            const ages: Record<string, { total: number; fem: number; masc: number }> = {};

            for (const [key, countVal] of Object.entries(values)) {
              const num = Number(countVal);
              const [g, ageRange] = key.split('.');
              if (g === 'F') fem += num;
              else if (g === 'M') masc += num;
              else outro += num;

              if (ageRange) {
                if (!ages[ageRange]) ages[ageRange] = { total: 0, fem: 0, masc: 0 };
                ages[ageRange].total += num;
                if (g === 'F') ages[ageRange].fem += num;
                if (g === 'M') ages[ageRange].masc += num;
              }
            }

            genderData = [
              { name: 'Feminino', percentage: +(fem / totalVal * 100).toFixed(1), color: '#ec4899' },
              { name: 'Masculino', percentage: +(masc / totalVal * 100).toFixed(1), color: '#6366f1' },
              { name: 'Não especificado', percentage: +(outro / totalVal * 100).toFixed(1), color: '#94a3b8' },
            ];

            ageData = Object.entries(ages).map(([age, obj]) => ({
              age,
              percentage: +(obj.total / totalVal * 100).toFixed(1),
              female: +(obj.fem / totalVal * 100).toFixed(1),
              male: +(obj.masc / totalVal * 100).toFixed(1),
            }));
          }

          if (metric.name === 'audience_country' && totalVal > 0) {
            topCountries = Object.entries(values)
              .sort((a: any, b: any) => Number(b[1]) - Number(a[1]))
              .slice(0, 5)
              .map(([code, cVal]) => {
                const count = Number(cVal);
                return {
                  country: COUNTRY_NAMES[code] || code,
                  code,
                  percentage: +(count / totalVal * 100).toFixed(1),
                  followers: count,
                };
              });
          }

          if (metric.name === 'audience_city' && totalVal > 0) {
            topCities = Object.entries(values)
              .sort((a: any, b: any) => Number(b[1]) - Number(a[1]))
              .slice(0, 6)
              .map(([cityWithState, cVal]) => {
                const count = Number(cVal);
                const [city, state] = cityWithState.split(',');
                return {
                  city: city?.trim() || cityWithState,
                  state: state?.trim() || '',
                  percentage: +(count / totalVal * 100).toFixed(1),
                };
              });
          }
        }
      } else if (insightsJson.error) {
        if (followers < 100) {
          notes = 'Seguidores reais obtidos via Meta. A demografia completa exige no mínimo 100 seguidores na conta do Instagram.';
        } else {
          notes = `Seguidores reais obtidos. Detalhes demográficos: ${insightsJson.error.message}`;
        }
      }
    } catch {
      // Ignora erro de insights e mantém dados de perfil reais
    }

    return {
      platform: 'instagram',
      accountHandle: profileData.username ? `@${profileData.username}` : account.handle || undefined,
      accountName: profileData.name || account.display_name || undefined,
      avatarUrl: profileData.profile_picture_url || account.avatar_url || undefined,
      followers,
      mediaCount,
      isRealData: true,
      notes,
      genderData,
      ageData,
      topCountries,
      topCities,
    };
  } catch (err) {
    console.error('Erro ao consultar Instagram Graph API:', err);
    return null;
  }
}

/** Busca dados reais do Facebook (Página) via Meta Graph API */
export async function getLiveFacebookAudience(account: Account): Promise<PlatformLiveAudience | null> {
  try {
    const tokens = await validTokenSet(account);
    if (!account.external_id) return null;

    const res = await fetch(
      `${GRAPH}/${account.external_id}?${new URLSearchParams({
        fields: 'id,name,fan_count,followers_count,picture{url}',
        access_token: tokens.access_token,
      })}`
    );
    const data = await res.json();
    const followers = Number(data.followers_count || data.fan_count) || 0;

    return {
      platform: 'facebook',
      accountName: data.name || account.display_name || undefined,
      accountHandle: account.handle || undefined,
      avatarUrl: data.picture?.data?.url || account.avatar_url || undefined,
      followers,
      isRealData: true,
      notes: 'Métricas reais de seguidores e curtidas da Página no Facebook.',
    };
  } catch (err) {
    console.error('Erro ao consultar Facebook Graph API:', err);
    return null;
  }
}
