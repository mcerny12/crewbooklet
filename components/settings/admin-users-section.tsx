'use client';

import { useEffect, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/lib/stores/auth-store';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  lastSignIn: string | null;
}

const ROLE_BADGE: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  user: 'bg-blue-100 text-blue-700',
  viewer: 'bg-gray-100 text-gray-600',
};

export function AdminUsersSection() {
  const t = useTranslations('admin.users');
  const tRoles = useTranslations('roles');
  const tCommon = useTranslations('common');
  const format = useFormatter();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const currentUserId = useAuthStore((s) => s.session.userId);

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setUsers(d.users); })
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleRoleChange(userId: string, role: string) {
    setUpdatingId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('failedToUpdate'));
    } finally {
      setUpdatingId(null);
    }
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (isLoading) return <p className="text-sm text-gray-500">{tCommon('loading')}</p>;

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-140">
          <thead className="bg-muted/40 border-b">
            <tr>
              <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t('columns.email')}</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t('columns.role')}</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t('columns.joined')}</th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t('columns.lastSignIn')}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map(user => {
              const roleKey = (user.role === 'admin' || user.role === 'user' || user.role === 'viewer') ? user.role : 'viewer';
              return (
                <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3">
                    <span className="font-medium">{user.email}</span>
                    {user.id === currentUserId && (
                      <span className="ml-2 text-xs text-gray-400">({tCommon('you')})</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {user.id === currentUserId ? (
                      <Badge className={`text-xs ${ROLE_BADGE[user.role]}`}>
                        {tRoles(roleKey)}
                      </Badge>
                    ) : (
                      <Select value={user.role} onValueChange={v => handleRoleChange(user.id, v)} disabled={updatingId === user.id}>
                        <SelectTrigger size="xs" className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">{tRoles('admin')}</SelectItem>
                          <SelectItem value="user">{tRoles('user')}</SelectItem>
                          <SelectItem value="viewer">{tRoles('viewer')}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-[13px] tabular-nums">
                    {format.dateTime(new Date(user.createdAt), { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">
                    {user.lastSignIn
                      ? format.dateTime(new Date(user.lastSignIn), { day: '2-digit', month: '2-digit', year: 'numeric' })
                      : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
