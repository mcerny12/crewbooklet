/**
 * Admin Users API
 * GET  /api/admin/users       — list all users with their roles
 * PATCH /api/admin/users      — update a user's role
 *
 * Protected: only callable by authenticated admins (middleware enforces /admin/* routes,
 * but this API route does its own check so it can't be hit directly).
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

async function assertAdmin() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.user_metadata?.role !== 'admin') {
    return null;
  }
  return user;
}

export async function GET() {
  const caller = await assertAdmin();
  if (!caller) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.listUsers();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const users = data.users.map((u) => ({
    id: u.id,
    email: u.email,
    role: (u.user_metadata?.role as string) || 'user',
    createdAt: u.created_at,
    lastSignIn: u.last_sign_in_at,
  }));

  return NextResponse.json({ users });
}

export async function PATCH(request: NextRequest) {
  const caller = await assertAdmin();
  if (!caller) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { userId, role } = body as { userId: string; role: string };

  if (!userId || !['admin', 'user', 'viewer'].includes(role)) {
    return NextResponse.json({ error: 'Invalid userId or role' }, { status: 400 });
  }

  // Prevent admins from demoting themselves
  if (userId === caller.id && role !== 'admin') {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    user_metadata: { role },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
