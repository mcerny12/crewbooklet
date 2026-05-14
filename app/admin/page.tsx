'use client';

import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/main-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useJobTypesStore } from '@/lib/stores/job-types-store';
import { UserRoleDisplay } from '@/lib/types/models';
import { Shield, Plus, Trash2, Pencil, Check, X } from 'lucide-react';
import { MobilePageHeader } from '@/components/layout/mobile-page-header';

// ── Types ────────────────────────────────────────────────────

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

const JOB_CATEGORIES = [
  'Production', 'Direction', 'Camera', 'Sound', 'Lighting',
  'Grip', 'Art Department', 'Hair & Makeup', 'Wardrobe',
  'Post-Production', 'Other',
];

// ── Users tab ────────────────────────────────────────────────

function UsersTab() {
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
      setError(e instanceof Error ? e.message : 'Failed to update role');
    } finally {
      setUpdatingId(null);
    }
  }

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (isLoading) return <p className="text-sm text-gray-500">Loading…</p>;

  return (
    <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-140">
        <thead className="bg-muted/40 border-b">
          <tr>
            <th className="text-left px-5 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Email</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Joined</th>
            <th className="text-left px-4 py-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Last sign-in</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {users.map(user => (
            <tr key={user.id} className="hover:bg-muted/20 transition-colors">
              <td className="px-5 py-3">
                <span className="font-medium">{user.email}</span>
                {user.id === currentUserId && (
                  <span className="ml-2 text-xs text-gray-400">(you)</span>
                )}
              </td>
              <td className="px-4 py-3">
                {user.id === currentUserId ? (
                  <Badge className={`text-xs ${ROLE_BADGE[user.role]}`}>
                    {UserRoleDisplay[user.role as keyof typeof UserRoleDisplay] ?? user.role}
                  </Badge>
                ) : (
                  <Select value={user.role} onValueChange={v => handleRoleChange(user.id, v)} disabled={updatingId === user.id}>
                    <SelectTrigger size="xs" className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrator</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground text-[13px] tabular-nums">{new Date(user.createdAt).toLocaleDateString()}</td>
              <td className="px-4 py-2.5 text-gray-500">
                {user.lastSignIn ? new Date(user.lastSignIn).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// ── Job Types tab ─────────────────────────────────────────────

function JobTypesTab() {
  const { jobTypes, isLoading, fetchJobTypes, addJobType, updateJobType, deleteJobType } = useJobTypesStore();
  const [error, setError] = useState<string | null>(null);

  // New job form
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState(JOB_CATEGORIES[0]);
  const [adding, setAdding] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');

  useEffect(() => { fetchJobTypes(); }, [fetchJobTypes]);

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await addJobType(newName.trim(), newCategory);
      setNewName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add');
    } finally {
      setAdding(false);
    }
  }

  function startEdit(id: string, name: string, category: string) {
    setEditingId(id);
    setEditName(name);
    setEditCategory(category);
  }

  async function commitEdit() {
    if (!editingId || !editName.trim()) return;
    try {
      await updateJobType(editingId, { name: editName.trim(), category: editCategory });
      setEditingId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update');
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete job type "${name}"? This won't affect existing crew assignments.`)) return;
    try {
      await deleteJobType(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    }
  }

  const grouped = JOB_CATEGORIES.map(cat => ({
    category: cat,
    jobs: jobTypes.filter(j => j.category === cat),
  })).filter(g => g.jobs.length > 0);

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Add new job */}
      <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
        <Input
          placeholder="New job title…"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="h-7 text-xs flex-1"
        />
        <Select value={newCategory} onValueChange={setNewCategory}>
          <SelectTrigger size="xs" className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {JOB_CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={handleAdd} disabled={adding || !newName.trim()} className="h-7 text-xs gap-1">
          <Plus className="h-3 w-3" />Add
        </Button>
      </div>

      {/* Job list grouped by category */}
      {isLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ category, jobs }) => (
            <div key={category}>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 px-1">
                {category}
              </div>
              <div className="border rounded-lg divide-y overflow-hidden">
                {jobs.map(job => (
                  <div key={job.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50">
                    {editingId === job.id ? (
                      <>
                        <Input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && commitEdit()}
                          className="h-6 text-xs flex-1"
                          autoFocus
                        />
                        <Select value={editCategory} onValueChange={setEditCategory}>
                          <SelectTrigger size="xs" className="w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {JOB_CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <button onClick={commitEdit} className="text-green-600 hover:text-green-700">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm">{job.name}</span>
                        <button
                          onClick={() => startEdit(job.id, job.name, job.category)}
                          className="text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(job.id, job.name)}
                          className="text-gray-300 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function AdminPage() {
  return (
    <MainLayout>
      <div className="flex h-full flex-col">
        {/* Mobile header */}
        <MobilePageHeader title="Admin Panel" />
        {/* Desktop header */}
        <div className="hidden lg:flex shrink-0 border-b bg-card h-12 items-center gap-2 px-4">
          <Shield className="h-4 w-4 text-primary" aria-hidden />
          <h1 className="text-[15px] font-semibold tracking-tight">Admin Panel</h1>
        </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-3xl">

        <Tabs defaultValue="users">
          <TabsList className="mb-4">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="jobs">Job Types</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          <TabsContent value="jobs">
            <JobTypesTab />
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </MainLayout>
  );
}
