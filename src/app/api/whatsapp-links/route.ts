import http from 'http';
import path from 'path';
import fs from 'fs';
import { NextRequest, NextResponse } from 'next/server';
import { getActiveProfile, getCurrentUser } from '@/lib/activeProfile';
import {
  DATA_PATH,
  createOrUpdatePendingWhatsAppLink,
  deleteWhatsAppLink,
  getProfileById,
  getProfilesWithCounts,
  listApiKeys,
  listWhatsAppLinks,
  setWhatsAppLinkLid,
  syncHermesWhatsAppPermissionsFile,
  verifyWhatsAppLinkCode,
} from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RelayResponse {
  success: boolean;
  resolvedJid?: string;
  resolvedLid?: string | null;
  error?: string;
}

function sendViaHermesRelay(payload: {
  phone_normalized: string;
  phone_alt?: string | null;
  message: string;
}): Promise<RelayResponse> {
  return new Promise((resolve) => {
    const sockPath = process.env.HERMES_WHATSAPP_SOCKET || path.join(DATA_PATH, 'hermes-whatsapp.sock');

    if (!fs.existsSync(sockPath)) {
      resolve({
        success: false,
        error: 'Relay do WhatsApp Hermes não encontrado em ' + sockPath,
      });
      return;
    }

    const bodyStr = JSON.stringify(payload);
    const req = http.request(
      {
        socketPath: sockPath,
        path: '/send-whatsapp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
        },
        timeout: 15000,
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => {
          raw += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(raw);
            resolve({
              success: Boolean(parsed.success),
              resolvedJid: parsed.resolvedJid,
              resolvedLid: parsed.resolvedLid || null,
              error: parsed.error,
            });
          } catch {
            resolve({
              success: false,
              error: `Resposta inválida do relay (${res.statusCode}): ${raw.slice(0, 120)}`,
            });
          }
        });
      }
    );

    req.on('error', (err) => {
      resolve({
        success: false,
        error: err.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Timeout ao enviar mensagem pelo WhatsApp do Hermes.',
      });
    });

    req.write(bodyStr);
    req.end();
  });
}

export async function GET() {
  try {
    const user = getCurrentUser();
    const activeProfile = getActiveProfile();
    const profiles = getProfilesWithCounts(user.id);
    syncHermesWhatsAppPermissionsFile();
    const whatsappLinks = listWhatsAppLinks(user.id);

    return NextResponse.json({
      success: true,
      activeProfile: { id: activeProfile.id, username: activeProfile.username },
      profiles,
      whatsappLinks,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = getCurrentUser();
    const activeProfile = getActiveProfile();
    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'request_code');

    if (action === 'request_code') {
      const phone = String(body.phone || '').trim();
      const scope: 'user' | 'profile' = body.scope === 'profile' ? 'profile' : 'user';
      const profileId = scope === 'profile' ? String(body.profile_id || activeProfile.id).trim() : null;

      if (scope === 'profile' && profileId) {
        const targetProfile = getProfileById(profileId);
        if (!targetProfile || targetProfile.user_id !== user.id) {
          return NextResponse.json({ error: 'Perfil selecionado inválido.' }, { status: 400 });
        }
      }

      const { link, code } = createOrUpdatePendingWhatsAppLink({
        user_id: user.id,
        scope,
        profile_id: profileId,
        phone,
        label: body.label ? String(body.label) : undefined,
      });

      const scopeDescription =
        scope === 'profile' && link.profile_name
          ? `Apenas o perfil *${link.profile_name}*`
          : `Todos os perfis e contas conectadas do usuário *${user.name}*`;

      const waMessage = [
        `🔐 *NexoPost × Orium Agent — Código de Verificação*`,
        ``,
        `Olá! Foi solicitado o vínculo deste WhatsApp no painel do *NexoPost*.`,
        `• *Conta:* ${user.name} (${user.email})`,
        `• *Acesso liberado:* ${scopeDescription}`,
        ``,
        `Seu código de verificação de 6 dígitos é:`,
        `*${code}*`,
        ``,
        `_Digite este código na tela do NexoPost em até 10 minutos para concluir a liberação._`,
      ].join('\n');

      const relayRes = await sendViaHermesRelay({
        phone_normalized: link.phone_normalized,
        phone_alt: link.phone_alt,
        message: waMessage,
      });

      if (relayRes.resolvedLid) {
        setWhatsAppLinkLid(link.id, relayRes.resolvedLid);
      }

      if (!relayRes.success) {
        return NextResponse.json(
          {
            error: `Não foi possível enviar a mensagem no WhatsApp (${relayRes.error || 'erro desconhecido'}). Verifique se o número está correto e com DDI+DDD.`,
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        link: listWhatsAppLinks(user.id).find((l) => l.id === link.id) || link,
        whatsappLinks: listWhatsAppLinks(user.id),
        message: `Código de 6 dígitos enviado para o WhatsApp +${link.phone_normalized}!`,
      });
    }

    if (action === 'verify_code') {
      const linkId = String(body.link_id || '').trim();
      const code = String(body.code || '').trim();

      if (!linkId || !code) {
        return NextResponse.json({ error: 'Informe o código de 6 dígitos recebido no WhatsApp.' }, { status: 400 });
      }

      const verifiedLink = verifyWhatsAppLinkCode(user.id, linkId, code);

      const allowedNames = verifiedLink.allowed_profiles.map((p) => p.username).join(', ');
      const confirmMsg = [
        `✅ *NexoPost — WhatsApp Verificado com Sucesso!*`,
        ``,
        `Este número (+${verifiedLink.phone_normalized}) agora está autorizado a publicar, agendar e consultar métricas pelo WhatsApp.`,
        `• *Usuário NexoPost:* ${user.name}`,
        `• *Perfis liberados para este número:* ${allowedNames || 'Nenhum perfil ainda'}`,
        ``,
        `Você só poderá publicar nas redes sociais conectadas aos perfis acima.`,
      ].join('\n');

      const relayRes = await sendViaHermesRelay({
        phone_normalized: verifiedLink.phone_normalized,
        phone_alt: verifiedLink.phone_alt,
        message: confirmMsg,
      });

      if (relayRes.resolvedLid && !verifiedLink.whatsapp_lid) {
        setWhatsAppLinkLid(verifiedLink.id, relayRes.resolvedLid);
        syncHermesWhatsAppPermissionsFile();
      }

      return NextResponse.json({
        success: true,
        link: listWhatsAppLinks(user.id).find((l) => l.id === verifiedLink.id) || verifiedLink,
        whatsappLinks: listWhatsAppLinks(user.id),
        apiKeys: listApiKeys(user.id),
        message: `WhatsApp +${verifiedLink.phone_normalized} verificado e liberado no Hermes!`,
      });
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = getCurrentUser();
    const id = request.nextUrl.searchParams.get('id') || '';
    if (!id) {
      return NextResponse.json({ error: 'ID do vínculo é obrigatório.' }, { status: 400 });
    }

    const removed = deleteWhatsAppLink(id, user.id);
    if (!removed) {
      return NextResponse.json({ error: 'Vínculo não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      whatsappLinks: listWhatsAppLinks(user.id),
      apiKeys: listApiKeys(user.id),
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
