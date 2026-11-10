/**
 * The story world model. Everything here is plain data (JSON-safe), so the
 * same objects travel between the browser, the API, the database and Claude.
 */

export type ElementType = 'person' | 'place' | 'time' | 'object' | 'group' | 'rule';

export const ELEMENT_TYPES: readonly ElementType[] = ['person', 'place', 'time', 'object', 'group', 'rule'];

export const ELEMENT_TYPE_LABELS: Record<ElementType, string> = {
  person: 'Person',
  place: 'Place',
  time: 'Time',
  object: 'Object',
  group: 'Group',
  rule: 'Rule',
};

/**
 * hard: breaking it is an error unless the text explains it.
 * soft: breaking it is a story beat; the reader should feel the cost.
 * knowledge: who knows what, and since when.
 */
export type TraitKind = 'hard' | 'soft' | 'knowledge';

export const TRAIT_KIND_LABELS: Record<TraitKind, string> = {
  hard: 'Hard',
  soft: 'Soft',
  knowledge: 'Knowledge',
};

export interface Trait {
  id: string;
  name: string;
  kind: TraitKind;
  /** Words or phrases that, near a mark of this element, suggest the trait is being tested. */
  watchWords: string[];
  /** The element cannot be present (dead, sealed, destroyed, lost) while the trait applies. */
  cannotBePresent: boolean;
  /** The trait applies only to scenes after this one in story time. Null: from the start. */
  afterSceneId: string | null;
  /** The trait stops applying after this scene in story time. Null: to the end. */
  untilSceneId: string | null;
}

export interface StoryElement {
  id: string;
  type: ElementType;
  name: string;
  aliases: string[];
  /** Author notes: planned canon, not yet established by the text. */
  notes: string;
  traits: Trait[];
}

/** A typed relation: "Mara keeps the brass key during the Flood". */
export interface Link {
  id: string;
  fromId: string;
  relation: string;
  toId: string;
  /** Optional Time element the link holds during. */
  duringId: string | null;
}

/** A mark: a span of paragraph text tied to one or more story elements. Offsets are UTF-16 code units. */
export interface MarkSpan {
  from: number;
  to: number;
  elementIds: string[];
}

export interface Paragraph {
  text: string;
  marks: MarkSpan[];
}

export interface Chapter {
  id: string;
  title: string;
}

export interface Scene {
  id: string;
  chapterId: string;
  title: string;
  /** Exact story date (YYYY-MM-DD), or null when only relative or unknown. */
  storyDate: string | null;
  /** Free text such as "a few weeks after the Flood". */
  whenNote: string;
  paragraphs: Paragraph[];
}

export type Resolution = 'intentional' | 'dismissed';

export interface StoryWorld {
  title: string;
  chapters: Chapter[];
  /** Scenes in reading order. */
  scenes: Scene[];
  elements: StoryElement[];
  links: Link[];
  /** Issue ids the author marked intentional or dismissed. */
  resolved: Record<string, Resolution>;
}

export type Severity = 'error' | 'warning' | 'idea';

export type IssueKind = 'cannot-be-present' | 'watch-word' | 'two-places' | 'unmarked-mention' | 'planned-only';

export interface Issue {
  /** Stable across runs while the underlying facts stay the same. */
  id: string;
  kind: IssueKind;
  severity: Severity;
  sceneId: string | null;
  elementIds: string[];
  title: string;
  detail: string;
  /** The paragraph the issue points at, when there is one. */
  quote: string | null;
}
