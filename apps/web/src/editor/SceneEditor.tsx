import type { Paragraph } from '@storyworld/core';
import { baseKeymap } from 'prosemirror-commands';
import { history, redo, undo } from 'prosemirror-history';
import { keymap } from 'prosemirror-keymap';
import { EditorState, TextSelection } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { useEffect, useRef, useState } from 'react';
import { docToParagraphs, paragraphsToDoc, schema } from './schema';

export interface MarkRequest {
  /** The selected text, used as the default name for a new element. */
  text: string;
  /** Screen position to anchor the popover under. */
  anchor: { left: number; top: number; bottom: number };
  /** Ids already on the selected mark, when the selection is exactly one mark. */
  existingIds: string[];
  /** Replace the mark on the selection with these ids; an empty list removes it. */
  apply: (ids: string[]) => void;
}

interface Props {
  initial: Paragraph[];
  onChange: (paragraphs: Paragraph[]) => void;
  onMarkRequest: (request: MarkRequest | null) => void;
}

/**
 * One scene's prose. Mount it with `key={sceneId}`: it owns its editor state
 * and only reports changes upward, so it is never reset by its own edits.
 */
export function SceneEditor({ initial, onChange, onMarkRequest }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const callbacks = useRef({ onChange, onMarkRequest });
  callbacks.current = { onChange, onMarkRequest };
  const [button, setButton] = useState<{ left: number; top: number } | null>(null);
  const requestMarkRef = useRef<() => void>(() => {});

  useEffect(() => {
    const requestMark = (v: EditorView): boolean => {
      const { from, to, $from, $to, empty } = v.state.selection;
      if (empty) return false;
      if (!$from.sameParent($to)) {
        callbacks.current.onMarkRequest(null);
        alertInline(v, 'Marks stay inside one paragraph. Select less text.');
        return true;
      }
      const start = v.coordsAtPos(from);
      const end = v.coordsAtPos(to);
      const type = schema.marks.element;
      const at = $from.marksAcross($to)?.find((m) => m.type === type);
      callbacks.current.onMarkRequest({
        text: v.state.doc.textBetween(from, to).trim().replace(/\s+/g, ' '),
        anchor: { left: start.left, top: start.top, bottom: Math.max(start.bottom, end.bottom) },
        existingIds: at ? [...(at.attrs.ids as string[])] : [],
        apply: (ids) => {
          let tr = v.state.tr.removeMark(from, to, type);
          if (ids.length) tr = tr.addMark(from, to, type.create({ ids }));
          v.dispatch(tr.setSelection(TextSelection.create(tr.doc, to)));
          v.focus();
        },
      });
      return true;
    };

    const state = EditorState.create({
      doc: paragraphsToDoc(initial),
      plugins: [
        history(),
        keymap({ 'Mod-z': undo, 'Mod-y': redo, 'Shift-Mod-z': redo, 'Mod-m': (_s, _d, v) => (v ? requestMark(v) : false) }),
        keymap(baseKeymap),
      ],
    });
    const v = new EditorView(host.current!, {
      state,
      attributes: { 'aria-label': 'Scene text', spellcheck: 'true' },
      dispatchTransaction(tr) {
        const next = v.state.apply(tr);
        v.updateState(next);
        if (tr.docChanged) callbacks.current.onChange(docToParagraphs(next.doc));
        const sel = next.selection;
        if (sel.empty || !v.hasFocus()) setButton(null);
        else {
          const c = v.coordsAtPos(sel.from);
          setButton({ left: c.left, top: c.top });
        }
      },
      handleDOMEvents: { blur: () => { setTimeout(() => setButton(null), 150); return false; } },
    });
    view.current = v;
    requestMarkRef.current = () => { requestMark(v); };
    return () => { v.destroy(); view.current = null; };
    // Mount once per scene; the parent remounts the component with a new key.
  }, []);

  return (
    <>
      <div ref={host} className="prose" />
      {button && (
        <button
          className="mark-btn"
          style={{ left: button.left, top: Math.max(8, button.top - 40) }}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => requestMarkRef.current()}
        >
          Mark
        </button>
      )}
    </>
  );
}

function alertInline(v: EditorView, message: string) {
  v.dom.dispatchEvent(new CustomEvent('storyworld:toast', { bubbles: true, detail: message }));
}
