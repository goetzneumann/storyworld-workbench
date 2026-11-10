import { parseMarkedText } from './markup.js';
import type { StoryWorld, Trait } from './types.js';

const trait = (t: Partial<Trait> & Pick<Trait, 'id' | 'name' | 'kind'>): Trait => ({
  watchWords: [],
  cannotBePresent: false,
  afterSceneId: null,
  untilSceneId: null,
  ...t,
});

/**
 * "The Lamp Room": the four-scene sample story from the prototype. It holds
 * deliberate continuity problems, which the tests rely on:
 * - Mara and Jon enter the lighthouse after its door was bricked up (error)
 * - Jon is in Vienna and at the lighthouse on 3 Apr 1921 (error)
 * - Mara runs up the stairs despite her fear of heights (warning)
 * - Mara and the Flood are mentioned without marks in the last scene (ideas)
 */
export function sampleWorld(): StoryWorld {
  return {
    title: 'The Lamp Room',
    chapters: [
      { id: 'c1', title: 'Before' },
      { id: 'c2', title: 'After' },
    ],
    scenes: [
      {
        id: 's1', chapterId: 'c1', title: 'The cliffs', storyDate: '1921-03-02', whenNote: 'Ten days before the Flood',
        paragraphs: [
          parseMarkedText('[Mara]{e_mara} never went near [the cliffs]{e_cliffs}; heights turned her legs to water. From the harbour she could see [the lighthouse]{e_lh}, white against the rain.'),
          parseMarkedText('Her brother [Jon]{e_jon} was leaving for [Vienna]{e_vienna} in the morning, and he had promised to write every week.'),
        ],
      },
      {
        id: 's2', chapterId: 'c1', title: 'The Flood', storyDate: '1921-03-12', whenNote: '',
        paragraphs: [
          parseMarkedText('When [the Flood]{e_flood} came, the sea took the lower town in a single night. Afterwards the harbour master had the door of [the lighthouse]{e_lh} bricked up, so that no one would try the stairs again.'),
          parseMarkedText('[Mara]{e_mara} watched from the church steps. She had kept [the brass key]{e_key} anyway.'),
        ],
      },
      {
        id: 's3', chapterId: 'c2', title: 'Letters from Vienna', storyDate: '1921-04-03', whenNote: '',
        paragraphs: [
          parseMarkedText('In [Vienna]{e_vienna}, [Jon]{e_jon} sat in a cold room above a bakery and wrote to his sister for the third time that week. The trams rang below the window all night.'),
        ],
      },
      {
        id: 's4', chapterId: 'c2', title: 'The lamp room', storyDate: '1921-04-03', whenNote: 'Night of the storm',
        paragraphs: [
          parseMarkedText('On the night of the storm, [Mara]{e_mara} slipped inside [the lighthouse]{e_lh} and ran up the stairs to the lamp room. [Jon]{e_jon} was beside her, holding the lantern.'),
          parseMarkedText('Below them the water rose over the rocks. Mara thought of the Flood and did not look down.'),
        ],
      },
    ],
    elements: [
      {
        id: 'e_mara', type: 'person', name: 'Mara', aliases: ['Mara Lind'], notes: "The lighthouse keeper's daughter, 19 in 1921.",
        traits: [
          trait({ id: 't1', name: 'Fear of heights', kind: 'soft', watchWords: ['climb', 'climbed', 'climbing', 'ran up', 'stairs', 'ladder', 'tower', 'roof'] }),
          trait({ id: 't2', name: "Can't swim", kind: 'hard', watchWords: ['swim', 'swam', 'swimming', 'dived'] }),
        ],
      },
      { id: 'e_jon', type: 'person', name: 'Jon', aliases: [], notes: "Mara's older brother.", traits: [] },
      {
        id: 'e_lh', type: 'place', name: 'Lighthouse', aliases: ['the lighthouse'], notes: 'On the north rocks, reached by a causeway.',
        traits: [trait({ id: 't3', name: 'Sealed: door bricked up', kind: 'hard', cannotBePresent: true, afterSceneId: 's2' })],
      },
      { id: 'e_cliffs', type: 'place', name: 'The cliffs', aliases: [], notes: '', traits: [] },
      {
        id: 'e_vienna', type: 'place', name: 'Vienna', aliases: [], notes: 'Two days from the coast by train.',
        traits: [trait({ id: 't4', name: 'Far away: two days by train', kind: 'soft' })],
      },
      { id: 'e_flood', type: 'time', name: 'The Flood', aliases: [], notes: 'Night of 12 March 1921.', traits: [] },
      { id: 'e_key', type: 'object', name: 'Brass key', aliases: ['the brass key'], notes: 'Opens the old lighthouse door.', traits: [] },
    ],
    links: [
      { id: 'l1', fromId: 'e_mara', relation: 'sister of', toId: 'e_jon', duringId: null },
      { id: 'l2', fromId: 'e_jon', relation: 'moves to', toId: 'e_vienna', duringId: null },
      { id: 'l3', fromId: 'e_lh', relation: 'sealed after', toId: 'e_flood', duringId: null },
      { id: 'l4', fromId: 'e_mara', relation: 'keeps', toId: 'e_key', duringId: 'e_flood' },
    ],
    resolved: {},
  };
}
