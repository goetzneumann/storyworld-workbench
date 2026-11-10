import type { Paragraph } from '@storyworld/core';
import { Schema, type Mark, type Node as PMNode } from 'prosemirror-model';

/**
 * Scenes are plain paragraphs of prose. A story-element mark carries the ids
 * of the elements it points at. `inclusive: false` means typing at the edge of
 * a mark does not extend it (a known glitch in the single-file prototype).
 */
export const schema = new Schema({
  nodes: {
    doc: { content: 'paragraph+' },
    paragraph: {
      content: 'text*',
      parseDOM: [{ tag: 'p' }],
      toDOM: () => ['p', 0],
    },
    text: {},
  },
  marks: {
    element: {
      attrs: { ids: { default: [] as string[] } },
      inclusive: false,
      parseDOM: [{
        tag: 'span[data-ids]',
        getAttrs: (dom) => ({ ids: ((dom as HTMLElement).dataset.ids ?? '').split(',').filter(Boolean) }),
      }],
      toDOM: (mark) => {
        const ids = mark.attrs.ids as string[];
        return ['span', { class: ids.length > 1 ? 'mk multi' : 'mk', 'data-ids': ids.join(','), 'data-first': ids[0] ?? '' }, 0];
      },
    },
  },
});

const elementMark = (marks: readonly Mark[]) => marks.find((m) => m.type === schema.marks.element);

/** ProseMirror document -> core paragraphs (the storage format). */
export function docToParagraphs(doc: PMNode): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  doc.forEach((block) => {
    let text = '';
    const marks: Paragraph['marks'] = [];
    block.forEach((inline) => {
      const from = text.length;
      text += inline.text ?? '';
      const mark = elementMark(inline.marks);
      if (!mark) return;
      const ids = mark.attrs.ids as string[];
      const prev = marks.at(-1);
      // Adjacent text nodes with the same mark come from one mark split by formatting; join them.
      if (prev && prev.to === from && prev.elementIds.join() === ids.join()) prev.to = text.length;
      else marks.push({ from, to: text.length, elementIds: [...ids] });
    });
    paragraphs.push({ text, marks });
  });
  return paragraphs;
}

/** Core paragraphs -> ProseMirror document. */
export function paragraphsToDoc(paragraphs: readonly Paragraph[]): PMNode {
  const blocks = (paragraphs.length ? paragraphs : [{ text: '', marks: [] }]).map((p) => {
    const cuts = new Set<number>([0, p.text.length]);
    for (const m of p.marks) { cuts.add(Math.max(0, m.from)); cuts.add(Math.min(p.text.length, m.to)); }
    const points = [...cuts].sort((a, b) => a - b);
    const inlines: PMNode[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i]!;
      const to = points[i + 1]!;
      if (to <= from) continue;
      const covering = p.marks.find((m) => m.from <= from && m.to >= to);
      const marks = covering ? [schema.marks.element.create({ ids: covering.elementIds })] : [];
      inlines.push(schema.text(p.text.slice(from, to), marks));
    }
    return schema.nodes.paragraph.create(null, inlines);
  });
  return schema.nodes.doc.create(null, blocks);
}
