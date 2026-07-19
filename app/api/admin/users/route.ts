/**
 * Admin Users API
 * GET  /api/admin/users  — list all users with their roles
 * PATCH /api/admin/users — update a user's role
 *
 * Protected: caller must be an authenticated admin (verified server-side).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

async function assertAdmin() {
  const { supabase, responseHeaders } = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const caller = user && user.app_metadata?.role === 'admin' ? user : null;
  return { caller, responseHeaders };
}

export async function GET() {
  const { caller, responseHeaders } = await assertAdmin();
  if (!caller) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: responseHeaders });
  }

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 503, headers: responseHeaders });
  }

  const { data, error } = await admin.auth.admin.listUsers();
  if (error) {
    console.error('admin listUsers:', error.message);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500, headers: responseHeaders });
  }

  const users = data.users.map((u) => ({
    id: u.id,
    email: u.email,
    role: (u.app_metadata?.role as string) || 'user',
    createdAt: u.created_at,
    lastSignIn: u.last_sign_in_at,
  }));

  return NextResponse.json({ users }, { headers: responseHeaders });
}

const patchSchema = z.object({
  userId: z.uuid(),
  role: z.enum(['admin', 'user', 'viewer']),
});

export async function PATCH(request: NextRequest) {
  const { caller, responseHeaders } = await assertAdmin();
  if (!caller) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: responseHeaders });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400, headers: responseHeaders });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid userId or role' }, { status: 400, headers: responseHeaders });
  }

  const { userId, role } = parsed.data;

  if (userId === caller.id) {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400, headers: responseHeaders });
  }

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 503, headers: responseHeaders });
  }

  const { error } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  });

  if (error) {
    console.error('admin updateUserById:', error.message);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500, headers: responseHeaders });
  }

  return NextResponse.json({ success: true }, { headers: responseHeaders });
}
