import type { BrandProfile } from './db';

// ============================================================
// Google Gemini AI Service para NexoPost
// ============================================================

export interface AICopyResult {
  title: string;
  description: string;
  hashtags: string[];
  callToAction?: string;
  alternativeTitles: string[];
  brandContextUsed?: boolean;
}

function getGeminiKey(): string {
  const key = process.env.GEMINI_API_KEY || '';
  if (!key) {
    throw new Error('GEMINI_API_KEY não configurada no servidor (.env.local).');
  }
  return key;
}

const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const FALLBACK_MODEL = 'gemini-flash-lite-latest';

async function callGemini(prompt: string, model = PRIMARY_MODEL): Promise<string> {
  const key = getGeminiKey();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    // Se o modelo principal estiver com alta demanda (503), tenta o fallback
    if (res.status === 503 && model === PRIMARY_MODEL) {
      console.warn(`Gemini ${PRIMARY_MODEL} ocupado. Tentando fallback ${FALLBACK_MODEL}...`);
      return callGemini(prompt, FALLBACK_MODEL);
    }
    const errMessage = data.error?.message || `Erro da API Gemini (Status ${res.status})`;
    throw new Error(errMessage);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('A API do Gemini retornou uma resposta vazia.');
  return text;
}

function buildBrandContextBlock(brand?: BrandProfile | null): { block: string; hasContext: boolean } {
  if (!brand) return { block: '', hasContext: false };

  const lines: string[] = [];
  if (brand.company_name?.trim()) lines.push(`- Nome da Empresa / Marca: ${brand.company_name.trim()}`);
  if (brand.niche?.trim()) lines.push(`- Nicho / Segmento de Atuação: ${brand.niche.trim()}`);
  if (brand.location?.trim()) lines.push(`- Localização / Região de Atendimento: ${brand.location.trim()}`);
  if (brand.target_audience?.trim()) lines.push(`- Público-Alvo Ideal (Persona): ${brand.target_audience.trim()}`);
  if (brand.unique_selling_points?.trim()) {
    lines.push(`- Diferenciais Competitivos (USPs): ${brand.unique_selling_points.trim()}`);
  }
  if (brand.tone?.trim()) lines.push(`- Identidade e Tom de Voz da Marca: ${brand.tone.trim()}`);
  if (brand.default_cta?.trim()) lines.push(`- Chamada para Ação (CTA) Padrão da Marca: ${brand.default_cta.trim()}`);
  if (brand.rules_to_avoid?.trim()) {
    lines.push(`- REGRAS DE OURO / O QUE EVITAR ESTRITAMENTE: ${brand.rules_to_avoid.trim()}`);
  }

  if (lines.length === 0) return { block: '', hasContext: false };

  const block = `
=== CÉREBRO DA MARCA (CONTEXTO OBRIGATÓRIO DO PERFIL ATUAL) ===
${lines.join('\n')}
Instrução de Marca: Personalize o título, a legenda, a linguagem, os argumentos e as hashtags para refletir fielmente a identidade desta marca, seu público-alvo, localização (se aplicável) e diferenciais. Respeite rigorosamente as regras do que evitar.
===============================================================
`;
  return { block, hasContext: true };
}

/**
 * Gera título viral, legenda persuasiva e hashtags estratégicas
 * injetando automaticamente o "Cérebro da Marca" (Brand Context) do perfil ativo.
 */
export async function generateSocialCopy(params: {
  topic: string;
  platform?: string;
  tone?: string;
  videoDurationSeconds?: number;
  brandProfile?: BrandProfile | null;
}): Promise<AICopyResult> {
  const platform = params.platform || 'todas as redes';
  const brand = params.brandProfile;
  const { block: brandBlock, hasContext } = buildBrandContextBlock(brand);

  const effectiveTone =
    params.tone && brand?.tone
      ? `${params.tone} (alinhado à voz da marca: ${brand.tone})`
      : params.tone || brand?.tone || 'dinâmico, persuasivo e focado em engajamento';

  const ctaInstruction = brand?.default_cta?.trim()
    ? `Use ou adapte preferencialmente o CTA oficial da marca: "${brand.default_cta.trim()}"`
    : `Chamada para ação direta (ex: 'Comente QUERO para receber o link completo!')`;

  const prompt = `
Você é um estrategista-chefe de conteúdo e copywriter profissional de mídias sociais especializado em alto engajamento, retenção e conversão.
Gere o conteúdo ideal para uma publicação ou vídeo para a rede: ${platform}.
Tema ou assunto do post: "${params.topic}"
Tom de voz solicitado: ${effectiveTone}
${params.videoDurationSeconds ? `Duração aproximada do vídeo: ${params.videoDurationSeconds} segundos.` : ''}
${brandBlock}

REGRAS OBRIGATÓRIAS DE HASHTAGS:
- NUNCA inclua o nome do sistema de postagem (JAMAIS coloque #NexoPost, #nexopost ou variações).
- Gere apenas hashtags altamente estratégicas e focadas no assunto, no nicho do cliente e no público-alvo.

Retorne ESTRITAMENTE um objeto JSON válido (sem blocos markdown adicionais como \`\`\`json) com a seguinte estrutura:
{
  "title": "Título principal com gancho viral curto para reter a atenção",
  "alternativeTitles": ["Opção alternativa 1", "Opção alternativa 2", "Opção alternativa 3"],
  "description": "Legenda completa com emojis, quebras de linha e chamada persuasiva alinhada à marca e à audiência",
  "callToAction": "${ctaInstruction.replace(/"/g, "'")}",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
}
`;

  const raw = await callGemini(prompt);
  let parsed: any;
  try {
    // Tenta primeiro parse direto removendo blocos markdown
    const stripped = raw.replace(/```(?:json)?/gi, '').trim();
    parsed = JSON.parse(stripped);
  } catch {
    try {
      // Tenta extrair o bloco {...} se houver texto ao redor
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      }
    } catch {
      // Fallback se não conseguir parsear
    }
  }

  // Filtro de segurança: remove qualquer hashtag com 'nexopost'
  const sanitizeTags = (tags: any[]): string[] => {
    if (!Array.isArray(tags)) return ['#viral', '#conteudo', '#marketing', '#negocios'];
    const filtered = tags
      .map((t) => String(t).trim())
      .filter((t) => t.startsWith('#') && !t.toLowerCase().includes('nexopost'));
    return filtered.length > 0 ? filtered : ['#viral', '#conteudo', '#marketing'];
  };

  if (parsed && typeof parsed === 'object') {
    return {
      title: parsed.title || params.topic,
      description: parsed.description || '',
      hashtags: sanitizeTags(parsed.hashtags),
      callToAction: parsed.callToAction || brand?.default_cta || undefined,
      alternativeTitles: Array.isArray(parsed.alternativeTitles) ? parsed.alternativeTitles : [],
      brandContextUsed: hasContext,
    };
  }

  return {
    title: params.topic,
    description: raw,
    hashtags: ['#viral', '#conteudo', '#marketing'],
    callToAction: brand?.default_cta || undefined,
    alternativeTitles: [],
    brandContextUsed: hasContext,
  };
}
