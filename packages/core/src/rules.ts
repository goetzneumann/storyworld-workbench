import { markedIds, unmarkedText } from './markup.js';
import { compareStoryTime, formatStoryDate, sceneLabel, storyPositions, traitApplies } from './storyTime.js';
import type { Issue, IssueKind, Paragraph, Scene, Severity, StoryElement, StoryWorld } from './types.js';
import { TRAIT_KIND_LABELS } from './types.js';

/**
 * The deterministic continuity checker. It reads only the structured model
 * (marks, traits, story dates), so it is cheap enough to run on every edit.
 * Prose-level problems nobody marked are left to the AI review.
 */
export function checkContinuity(world: StoryWorld): Issue[] {
  const ctx = makeContext(world);
  const issues = [
    ...checkTraits(ctx),
    ...checkTwoPlaces(ctx),
    ...checkUnmarkedMentions(ctx),
    ...checkPlannedOnly(ctx),
  ].filter((issue) => !world.resolved[issue.id]);
  const rank: Record<Severity, number> = { error: 0, warning: 1, idea: 2 };
  return issues.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

interface Context {
  world: StoryWorld;
  positions: ReturnType<typeof storyPositions>;
  elements: Map<string, StoryElement>;
  /** Scene id -> ids of every element marked in it. */
  present: Map<string, Set<string>>;
}

function makeContext(world: StoryWorld): Context {
  const present = new Map<string, Set<string>>();
  for (const scene of world.scenes) {
    const ids = new Set<string>();
    for (const p of scene.paragraphs) for (const id of markedIds(p)) ids.add(id);
    present.set(scene.id, ids);
  }
  return {
    world,
    positions: storyPositions(world.scenes),
    elements: new Map(world.elements.map((e) => [e.id, e])),
    present,
  };
}

function issue(kind: IssueKind, key: string, fields: Omit<Issue, 'id' | 'kind'>): Issue {
  return { id: stableId(`${kind}:${key}`), kind, ...fields };
}

/** Short, stable id from a key (djb2). Safe to store as a document field name. */
export function stableId(key: string): string {
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) | 0;
  return 'i' + (h >>> 0).toString(36);
}

const LETTER_OR_DIGIT = '[\\p{L}\\p{N}]';
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whole-word, case-insensitive match for any of the given phrases. */
export function phraseRegExp(phrases: readonly string[], flags = 'iu'): RegExp | null {
  const cleaned = phrases.map((p) => p.trim()).filter(Boolean);
  if (!cleaned.length) return null;
  const alternatives = [...cleaned].sort((a, b) => b.length - a.length).map(escapeRegExp).join('|');
  return new RegExp(`(?<!${LETTER_OR_DIGIT})(?:${alternatives})(?!${LETTER_OR_DIGIT})`, flags);
}

/** The names an element is recognised by in prose. Very short names are skipped to avoid noise. */
export function namesFor(element: StoryElement): string[] {
  return [element.name, ...element.aliases].map((s) => s.trim()).filter((s) => s.length >= 3);
}

function checkTraits(ctx: Context): Issue[] {
  const out: Issue[] = [];
  const { world, positions, elements, present } = ctx;
  for (const element of world.elements) {
    for (const trait of element.traits) {
      for (const scene of world.scenes) {
        if (!present.get(scene.id)?.has(element.id)) continue;
        if (!traitApplies(trait, scene.id, positions)) continue;
        const severity: Severity = trait.kind === 'hard' ? 'error' : 'warning';
        const window = trait.afterSceneId ? `, in force after ${sceneLabel(world, trait.afterSceneId)}` : '';

        if (trait.cannotBePresent) {
          // A place is only "entered" when a person is marked in the same paragraph.
          const hit = scene.paragraphs.find((p) => {
            const ids = markedIds(p);
            if (!ids.has(element.id)) return false;
            return element.type !== 'place' || [...ids].some((id) => elements.get(id)?.type === 'person');
          });
          if (hit) {
            const people = [...markedIds(hit)].map((id) => elements.get(id)).filter((e) => e?.type === 'person').map((e) => e!.name);
            out.push(issue('cannot-be-present', `${trait.id}:${scene.id}`, {
              severity,
              sceneId: scene.id,
              elementIds: [element.id, ...markedIds(hit)].filter((v, i, a) => a.indexOf(v) === i),
              title: element.type === 'place'
                ? `${people.join(' and ') || 'Someone'} at ${element.name}, which is “${trait.name}”`
                : `${element.name} appears while “${trait.name}”`,
              detail: `${TRAIT_KIND_LABELS[trait.kind]} trait on ${element.name}${window}. ${trait.kind === 'hard' ? 'Explain how this is possible, or change the scene.' : 'Make it a story beat, or adjust the scene.'}`,
              quote: hit.text,
            }));
          }
        }

        const re = phraseRegExp(trait.watchWords);
        if (re) {
          const hit = scene.paragraphs.find((p) => markedIds(p).has(element.id) && re.test(p.text));
          if (hit) {
            const word = hit.text.match(re)?.[0] ?? '';
            out.push(issue('watch-word', `${trait.id}:${scene.id}`, {
              severity,
              sceneId: scene.id,
              elementIds: [element.id],
              title: trait.kind === 'soft'
                ? `${element.name}'s “${trait.name}” isn't felt here`
                : trait.kind === 'knowledge'
                  ? `${element.name} may know too much: “${trait.name}”`
                  : `${element.name} breaks “${trait.name}”`,
              detail: `The passage says “${word}” near ${element.name}. ${trait.kind === 'soft'
                ? 'A soft trait can be overcome, but the reader should see the cost.'
                : trait.kind === 'knowledge' ? 'Check when they learned this.' : 'A hard trait needs an explanation in the text.'}`,
              quote: hit.text,
            }));
          }
        }
      }
    }
  }
  return out;
}

