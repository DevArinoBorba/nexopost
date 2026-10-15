import fs from 'fs';
import path from 'path';

export const DATA_SAFE = path.resolve(process.cwd(), process.env.DATA_DIR || './data');

/** Salva um buffer no diretório de mídia e retorna o caminho + tamanho. */
export function saveMedia(buffer: Buffer, filename: string): { filePath: string; size: number } {
  const mediaDir = path.join(DATA_SAFE, 'media');
  fs.mkdirSync(mediaDir, { recursive: true });
  const safe = `${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const filePath = path.join(mediaDir, safe);
  fs.writeFileSync(filePath, buffer);
  return { filePath, size: buffer.length };
}
