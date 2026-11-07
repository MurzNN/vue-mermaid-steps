# vue-mermaid-steps

Standalone Vue 3 + TypeScript library for progressively revealing Mermaid
diagrams. This package does not depend on the parent Slidev workspace.

## Project map

- [src/VueMermaidSteps.vue](./src/VueMermaidSteps.vue): component props and reactive
  Mermaid source generation; delegates rendering to `MermaidRenderer.vue`.
- [src/MermaidRenderer.vue](./src/MermaidRenderer.vue): internal renderer that
  lazily imports `mermaid`, renders SVG, and emits `rendered`/`parse-error`.
- [src/index.ts](./src/index.ts): default and named component exports.
- [playground/](./playground/): standalone demo; `App.vue` contains controls,
  preview, and usage example; `style.css` contains page styling.
- [tests/](./tests/): Vitest + Vue Test Utils tests. Component tests stub the
  renderer; playground tests stub the component.
- [vite.config.js](./vite.config.js): library build and test configuration.
- [vite.playground.config.js](./vite.playground.config.js): demo build configuration.
- [README.md](./README.md): public API, Mermaid conventions, and deployment guide.
- `dist/` and `playground-dist/`: generated build outputs; edit source instead.

## Development

Run commands from this package directory, not the parent workspace:

```sh
pnpm test
pnpm run typecheck
pnpm run build
pnpm run build:playground
pnpm run dev
```

Preserve cumulative step visibility and node/edge class mappings. Custom styles
use Mermaid's comma-separated declarations, not CSS blocks. When changing props,
update related tests, README documentation, and playground controls/usage as needed.