/** A person marked in two scenes with the same exact story date but no place in common. */
function checkTwoPlaces(ctx: Context): Issue[] {
  const out: Issue[] = [];
  const { world, positions, elements, present } = ctx;
  const placesIn = (scene: Scene) => [...(present.get(scene.id) ?? [])].filter((id) => elements.get(id)?.type === 'place');
  for (const person of world.elements.filter((e) => e.type === 'person')) {
    const appearances = world.scenes
      .filter((s) => s.storyDate && !positions.get(s.id)?.approximate && present.get(s.id)?.has(person.id))
      .map((scene) => ({ scene, places: placesIn(scene) }))
      .filter((a) => a.places.length > 0);
    for (let i = 0; i < appearances.length; i++) {
      for (let j = i + 1; j < appearances.length; j++) {
        const a = appearances[i]!;
        const b = appearances[j]!;
        if (a.scene.storyDate !== b.scene.storyDate) continue;
        if (a.places.some((p) => b.places.includes(p))) continue;
        const [first, second] = compareStoryTime(a.scene.id, b.scene.id, positions) <= 0 ? [a, b] : [b, a];
        const placeA = elements.get(first.places[0]!)!.name;
        const placeB = elements.get(second.places[0]!)!.name;
        out.push(issue('two-places', `${person.id}:${first.scene.id}:${second.scene.id}`, {
          severity: 'error',
          sceneId: second.scene.id,
          elementIds: [person.id, first.places[0]!, second.places[0]!],
          title: `${person.name} is in two places on ${formatStoryDate(first.scene.storyDate!)}`,
          detail: `${sceneLabel(world, first.scene.id)} puts ${person.name} in ${placeA}; ${sceneLabel(world, second.scene.id)} puts them at ${placeB}, on the same story date. Change a date, or explain the journey.`,
          quote: null,
        }));
      }
    }
  }
  return out;
}

/** Names of known elements that appear in a scene without a mark. */
function checkUnmarkedMentions(ctx: Context): Issue[] {
  const out: Issue[] = [];
  for (const scene of ctx.world.scenes) {
    for (const element of ctx.world.elements) {
      const count = countUnmarked(scene.paragraphs, element);
      if (!count) continue;
      out.push(issue('unmarked-mention', `${element.id}:${scene.id}`, {
        severity: 'idea',
        sceneId: scene.id,
        elementIds: [element.id],
        title: `${element.name} is mentioned ${count === 1 ? 'once' : `${count} times`} without a mark`,
        detail: 'Marked mentions feed the dossier and the continuity checks.',
        quote: null,
      }));
    }
  }
  return out;
}

export function countUnmarked(paragraphs: readonly Paragraph[], element: StoryElement): number {
  const re = phraseRegExp(namesFor(element), 'giu');
  if (!re) return 0;
  return paragraphs.reduce((n, p) => n + (unmarkedText(p).match(re)?.length ?? 0), 0);
}

/** Adds a mark for every unmarked mention of the element. Returns a new paragraph. */
export function markMentions(paragraph: Paragraph, element: StoryElement): Paragraph {
  const re = phraseRegExp(namesFor(element), 'giu');
  if (!re) return paragraph;
  const added = [...unmarkedText(paragraph).matchAll(re)].map((m) => ({
    from: m.index ?? 0,
    to: (m.index ?? 0) + m[0].length,
    elementIds: [element.id],
  }));
  if (!added.length) return paragraph;
  return { text: paragraph.text, marks: [...paragraph.marks, ...added].sort((a, b) => a.from - b.from) };
}

/** Elements with notes or traits that no scene marks yet. */
function checkPlannedOnly(ctx: Context): Issue[] {
  const marked = new Set<string>();
  for (const ids of ctx.present.values()) for (const id of ids) marked.add(id);
  return ctx.world.elements
    .filter((e) => !marked.has(e.id) && (e.notes.trim() || e.traits.length))
    .map((e) => issue('planned-only', e.id, {
      severity: 'idea',
      sceneId: null,
      elementIds: [e.id],
      title: `${e.name} exists only in your notes`,
      detail: 'Planned canon: nothing in the manuscript establishes it yet.',
      quote: null,
    }));
}
