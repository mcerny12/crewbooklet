'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/lib/stores/auth-store';
import { UserRoleDisplay } from '@/lib/types/models';
import { Shield } from 'lucide-react';

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

export default function AdminPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const currentUserId = useAuthStore((s) => s.session.userId);

  useEffect(() => {
    fetch('/api/admin/users')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setUsers(d.users);
      })
      .catch((e) => setError(e.message))
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
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u))
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update role');
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <MainLayout>
      <div className="p-6 max-w-3xl">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="h-5 w-5 text-gray-500" />
          <h1 className="text-xl font-semibold">User Management</h1>
        </div>

        {error && (
          <p className="text-sm text-red-600 mb-4">{error}</p>
        )}

        {isLoading ? (
          <p className="text-sm text-gray-500">Loading users…</p>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Email</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Role</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Joined</th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600">Last sign-in</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{user.email}</span>
                      {user.id === currentUserId && (
                        <span className="ml-2 text-xs text-gray-400">(you)</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {user.id === currentUserId ? (
                        <Badge className={`text-xs ${ROLE_BADGE[user.role]}`}>
                          {UserRoleDisplay[user.role as keyof typeof UserRoleDisplay] ?? user.role}
                        </Badge>
                      ) : (
                        <Select
                          value={user.role}
                          onValueChange={(v) => handleRoleChange(user.id, v)}
                          disabled={updatingId === user.id}
                        >
                          <SelectTrigger size="xs" className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrator</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {user.lastSignIn
                        ? new Date(user.lastSignIn).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
