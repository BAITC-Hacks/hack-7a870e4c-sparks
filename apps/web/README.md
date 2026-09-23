# Crystal Architecture v2

Frontend template for Next.js App Router projects with React 19, Orval,
TanStack Query, shadcn/ui, nuqs, Zustand, Biome, Vitest and Playwright.

The template is optimized for frontend applications where Next.js is the
routing/composition shell, Orval is the generated transport layer and TanStack
Query owns backend server-state.

## Quick Start

Use Node.js 24 LTS (24.14.0 or newer within 24.x) and pnpm 10.30.3, as
declared in `package.json`. CI and Docker also use Node.js 24.

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

Useful commands:

```bash
pnpm build
pnpm lint
pnpm test:run
pnpm lint:deps
pnpm lint:unused
pnpm orval
pnpm g:query
pnpm g:mutation
```

## Stack

| Area | Tooling |
| --- | --- |
| App shell | Next.js App Router |
| UI | React 19, shadcn/ui, Tailwind v4 |
| Backend API | Orval-generated client |
| Server-state | TanStack Query |
| URL state | nuqs |
| UI-state | Zustand |
| Validation | Zod |
| i18n | next-intl |
| Quality | Biome, dependency-cruiser, Knip |
| Tests | Vitest, React Testing Library, Playwright |

## Core Rules

- Dependency direction is `app -> modules -> entities -> shared`.
- `app/` stays thin: route composition, metadata, providers and route-level
  concerns only.
- Modules expose public APIs through `index.ts`.
- Scenario modules may compose other modules through public APIs.
- `modules/*/ui` does not import `@/shared/api/generated` directly.
- TanStack Query owns backend server-state.
- Zustand is only for ephemeral UI-state.
- `ui/` can be split by responsibility zones, not by `smart/dumb`.

## Structure

```txt
src/
├── app/
├── modules/
│   └── users/
│       ├── model/
│       │   ├── queries/
│       │   ├── mutations/
│       │   └── stores/
│       ├── ui/
│       └── index.ts
├── entities/
│   └── user/
│       ├── model/
│       ├── lib/
│       ├── ui/
│       └── index.ts
├── shared/
│   ├── api/
│   ├── components/ui/
│   ├── lib/client/
│   ├── hooks/
│   ├── providers/
│   ├── configs/i18/
│   ├── consts/
│   └── types/
└── styles/
```

## Data Flow

```txt
UI component
↓
module model query/mutation hook
↓
shared/api/generated
↓
backend
```

User-controlled navigation state belongs in the URL through `nuqs`. For shadcn
overlays opened from tables/lists, prefer one controlled Dialog/Sheet driven by
a selected ID in the URL.

## Documentation

- [Architecture](docs/architecture.md)
- [Module Structure](docs/module-structure.md)
- [Data Flow](docs/data-flow.md)
- [Tooling](docs/tooling.md)
