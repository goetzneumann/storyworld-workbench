import { sampleWorld, type StoryWorld } from '@storyworld/core';
import { useCallback, useEffect, useRef, useState } from 'react';

const KEY = 'storyworld.web.v1';

function load(): StoryWorld {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as StoryWorld;
  } catch {
    // Unreadable or blocked storage: fall back to the sample.
  }
  return sampleWorld();
}

/**
 * The whole story world in React state, saved to this browser. A placeholder
 * for the API: the shape stays the same when storage moves to Postgres.
 */
export function useStoryWorld() {
  const [world, setWorld] = useState<StoryWorld>(load);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(world)); } catch { /* storage full or blocked */ }
    }, 400);
  }, [world]);

  /** Apply a change to a copy of the world. */
  const update = useCallback((change: (draft: StoryWorld) => void) => {
    setWorld((prev) => {
      const next = structuredClone(prev);
      change(next);
      return next;
    });
  }, []);

  const reset = useCallback((next: StoryWorld) => setWorld(next), []);
  return { world, update, reset };
}

export const newId = (prefix: string) => `${prefix}${Math.random().toString(36).slice(2, 9)}`;
