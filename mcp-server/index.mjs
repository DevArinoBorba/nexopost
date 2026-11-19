#!/usr/bin/env node
/**
 * NexoPost MCP Server (Model Context Protocol over stdio)
 *
 * Conecta qualquer cliente MCP (Antigravity, Claude Desktop, Cursor, etc.)
 * à API REST v1 do NexoPost (/api/v1/*) para gerenciar múltiplos perfis (contas dark)
 * usando uma única API Key pessoal.
 *
 * Variáveis de ambiente:
 *   NEXOPOST_API_URL  - URL do NexoPost (padrão: https://nexopost.oriumdigital.tech)
 *   NEXOPOST_API_KEY  - Chave de API (nex_live_...) gerada em Configurações → API & MCP
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

const BASE_URL = (
  process.env.NEXOPOST_API_URL ||
  process.env.NEXOPOST_BASE_URL ||
  'https://nexopost.oriumdigital.tech'
).replace(/\/+$/, '');

const DEFAULT_API_KEY = (
  process.env.NEXOPOST_API_KEY ||
  process.env.NEXOPOST_DEFAULT_API_KEY ||
  ''
).trim();

const MIME_BY_EXT = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.m4v': 'video/x-m4v',
  '.avi': 'video/x-msvideo',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

const PHOTO_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const VIDEO_EXTS = new Set(['.mp4', '.mov', '.webm', '.mkv', '.m4v', '.avi']);

function resolveApiKey(args) {
  const key = String(args?.api_key || DEFAULT_API_KEY || '').trim();
  if (!key) {
    throw new Error(
      `API Key não configurada. Defina a variável de ambiente NEXOPOST_API_KEY (gere uma chave em ${BASE_URL}/settings?tab=api) ou passe "api_key".`
    );
  }
  return key;
}

function buildHeaders(apiKey, profile, extra = {}) {
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    ...extra,
  };
  if (profile && String(profile).trim()) {
    headers['X-NexoPost-Profile'] = String(profile).trim();
  }
  return headers;
}

async function apiJson(endpoint, { method = 'GET', apiKey, profile, body } = {}) {
  const headers = buildHeaders(
    apiKey,
    profile,
    body !== undefined ? { 'Content-Type': 'application/json' } : {}
  );
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(data?.error || data?.message || `HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return data;
}

function detectMediaType(filePath, explicit) {
  if (explicit === 'video' || explicit === 'photo' || explicit === 'text') return explicit;
  if (filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (PHOTO_EXTS.has(ext)) return 'photo';
    if (VIDEO_EXTS.has(ext)) return 'video';
  }
  return 'video';
}

const TOOLS = [
  {
    name: 'nexopost_list_profiles',
    description:
      'Lista todos os seus perfis (contas dark) cadastrados no NexoPost, com as redes sociais conectadas em cada perfil e o Cérebro da Marca.',
    inputSchema: {
      type: 'object',
      properties: {
        api_key: {
          type: 'string',
          description: 'Opcional: chave nex_live_... caso queira sobrescrever NEXOPOST_API_KEY.',
        },
      },
    },
  },
  {
    name: 'nexopost_list_accounts',
    description:
      'Lista as contas sociais conectadas (Instagram, Facebook, YouTube, TikTok), status dos tokens e Cérebro da Marca de um perfil (conta dark).',
    inputSchema: {
      type: 'object',
      properties: {
        profile: {
          type: 'string',
          description: 'Nome ou ID do perfil (conta dark). Se omitido, usa o perfil padrão da API Key.',
        },
        api_key: { type: 'string', description: 'Opcional: chave nex_live_...' },
      },
    },
  },
  {
    name: 'nexopost_publish',
    description:
      'Publica imediatamente ou agenda um post (vídeo, foto ou texto) em um perfil (conta dark) do NexoPost. Se media_path apontar para um arquivo local na máquina, o servidor MCP faz o upload multipart automaticamente para o NexoPost.',
    inputSchema: {
      type: 'object',
      properties: {
        profile: {
          type: 'string',
          description: 'Nome ou ID do perfil (conta dark) onde publicar. Se omitido, usa o perfil padrão da chave.',
        },
        platforms: {
          type: 'array',
          items: { type: 'string', enum: ['instagram', 'facebook', 'youtube', 'tiktok'] },
          description: 'Lista de redes de destino, ex.: ["instagram", "facebook"].',
        },
        title: {
          type: 'string',
          description: 'Título do vídeo/post (ou texto principal quando media_type="text").',
        },
        description: {
          type: 'string',
          description: 'Legenda completa, hashtags e CTA.',
        },
        media_path: {
          type: 'string',
          description: 'Caminho local do arquivo de vídeo ou imagem para upload (ex.: C:\\videos\\clip.mp4).',
        },
        media_paths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Lista de caminhos locais de imagens para carrossel.',
        },
        media_url: {
          type: 'string',
          description: 'URL pública da mídia (alternativa a media_path).',
        },
        media_type: {
          type: 'string',
          enum: ['video', 'photo', 'text'],
          description: 'Tipo de mídia. Detectado automaticamente pela extensão se omitido.',
        },
        format: {
          type: 'string',
          enum: ['feed', 'reel', 'story'],
          description: 'Formato de publicação (padrão: "feed"; para Reels no Instagram use "reel").',
        },
        scheduled_at: {
          type: 'string',
          description: 'Data/hora ISO 8601 para agendar (ex.: "2026-11-20T18:00:00-04:00"). Se omitido, publica na hora.',
        },
        timezone: {
          type: 'string',
          description: 'Fuso horário IANA (ex.: "America/Campo_Grande" ou "America/Sao_Paulo").',
        },
        privacy: {
          type: 'string',
          enum: ['public', 'unlisted', 'private'],
          description: 'Privacidade (usado no YouTube/TikTok).',
        },
        account_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Opcional: IDs específicos de contas (quando há mais de uma conta da mesma rede no perfil).',
        },
        api_key: { type: 'string', description: 'Opcional: chave nex_live_...' },
      },
      required: ['platforms'],
    },
  },
  {
    name: 'nexopost_list_schedule',
    description:
      'Lista os posts agendados (ou todo o histórico com status="all") de um perfil (conta dark).',
    inputSchema: {
      type: 'object',
      properties: {
        profile: {
          type: 'string',
          description: 'Nome ou ID do perfil (conta dark).',
        },
        status: {
          type: 'string',
          enum: ['scheduled', 'all'],
          description: '"scheduled" (padrão) ou "all" para incluir publicados e falhos.',
        },
        api_key: { type: 'string', description: 'Opcional: chave nex_live_...' },
      },
    },
  },
  {
    name: 'nexopost_cancel_schedule',
    description: 'Cancela/exclui um post agendado pelo ID.',
    inputSchema: {
      type: 'object',
      properties: {
        post_id: {
          type: 'string',
          description: 'ID do post agendado retornado por nexopost_list_schedule ou nexopost_publish.',
        },
        profile: {
          type: 'string',
          description: 'Nome ou ID do perfil (conta dark) ao qual o post pertence.',
        },
        api_key: { type: 'string', description: 'Opcional: chave nex_live_...' },
      },
      required: ['post_id'],
    },
  },
  {
    name: 'nexopost_get_audience',
    description: 'Consulta métricas consolidadas de seguidores, alcance e crescimento de um perfil (conta dark).',
    inputSchema: {
      type: 'object',
      properties: {
        profile: {
          type: 'string',
          description: 'Nome ou ID do perfil (conta dark).',
        },
        platform: {
          type: 'string',
          enum: ['all', 'instagram', 'facebook', 'youtube', 'tiktok'],
          description: 'Plataforma específica ou "all" (padrão).',
        },
        period: {
          type: 'string',
          enum: ['7d', '30d', '90d'],
          description: 'Período das métricas (padrão: "30d").',
        },
        api_key: { type: 'string', description: 'Opcional: chave nex_live_...' },
      },
    },
  },
];

async function handlePublish(args) {
  const apiKey = resolveApiKey(args);
  const profile = args?.profile;
  const platforms = Array.isArray(args?.platforms) ? args.platforms : [];
  if (platforms.length === 0) {
    throw new Error('Informe ao menos uma plataforma em "platforms" (ex.: ["instagram", "facebook"]).');
  }

  const localPaths = [];
  if (typeof args?.media_path === 'string' && args.media_path.trim()) {
    localPaths.push(args.media_path.trim());
  }
  if (Array.isArray(args?.media_paths)) {
    for (const p of args.media_paths) {
      if (typeof p === 'string' && p.trim()) localPaths.push(p.trim());
    }
  }

  const existingLocalFiles = localPaths.filter((p) => fs.existsSync(p) && fs.statSync(p).isFile());
  const mediaType = detectMediaType(existingLocalFiles[0] || localPaths[0], args?.media_type);

  // Se houver arquivos locais acessíveis nesta máquina, faz upload multipart direto para a VPS/servidor
  if (existingLocalFiles.length > 0) {
    const form = new FormData();
    form.set('title', String(args?.title || ''));
    form.set('description', String(args?.description || ''));
    form.set('platforms', JSON.stringify(platforms));
    form.set('media_type', mediaType);
    form.set('format', String(args?.format || 'feed'));
    if (args?.scheduled_at) form.set('scheduled_at', String(args.scheduled_at));
    if (args?.timezone) form.set('timezone', String(args.timezone));
    if (args?.privacy) form.set('privacy', String(args.privacy));
    if (Array.isArray(args?.account_ids)) {
      for (const id of args.account_ids) form.append('account_id', String(id));
    }

    for (const filePath of existingLocalFiles) {
      const ext = path.extname(filePath).toLowerCase();
      const mime = MIME_BY_EXT[ext] || 'application/octet-stream';
      const buf = fs.readFileSync(filePath);
      const blob = new Blob([buf], { type: mime });
      form.append('media', blob, path.basename(filePath));
    }

    const res = await fetch(`${BASE_URL}/api/v1/publish`, {
      method: 'POST',
      headers: buildHeaders(apiKey, profile),
      body: form,
    });
    const text = await res.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }
    if (!res.ok) {
      throw new Error(data?.error || data?.message || `HTTP ${res.status}: ${text.slice(0, 300)}`);
    }
    return data;
  }

  // Sem arquivo local (texto, media_url ou caminho já no servidor)
  return apiJson('/api/v1/publish', {
    method: 'POST',
    apiKey,
    profile,
    body: {
      title: args?.title || '',
      description: args?.description || '',
      platforms,
      account_ids: args?.account_ids,
      media_type: mediaType,
      format: args?.format || 'feed',
      scheduled_at: args?.scheduled_at || undefined,
      timezone: args?.timezone || undefined,
      privacy: args?.privacy || undefined,
      media_url: args?.media_url || undefined,
      local_media_paths: localPaths.length > 0 ? localPaths : undefined,
    },
  });
}

async function executeTool(name, args = {}) {
  const apiKey = resolveApiKey(args);
  const profile = args?.profile;

  switch (name) {
    case 'nexopost_list_profiles':
      return apiJson('/api/v1/profiles', { apiKey });

    case 'nexopost_list_accounts':
      return apiJson('/api/v1/accounts', { apiKey, profile });

    case 'nexopost_publish':
      return handlePublish(args);

    case 'nexopost_list_schedule': {
      const status = args?.status === 'all' ? 'all' : 'scheduled';
      return apiJson(`/api/v1/schedule?status=${encodeURIComponent(status)}`, { apiKey, profile });
    }

    case 'nexopost_cancel_schedule': {
      const postId = String(args?.post_id || '').trim();
      if (!postId) throw new Error('Informe "post_id" para cancelar o agendamento.');
      return apiJson(`/api/v1/schedule?id=${encodeURIComponent(postId)}`, {
        method: 'DELETE',
        apiKey,
        profile,
      });
    }

    case 'nexopost_get_audience': {
      const platform = encodeURIComponent(args?.platform || 'all');
      const period = encodeURIComponent(args?.period || '30d');
      return apiJson(`/api/v1/audience?platform=${platform}&period=${period}`, { apiKey, profile });
    }

    default:
      throw new Error(`Tool desconhecida: ${name}`);
  }
}

// ============================================================
// Loop JSON-RPC 2.0 sobre stdio (MCP 2024-11-05)
// ============================================================

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + '\n');
}

async function handleMessage(msg) {
  if (!msg || typeof msg !== 'object') return;
  const { id, method, params } = msg;

  // Notificações sem id não recebem resposta
  if (id === undefined || id === null) {
    return;
  }

  try {
    if (method === 'initialize') {
      send({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: 'nexopost-mcp',
            version: '2.0.0',
          },
        },
      });
      return;
    }

    if (method === 'ping') {
      send({ jsonrpc: '2.0', id, result: {} });
      return;
    }

    if (method === 'tools/list') {
      send({
        jsonrpc: '2.0',
        id,
        result: { tools: TOOLS },
      });
      return;
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};
      try {
        const result = await executeTool(toolName, toolArgs);
        send({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          },
        });
      } catch (err) {
        send({
          jsonrpc: '2.0',
          id,
          result: {
            isError: true,
            content: [{ type: 'text', text: `Erro: ${err instanceof Error ? err.message : String(err)}` }],
          },
        });
      }
      return;
    }

    send({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Método não suportado: ${method}` },
    });
  } catch (err) {
    send({
      jsonrpc: '2.0',
      id,
      error: { code: -32603, message: err instanceof Error ? err.message : String(err) },
    });
  }
}

const rl = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });
rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const parsed = JSON.parse(trimmed);
    handleMessage(parsed);
  } catch (err) {
    send({
      jsonrpc: '2.0',
      id: null,
      error: { code: -32700, message: `JSON inválido: ${err instanceof Error ? err.message : String(err)}` },
    });
  }
});
