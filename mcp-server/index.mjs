#!/usr/bin/env node
/**
 * NexoPost MCP Server (Model Context Protocol over stdio)
 * Conecta o Agente Hermes ao NexoPost REST API v1 (/api/v1/*)
 * com controle de acesso estrito por número de WhatsApp verificado.
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';

const BASE_URL = (process.env.NEXOPOST_BASE_URL || 'https://nexopost.oriumdigital.tech').replace(/\/+$/, '');
const DEFAULT_API_KEY = (process.env.NEXOPOST_DEFAULT_API_KEY || '').trim();
const KEYS_FILE = process.env.NEXOPOST_KEYS_FILE || '/root/.hermes/nexopost_keys.json';
const PERMISSIONS_FILE =
  process.env.NEXOPOST_WHATSAPP_PERMISSIONS_FILE || '/data/nexopost/data/hermes_whatsapp_permissions.json';
const SESSION_DIR = process.env.HERMES_WHATSAPP_SESSION_DIR || '/root/.hermes/whatsapp/session';

function normalizeStr(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizePhoneVariants(input) {
  const raw = String(input || '').trim();
  if (!raw) return [];

  // Se for um @lid (ex: 72736059699239@lid), tenta resolver no lid-mapping reverso do Baileys
  const lidMatch = raw.match(/^(\d+)@lid$/i);
  let digits = raw.replace(/@.*$/, '').replace(/\D+/g, '');

  if (lidMatch) {
    const lidNum = lidMatch[1];
    const reverseFile = path.join(SESSION_DIR, `lid-mapping-${lidNum}_reverse.json`);
    if (fs.existsSync(reverseFile)) {
      try {
        const mappedPhone = JSON.parse(fs.readFileSync(reverseFile, 'utf8'));
        if (mappedPhone) {
          digits = String(mappedPhone).replace(/\D+/g, '');
        }
      } catch {
        // ignore
      }
    }
  }

  if (!digits) return [raw.toLowerCase()];
  if (digits.length === 10 || digits.length === 11) {
    digits = '55' + digits;
  }

  const variants = new Set([digits, raw.toLowerCase()]);
  if (digits.startsWith('55')) {
    const ddd = digits.slice(2, 4);
    const rest = digits.slice(4);
    if (rest.length === 9 && rest.startsWith('9')) {
      variants.add(`55${ddd}${rest.slice(1)}`);
    } else if (rest.length === 8) {
      variants.add(`55${ddd}9${rest}`);
    }
  }
  return Array.from(variants);
}

function loadPermissionsData() {
  try {
    if (fs.existsSync(PERMISSIONS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PERMISSIONS_FILE, 'utf8'));
      return Array.isArray(parsed?.verified_links) ? parsed.verified_links : [];
    }
  } catch {
    // ignore
  }
  return [];
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

function findSenderLink(senderWhatsapp) {
  const variants = normalizePhoneVariants(senderWhatsapp);
  if (variants.length === 0) return null;

  const verifiedLinks = loadPermissionsData();
  for (const link of verifiedLinks) {
    const linkCandidates = [
      link.phone_normalized,
      link.phone_alt,
      link.whatsapp_lid ? String(link.whatsapp_lid).toLowerCase() : null,
      link.whatsapp_lid ? String(link.whatsapp_lid).replace(/@.*$/, '') : null,
    ].filter(Boolean);

    if (variants.some((v) => linkCandidates.includes(v))) {
      return link;
    }
  }
  return null;
}

function resolveApiKey(args) {
  const senderWhatsapp = String(args?.sender_whatsapp || '').trim();
  const verifiedLinks = loadPermissionsData();

  // Se já existem vínculos verificados ou se sender_whatsapp foi informado, aplica o controle por WhatsApp
  if (senderWhatsapp || verifiedLinks.length > 0) {
    if (!senderWhatsapp) {
      throw new Error(
        'Informe o parâmetro obrigatório "sender_whatsapp" (número ou @lid de quem enviou a mensagem no WhatsApp) para validar as permissões da conta no NexoPost.'
      );
    }

    const link = findSenderLink(senderWhatsapp);
    if (!link) {
      throw new Error(
        `O número/remetente "${senderWhatsapp}" não possui vínculo verificado no NexoPost. Para liberar o acesso, acesse https://nexopost.oriumdigital.tech/settings?tab=api, cadastre o número de WhatsApp e confirme o código de 6 dígitos enviado pelo Hermes.`
      );
    }

    const allowedProfiles = Array.isArray(link.profiles) ? link.profiles : [];
    if (allowedProfiles.length === 0) {
      throw new Error(
        `O WhatsApp +${link.phone_normalized} está verificado, mas não possui nenhum perfil com chave ativa.`
      );
    }

    const clientQuery = normalizeStr(args?.client_name || '');
    if (!clientQuery) {
      if (allowedProfiles.length === 1) {
        return allowedProfiles[0].api_key;
      }
      const def = allowedProfiles.find((p) => normalizeStr(p.profile_name) === 'default') || allowedProfiles[0];
      return def.api_key;
    }

    // Match exato dentro dos perfis permitidos para este WhatsApp
    for (const p of allowedProfiles) {
      if (normalizeStr(p.profile_name) === clientQuery && p.api_key) {
        return p.api_key;
      }
    }
    // Match parcial dentro dos perfis permitidos para este WhatsApp
    for (const p of allowedProfiles) {
      const normName = normalizeStr(p.profile_name);
      if ((normName.includes(clientQuery) || clientQuery.includes(normName)) && p.api_key) {
        return p.api_key;
      }
    }

    const allowedNames = allowedProfiles.map((p) => p.profile_name).join(', ');
    throw new Error(
      `Acesso negado: o WhatsApp +${link.phone_normalized} (${link.user_name}) não tem permissão para acessar o perfil "${args?.client_name}". Perfis liberados para este WhatsApp: ${allowedNames}.`
    );
  }

  // Fallback legado caso ainda não haja vínculos na tabela whatsapp_links
  const rawKey = String(args?.client_api_key || '').trim();
  if (rawKey.startsWith('nex_')) {
    return rawKey;
  }

  const clientQuery = normalizeStr(args?.client_name || rawKey);
  const keysMap = loadKeysMap();
  const entries = Object.entries(keysMap);

  if (clientQuery && entries.length > 0) {
    for (const [profileName, key] of entries) {
      if (normalizeStr(profileName) === clientQuery && String(key).startsWith('nex_')) {
        return String(key);
      }
    }
    for (const [profileName, key] of entries) {
      const normProfile = normalizeStr(profileName);
      if ((normProfile.includes(clientQuery) || clientQuery.includes(normProfile)) && String(key).startsWith('nex_')) {
        return String(key);
      }
    }
  }

  if (DEFAULT_API_KEY) return DEFAULT_API_KEY;

  throw new Error('Chave de API ou vínculo de WhatsApp não encontrado.');
}

const TOOLS = [
  {
    name: 'nexopost_my_access',
    description:
      'Verifica se o número de WhatsApp do remetente está vinculado e verificado no NexoPost e retorna exatamente quais perfis (clientes) e redes sociais ele tem permissão para publicar.',
    inputSchema: {
      type: 'object',
      properties: {
        sender_whatsapp: {
          type: 'string',
          description:
            'Número de WhatsApp ou @lid de quem enviou a mensagem no WhatsApp (ex: "5567981108176", "556781108176@s.whatsapp.net" ou "72736059699239@lid").',
        },
      },
      required: ['sender_whatsapp'],
    },
  },
  {
    name: 'nexopost_schedule_post',
    description:
      'Agenda ou publica imediatamente uma publicação (vídeo, foto ou texto) no NexoPost apenas nas contas sociais vinculadas ao WhatsApp do remetente. Se media_path apontar para um arquivo local na VPS, o MCP faz o upload binário automaticamente.',
    inputSchema: {
      type: 'object',
      properties: {
        sender_whatsapp: {
          type: 'string',
          description:
            'OBRIGATÓRIO: Número de WhatsApp ou @lid de quem enviou a mensagem no WhatsApp (ex: "5567981108176" ou "72736059699239@lid"). O sistema valida se esse número tem permissão para publicar no perfil solicitado.',
        },
        client_name: {
          type: 'string',
          description:
            'Nome do cliente/perfil no NexoPost liberado para este WhatsApp (ex: "Gordinho Celulares CG", "Black Shark Imports"). Opcional se o WhatsApp estiver vinculado a um único perfil.',
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
          description: 'Lista de redes sociais conectadas onde o conteúdo será publicado.',
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
      required: ['sender_whatsapp', 'title', 'description', 'platforms'],
    },
  },
  {
    name: 'nexopost_list_schedule',
    description:
      'Consulta a fila de postagens agendadas de um perfil liberado para o WhatsApp do remetente (ou cancela um agendamento específico se cancel_post_id for informado).',
    inputSchema: {
      type: 'object',
      properties: {
        sender_whatsapp: {
          type: 'string',
          description:
            'OBRIGATÓRIO: Número de WhatsApp ou @lid de quem enviou a mensagem no WhatsApp.',
        },
        client_name: {
          type: 'string',
          description: 'Nome do cliente/perfil no NexoPost liberado para este WhatsApp.',
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
      required: ['sender_whatsapp'],
    },
  },
  {
    name: 'nexopost_get_metrics',
    description:
      'Obtém as métricas consolidadas de seguidores, alcance, crescimento, contas conectadas e Cérebro da Marca (Brand Context) de um perfil liberado para o WhatsApp do remetente.',
    inputSchema: {
      type: 'object',
      properties: {
        sender_whatsapp: {
          type: 'string',
          description:
            'OBRIGATÓRIO: Número de WhatsApp ou @lid de quem enviou a mensagem no WhatsApp.',
        },
        client_name: {
          type: 'string',
          description: 'Nome do cliente/perfil no NexoPost liberado para este WhatsApp.',
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
      required: ['sender_whatsapp'],
    },
  },
  {
    name: 'nexopost_list_accounts',
    description:
      'Lista as redes sociais conectadas no perfil do cliente no NexoPost, status do token OAuth, contagem de seguidores e diretrizes do Cérebro da Marca liberados para o WhatsApp do remetente.',
    inputSchema: {
      type: 'object',
      properties: {
        sender_whatsapp: {
          type: 'string',
          description:
            'OBRIGATÓRIO: Número de WhatsApp ou @lid de quem enviou a mensagem no WhatsApp.',
        },
        client_name: {
          type: 'string',
          description: 'Nome do cliente/perfil no NexoPost liberado para este WhatsApp.',
        },
      },
      required: ['sender_whatsapp'],
    },
  },
];

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

async function callMyAccess(args) {
  const senderWhatsapp = String(args?.sender_whatsapp || '').trim();
  const link = findSenderLink(senderWhatsapp);
  if (!link) {
    return {
      verified: false,
      sender_whatsapp: senderWhatsapp,
      message:
        'Este número de WhatsApp não está verificado no NexoPost. Acesse https://nexopost.oriumdigital.tech/settings?tab=api, digite seu número de WhatsApp e confirme o código de 6 dígitos enviado pelo Hermes.',
    };
  }
  return {
    verified: true,
    user_name: link.user_name,
    user_email: link.user_email,
    phone_normalized: link.phone_normalized,
    scope: link.scope,
    allowed_profiles: (link.profiles || []).map((p) => ({
      profile_id: p.profile_id,
      profile_name: p.profile_name,
      connected_platforms: p.platforms,
    })),
  };
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
          version: '1.1.0',
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
      if (toolName === 'nexopost_my_access') {
        output = await callMyAccess(args);
      } else if (toolName === 'nexopost_schedule_post') {
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
