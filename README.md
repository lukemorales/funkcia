# Funkcia Monorepo

This is a monorepo for the Funkcia project, managed with [Turborepo](https://turbo.build/repo).

## What's inside?

This monorepo includes the following packages:

### Packages

- `funkcia`: Core library for encoding failure and absence of value in TypeScript

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 9.0.0

### Installation

```bash
pnpm install
```

### Build

To build all packages:

```bash
pnpm run build
```

### Development

To run tests in watch mode:

```bash
pnpm run dev
```

### Testing

Run all tests:

```bash
pnpm run test
```

Run tests with coverage:

```bash
pnpm run test:coverage
```

Run tests in CI mode:

```bash
pnpm run test:ci
```

### Linting

Run all linters:

```bash
pnpm run lint
```

### Clean

Clean all build artifacts:

```bash
pnpm run clean
```

## Turborepo

This monorepo uses [Turborepo](https://turbo.build/repo) for:

- **Fast builds**: Turborepo caches build outputs and only rebuilds what's changed
- **Task orchestration**: Runs tasks across packages in the correct order
- **Remote caching**: Share build caches across your team (optional)

### Useful Commands

- `turbo run build` - Build all packages
- `turbo run test` - Run all tests
- `turbo run lint` - Lint all packages

Learn more about Turborepo at [turbo.build/repo](https://turbo.build/repo).

## Release

This project uses [Changesets](https://github.com/changesets/changesets) for versioning and publishing.

```bash
pnpm run changeset
pnpm run release
```
