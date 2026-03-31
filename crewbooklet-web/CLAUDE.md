# CrewBooklet Web — Development Rules

## RULE: No plain dropdowns for large option lists

**Never** use a plain `<Select>` / `<SelectContent>` for lists with more than ~8 options.
Use `<SearchableSelect>` from `@/components/ui/searchable-select` instead.

### When to use SearchableSelect
- Country fields (FILM_COUNTRIES — 34 options)
- JobType / role fields (40+ options)
- OrganizationJobType fields (20 options)
- CrewDepartment fields (19 options)
- Any entity selection (people, organizations, projects)

### When plain Select is fine
- Gender (3 options)
- Language (5 options)
- ProjectStatus (6 options)
- AssignmentStatus (9 options)
- Any list with fewer than ~8 options where all items are immediately readable

### SearchableSelect behaviour
- Shows **no results** until the user types at least one character
- Filters by label and sublabel
- Returns `string | null` via `onChange`

### Usage pattern
```tsx
import { SearchableSelect } from '@/components/ui/searchable-select';

<SearchableSelect
  options={FILM_COUNTRIES.map(c => ({ id: c, label: c }))}
  value={country || null}
  onChange={(v) => setCountry(v ?? '')}
  placeholder="Search country..."
/>
```

For enums:
```tsx
<SearchableSelect
  options={Object.values(JobType).map(j => ({ id: j, label: j }))}
  value={selectedJob || null}
  onChange={(v) => setSelectedJob(v)}
  placeholder="Search role..."
/>
```

For entity lists (people, orgs, projects):
```tsx
<SearchableSelect
  options={people.map(p => ({ id: p.id, label: p.name, sublabel: p.jobs?.[0] }))}
  value={selectedPersonId}
  onChange={setSelectedPersonId}
  placeholder="Search person..."
/>
```
