#!/usr/bin/env node
/**
 * NexoPost <-> Hermes WhatsApp Bridge Relay
 * Escuta em um Unix Socket compartilhado (/data/nexopost/data/hermes-whatsapp.sock)
 * para permitir que o container nexopost-web envie códigos de verificação de 6 dígitos
 * pelo WhatsApp Bridge do Hermes (127.0.0.1:3000) sem abrir portas TCP externas.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';

const SOCKET_PATH = process.env.HERMES_WHATSAPP_SOCKET || '/data/nexopost/data/hermes-whatsapp.sock';
const BRIDGE_URL = (process.env.HERMES_BRIDGE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const SESSION_DIR = process.env.HERMES_WHATSAPP_SESSION_DIR || '/root/.hermes/whatsapp/session';

function resolveWhatsAppTargets(phoneNormalized, phoneAlt) {
  const candidates = [phoneNormalized, phoneAlt].filter(Boolean);
  let resolvedLid = null;
  let preferredPhone = null;

  for (const phone of candidates) {
    const clean = String(phone).replace(/\D+/g, '');
    const mapFile = path.join(SESSION_DIR, `lid-mapping-${clean}.json`);
    if (fs.existsSync(mapFile)) {
      try {
        const lidNum = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
        if (lidNum) {
          resolvedLid = `${String(lidNum).replace(/@.*$/, '')}@lid`;
          preferredPhone = clean;
          break;
        }
      } catch {
        // ignore
      }
    }
  }

  const chatIds = [];
  if (resolvedLid) {
    chatIds.push(resolvedLid);
  }
  if (preferredPhone) {
    chatIds.push(`${preferredPhone}@s.whatsapp.net`);
  }
  for (const c of candidates) {
    const jid = `${String(c).replace(/\D+/g, '')}@s.whatsapp.net`;
    if (!chatIds.includes(jid)) chatIds.push(jid);
  }

  return { chatIds, resolvedLid };
}

async function sendToBridge(chatId, message) {
  const res = await fetch(`${BRIDGE_URL}/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
}

if (fs.existsSync(SOCKET_PATH)) {
  try {
    fs.unlinkSync(SOCKET_PATH);
  } catch {
    // ignore
  }
}

fs.mkdirSync(path.dirname(SOCKET_PATH), { recursive: true });

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (req.method === 'POST' && req.url === '/send-whatsapp') {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', async () => {
      try {
        const body = JSON.parse(raw || '{}');
        const { phone_normalized, phone_alt, message } = body;
        if (!phone_normalized || !message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'phone_normalized e message são obrigatórios.' }));
          return;
        }

        const { chatIds, resolvedLid } = resolveWhatsAppTargets(phone_normalized, phone_alt);
        let lastError = 'Nenhum destino válido';
        for (const chatId of chatIds) {
          try {
            await sendToBridge(chatId, message);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(
              JSON.stringify({
                success: true,
                resolvedJid: chatId,
                resolvedLid,
              })
            );
            return;
          } catch (err) {
            lastError = err.message || String(err);
          }
        }

        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: lastError }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message || String(err) }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(SOCKET_PATH, () => {
  try {
    fs.chmodSync(SOCKET_PATH, 0o666);
  } catch {
    // ignore
  }
  console.log(`[nexopost-whatsapp-relay] Listening on ${SOCKET_PATH} -> ${BRIDGE_URL}`);
});
