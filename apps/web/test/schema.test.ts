import { checkContinuity, sampleWorld, toMarkedText } from '@storyworld/core';
import { describe, expect, it } from 'vitest';
import { docToParagraphs, paragraphsToDoc, schema } from '../src/editor/schema';

describe('editor document <-> core paragraphs', () => {
  it('round-trips every scene of the sample without losing marks', () => {
    for (const scene of sampleWorld().scenes) {
      const back = docToParagraphs(paragraphsToDoc(scene.paragraphs));
      expect(back.map(toMarkedText)).toEqual(scene.paragraphs.map(toMarkedText));
    }
  });

  it('keeps the checker results identical after a round trip', () => {
    const world = sampleWorld();
    const before = checkContinuity(world).map((i) => i.id);
    for (const s of world.scenes) s.paragraphs = docToParagraphs(paragraphsToDoc(s.paragraphs));
    expect(checkContinuity(world).map((i) => i.id)).toEqual(before);
  });

  it('gives an empty scene one empty paragraph', () => {
    const doc = paragraphsToDoc([]);
    expect(doc.childCount).toBe(1);
    expect(docToParagraphs(doc)).toEqual([{ text: '', marks: [] }]);
  });

  it('does not extend a mark when typing at its edge', () => {
    expect(schema.marks.element.spec.inclusive).toBe(false);
  });
});
