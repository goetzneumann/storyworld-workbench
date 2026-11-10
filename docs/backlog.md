# Backlog

Each heading is meant to become one GitHub Issue. Labels in brackets.

## Known gaps carried over from the prototype

### Reorder scenes and chapters [editor]
Scenes can only be added at the end of a chapter. Add drag-and-drop (or move up/down) in the manuscript tree, for scenes within and across chapters, and for chapters. Story-time checks already use reading order for ties, so the order must persist.

### Delete scenes and chapters [editor]
There is no way to remove a scene or chapter. Needs an in-page confirmation and must clean up traits whose "after" or "until" points at the deleted scene.

### Links between story elements [model]
The core model has links (with an optional "during" time element), but the web app has no UI for them yet. Port the dossier's "Links" section from the prototype.

### Images on elements and scenes [media]
Port image attachments from the prototype: upload, caption, tags, scene, and a Claude description with detail tags. Needs file storage (S3) and the AI service.

### Series bible export [export]
Port the bible preview and the HTML and Markdown export from the prototype, then add .docx.

## AI

### AI service: scene review, dossier summaries, Ask [ai]
A server-side service that calls Claude with the canon and the relevant passages. Starts with the three features the prototype has: review a scene, summarise an element with citations, answer a question about the story. Zero-retention, EU region (see the spec).

### AI-proposed marks [ai] [editor]
Claude proposes marks for names and pronouns ("she" -> Mara) as dotted underlines; one key accepts. Decided in the spec: suggest only, never auto-apply.

## Checks

### Travel time between far-away places [checks]
A soft "far away" trait on a place should warn when a person reaches it from another place with too little story time in between.

### Knowledge tracking [checks]
Knowledge traits currently only use watch words. Model "learns X in scene Y" so the checker can flag a character referring to a secret before learning it.

### Fuzzy story time [checks] [model]
Decision in the spec: time stores a range plus confidence. Replace the single optional date with a range, and downgrade checks to warnings when ranges only overlap.

## Platform

### API and Postgres storage [platform]
Replace browser storage with the API (Node, Fastify or tRPC) and Postgres. The `StoryWorld` shape in `packages/core` is the contract.

### Sign-in and per-user books [platform]
Accounts, several books per user, and access control.
