# CrewBooklet — Project Rules for AI Agents

This file is automatically loaded by Claude Code at the start of every session.
Rules here are non-negotiable and must be followed before writing any code.

---

## UI: No plain dropdowns for large option lists

**Never** use a plain `<Select>` / `<SelectContent>` for lists with more than ~8 options.
Use `<SearchableSelect>` from `@/components/ui/searchable-select` instead.

**Why:** The app will have 1000+ datasets. Scrolling through a long dropdown is unusable.

### Must use SearchableSelect
- Country fields (`FILM_COUNTRIES` — 34 options)
- `JobType` / role fields (40+ options)
- `OrganizationJobType` fields (20 options)
- `CrewDepartment` fields (19 options)
- Any entity selection (people, organizations, projects)

### Plain Select is fine for
- Gender (3), Language (5), ProjectStatus (6), AssignmentStatus (9)
- Any fixed list with fewer than ~8 options

### SearchableSelect shows NO results until the user types
```tsx
import { SearchableSelect } from '@/components/ui/searchable-select';

// Country / enum:
<SearchableSelect
  options={FILM_COUNTRIES.map(c => ({ id: c, label: c }))}
  value={country || null}
  onChange={(v) => setCountry(v ?? '')}
  placeholder="Search country..."
/>

// Entity (person/org/project):
<SearchableSelect
  options={people.map(p => ({ id: p.id, label: p.name, sublabel: p.jobs?.[0] }))}
  value={selectedPersonId}
  onChange={setSelectedPersonId}
  placeholder="Search person..."
/>
```

---

## UI: Consistent field heights

All form inputs, selects, and triggers must use `h-7 text-xs`.
Use `size="xs"` on `<SelectTrigger>` — never omit it.

---

## UI: Auto-save pattern

Detail views (person, org, project) use a 1000ms debounce auto-save.
Do not add explicit save buttons to detail forms — changes save automatically.
