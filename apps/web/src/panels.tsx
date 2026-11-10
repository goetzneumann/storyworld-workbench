import {
  ELEMENT_TYPE_LABELS,
  ELEMENT_TYPES,
  TRAIT_KIND_LABELS,
  markedIds,
  sceneLabel,
  type Issue,
  type StoryElement,
  type StoryWorld,
  type TraitKind,
} from '@storyworld/core';
import { useState } from 'react';
import { newId } from './store';

type Update = (change: (draft: StoryWorld) => void) => void;

export function IssuesPanel({ world, issues, onGoto, onMarkAll, update }: {
  world: StoryWorld;
  issues: Issue[];
  onGoto: (sceneId: string) => void;
  onMarkAll: (sceneId: string, elementId: string) => void;
  update: Update;
}) {
  const groups: [Issue['severity'], string][] = [['error', 'Errors'], ['warning', 'Warnings'], ['idea', 'Ideas and suggestions']];
  const resolved = Object.keys(world.resolved).length;
  return (
    <div>
      {!issues.length && <p className="muted">No open issues. The checker runs on every edit.</p>}
      {groups.map(([sev, label]) => {
        const list = issues.filter((i) => i.severity === sev);
        if (!list.length) return null;
        return (
          <section key={sev}>
            <h3 className="sev-head"><span className={`dot ${sev}`} />{label} <span className="muted small">{list.length}</span></h3>
            {list.map((i) => (
              <article key={i.id} className={`issue ${i.severity}`}>
                <div className="issue-title">{i.title}</div>
                <p>{i.detail}</p>
                {i.quote && <blockquote>{i.quote.length > 200 ? i.quote.slice(0, 200) + '…' : i.quote}</blockquote>}
                {i.sceneId && <div className="muted small">{sceneLabel(world, i.sceneId)}</div>}
                <div className="acts">
                  {i.sceneId && <button className="btn" onClick={() => onGoto(i.sceneId!)}>Go to scene</button>}
                  {i.kind === 'unmarked-mention' && i.sceneId && i.elementIds[0] && (
                    <button className="btn primary" onClick={() => onMarkAll(i.sceneId!, i.elementIds[0]!)}>Mark them</button>
                  )}
                  <button className="btn" onClick={() => update((w) => { w.resolved[i.id] = 'intentional'; })}>Intentional</button>
                  <button className="btn" onClick={() => update((w) => { w.resolved[i.id] = 'dismissed'; })}>Dismiss</button>
                </div>
              </article>
            ))}
          </section>
        );
      })}
      {resolved > 0 && (
        <p className="muted small">
          {resolved} issue{resolved === 1 ? '' : 's'} marked intentional or dismissed.{' '}
          <button className="link" onClick={() => update((w) => { w.resolved = {}; })}>Show them again</button>
        </p>
      )}
    </div>
  );
}

export function ElementsPanel({ world, openId, onOpen, update }: {
  world: StoryWorld;
  openId: string | null;
  onOpen: (id: string | null) => void;
  update: Update;
}) {
  const el = openId ? world.elements.find((e) => e.id === openId) : null;
  if (el) return <Dossier key={el.id} world={world} el={el} onBack={() => onOpen(null)} update={update} />;
  const counts = new Map<string, number>();
  for (const s of world.scenes) {
    const ids = new Set<string>();
    s.paragraphs.forEach((p) => markedIds(p).forEach((id) => ids.add(id)));
    ids.forEach((id) => counts.set(id, (counts.get(id) ?? 0) + 1));
  }
  return (
    <div>
      {ELEMENT_TYPES.map((t) => {
        const list = world.elements.filter((e) => e.type === t);
        if (!list.length) return null;
        return (
          <section key={t}>
            <h3 className="sec-head">{ELEMENT_TYPE_LABELS[t]}</h3>
            {list.map((e) => (
              <button key={e.id} className={`el-row t-${e.type}`} onClick={() => onOpen(e.id)}>
                <span className="tdot" /><span>{e.name}</span>
                <span className="muted small push">{counts.get(e.id) ?? 0} scenes · {e.traits.length} traits</span>
              </button>
            ))}
          </section>
        );
      })}
      {!world.elements.length && <p className="muted">No story elements yet. Select a name in the text and press Mark.</p>}
    </div>
  );
}

