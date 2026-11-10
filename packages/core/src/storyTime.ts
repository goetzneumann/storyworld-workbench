import type { Scene, StoryWorld, Trait } from './types.js';

/**
 * Where a scene sits in story time. Scenes with an exact date use it; scenes
 * without one inherit the date of the previous dated scene in reading order
 * and are marked approximate. Reading order breaks ties.
 */
export interface StoryPosition {
  /** YYYY-MM-DD, or '' when no earlier scene has a date. */
  date: string;
  approximate: boolean;
  readingIndex: number;
}

export function storyPositions(scenes: readonly Scene[]): Map<string, StoryPosition> {
  const positions = new Map<string, StoryPosition>();
  let lastDate = '';
  scenes.forEach((scene, readingIndex) => {
    if (scene.storyDate) {
      lastDate = scene.storyDate;
      positions.set(scene.id, { date: scene.storyDate, approximate: false, readingIndex });
    } else {
      positions.set(scene.id, { date: lastDate, approximate: true, readingIndex });
    }
  });
  return positions;
}

/** Negative when a comes before b in story time. */
export function compareStoryTime(a: string, b: string, positions: Map<string, StoryPosition>): number {
  const pa = positions.get(a);
  const pb = positions.get(b);
  if (!pa || !pb) return 0;
  if (pa.date && pb.date && pa.date !== pb.date) return pa.date < pb.date ? -1 : 1;
  return pa.readingIndex - pb.readingIndex;
}

/** Whether a trait is in force in a given scene. "After" is exclusive, "until" is inclusive. */
export function traitApplies(trait: Trait, sceneId: string, positions: Map<string, StoryPosition>): boolean {
  if (trait.afterSceneId && positions.has(trait.afterSceneId) && compareStoryTime(sceneId, trait.afterSceneId, positions) <= 0) {
    return false;
  }
  if (trait.untilSceneId && positions.has(trait.untilSceneId) && compareStoryTime(sceneId, trait.untilSceneId, positions) > 0) {
    return false;
  }
  return true;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "1921-04-03" becomes "3 Apr 1921". Parsed from the string, so no time-zone shift. */
export function formatStoryDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  return `${d} ${MONTHS[m - 1] ?? ''} ${y}`;
}

/** "Ch 2 · The lamp room". */
export function sceneLabel(world: StoryWorld, sceneId: string): string {
  const scene = world.scenes.find((s) => s.id === sceneId);
  if (!scene) return 'Unknown scene';
  const chapterIndex = world.chapters.findIndex((c) => c.id === scene.chapterId);
  return `Ch ${chapterIndex + 1} · ${scene.title || 'Untitled'}`;
}
