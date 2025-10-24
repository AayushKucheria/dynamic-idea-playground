# Dynamic Idea Playground

Dynamic Idea Playground (DIP) is an experiment in fluid, context-sensitive interfaces. The current slice focuses on a Go strategy playground that reshapes its surrounding context panels as you interact with the board.

## Getting started
Run the development server and open the playground locally:

```bash
npm install
npm run dev
```

Navigate to <http://localhost:3000> to explore the experience. Edits under `app/` hot-reload automatically.

## Project structure
- `app/page.tsx` — Renders the Go playground framed by insight panels.
- `app/components/GoBoard.tsx` — Interactive 9×9 board with alternating stone placement.
- `app/components/InsightPanel.tsx` — Shared shell for the narrative side panels.
- `docs/dip-context.md` — Full concept brief, motivation, and design intent captured from the original Hack0 submission.

## Design intent
Before making significant UX or narrative changes, read `docs/dip-context.md`. It captures the motivations, constraints, and cultural shifts the playground is meant to embody so future iterations stay aligned with the original vision.

## Contributing
1. Follow the guidance in `AGENTS.md` to maintain tone and structure.
2. Run relevant linting or test commands before opening a pull request.
3. Reference both the Go playground and supporting panels in summaries when your change touches them.

The goal is to keep the experience calm, invitational, and reflective as we expand beyond the initial Go slice.
