# Dynamic Idea Playground Agent Guide

## Scope
This file applies to the entire repository unless a more specific `AGENTS.md` is introduced deeper in the tree.

## Working principles
- Prioritize designs and copy that feel calm, intentful, and supportive of reflective exploration. Avoid overly transactional or high-friction language.
- When adjusting React components under `app/`, keep them functional, client components where interactivity is required, and prefer Tailwind classes already in use for visual consistency.
- Before changing high-level layout or tone, skim `docs/dip-context.md` to ensure updates respect the original vision captured there.

## Documentation expectations
- Store concept and product context in `docs/`. Significant narrative changes should append or reference `docs/dip-context.md` rather than scattering context across component files.
- When adding new docs, favor Markdown with clear section headings so future contributors can navigate quickly.

## Testing & PR etiquette
- Run relevant linting/tests when feasible and report the commands executed.
- Summaries, test plans, and PR descriptions should explicitly reference the Go playground and its supporting panels when changes affect them.
