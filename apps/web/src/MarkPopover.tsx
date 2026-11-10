import { ELEMENT_TYPE_LABELS, ELEMENT_TYPES, type ElementType, type StoryElement } from '@storyworld/core';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { MarkRequest } from './editor/SceneEditor';

interface Props {
  request: MarkRequest;
  elements: StoryElement[];
  onCreate: (name: string, type: ElementType) => string;
  onClose: () => void;
}

/** Find or create a story element for the selected text. */
export function MarkPopover({ request, elements, onCreate, onClose }: Props) {
  const [query, setQuery] = useState(request.text);
  const box = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState({ left: request.anchor.left, top: request.anchor.bottom + 8 });

  useEffect(() => { input.current?.select(); }, []);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const left = Math.min(window.innerWidth - el.offsetWidth - 16, Math.max(16, request.anchor.left));
    const below = request.anchor.bottom + 8;
    const top = below + el.offsetHeight > window.innerHeight - 16 ? Math.max(16, request.anchor.top - el.offsetHeight - 8) : below;
    setPos({ left, top });
  }, [request]);
  useEffect(() => {
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) onClose(); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [onClose]);

  const q = query.trim().toLowerCase();
  const matches = elements
    .filter((e) => !request.existingIds.includes(e.id))
    .filter((e) => !q || [e.name, ...e.aliases].some((n) => n.toLowerCase().includes(q) || q.includes(n.toLowerCase())))
    .slice(0, 8);
  const current = request.existingIds.map((id) => elements.find((e) => e.id === id)).filter((e): e is StoryElement => !!e);

  const pick = (id: string) => { request.apply([...request.existingIds, id]); onClose(); };
  const create = (type: ElementType) => {
    const name = query.trim();
    if (!name) return;
    pick(onCreate(name, type));
  };

  return (
    <div ref={box} className="pop" style={pos} role="dialog" aria-label="Mark selected text">
      {current.length > 0 && (
        <div className="pop-current">
          Marked as {current.map((e) => <span key={e.id} className={`chip t-${e.type}`}><span className="tdot" />{e.name}</span>)}
          <button className="link danger" onClick={() => { request.apply([]); onClose(); }}>Remove mark</button>
        </div>
      )}
      <input
        ref={input}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Find or create a story element"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'Enter') { e.preventDefault(); if (matches[0]) pick(matches[0].id); else create('person'); }
        }}
      />
      <div className="pop-list">
        {matches.length ? matches.map((e, i) => (
          <button key={e.id} className={`opt t-${e.type}${i === 0 ? ' sel' : ''}`} onClick={() => pick(e.id)}>
            <span className="tdot" />{e.name}<small>{ELEMENT_TYPE_LABELS[e.type]}</small>
          </button>
        )) : <p className="muted small">No matching story element. Create one below.</p>}
      </div>
      <div className="pop-create">
        <span className="muted small">Create “{query.trim() || '…'}” as</span>
        <div className="chips">
          {ELEMENT_TYPES.map((t) => (
            <button key={t} className={`chip t-${t}`} onClick={() => create(t)}><span className="tdot" />{ELEMENT_TYPE_LABELS[t]}</button>
          ))}
        </div>
      </div>
    </div>
  );
}
