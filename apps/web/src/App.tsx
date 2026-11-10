import {
  checkContinuity,
  formatStoryDate,
  markMentions,
  sampleWorld,
  storyPositions,
  type ElementType,
} from '@storyworld/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MarkPopover } from './MarkPopover';
import { SceneEditor, type MarkRequest } from './editor/SceneEditor';
import { ElementsPanel, IssuesPanel } from './panels';
import { newId, useStoryWorld } from './store';

type Tab = 'issues' | 'elements';

export function App() {
  const { world, update, reset } = useStoryWorld();
  const [sceneId, setSceneId] = useState(() => world.scenes.at(-1)?.id ?? '');
  const [tab, setTab] = useState<Tab>('issues');
  const [dossier, setDossier] = useState<string | null>(null);
  const [markReq, setMarkReq] = useState<MarkRequest | null>(null);
  const [toast, setToast] = useState('');
  // Bumped when a scene's text is changed from outside the editor, to remount it.
  const [editorRev, setEditorRev] = useState(0);

  const issues = useMemo(() => checkContinuity(world), [world]);
  const scene = world.scenes.find((s) => s.id === sceneId) ?? world.scenes[0];
  const positions = useMemo(() => storyPositions(world.scenes), [world.scenes]);

  useEffect(() => {
    const onToast = (e: Event) => setToast((e as CustomEvent<string>).detail);
    document.addEventListener('storyworld:toast', onToast);
    return () => document.removeEventListener('storyworld:toast', onToast);
  }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 3200); return () => clearTimeout(t); }, [toast]);

  const createElement = useCallback((name: string, type: ElementType) => {
    const id = newId('e_');
    update((w) => { w.elements.push({ id, type, name, aliases: [], notes: '', traits: [] }); });
    return id;
  }, [update]);

  const markAll = (sid: string, elementId: string) => {
    update((w) => {
      const el = w.elements.find((e) => e.id === elementId);
      const s = w.scenes.find((x) => x.id === sid);
      if (el && s) s.paragraphs = s.paragraphs.map((p) => markMentions(p, el));
    });
    if (sid === scene?.id) setEditorRev((r) => r + 1);
  };

  const addScene = (chapterId: string) => {
    const id = newId('s');
    update((w) => {
      const lastInChapter = w.scenes.map((s) => s.chapterId).lastIndexOf(chapterId);
      w.scenes.splice(lastInChapter + 1, 0, { id, chapterId, title: 'New scene', storyDate: null, whenNote: '', paragraphs: [] });
    });
    setSceneId(id);
  };

  const errorScenes = new Map<string, 'error' | 'warning'>();
  for (const i of issues) if (i.sceneId && i.severity !== 'idea' && errorScenes.get(i.sceneId) !== 'error') errorScenes.set(i.sceneId, i.severity as 'error' | 'warning');
  const counts = { error: 0, warning: 0, idea: 0 };
  issues.forEach((i) => { counts[i.severity]++; });
  const words = world.scenes.reduce((n, s) => n + s.paragraphs.reduce((m, p) => m + (p.text.match(/\S+/g)?.length ?? 0), 0), 0);

  // Per-element colour rules for marks in the editor (marks only know element ids).
  const markColours = world.elements.map((e) => `.mk[data-first="${CSS.escape(e.id)}"]{--mk:var(--${e.type})}`).join('\n');

  return (
    <div className="app">
      <style>{markColours}</style>
      <header className="top">
        <div className="brand">Storyworld <span>Workbench</span></div>
        <input className="book-title" value={world.title} aria-label="Book title" onChange={(e) => update((w) => { w.title = e.target.value; })} />
        <span className="spacer" />
        <button className="chip-btn" onClick={() => setTab('issues')} aria-label={`${counts.error} errors, ${counts.warning} warnings, ${counts.idea} ideas`}>
          <span className="dot error" />{counts.error} <span className="dot warning" />{counts.warning} <span className="dot idea" />{counts.idea}
        </button>
        <button className="chip-btn" onClick={() => { reset(sampleWorld()); setSceneId('s4'); setEditorRev((r) => r + 1); }}>Load sample</button>
      </header>

      <div className="main">
        <aside className="pane scenes">
          <div className="side-label">Manuscript</div>
          {world.chapters.map((c, ci) => (
            <div key={c.id} className="chapter">
              <div className="chapter-head"><span className="muted mono small">{ci + 1}</span>
                <input value={c.title} aria-label="Chapter title" onChange={(e) => update((w) => { const x = w.chapters.find((y) => y.id === c.id); if (x) x.title = e.target.value; })} />
              </div>
              {world.scenes.filter((s) => s.chapterId === c.id).map((s) => {
                const pos = positions.get(s.id);
                const when = s.storyDate ? formatStoryDate(s.storyDate) : pos?.date ? `≈ after ${formatStoryDate(pos.date)}` : 'No date';
                const flag = errorScenes.get(s.id);
                return (
                  <button key={s.id} className={`scene-item${s.id === scene?.id ? ' active' : ''}`} onClick={() => setSceneId(s.id)}>
                    <span className="t">{s.title || 'Untitled'}</span>
                    <span className="d mono">{when}</span>
                    {flag && <span className={`dot ${flag} flag`} title={flag === 'error' ? 'Has errors' : 'Has warnings'} />}
                  </button>
                );
              })}
              <button className="link" onClick={() => addScene(c.id)}>+ Scene</button>
            </div>
          ))}
          <button className="link" onClick={() => {
            const id = newId('c');
            update((w) => { w.chapters.push({ id, title: `Chapter ${w.chapters.length + 1}` }); });
            setTimeout(() => addScene(id));
          }}>+ Chapter</button>
          <p className="muted mono small stats">{words.toLocaleString()} words · {world.elements.length} story elements</p>
        </aside>

        <main className="pane write">
          {scene && (
            <div className="write-wrap">
              <div className="scene-meta">
                <label>Story date <input type="date" value={scene.storyDate ?? ''} onChange={(e) => update((w) => { const s = w.scenes.find((x) => x.id === scene.id); if (s) s.storyDate = e.target.value || null; })} /></label>
                <label>When <input value={scene.whenNote} placeholder="e.g. a few weeks after the Flood" onChange={(e) => update((w) => { const s = w.scenes.find((x) => x.id === scene.id); if (s) s.whenNote = e.target.value; })} /></label>
                {!scene.storyDate && <span className="hint">{positions.get(scene.id)?.date ? `Placed after ${formatStoryDate(positions.get(scene.id)!.date)}; checks treat it as approximate` : 'No date yet; checks use reading order'}</span>}
              </div>
              <input className="scene-title" value={scene.title} aria-label="Scene title" onChange={(e) => update((w) => { const s = w.scenes.find((x) => x.id === scene.id); if (s) s.title = e.target.value; })} />
              <p className="hint">Select text, then press <kbd>Mark</kbd> or <kbd>Ctrl</kbd>+<kbd>M</kbd> to tie it to a story element.</p>
              <SceneEditor
                key={`${scene.id}:${editorRev}`}
                initial={scene.paragraphs}
                onChange={(paragraphs) => update((w) => { const s = w.scenes.find((x) => x.id === scene.id); if (s) s.paragraphs = paragraphs; })}
                onMarkRequest={setMarkReq}
              />
            </div>
          )}
        </main>

        <aside className="pane panel">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'issues'} className={tab === 'issues' ? 'on' : ''} onClick={() => setTab('issues')}>Issues ({issues.length})</button>
            <button role="tab" aria-selected={tab === 'elements'} className={tab === 'elements' ? 'on' : ''} onClick={() => setTab('elements')}>Story elements</button>
          </div>
          <div className="panel-body">
            {tab === 'issues'
              ? <IssuesPanel world={world} issues={issues} onGoto={setSceneId} onMarkAll={markAll} update={update} />
              : <ElementsPanel world={world} openId={dossier} onOpen={setDossier} update={update} />}
          </div>
        </aside>
      </div>

      {markReq && (
        <MarkPopover
          request={markReq}
          elements={world.elements}
          onCreate={createElement}
          onClose={() => setMarkReq(null)}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
