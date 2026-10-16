import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/activeProfile';
import {
  listUsersWithStats,
  createUser,
  getUserByEmail,
  getUserById,
  updateUser,
  updateUserPassword,
  deleteUser,
  createSession,
  getProfiles,
  createProfile,
} from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const currentUser = getCurrentUser();
  const users = listUsersWithStats();
  return NextResponse.json({
    users,
    currentUserId: currentUser.id,
    canManage: (currentUser.role || 'admin') === 'admin',
  });
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = getCurrentUser();
    const body = await request.json();

    // Trocar de conta rapidamente (impersonate / login direto pelo painel)
    if (body.action === 'switch_user') {
      const targetId = String(body.userId || '');
      const targetUser = getUserById(targetId);
      if (!targetUser) {
        return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
      }
      if (targetUser.status === 'suspended') {
        return NextResponse.json({ error: 'Não é possível entrar em uma conta suspensa.' }, { status: 400 });
      }

      const userAgent = request.headers.get('user-agent') || null;
      const ipAddress =
        request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        request.headers.get('x-real-ip') ||
        null;

      const session = createSession(targetUser.id, { userAgent, ipAddress });
      const profiles = getProfiles(targetUser.id);
      const firstProfile = profiles[0] || createProfile(targetUser.id, 'default');

      const response = NextResponse.json({
        success: true,
        user: {
          id: targetUser.id,
          email: targetUser.email,
          name: targetUser.name,
          plan: targetUser.plan,
          role: targetUser.role || 'user',
        },
        profile: firstProfile,
      });

      response.cookies.set('session', session.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        expires: new Date(session.expires_at),
        path: '/',
      });

      response.cookies.set('active_profile', firstProfile.id, {
        httpOnly: false,
        sameSite: 'lax',
        maxAge: 31536000,
        path: '/',
      });

      return response;
    }

    if ((currentUser.role || 'admin') !== 'admin') {
      return NextResponse.json({ error: 'Apenas administradores podem criar contas de usuários.' }, { status: 403 });
    }

    const { name, email, password, plan, role, company, phone, initialProfileName } = body as {
      name?: string;
      email?: string;
      password?: string;
      plan?: string;
      role?: 'admin' | 'user';
      company?: string;
      phone?: string;
      initialProfileName?: string;
    };

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Nome, email e senha são obrigatórios.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 6 caracteres.' }, { status: 400 });
    }
    if (getUserByEmail(email)) {
      return NextResponse.json({ error: 'Já existe um usuário cadastrado com este email.' }, { status: 400 });
    }

    const created = createUser({
      name,
      email,
      password,
      plan: plan || 'free',
      role: role || 'user',
      company: company || null,
      phone: phone || null,
      initialProfileName: initialProfileName || company || 'Principal',
    });

    return NextResponse.json({
      success: true,
      user: {
        id: created.id,
        email: created.email,
        name: created.name,
        plan: created.plan,
        role: created.role || 'user',
        status: created.status || 'active',
        company: created.company || null,
        phone: created.phone || null,
        created_at: created.created_at,
      },
      users: listUsersWithStats(),
    });
  } catch (error) {
    console.error('[api/users POST]', error);
    return NextResponse.json({ error: 'Erro ao criar conta de usuário.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = getCurrentUser();
    const body = await request.json();
    const { id, name, email, plan, role, status, company, phone, newPassword } = body as {
      id?: string;
      name?: string;
      email?: string;
      plan?: string;
      role?: 'admin' | 'user';
      status?: 'active' | 'suspended';
      company?: string;
      phone?: string;
      newPassword?: string;
    };

    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório.' }, { status: 400 });
    }

    const target = getUserById(id);
    if (!target) {
      return NextResponse.json({ error: 'Usuário não encontrado.' }, { status: 404 });
    }

    // Permite editar a si mesmo ou qualquer usuário se for admin
    if (currentUser.id !== id && (currentUser.role || 'admin') !== 'admin') {
      return NextResponse.json({ error: 'Sem permissão para editar este usuário.' }, { status: 403 });
    }

    if (email && email.trim().toLowerCase() !== target.email.toLowerCase()) {
      const existing = getUserByEmail(email);
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: 'Este email já está sendo usado por outro usuário.' }, { status: 400 });
      }
    }

    // Impede suspender a própria conta ativa
    if (id === currentUser.id && status === 'suspended') {
      return NextResponse.json({ error: 'Você não pode suspender a sua própria conta ativa.' }, { status: 400 });
    }

    const updated = updateUser(id, {
      name,
      email,
      plan,
      role,
      status,
      company,
      phone,
    });

    if (newPassword && newPassword.trim()) {
      if (newPassword.trim().length < 6) {
        return NextResponse.json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' }, { status: 400 });
      }
      updateUserPassword(id, newPassword.trim());
    }

    return NextResponse.json({
      success: true,
      user: updated,
      users: listUsersWithStats(),
    });
  } catch (error) {
    console.error('[api/users PATCH]', error);
    return NextResponse.json({ error: 'Falha ao atualizar usuário.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = getCurrentUser();
    const id = new URL(request.url).searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Parâmetro "id" é obrigatório.' }, { status: 400 });
    }

    if ((currentUser.role || 'admin') !== 'admin') {
      return NextResponse.json({ error: 'Apenas administradores podem remover usuários.' }, { status: 403 });
    }

    if (id === currentUser.id) {
      return NextResponse.json({ error: 'Você não pode excluir a conta em que está conectado no momento.' }, { status: 400 });
    }

    const allUsers = listUsersWithStats();
    if (allUsers.length <= 1) {
      return NextResponse.json({ error: 'Não é possível excluir o único usuário do sistema.' }, { status: 400 });
    }

    deleteUser(id);
    return NextResponse.json({
      success: true,
      users: listUsersWithStats(),
    });
  } catch (error) {
    console.error('[api/users DELETE]', error);
    return NextResponse.json({ error: 'Falha ao excluir usuário.' }, { status: 500 });
  }
}
