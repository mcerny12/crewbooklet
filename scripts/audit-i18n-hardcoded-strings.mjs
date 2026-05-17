#!/usr/bin/env node
/**
 * Lightweight audit to flag likely-untranslated UI strings.
 *
 * Run with: `node scripts/audit-i18n-hardcoded-strings.mjs`
 *
 * It scans `app/`, `components/`, and `lib/` for:
 *   - JSX text content that looks like a user-facing label
 *     (≥3 chars, starts with a letter, contains a space or an umlaut)
 *   - `placeholder=`, `aria-label=`, `title=`, `label=` attributes with
 *     literal string values
 *
 * Known false positives are filtered:
 *   - `_legacy-migrations/`, `_unused/`, `node_modules/`, `.next/`,
 *     `messages/`, this script itself
 *   - JSX text that consists only of digits, CSS-like tokens, or
 *     non-alphabetic characters
 *   - `data-*` attributes
 *   - JSX containing `{` (interpolated)
 *
 * Output is the file:line, the attribute / context, and the offending
 * literal. The script is not authoritative — it's a tripwire to catch
 * obvious regressions when adding new UI.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const TARGET_DIRS = ['app', 'components', 'lib'];
const SKIP_DIRS = new Set([
  'node_modules', '.next', '_legacy-migrations', '_unused', 'messages',
  '.git', 'supabase',
]);
const SKIP_FILES = new Set([
  'lib/types/models.ts',
  'lib/services/supabase-service.ts',
  'components/ui/searchable-select.tsx',
]);

const ATTR_REGEX = /\b(placeholder|aria-label|title|label)\s*=\s*"([^"{}\n]{3,})"/g;
const JSX_TEXT_REGEX = />\s*([A-Za-zÄÖÜäöüß][^<>{}\n]{2,})\s*</g;

const ALLOWED_TEXT = new Set([
  // common tokens that are not user labels
  'true', 'false', 'null', 'undefined', 'CrewBooklet',
  'M', 'T', 'W', 'F', 'S', 'D', 'E',
]);

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) yield* walk(full);
    else if (/\.tsx?$/.test(entry)) yield full;
  }
}

function isProbablyLabel(text) {
  const t = text.trim();
  if (t.length < 3) return false;
  if (ALLOWED_TEXT.has(t)) return false;
  if (!/[A-Za-zÄÖÜäöüß]/.test(t)) return false;
  // Skip likely class names / urls / IDs
  if (/^[a-z][a-z0-9-]*$/.test(t) && !/\s/.test(t)) return false;
  if (/^https?:\/\//.test(t)) return false;
  return true;
}

const findings = [];

for (const dir of TARGET_DIRS) {
  const abs = join(ROOT, dir);
  try { statSync(abs); } catch { continue; }
  for (const file of walk(abs)) {
    const rel = relative(ROOT, file);
    if (SKIP_FILES.has(rel)) continue;
    const src = readFileSync(file, 'utf8');
    if (src.includes('useTranslations(')) {
      // Files that already use next-intl are likely OK; still scan for
      // missed attrs/text but don't dump every literal in service code.
    }
    const lines = src.split('\n');
    lines.forEach((line, i) => {
      // Skip comments
      const trimmed = line.trim();
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

      ATTR_REGEX.lastIndex = 0;
      let m;
      while ((m = ATTR_REGEX.exec(line)) !== null) {
        const [, attr, value] = m;
        if (!isProbablyLabel(value)) continue;
        findings.push({ file: rel, line: i + 1, kind: attr, value });
      }

      JSX_TEXT_REGEX.lastIndex = 0;
      while ((m = JSX_TEXT_REGEX.exec(line)) !== null) {
        const [, value] = m;
        if (!isProbablyLabel(value)) continue;
        findings.push({ file: rel, line: i + 1, kind: 'jsxText', value });
      }
    });
  }
}

if (findings.length === 0) {
  console.log('No likely-untranslated strings detected. ✓');
  process.exit(0);
}

const byFile = new Map();
for (const f of findings) {
  if (!byFile.has(f.file)) byFile.set(f.file, []);
  byFile.get(f.file).push(f);
}

console.log(`Found ${findings.length} candidate hardcoded strings in ${byFile.size} files.\n`);

for (const [file, list] of byFile) {
  console.log(`  ${file}`);
  for (const f of list.slice(0, 10)) {
    console.log(`    ${f.line}: [${f.kind}] ${f.value}`);
  }
  if (list.length > 10) console.log(`    … ${list.length - 10} more`);
  console.log('');
}

console.log('Note: this is a tripwire, not a proof. Review each match before fixing.');
