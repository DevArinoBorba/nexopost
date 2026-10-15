import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DATA_SAFE } from '@/lib/paths';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Serve arquivos de mídia para as plataformas que exigem URL pública (ex.: Instagram).
// Só expõe arquivos dentro de data/media.

const MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

export async function GET(_request: NextRequest, { params }: { params: { name: string } }) {
  const safeName = path.basename(decodeURIComponent(params.name));
  const filePath = path.join(DATA_SAFE, 'media', safeName);

  if (!filePath.startsWith(path.join(DATA_SAFE, 'media')) || !fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const data = fs.readFileSync(filePath);

  return new NextResponse(data, {
    headers: {
      'Content-Type': MIME[path.extname(safeName).toLowerCase()] || 'application/octet-stream',
      'Content-Length': String(stat.size),
      'Cache-Control': 'public, max-age=3600',
      'Accept-Ranges': 'bytes',
    },
  });
}
