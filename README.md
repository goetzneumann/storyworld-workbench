# Storyworld Workbench

A writing desk for novelists that remembers your story world and tells you when you break your own rules.

You mark passages with the people, places, times, objects, groups and rules they involve. Each marked passage feeds a dossier for that story element. Traits such as "can't swim" or "sealed after the Flood" hold for a set stretch of story time, and a rule checker plus Claude flag contradictions as you write. When the book is done, the whole structure exports as a series bible for showrunners.

## What's here

| Path | What it is |
| --- | --- |
| [`storyworld.html`](storyworld.html) | The working prototype: one self-contained page |
| [`docs/spec.md`](docs/spec.md) | Product spec: concepts, data model, AI checks, tech stack, deployment, decisions |
| [`docs/pitch.md`](docs/pitch.md) | One-liner and elevator pitch |

## The prototype

`storyworld.html` is a claude.ai artifact. It runs best there, published at https://claude.ai/artifact/2MEbguoAiW4sFRHyfR3md8 (private to its owner until shared).

Features:

- Chapters and scenes, each with an optional story date and a free-text "when" note
- Marks: select text, press **Mark** or Ctrl+M, link it to a Person, Place, Time, Object, Group or Rule
- Traits (hard, soft, knowledge) with watch words, "cannot be present", and a story-time window
- Dossiers with notes, links, appearances, images and an AI summary that cites scenes
- Continuity checks on every edit: broken traits, sealed places, two places on one date, unmarked mentions
- Claude scene reviews, an Ask tab for questions about the story, and image descriptions
- Series bible export as self-contained HTML or Markdown
- Three designs: Desk, Typewriter and Corkboard

Opened as a plain file in a browser, the page still works for writing, marking, checks and the bible preview, and saves to that browser's local storage. Claude features, image storage and file export need the claude.ai artifact runtime.

## Status

Prototype only. The planned product stack (TypeScript, ProseMirror, PostgreSQL, Claude on Amazon Bedrock in the EU) is described in [`docs/spec.md`](docs/spec.md#tech-stack-and-deployment).
