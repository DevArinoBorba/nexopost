import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { getActiveProfile } from '@/lib/activeProfile';
import { saveMedia, DATA_SAFE } from '@/lib/paths';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const execFileAsync = promisify(execFile);

interface Preset {
  id: string;
  name: string;
  description: string;
  ext: string;
  args: (input: string, output: string) => string[];
}

const PRESETS: Record<string, Preset> = {
  vertical: {
    id: 'vertical',
    name: 'Vertical 9:16',
    description: 'Recorta para 1080x1920 (Shorts/Reels/TikTok)',
    ext: 'mp4',
    args: (i, o) => [
      '-y', '-i', i,
      '-vf', 'crop=in_h*9/16:in_h:(in_w-in_h*9/16)/2:0,scale=1080:1920',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'aac',
      o,
    ],
  },
  square: {
    id: 'square',
    name: 'Quadrado 1:1',
    description: 'Recorta para 1080x1080',
    ext: 'mp4',
    args: (i, o) => [
      '-y', '-i', i,
      '-vf', 'crop=min(iw\\,ih):min(iw\\,ih),scale=1080:1080',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'aac',
      o,
    ],
  },
  compress: {
    id: 'compress',
    name: 'Comprimir',
    description: 'Reduz o tamanho mantendo boa qualidade',
    ext: 'mp4',
    args: (i, o) => ['-y', '-i', i, '-vcodec', 'libx264', '-crf', '28', '-preset', 'fast', '-c:a', 'aac', o],
  },
  trim60: {
    id: 'trim60',
    name: 'Cortar em 60s',
    description: 'Mantém os primeiros 60 segundos',
    ext: 'mp4',
    args: (i, o) => ['-y', '-i', i, '-t', '60', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-c:a', 'aac', o],
  },
  audio: {
    id: 'audio',
    name: 'Extrair áudio',
    description: 'Exporta o áudio em MP3',
    ext: 'mp3',
    args: (i, o) => ['-y', '-i', i, '-vn', '-acodec', 'libmp3lame', '-q:a', '2', o],
  },
};

export async function GET() {
  return NextResponse.json({
    success: true,
    presets: Object.values(PRESETS).map((p) => ({ id: p.id, name: p.name, description: p.description, ext: p.ext })),
  });
}

export async function POST(request: NextRequest) {
  try {
    getActiveProfile();
    const form = await request.formData();
    const file = form.get('file') as File | null;
    const presetId = (form.get('preset') as string) || 'vertical';

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'Envie um arquivo de vídeo/áudio.' }, { status: 400 });
    }
    const preset = PRESETS[presetId];
    if (!preset) {
      return NextResponse.json({ error: `Preset inválido: ${presetId}` }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const input = saveMedia(buffer, file.name || 'input.bin');
    const outputName = `${Date.now()}-${presetId}.${preset.ext}`;
    const outputPath = path.join(DATA_SAFE, 'media', 'processed', outputName);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    try {
      await execFileAsync('ffmpeg', preset.args(input.filePath, outputPath), {
        maxBuffer: 1024 * 1024 * 32,
        timeout: 280_000,
      });
    } catch (e) {
      const err = e as { stderr?: string; message?: string };
      return NextResponse.json(
        { error: `FFmpeg falhou: ${(err.stderr || err.message || '').slice(-400)}` },
        { status: 500 }
      );
    }

    const stat = fs.statSync(outputPath);
    return NextResponse.json({
      success: true,
      name: outputName,
      size: stat.size,
      preset: preset.id,
      download_url: `/api/ffmpeg/download?name=${encodeURIComponent(outputName)}`,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
