import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  return NextResponse.json(
    { error: 'Cadastro desabilitado: o NexoPost está configurado em modo pessoal (single-user).' },
    { status: 403 }
  );
}