function Dossier({ world, el, onBack, update }: { world: StoryWorld; el: StoryElement; onBack: () => void; update: Update }) {
  const [adding, setAdding] = useState(false);
  const edit = (change: (e: StoryElement) => void) => update((w) => { const e = w.elements.find((x) => x.id === el.id); if (e) change(e); });
  const appearances = world.scenes.flatMap((s) => s.paragraphs.filter((p) => markedIds(p).has(el.id)).map((p) => ({ s, p })));
  return (
    <div>
      <button className="link" onClick={onBack}>← All story elements</button>
      <div className={`dossier-head t-${el.type}`}>
        <span className="tdot big" />
        <input className="dossier-name" value={el.name} aria-label="Name" onChange={(e) => edit((x) => { x.name = e.target.value; })} />
      </div>
      <div className="two">
        <label className="field"><span>Type</span>
          <select value={el.type} onChange={(e) => edit((x) => { x.type = e.target.value as StoryElement['type']; })}>
            {ELEMENT_TYPES.map((t) => <option key={t} value={t}>{ELEMENT_TYPE_LABELS[t]}</option>)}
          </select>
        </label>
        <label className="field"><span>Also called</span>
          <input
            defaultValue={el.aliases.join(', ')}
            placeholder="comma-separated"
            onBlur={(e) => edit((x) => { x.aliases = e.target.value.split(',').map((s) => s.trim()).filter(Boolean); })}
          />
        </label>
      </div>
      <label className="field"><span>Author notes · planned canon</span>
        <textarea value={el.notes} onChange={(e) => edit((x) => { x.notes = e.target.value; })} />
      </label>

      <h3 className="sec-head">Traits</h3>
      {el.traits.map((t) => (
        <div key={t.id} className="trait">
          <span className={`badge ${t.kind}`}>{TRAIT_KIND_LABELS[t.kind]}</span> <b>{t.name}</b>
          <button className="x" aria-label={`Remove ${t.name}`} onClick={() => edit((x) => { x.traits = x.traits.filter((y) => y.id !== t.id); })}>✕</button>
          <div className="muted small">
            {t.cannotBePresent ? 'Cannot be present · ' : ''}
            {t.watchWords.length ? `Watches: ${t.watchWords.join(', ')} · ` : ''}
            {t.afterSceneId ? `After ${sceneLabel(world, t.afterSceneId)}` : 'From the start'}
            {t.untilSceneId ? ` until ${sceneLabel(world, t.untilSceneId)}` : ''}
          </div>
        </div>
      ))}
      {adding ? <TraitForm world={world} el={el} onDone={() => setAdding(false)} edit={edit} /> : (
        <button className="link" onClick={() => setAdding(true)}>+ Add trait</button>
      )}

      <h3 className="sec-head">Appearances</h3>
      {appearances.length ? appearances.map(({ s, p }, i) => (
        <div key={i} className="appear"><div className="muted small">{sceneLabel(world, s.id)}</div><p>{p.text}</p></div>
      )) : <p className="muted small">Not marked in the manuscript yet.</p>}
    </div>
  );
}

function TraitForm({ world, el, onDone, edit }: { world: StoryWorld; el: StoryElement; onDone: () => void; edit: (c: (e: StoryElement) => void) => void }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<TraitKind>('soft');
  const [words, setWords] = useState('');
  const [absent, setAbsent] = useState(false);
  const [after, setAfter] = useState('');
  const [until, setUntil] = useState('');
  const sceneOptions = world.scenes.map((s) => <option key={s.id} value={s.id}>{sceneLabel(world, s.id)}</option>);
  return (
    <form className="form-box" onSubmit={(e) => {
      e.preventDefault();
      if (!name.trim()) return;
      edit((x) => { x.traits.push({ id: newId('t'), name: name.trim(), kind, watchWords: words.split(',').map((w) => w.trim()).filter(Boolean), cannotBePresent: absent, afterSceneId: after || null, untilSceneId: until || null }); });
      onDone();
    }}>
      <label className="field"><span>Trait</span><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Fear of heights" /></label>
      <label className="field"><span>Kind</span>
        <select value={kind} onChange={(e) => setKind(e.target.value as TraitKind)}>
          <option value="hard">Hard: breaking it is an error</option>
          <option value="soft">Soft: breaking it needs a story beat</option>
          <option value="knowledge">Knowledge: who knows what</option>
        </select>
      </label>
      <label className="field"><span>Watch words (comma-separated)</span><input value={words} onChange={(e) => setWords(e.target.value)} placeholder="e.g. climb, ladder, roof" /></label>
      <label className="check"><input type="checkbox" checked={absent} onChange={(e) => setAbsent(e.target.checked)} /> {el.type === 'place' ? 'Nobody can be here (locked, sealed, destroyed)' : 'Cannot appear (dead, gone, lost)'}</label>
      <div className="two">
        <label className="field"><span>Applies after</span><select value={after} onChange={(e) => setAfter(e.target.value)}><option value="">The start</option>{sceneOptions}</select></label>
        <label className="field"><span>Until</span><select value={until} onChange={(e) => setUntil(e.target.value)}><option value="">The end</option>{sceneOptions}</select></label>
      </div>
      <div className="acts"><button className="btn primary" type="submit">Add trait</button><button className="btn" type="button" onClick={onDone}>Cancel</button></div>
    </form>
  );
}
