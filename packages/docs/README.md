---
icon: hand-wave
cover: >-
  https://images.unsplash.com/photo-1617791160536-598cf32026fb?crop=entropy&cs=srgb&fm=jpg&ixid=M3wxOTcwMjR8MHwxfHNlYXJjaHwxfHxicmFpbnxlbnwwfHx8fDE3Mzk1MzgxOTN8MA&ixlib=rb-4.0.3&q=85
coverY: 0
---

# Welcome

Funkcia is a TypeScript library that provides robust error handling and functional programming primitives, heavily inspired by Rust's error handling patterns and functional programming concepts.

It provides a comprehensive toolkit for writing more reliable code with better error handling and functional programming patterns, making it easier to write maintainable and type-safe applications.

{% tabs %}
{% tab title="npm" %}
{% code fullWidth="true" %}
```bash
npm i funkcia
```
{% endcode %}
{% endtab %}

{% tab title="pnpm" %}
```bash
pnpm add funkcia
```
{% endtab %}

{% tab title="bun" %}
```bash
bun add funkcia
```
{% endtab %}

{% tab title="yarn" %}
```bash
yarn add funkcia
```
{% endtab %}
{% endtabs %}

### Jump right in

<table data-card-size="large" data-view="cards" data-full-width="true"><thead><tr><th></th><th></th><th data-hidden data-card-cover data-type="files"></th><th data-hidden></th><th data-hidden data-card-target data-type="content-ref"></th></tr></thead><tbody><tr><td>Option</td><td></td><td></td><td></td><td><a href="data-types/option/">option</a></td></tr><tr><td>Result</td><td></td><td></td><td></td><td><a href="data-types/result/">result</a></td></tr><tr><td>OptionAsync</td><td></td><td></td><td></td><td><a href="data-types/optionasync/">optionasync</a></td></tr><tr><td>ResultAsync</td><td></td><td></td><td></td><td><a href="data-types/resultasync/">resultasync</a></td></tr><tr><td>Brand</td><td></td><td></td><td></td><td><a href="modules/brand.md">brand.md</a></td></tr><tr><td>Pattern Matching</td><td></td><td></td><td></td><td><a href="modules/pattern-matching.md">pattern-matching.md</a></td></tr></tbody></table>

### Docs parity checklist

Before publishing docs updates:

- Verify public API names against source exports in `/packages/funkcia/src`.
- Ensure method headings match API casing exactly.
- Remove stale methods that no longer exist in source.
- Confirm `SUMMARY.md` links point to real files.
- Run a quick search for known removed APIs to avoid drift regressions.
