#!/usr/bin/env node
/**
 * NexoPost MCP Server (Model Context Protocol over stdio)
 * Conecta o Agente Hermes ao NexoPost REST API v1 (/api/v1/*)
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

const BASE_URL = (process.env.NEXOPOST_BASE_URL || 'https://nexopost.oriumdigital.tech').replace(/\/+$/, '');
const DEFAULT_API_KEY = (process.env.NEXOPOST_DEFAULT_API_KEY || '').trim();
const KEYS_FILE = process.env.NEXOPOST_KEYS_FILE || '/root/.hermes/nexopost_keys.json';

function normalizeStr(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function loadKeysMap() {
  try {
    if (fs.existsSync(KEYS_FILE)) {
      return JSON.parse(fs.readFileSync(KEYS_FILE, 'utf8')) || {};
    }
  } catch {
    // ignore
  }
  return {};
}

const TOOLS = [
  {
    name: 'nexopost_schedule_post',
    description:
      'Agenda ou publica imediatamente uma publicação (vídeo, foto ou texto) para um cliente no NexoPost nas redes sociais selecionadas (Instagram, Facebook, YouTube, TikTok). Se media_path apontar para um arquivo local na VPS, o MCP faz o upload binário automaticamente.',
    inputSchema: {
      type: 'object',
      properties: {
        client_name: {
          type: 'string',
          description:
            'Nome do cliente/perfil no NexoPost (ex: "Gordinho Celulares CG", "Gordinho Celulares Itajai", "Black Shark Imports", "default"). Resolve a chave automaticamente.',
        },
        client_api_key: {
          type: 'string',
          description:
            'Chave de API do cliente no NexoPost (nex_live_...). Opcional se client_name for informado.',
        },
        media_path: {
          type: 'string',
          description:
            'Caminho absoluto do arquivo de vídeo ou foto no disco da VPS (ex: /root/.hermes/cache/images/foto.jpg).',
        },
        media_url: {
          type: 'string',
          description: 'URL HTTP/HTTPS pública da mídia (alternativa ao media_path).',
        },
        title: {
          type: 'string',
          description: 'Título ou gancho principal da publicação.',
        },
        description: {
          type: 'string',
          description: 'Legenda completa com texto, CTA e hashtags.',
        },
        platforms: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['instagram', 'facebook', 'youtube', 'tiktok'],
          },
          description: 'Lista de redes sociais onde o conteúdo será publicado.',
        },
        scheduled_at: {
          type: 'string',
          description:
            'Data e hora ISO 8601 para agendamento (ex: 2026-10-25T18:00:00-04:00). Se omitido, publica imediatamente.',
        },
        format: {
          type: 'string',
          enum: ['feed', 'reel', 'story'],
          description: 'Formato da publicação (padrão: feed ou reel para vídeo vertical).',
        },
        media_type: {
          type: 'string',
          enum: ['video', 'photo', 'text'],
          description: 'Tipo de mídia (detectado automaticamente pela extensão se omitido).',
        },
      },
      required: ['title', 'description', 'platforms'],
    },
  },
  {
    name: 'nexopost_list_schedule',
    description:
      'Consulta a fila de postagens agendadas de um cliente no NexoPost (ou cancela um agendamento específico se cancel_post_id for informado).',
    inputSchema: {
      type: 'object',
      properties: {
        client_name: {
          type: 'string',
          description:
            'Nome do cliente/perfil no NexoPost (ex: "Gordinho Celulares CG", "Gordinho Celulares Itajai", "Black Shark Imports", "default"). Resolve a chave automaticamente.',
        },
        client_api_key: {
          type: 'string',
          description:
            'Chave de API do cliente no NexoPost (nex_live_...). Opcional se client_name for informado.',
        },
        status: {
          type: 'string',
          enum: ['scheduled', 'all'],
          description: 'Filtro de status: "scheduled" (apenas agendados) ou "all" (histórico recente).',
        },
        cancel_post_id: {
          type: 'string',
          description: 'Se informado, cancela/remove o agendamento com este ID.',
        },
      },
      required: [],
    },
  },
  {
    name: 'nexopost_get_metrics',
    description:
      'Obtém as métricas consolidadas de seguidores, alcance, crescimento, contas conectadas e Cérebro da Marca (Brand Context) do cliente no NexoPost.',
    inputSchema: {
      type: 'object',
      properties: {
        client_name: {
          type: 'string',
          description:
            'Nome do cliente/perfil no NexoPost (ex: "Gordinho Celulares CG", "Gordinho Celulares Itajai", "Black Shark Imports", "default"). Resolve a chave automaticamente.',
        },
        client_api_key: {
          type: 'string',
          description:
            'Chave de API do cliente no NexoPost (nex_live_...). Opcional se client_name for informado.',
        },
        platform: {
          type: 'string',
          enum: ['all', 'instagram', 'facebook', 'youtube', 'tiktok'],
          description: 'Plataforma específica ou "all" para consolidado (padrão: all).',
        },
        period: {
          type: 'string',
          enum: ['7d', '30d', '90d'],
          description: 'Período de análise (padrão: 30d).',
        },
      },
      required: [],
    },
  },
  {
    name: 'nexopost_list_accounts',
    description:
      'Lista as redes sociais conectadas no perfil do cliente no NexoPost, status do token OAuth, contagem de seguidores e diretrizes do Cérebro da Marca.',
    inputSchema: {
      type: 'object',
      properties: {
        client_name: {
          type: 'string',
          description:
            'Nome do cliente/perfil no NexoPost (ex: "Gordinho Celulares CG", "Gordinho Celulares Itajai", "Black Shark Imports", "default"). Resolve a chave automaticamente.',
        },
        client_api_key: {
          type: 'string',
          description:
            'Chave de API do cliente no NexoPost (nex_live_...). Opcional se client_name for informado.',
        },
      },
      required: [],
    },
  },
];

function resolveApiKey(args) {
  const rawKey = String(args?.client_api_key || '').trim();
  if (rawKey.startsWith('nex_')) {
    return rawKey;
  }

  const clientQuery = normalizeStr(args?.client_name || rawKey);
  const keysMap = loadKeysMap();
  const entries = Object.entries(keysMap);

  if (clientQuery && entries.length > 0) {
    // Match exato primeiro
    for (const [profileName, key] of entries) {
      if (normalizeStr(profileName) === clientQuery && String(key).startsWith('nex_')) {
        return String(key);
      }
    }
    // Match parcial
    for (const [profileName, key] of entries) {
      const normProfile = normalizeStr(profileName);
      if ((normProfile.includes(clientQuery) || clientQuery.includes(normProfile)) && String(key).startsWith('nex_')) {
        return String(key);
      }
    }
  }

  if (DEFAULT_API_KEY) {
    return DEFAULT_API_KEY;
  }

  const availableClients = entries.map(([name]) => name).join(', ');
  throw new Error(
    `Chave de API do cliente não localizada para "${args?.client_name || rawKey || 'vazio'}". Clientes disponíveis no cofre NexoPost: ${
      availableClients || 'nenhum'
    }.`
  );
}

function guessMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === '.mp4' || ext === '.m4v') return 'video/mp4';
  if (ext === '.mov') return 'video/quicktime';
  if (ext === '.webm') return 'video/webm';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'application/octet-stream';
}

async function callSchedulePost(args) {
  const apiKey = resolveApiKey(args);
  const mediaPath = args.media_path ? String(args.media_path).trim() : '';

  if (mediaPath) {
    if (!fs.existsSync(mediaPath)) {
      throw new Error(`Arquivo local não encontrado no caminho: ${mediaPath}`);
    }
    const fileBuffer = fs.readFileSync(mediaPath);
    const filename = path.basename(mediaPath);
    const mimeType = guessMimeType(filename);

    const form = new FormData();
    form.set('title', String(args.title || ''));
    form.set('description', String(args.description || ''));
    for (const p of Array.isArray(args.platforms) ? args.platforms : []) {
      form.append('platforms', String(p));
    }
    if (args.scheduled_at) form.set('scheduled_at', String(args.scheduled_at));
    if (args.format) form.set('format', String(args.format));
    if (args.media_type) form.set('media_type', String(args.media_type));

    const blob = new Blob([fileBuffer], { type: mimeType });
    form.append('media', blob, filename);

    const res = await fetch(`${BASE_URL}/api/v1/publish`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Erro HTTP ${res.status} ao publicar no NexoPost.`);
    }
    return data;
  }

  const res = await fetch(`${BASE_URL}/api/v1/publish`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: args.title || '',
      description: args.description || '',
      platforms: args.platforms || [],
      scheduled_at: args.scheduled_at || null,
      format: args.format || 'feed',
      media_type: args.media_type || (args.media_url ? undefined : 'text'),
      media_url: args.media_url || undefined,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Erro HTTP ${res.status} ao publicar no NexoPost.`);
  }
  return data;
}

async function callListSchedule(args) {
  const apiKey = resolveApiKey(args);

  if (args.cancel_post_id) {
    const id = encodeURIComponent(String(args.cancel_post_id).trim());
    const res = await fetch(`${BASE_URL}/api/v1/schedule?id=${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Erro HTTP ${res.status} ao cancelar agendamento.`);
    }
    return data;
  }

  const status = encodeURIComponent(String(args.status || 'scheduled'));
  const res = await fetch(`${BASE_URL}/api/v1/schedule?status=${status}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Erro HTTP ${res.status} ao consultar agenda.`);
  }
  return data;
}

async function callGetMetrics(args) {
  const apiKey = resolveApiKey(args);
  const platform = encodeURIComponent(String(args.platform || 'all'));
  const period = encodeURIComponent(String(args.period || '30d'));

  const res = await fetch(`${BASE_URL}/api/v1/audience?platform=${platform}&period=${period}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Erro HTTP ${res.status} ao consultar métricas.`);
  }
  return data;
}

async function callListAccounts(args) {
  const apiKey = resolveApiKey(args);
  const res = await fetch(`${BASE_URL}/api/v1/accounts`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Erro HTTP ${res.status} ao listar contas.`);
  }
  return data;
}

function sendResponse(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
}

function sendError(id, code, message) {
  process.stdout.write(
    JSON.stringify({
      jsonrpc: '2.0',
      id,
      error: { code, message },
    }) + '\n'
  );
}

async function handleRequest(msg) {
  if (!msg || typeof msg !== 'object') return;
  const { id, method, params } = msg;

  // Notifications (no id)
  if (id === undefined || id === null) {
    return;
  }

  try {
    if (method === 'initialize') {
      const clientVersion = params?.protocolVersion || '2024-11-05';
      sendResponse(id, {
        protocolVersion: clientVersion,
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'nexopost-mcp',
          version: '1.0.0',
        },
      });
      return;
    }

    if (method === 'ping') {
      sendResponse(id, {});
      return;
    }

    if (method === 'tools/list') {
      sendResponse(id, { tools: TOOLS });
      return;
    }

    if (method === 'resources/list') {
      sendResponse(id, { resources: [] });
      return;
    }

    if (method === 'prompts/list') {
      sendResponse(id, { prompts: [] });
      return;
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const args = params?.arguments || {};

      let output;
      if (toolName === 'nexopost_schedule_post') {
        output = await callSchedulePost(args);
      } else if (toolName === 'nexopost_list_schedule') {
        output = await callListSchedule(args);
      } else if (toolName === 'nexopost_get_metrics') {
        output = await callGetMetrics(args);
      } else if (toolName === 'nexopost_list_accounts') {
        output = await callListAccounts(args);
      } else {
        sendResponse(id, {
          isError: true,
          content: [{ type: 'text', text: `Ferramenta desconhecida: ${toolName}` }],
        });
        return;
      }

      sendResponse(id, {
        content: [
          {
            type: 'text',
            text: JSON.stringify(output, null, 2),
          },
        ],
      });
      return;
    }

    sendError(id, -32601, `Método não suportado: ${method}`);
  } catch (err) {
    sendResponse(id, {
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: err instanceof Error ? err.message : String(err),
          }),
        },
      ],
    });
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  terminal: false,
});

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const parsed = JSON.parse(trimmed);
    handleRequest(parsed);
  } catch (err) {
    process.stderr.write(`[nexopost-mcp] Erro ao parsear JSON-RPC: ${err.message}\n`);
  }
});
