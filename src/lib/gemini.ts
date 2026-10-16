// ============================================================
// Google Gemini AI Service para NexoPost
// ============================================================

export interface AICopyResult {
  title: string;
  description: string;
  hashtags: string[];
  callToAction?: string;
  alternativeTitles: string[];
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

/**
 * Gera título viral, legenda persuasiva e hashtags estratégicas
 */
export async function generateSocialCopy(params: {
  topic: string;
  platform?: string;
  tone?: string;
  videoDurationSeconds?: number;
}): Promise<AICopyResult> {
  const platform = params.platform || 'todas as redes';
  const tone = params.tone || 'dinâmico, persuasivo e focado em engajamento';

  const prompt = `
Você é o estrategista de conteúdo e mídias sociais do NexoPost.
Gere o conteúdo ideal para uma publicação ou vídeo para a rede: ${platform}.
Tema ou assunto: "${params.topic}"
Tom de voz: ${tone}

Retorne ESTRITAMENTE um objeto JSON válido (sem blocos markdown adicionais como \`\`\`json) com a seguinte estrutura:
{
  "title": "Título principal com gancho viral curto para reter a atenção",
  "alternativeTitles": ["Opção alternativa 1", "Opção alternativa 2", "Opção alternativa 3"],
  "description": "Legenda completa com emojis, quebras de linha e chamada persuasiva para a audiência",
  "callToAction": "Chamada para ação direta (ex: 'Comente QUERO para receber o link completo!')",
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

  if (parsed && typeof parsed === 'object') {
    return {
      title: parsed.title || params.topic,
      description: parsed.description || '',
      hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags : ['#nexopost', '#viral', '#marketing'],
      callToAction: parsed.callToAction,
      alternativeTitles: Array.isArray(parsed.alternativeTitles) ? parsed.alternativeTitles : [],
    };
  }

  return {
    title: params.topic,
    description: raw,
    hashtags: ['#nexopost', '#viral', '#socialmedia'],
    alternativeTitles: [],
  };
}
