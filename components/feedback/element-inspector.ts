export type FeedbackType =
  | 'bug'
  | 'visual_change'
  | 'missing_data'
  | 'broken_functionality'
  | 'content_copy'
  | 'other';

export type FeedbackSeverity = 'blocker' | 'high' | 'medium' | 'low';

export interface FeedbackTarget {
  tagName: string;
  visibleText: string | null;
  ariaLabel: string | null;
  role: string | null;
  id: string | null;
  className: string | null;
  selector: string;
  component: string | null;
  area: string | null;
  field: string | null;
  action: string | null;
  entity: string | null;
}

export interface FeedbackContext {
  route: string;
  url: string;
  viewport: { width: number; height: number };
  scroll: { x: number; y: number };
  userAgent: string;
}

export interface FeedbackItem {
  id: string;
  uuid: string;
  timestamp: string;
  type: FeedbackType;
  severity: FeedbackSeverity;
  problem: string;
  expectedChange: string;
  context: FeedbackContext;
  target: FeedbackTarget;
}

const SENSITIVE_NAME_RE = /pass|pwd|token|secret|apikey|api_key|auth/i;

function findAncestorAttr(el: Element, attr: string): string | null {
  const match = el.closest(`[${attr}]`);
  if (!match) return null;
  return match.getAttribute(attr);
}

export function extractVisibleText(el: Element): string | null {
  const raw = el.textContent;
  if (!raw) return null;
  const collapsed = raw.replace(/\s+/g, ' ').trim();
  if (!collapsed) return null;
  if (collapsed.length > 200) return collapsed.slice(0, 200) + '…';
  return collapsed;
}

export function buildSelector(el: Element): string {
  const component = findAncestorAttr(el, 'data-cb-component');
  const field = el.getAttribute('data-cb-field') ?? findAncestorAttr(el, 'data-cb-field');

  if (component) {
    let selector = `[data-cb-component="${component}"]`;
    if (field) selector += ` [data-cb-field="${field}"]`;
    return selector;
  }

  if (el.id) return `#${el.id}`;

  const tag = el.tagName.toLowerCase();
  const parent = el.parentElement;
  if (!parent) return tag;

  const siblings = Array.from(parent.children).filter(
    (c) => c.tagName === el.tagName
  );
  if (siblings.length === 1) return tag;
  const index = siblings.indexOf(el) + 1;
  return `${tag}:nth-of-type(${index})`;
}

export function extractTarget(el: Element): FeedbackTarget {
  const className =
    typeof el.className === 'string' && el.className.trim().length > 0
      ? el.className.trim()
      : null;

  return {
    tagName: el.tagName.toLowerCase(),
    visibleText: extractVisibleText(el),
    ariaLabel: el.getAttribute('aria-label'),
    role: el.getAttribute('role'),
    id: el.id || null,
    className,
    selector: buildSelector(el),
    component: findAncestorAttr(el, 'data-cb-component'),
    area: findAncestorAttr(el, 'data-cb-area'),
    field: findAncestorAttr(el, 'data-cb-field'),
    action: findAncestorAttr(el, 'data-cb-action'),
    entity: findAncestorAttr(el, 'data-cb-entity'),
  };
}

export function captureContext(): FeedbackContext {
  const route = window.location.pathname;
  const url = window.location.pathname + window.location.search;
  return {
    route,
    url,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    scroll: { x: window.scrollX, y: window.scrollY },
    userAgent: navigator.userAgent,
  };
}

export function isSensitiveElement(el: Element): boolean {
  let cur: Element | null = el;
  while (cur) {
    if (cur instanceof HTMLInputElement) {
      if (cur.type === 'password') return true;
      const ac = cur.getAttribute('autocomplete');
      if (ac === 'current-password' || ac === 'new-password') return true;
    }
    if (cur.hasAttribute('data-cb-sensitive')) return true;

    const name = cur.getAttribute('name');
    const id = cur.id;
    if (name && SENSITIVE_NAME_RE.test(name)) return true;
    if (id && SENSITIVE_NAME_RE.test(id)) return true;

    cur = cur.parentElement;
  }
  return false;
}
