import { describe, expect, it } from 'vitest';
import {
  checkContinuity,
  compareStoryTime,
  countUnmarked,
  formatStoryDate,
  markMentions,
  parseMarkedText,
  sampleWorld,
  storyPositions,
  toMarkedText,
  traitApplies,
  unmarkedText,
  type StoryWorld,
} from '../src/index.js';

const titles = (world: StoryWorld) => checkContinuity(world).map((i) => `${i.severity}: ${i.title}`);

describe('parseMarkedText', () => {
  it('turns bracket markup into text and offsets', () => {
    const p = parseMarkedText('[Mara]{e_mara} saw [them]{e_jon, e_key}.');
    expect(p.text).toBe('Mara saw them.');
    expect(p.marks).toEqual([
      { from: 0, to: 4, elementIds: ['e_mara'] },
      { from: 9, to: 13, elementIds: ['e_jon', 'e_key'] },
    ]);
  });

  it('round-trips through toMarkedText', () => {
    const src = 'In [Vienna]{e_vienna}, [Jon]{e_jon} wrote.';
    expect(toMarkedText(parseMarkedText(src))).toBe(src);
  });

  it('blanks marked spans so only unmarked names are found', () => {
    const p = parseMarkedText('[Mara]{e_mara} and Mara');
    expect(unmarkedText(p)).toBe('\u0000\u0000\u0000\u0000 and Mara');
  });
});

describe('story time', () => {
  it('places undated scenes after the previous dated scene, approximately', () => {
    const world = sampleWorld();
    world.scenes[2]!.storyDate = null;
    const pos = storyPositions(world.scenes);
    expect(pos.get('s3')).toEqual({ date: '1921-03-12', approximate: true, readingIndex: 2 });
  });

  it('orders by date first, then reading order', () => {
    const world = sampleWorld();
    world.scenes[0]!.storyDate = '1921-05-01'; // a flash-forward read first
    const pos = storyPositions(world.scenes);
    expect(compareStoryTime('s1', 's2', pos)).toBeGreaterThan(0);
    expect(compareStoryTime('s3', 's4', pos)).toBeLessThan(0);
  });

  it('applies a trait strictly after its start scene and up to its end scene', () => {
    const world = sampleWorld();
    const pos = storyPositions(world.scenes);
    const sealed = world.elements.find((e) => e.id === 'e_lh')!.traits[0]!;
    expect(traitApplies(sealed, 's2', pos)).toBe(false);
    expect(traitApplies(sealed, 's4', pos)).toBe(true);
    expect(traitApplies({ ...sealed, untilSceneId: 's3' }, 's4', pos)).toBe(false);
  });

  it('formats dates without time-zone drift', () => {
    expect(formatStoryDate('1921-04-03')).toBe('3 Apr 1921');
  });
});

describe('checkContinuity on the sample story', () => {
  it('finds the planted problems, errors first', () => {
    expect(titles(sampleWorld())).toEqual([
      'error: Mara and Jon at Lighthouse, which is “Sealed: door bricked up”',
      'error: Jon is in two places on 3 Apr 1921',
      "warning: Mara's “Fear of heights” isn't felt here",
      'idea: Mara is mentioned once without a mark',
      'idea: The Flood is mentioned once without a mark',
    ]);
  });

  it('gives issues stable ids across runs', () => {
    const a = checkContinuity(sampleWorld()).map((i) => i.id);
    const b = checkContinuity(sampleWorld()).map((i) => i.id);
    expect(a).toEqual(b);
    expect(new Set(a).size).toBe(a.length);
  });

  it('hides issues the author resolved', () => {
    const world = sampleWorld();
    const first = checkContinuity(world)[0]!;
    world.resolved[first.id] = 'intentional';
    expect(checkContinuity(world).map((i) => i.id)).not.toContain(first.id);
  });

  it('does not flag two places when a date is only approximate', () => {
    const world = sampleWorld();
    world.scenes[2]!.storyDate = null; // Vienna scene now "after 12 Mar", approximate
    expect(titles(world).some((t) => t.includes('two places'))).toBe(false);
  });

  it('does not flag a sealed place before the seal applies', () => {
    const world = sampleWorld();
    const sealed = world.elements.find((e) => e.id === 'e_lh')!.traits[0]!;
    sealed.afterSceneId = 's4';
    expect(titles(world).some((t) => t.includes('Sealed'))).toBe(false);
  });

  it('flags a hard watch word as an error', () => {
    const world = sampleWorld();
    world.scenes[3]!.paragraphs.push(parseMarkedText('[Mara]{e_mara} swam to the rocks.'));
    expect(titles(world)).toContain("error: Mara breaks “Can't swim”");
  });

  it('reports elements that exist only in notes', () => {
    const world = sampleWorld();
    world.elements.push({ id: 'e_ferry', type: 'person', name: 'The ferryman', aliases: [], notes: 'Knows about the key.', traits: [] });
    expect(titles(world)).toContain('idea: The ferryman exists only in your notes');
  });

  it('marks every unmarked mention and clears the idea', () => {
    const world = sampleWorld();
    const mara = world.elements.find((e) => e.id === 'e_mara')!;
    const s4 = world.scenes[3]!;
    s4.paragraphs = s4.paragraphs.map((p) => markMentions(p, mara));
    expect(toMarkedText(s4.paragraphs[1]!)).toBe('Below them the water rose over the rocks. [Mara]{e_mara} thought of the Flood and did not look down.');
    expect(titles(world)).not.toContain('idea: Mara is mentioned once without a mark');
  });

  it('counts whole-word, case-insensitive unmarked mentions only', () => {
    const world = sampleWorld();
    const mara = world.elements.find((e) => e.id === 'e_mara')!;
    const paras = [parseMarkedText('[Mara]{e_mara} met MARA, not Maradona, and Mara Lind.')];
    expect(countUnmarked(paras, mara)).toBe(2); // "MARA" and "Mara Lind"
  });
});
