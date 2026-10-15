import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { DATA_SAFE } from '@/lib/paths';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MIME: Record<string, string> = {
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
};

export async function GET(request: NextRequest) {
  const name = new URL(request.url).searchParams.get('name');
  if (!name) return NextResponse.json({ error: 'Parâmetro "name" obrigatório' }, { status: 400 });

  // Evita path traversal
  const safeName = path.basename(name);
  const filePath = path.join(DATA_SAFE, 'media', 'processed', safeName);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'Arquivo não encontrado' }, { status: 404 });
  }

  const data = fs.readFileSync(filePath);
  return new NextResponse(data, {
    headers: {
      'Content-Type': MIME[path.extname(safeName).toLowerCase()] || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${safeName}"`,
    },
  });
}
