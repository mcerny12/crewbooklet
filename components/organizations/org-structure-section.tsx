'use client';

import { useState, useEffect } from 'react';
import type { Organization } from '@/lib/types/models';
import { OrgRole } from '@/lib/types/models';
import { useOrganizationsStore } from '@/lib/stores/organizations-store';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrgStructureSectionProps {
  /** The committed (store-synced) organization — NOT editedOrg. */
  organization: Organization;
}

const ROLE_OPTIONS: { value: OrgRole; label: string }[] = [
  { value: OrgRole.Standalone, label: 'Standalone' },
  { value: OrgRole.Mother,     label: 'Mother' },
  { value: OrgRole.Subsidiary, label: 'Subsidiary' },
];

export function OrgStructureSection({ organization }: OrgStructureSectionProps) {
  const { isAdmin } = usePermissions();
  const organizations     = useOrganizationsStore(s => s.organizations);
  const setOrgRole        = useOrganizationsStore(s => s.setOrganizationRole);

  const committedRole = organization.org_role ?? OrgRole.Standalone;

  // pendingSubMode: user clicked "Subsidiary" but hasn't saved a parent yet
  const [pendingSubMode, setPendingSubMode]     = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(
    organization.parent_organization_id ?? null,
  );
  const [attachingSubId, setAttachingSubId]     = useState<string | null>(null);
  const [error, setError]                       = useState<string | null>(null);
  const [isBusy, setIsBusy]                     = useState(false);

  // Sync local picker state when the stored org changes (after a role save)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingSubMode(false);
     
    setSelectedParentId(organization.parent_organization_id ?? null);
     
    setError(null);
  }, [organization.id, organization.org_role, organization.parent_organization_id]);

  const displayRole = pendingSubMode ? OrgRole.Subsidiary : committedRole;

  // Sub-organizations currently attached to this org
  const subOrgs = organizations.filter(o => o.parent_organization_id === organization.id);

  // Mother orgs available as parent options (excluding self)
  const motherOrgs = organizations.filter(
    o => o.org_role === OrgRole.Mother && o.id !== organization.id,
  );

  // Standalone orgs eligible to be attached as subsidiaries (exclude self, mothers, already-subsidiaries)
  const eligibleToAttach = organizations.filter(
    o =>
      o.id !== organization.id &&
      (o.org_role == null || o.org_role === OrgRole.Standalone) &&
      o.parent_organization_id == null,
  );

  const run = async (fn: () => Promise<string | null>) => {
    setIsBusy(true);
    setError(null);
    const err = await fn();
    setIsBusy(false);
    if (err) setError(err);
    return !err;
  };

  const handleRoleClick = async (role: OrgRole) => {
    if (!isAdmin || isBusy) return;
    if (role === displayRole && !pendingSubMode) return;

    if (role === OrgRole.Subsidiary) {
      // Don't write to DB yet — just show the parent picker
      setPendingSubMode(true);
      setSelectedParentId(organization.parent_organization_id ?? null);
      setError(null);
      return;
    }

    // Standalone or Mother: write immediately
    const ok = await run(() => setOrgRole(organization.id, role, null));
    if (ok) setPendingSubMode(false);
  };

  const handleLinkParent = async () => {
    if (!selectedParentId || !isAdmin) return;
    const ok = await run(() => setOrgRole(organization.id, OrgRole.Subsidiary, selectedParentId));
    if (ok) setPendingSubMode(false);
  };

  const handleCancelPending = () => {
    setPendingSubMode(false);
    setSelectedParentId(organization.parent_organization_id ?? null);
    setError(null);
  };

  const handleDetachSub = async (sub: Organization) => {
    if (!isAdmin) return;
    if (!confirm(`Detach "${sub.name}" from this organization? It will become standalone.`)) return;
    await run(() => setOrgRole(sub.id, OrgRole.Standalone, null));
  };

  const handleAttachSub = async () => {
    if (!attachingSubId || !isAdmin) return;
    const ok = await run(() => setOrgRole(attachingSubId, OrgRole.Subsidiary, organization.id));
    if (ok) setAttachingSubId(null);
  };

  const parentOrg = organizations.find(o => o.id === organization.parent_organization_id);

  return (
    <div className="section-card">
      <div className="section-card-header">Organization Structure</div>
      <div className="section-card-body space-y-3 detail-form-fields">

        {/* ── Role selector (segmented control) ── */}
        <div className="space-y-1">
          <div className="text-[10px] text-gray-500">Role</div>
          <div className="flex rounded-md border overflow-hidden text-xs">
            {ROLE_OPTIONS.map((opt, idx) => (
              <button
                key={opt.value}
                type="button"
                disabled={!isAdmin || isBusy}
                onClick={() => handleRoleClick(opt.value)}
                className={cn(
                  'flex-1 py-1.5 px-2 font-medium transition-colors',
                  idx > 0 && 'border-l',
                  displayRole === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted/40 text-muted-foreground',
                  (!isAdmin || isBusy) && 'opacity-50 cursor-not-allowed',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {!isAdmin && (
            <p className="text-[10px] text-muted-foreground">Only admins can change the structure.</p>
          )}
        </div>

        {/* ── Mother: sub-organization list + attach picker ── */}
        {displayRole === OrgRole.Mother && (
          <div className="space-y-2">
            <div className="text-[10px] text-gray-500">
              Sub-organizations{subOrgs.length > 0 ? ` (${subOrgs.length})` : ''}
            </div>

            {subOrgs.length === 0 ? (
              <p className="text-xs text-muted-foreground">No sub-organizations attached yet.</p>
            ) : (
              <div className="space-y-1">
                {subOrgs.map(sub => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between border rounded px-2 py-1.5 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-medium truncate">{sub.name}</span>
                      {sub.jobs?.[0] && (
                        <span className="ml-2 text-muted-foreground">{sub.jobs[0]}</span>
                      )}
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDetachSub(sub)}
                        disabled={isBusy}
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive ml-2 shrink-0"
                        aria-label={`Detach ${sub.name}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {isAdmin && (
              <div className="flex gap-2">
                <SearchableSelect
                  options={eligibleToAttach.map(o => ({
                    id: o.id,
                    label: o.name,
                    sublabel: o.jobs?.[0],
                  }))}
                  value={attachingSubId}
                  onChange={setAttachingSubId}
                  placeholder="Attach organization…"
                  showOptionsWhenEmpty
                  className="flex-1"
                />
                <Button
                  size="sm"
                  className="h-7 text-xs shrink-0"
                  disabled={!attachingSubId || isBusy}
                  onClick={handleAttachSub}
                >
                  Attach
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Subsidiary: parent org picker ── */}
        {displayRole === OrgRole.Subsidiary && (
          <div className="space-y-1">
            <div className="text-[10px] text-gray-500">Parent Organization</div>

            {isAdmin ? (
              <div className="flex gap-2">
                <SearchableSelect
                  options={motherOrgs.map(o => ({
                    id: o.id,
                    label: o.name,
                    sublabel: o.jobs?.[0],
                  }))}
                  value={selectedParentId}
                  onChange={setSelectedParentId}
                  placeholder="Select parent organization…"
                  showOptionsWhenEmpty
                  className="flex-1"
                />
                <Button
                  size="sm"
                  className="h-7 text-xs shrink-0"
                  disabled={
                    !selectedParentId ||
                    selectedParentId === organization.parent_organization_id ||
                    isBusy
                  }
                  onClick={handleLinkParent}
                >
                  {committedRole === OrgRole.Subsidiary ? 'Change' : 'Link'}
                </Button>
                {pendingSubMode && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs shrink-0"
                    onClick={handleCancelPending}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-xs font-medium">{parentOrg?.name ?? '—'}</p>
            )}
          </div>
        )}

        {/* ── Error display ── */}
        {error && (
          <p className="text-xs text-destructive bg-destructive/10 rounded px-2 py-1.5">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
