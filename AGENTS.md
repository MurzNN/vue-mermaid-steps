# vue-mermaid-steps

Standalone Vue 3 + TypeScript library for progressively revealing Mermaid
diagrams. This package does not depend on the parent Slidev workspace.

## Project map

- [src/MermaidSteps.vue](./src/MermaidSteps.vue): the component. Lazily
  imports `mermaid`, renders the unchanged `diagram` (only when the source or
  `options` values change), and applies step opacity/styles as inline
  `!important` styles on the rendered SVG, restoring originals before reapplying.
- [src/index.ts](./src/index.ts): default and named component exports.
- [playground/](./playground/): standalone demo; `App.vue` contains controls,
  preview, and usage example; `style.css` contains page styling.
- [tests/](./tests/): Vitest + Vue Test Utils tests. Component tests mock
  `mermaid` with an SVG fixture mirroring Mermaid's output; playground tests stub
  the component.
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
use semicolon-separated CSS declarations without selectors or braces. When changing props,
update related tests, README documentation, and playground controls/usage as needed.
