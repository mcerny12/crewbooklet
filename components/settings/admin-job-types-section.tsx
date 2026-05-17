'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useJobTypesStore } from '@/lib/stores/job-types-store';
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react';

const JOB_CATEGORIES = [
  'Production', 'Direction', 'Camera', 'Sound', 'Lighting',
  'Grip', 'Art Department', 'Hair & Makeup', 'Wardrobe',
  'Post-Production', 'Other',
];

export function AdminJobTypesSection() {
  const t = useTranslations('admin.jobTypes');
  const tCommon = useTranslations('common');
  const { jobTypes, isLoading, fetchJobTypes, addJobType, updateJobType, deleteJobType } = useJobTypesStore();
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState(JOB_CATEGORIES[0]);
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');

  useEffect(() => { fetchJobTypes(); }, [fetchJobTypes]);

  const categoryLabel = (cat: string) => {
    try { return t(`categories.${cat}`); } catch { return cat; }
  };

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await addJobType(newName.trim(), newCategory);
      setNewName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('addFailed'));
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
      setError(e instanceof Error ? e.message : t('updateFailed'));
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(t('confirmDelete', { name }))) return;
    try {
      await deleteJobType(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('deleteFailed'));
    }
  }

  const grouped = JOB_CATEGORIES.map(cat => ({
    category: cat,
    jobs: jobTypes.filter(j => j.category === cat),
  })).filter(g => g.jobs.length > 0);

  return (
    <div className="space-y-6">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-2 p-3 border rounded-lg bg-gray-50">
        <Input
          placeholder={t('newJobPlaceholder')}
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="h-7 text-xs flex-1"
        />
        <Select value={newCategory} onValueChange={setNewCategory}>
          <SelectTrigger size="xs" className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {JOB_CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{categoryLabel(c)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={handleAdd} disabled={adding || !newName.trim()} className="h-7 text-xs gap-1">
          <Plus className="h-3 w-3" />{t('addAction')}
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-500">{tCommon('loading')}</p>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ category, jobs }) => (
            <div key={category}>
              <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1 px-1">
                {categoryLabel(category)}
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
                            {JOB_CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs">{categoryLabel(c)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <button onClick={commitEdit} aria-label={tCommon('save')} className="text-green-600 hover:text-green-700">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)} aria-label={tCommon('cancel')} className="text-gray-400 hover:text-gray-600">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm">{job.name}</span>
                        <button
                          onClick={() => startEdit(job.id, job.name, job.category)}
                          aria-label={tCommon('edit')}
                          className="text-gray-300 hover:text-gray-600"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(job.id, job.name)}
                          aria-label={tCommon('delete')}
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
