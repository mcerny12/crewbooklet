// Initial implementation; hardened by privacy/export agent.
import type { FeedbackItem } from './element-inspector';

function escapeXML(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function tag(name: string, value: string | number | null | undefined, indent: string): string {
  if (value === null || value === undefined || value === '') return '';
  return `${indent}<${name}>${escapeXML(String(value))}</${name}>\n`;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function timestampForFilename(d: Date): string {
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    `-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`
  );
}

export function feedbackItemsToXML(items: FeedbackItem[]): string {
  const exportedAt = new Date().toISOString();
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-8"?>');
  lines.push('<crewbooklet_feedback_export>');
  lines.push('  <summary>');
  lines.push(`    <exported_at>${escapeXML(exportedAt)}</exported_at>`);
  lines.push(`    <item_count>${items.length}</item_count>`);
  lines.push('  </summary>');

  for (const item of items) {
    lines.push('  <feedback_item>');
    lines.push(tag('id', item.id, '    ').trimEnd());
    lines.push(tag('uuid', item.uuid, '    ').trimEnd());
    lines.push(tag('timestamp', item.timestamp, '    ').trimEnd());
    lines.push(tag('type', item.type, '    ').trimEnd());
    lines.push(tag('severity', item.severity, '    ').trimEnd());
    lines.push(tag('problem', item.problem, '    ').trimEnd());
    lines.push(tag('expected_change', item.expectedChange, '    ').trimEnd());

    lines.push('    <context>');
    lines.push(tag('route', item.context.route, '      ').trimEnd());
    lines.push(tag('url', item.context.url, '      ').trimEnd());
    lines.push(`      <viewport width="${item.context.viewport.width}" height="${item.context.viewport.height}"/>`);
    lines.push(`      <scroll x="${item.context.scroll.x}" y="${item.context.scroll.y}"/>`);
    lines.push(tag('user_agent', item.context.userAgent, '      ').trimEnd());
    lines.push('    </context>');

    lines.push('    <target>');
    lines.push(tag('tag_name', item.target.tagName, '      ').trimEnd());
    lines.push(tag('visible_text', item.target.visibleText, '      ').trimEnd());
    lines.push(tag('aria_label', item.target.ariaLabel, '      ').trimEnd());
    lines.push(tag('role', item.target.role, '      ').trimEnd());
    lines.push(tag('element_id', item.target.id, '      ').trimEnd());
    lines.push(tag('class_name', item.target.className, '      ').trimEnd());
    lines.push(tag('selector', item.target.selector, '      ').trimEnd());
    lines.push(tag('component', item.target.component, '      ').trimEnd());
    lines.push(tag('area', item.target.area, '      ').trimEnd());
    lines.push(tag('field', item.target.field, '      ').trimEnd());
    lines.push(tag('action', item.target.action, '      ').trimEnd());
    lines.push(tag('entity', item.target.entity, '      ').trimEnd());
    lines.push('    </target>');

    lines.push('  </feedback_item>');
  }

  lines.push('</crewbooklet_feedback_export>');
  return lines.filter((l) => l.length > 0).join('\n') + '\n';
}

export function downloadFeedbackXML(items: FeedbackItem[]): void {
  if (typeof window === 'undefined') return;
  const xml = feedbackItemsToXML(items);
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const filename = `crewbooklet-feedback-${timestampForFilename(new Date())}.xml`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
