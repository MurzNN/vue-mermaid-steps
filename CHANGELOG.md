# Changelog

## [0.3.0](https://github.com/MurzNN/vue-mermaid-steps/compare/v0.2.0...v0.3.0) (2026-11-07)

### ⚠ BREAKING CHANGES

* simplify MermaidSteps rendering and CSS styling API
* the `node-click` event is removed and Mermaid `click`
  callbacks are no longer wired to Vue events. `options` is now a declared
  prop and changing it re-renders the diagram.

### Features

* render with Mermaid 12 directly instead of vue-mermaid-string ([9d3772d](https://github.com/MurzNN/vue-mermaid-steps/commit/9d3772d0972b66ca31bb9a001d38e5f50a189a33))
* simplify MermaidSteps rendering and CSS styling API ([2b9c36f](https://github.com/MurzNN/vue-mermaid-steps/commit/2b9c36f7388d35d91c07308c28763736a794666e))

Release notes are generated from Conventional Commits by release-it.

## [0.2.0](https://github.com/MurzNN/vue-mermaid-steps/compare/v0.1.0...v0.2.0) (2026-11-03)

### Features

* add independent step styles and current-step CSS ([9eb6c31](https://github.com/MurzNN/vue-mermaid-steps/commit/9eb6c31ee9be7d67d50fd7137209bc621e20fc06))

### Bug Fixes

* support npm-only publishing retries ([3e77af3](https://github.com/MurzNN/vue-mermaid-steps/commit/3e77af395f6ae6b865791f6dd39cf981cb931048))

## [0.1.0](https://github.com/MurzNN/vue-mermaid-steps/tree/v0.1.0) (2026-11-02)

### Features

* add reactive Mermaid steps library and live playground ([21586ca](https://github.com/MurzNN/vue-mermaid-steps/commit/21586ca8b638527337872e3cc6f8b579fe909c93))
* configure step edge mappings and inactive opacity ([004f8d3](https://github.com/MurzNN/vue-mermaid-steps/commit/004f8d32d9a4cd5fcd3330041aabe276c3fa709c))
