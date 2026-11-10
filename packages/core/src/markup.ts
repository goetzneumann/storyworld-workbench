import type { MarkSpan, Paragraph } from './types.js';

/**
 * Write marked text compactly: `[Mara]{e_mara} slipped inside [the lighthouse]{e_lh}`.
 * Several ids are comma-separated: `[them]{e_mara,e_jon}`. Used for sample data,
 * tests and plain-text import.
 */
export function parseMarkedText(source: string): Paragraph {
  const marks: MarkSpan[] = [];
  let text = '';
  const pattern = /\[([^\]]+)\]\{([^}]+)\}/g;
  let last = 0;
  for (const match of source.matchAll(pattern)) {
    const [whole, inner = '', ids = ''] = match;
    text += source.slice(last, match.index);
    const from = text.length;
    text += inner;
    marks.push({ from, to: text.length, elementIds: ids.split(',').map((s) => s.trim()).filter(Boolean) });
    last = (match.index ?? 0) + whole.length;
  }
  text += source.slice(last);
  return { text, marks };
}

/** The reverse of parseMarkedText. Marks must not overlap. */
export function toMarkedText(paragraph: Paragraph): string {
  const marks = [...paragraph.marks].sort((a, b) => a.from - b.from);
  let out = '';
  let pos = 0;
  for (const mark of marks) {
    if (mark.from < pos) continue;
    out += paragraph.text.slice(pos, mark.from);
    out += `[${paragraph.text.slice(mark.from, mark.to)}]{${mark.elementIds.join(',')}}`;
    pos = mark.to;
  }
  return out + paragraph.text.slice(pos);
}

/** Element ids marked anywhere in the paragraph. */
export function markedIds(paragraph: Paragraph): Set<string> {
  const ids = new Set<string>();
  for (const mark of paragraph.marks) for (const id of mark.elementIds) ids.add(id);
  return ids;
}

/**
 * The paragraph text with every marked span blanked out, so a search for
 * names finds only unmarked mentions. Blanks keep offsets and stop a name
 * from matching across a mark boundary.
 */
export function unmarkedText(paragraph: Paragraph): string {
  const chars = paragraph.text.split('');
  for (const mark of paragraph.marks) {
    for (let i = Math.max(0, mark.from); i < Math.min(chars.length, mark.to); i++) chars[i] = '\u0000';
  }
  return chars.join('');
}
