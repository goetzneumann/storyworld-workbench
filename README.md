# Storyworld Workbench

A writing desk for novelists that remembers your story world and tells you when you break your own rules.

You mark passages with the people, places, times, objects, groups and rules they involve. Each marked passage feeds a dossier for that story element. Traits such as "can't swim" or "sealed after the Flood" hold for a set stretch of story time, and a rule checker plus Claude flag contradictions as you write. When the book is done, the whole structure exports as a series bible for showrunners.

## What's here

| Path | What it is |
| --- | --- |
| [`packages/core`](packages/core) | The story world model and the continuity rule engine, in TypeScript with no browser code, so the browser and the server share it |
| [`apps/web`](apps/web) | The web app: Vite, React and a ProseMirror editor where marks are real editor marks |
| [`prototype/storyworld.html`](prototype/storyworld.html) | The single-file prototype, with every feature explored so far |
| [`docs/spec.md`](docs/spec.md) | Product spec: concepts, data model, AI checks, tech stack, deployment, decisions |
| [`docs/backlog.md`](docs/backlog.md) | Planned work, one heading per future GitHub Issue |
| [`docs/pitch.md`](docs/pitch.md) | One-liner and elevator pitch |

## Run it

Needs Node 22 or newer.

```sh
npm install
npm run dev        # web app at http://localhost:5173
npm test           # core rule engine and editor conversion tests
npm run typecheck
npm run build
```

The web app opens on the sample story, "The Lamp Room", which contains planted continuity problems. Your work is saved in the browser for now; "Load sample" resets it.

## What the web app does so far

- Chapters and scenes, each with an optional story date and a free-text "when" note
- Marks: select text, press **Mark** or Ctrl+M, then pick a story element or create one
- Story elements with aliases, author notes and traits (hard, soft or knowledge; watch words; "cannot be present"; a story-time window)
- Continuity issues on every edit, with "Go to scene", "Mark them", "Intentional" and "Dismiss"

The prototype goes further (links, images, Claude reviews, dossier summaries, the series bible, three designs). Porting those is tracked in [`docs/backlog.md`](docs/backlog.md).

## How it fits together

- Scenes are stored as paragraphs of plain text plus mark spans (`packages/core/src/types.ts`). The editor converts to and from ProseMirror documents (`apps/web/src/editor/schema.ts`), so storage does not depend on the editor.
- `checkContinuity(world)` in `packages/core/src/rules.ts` is pure and fast enough to run on every keystroke. The same function will run on the server for whole-book checks.
- Issue ids are stable hashes of what they are about, so "Intentional" and "Dismiss" survive edits elsewhere.

## The prototype

`prototype/storyworld.html` is a claude.ai artifact, published at https://claude.ai/artifact/2MEbguoAiW4sFRHyfR3md8 (private to its owner until shared). Opened as a plain file it still works for writing, marking, checks and the bible preview; Claude features, image storage and file export need the claude.ai artifact runtime.
