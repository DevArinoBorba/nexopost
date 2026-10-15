import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rotas que precisam de autenticação
  const protectedRoutes = ['/dashboard', '/upload', '/schedule', '/analytics', '/accounts', '/ai-shorts', '/autodm', '/audience', '/queue', '/settings'];

  // Verificar se é uma rota protegida
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));

  if (isProtectedRoute) {
    // Verificar token no localStorage (client-side)
    // Como middleware não tem acesso a localStorage, vamos apenas
    // passar a requisição e o client-side vai verificar
    // Em produção, usar cookies httponly
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard', '/upload', '/schedule', '/analytics', '/accounts', '/ai-shorts', '/autodm', '/audience', '/queue', '/settings'],
};
