# AGENTS.md
USE APP-DOCS  files for up-to-date information on architecture , UI/UX  and tooling.

## Purpose

This repository is a frontend template for Next.js App Router projects.

Architecture style:

- Crystal Architecture v2
- frontend-first Next.js App Router
- Orval-generated REST client
- TanStack Query for backend server-state
- shadcn/ui for UI primitives
- nuqs for URL state
- Zustand only for ephemeral UI-state

The goal is a readable frontend architecture with thin routes, clear module
boundaries, public APIs and low coupling between modules.

## Documentation

Use these docs as the source of truth:

- `docs/architecture.md` — layers, public APIs, module dependencies
- `docs/module-structure.md` — entities, modules, model folders, UI zones
- `docs/data-flow.md` — Orval, TanStack Query, nuqs, shadcn overlays
- `docs/tooling.md` — scripts, generators, env, testing, quality tools

Keep `README.md`, `docs/*`, `.cursor/rules/*` and this file synchronized when
architecture rules change.

## Core Rules

- Dependency direction is `app -> modules -> entities -> shared`.
- `app/` stays thin: route composition, metadata, providers and route-level
  concerns only.
- Modules expose their external surface through `index.ts`.
- Scenario modules may compose other modules only through public APIs.
- Do not import internal files of another module/entity.
- `modules/*/ui` must not import `@/shared/api/generated` directly.
- `app/*` must not import `@/shared/api/generated` directly.
- TanStack Query owns backend server-state.
- Zustand is only for ephemeral UI-state.
- Do not add a shared env facade.

## Module Structure

Default module shape:

```txt
src/modules/{moduleName}/
├── model/
│   ├── queries/      # useQuery hooks and query keys
│   ├── mutations/    # useMutation hooks, invalidation, optimistic updates
│   ├── stores/       # Zustand ephemeral UI-state
│   ├── mappers/      # DTO -> domain/view model mapping
│   ├── constants/    # scenario constants
│   └── permissions/  # scenario permissions and checks
├── ui/               # scenario components
├── api/              # optional manual transport adapter only
├── lib/              # pure module-local utilities
└── index.ts          # public API
```

Create optional folders only when they have real responsibility.

## Data Flow

Default flow:

```txt
UI component
↓
module model query/mutation hook
↓
shared/api/generated
↓
backend
```

Rules:

- Orval output lives in `src/shared/api/generated.ts`.
- Module query hooks live in `model/queries`.
- Module mutation hooks live in `model/mutations`.
- Query keys live in `model/queries`.
- Invalidation and optimistic updates live in `model/mutations`.
- Manual transport adapters live in `modules/*/api` only for composite
  requests, uploads/downloads, SSE/WebSocket, polling, legacy endpoints or
  complex transport mapping.

## UI Structure

Keep `ui/` flat for small modules. When it grows, split by responsibility
zones, not by smart/dumb or container/component categories.

Recommended zones:

- `table`
- `form`
- `dialog`
- `sheet`
- `drawer`
- `filters`
- `states`
- `content`
- `toolbar`
- `parts`

Keep the main scenario component at the top level of `ui/` when that improves
discoverability. Move reusable presentational components used by multiple
modules to `entities` or `shared`.

## URL State And Overlays

User-controlled state that affects page content, navigation or data fetching
belongs in the URL through `nuqs`.

For shadcn Dialog/Sheet/Drawer opened from lists or tables:

- store the selected ID in the URL;
- derive open state from the selected ID;
- use `history: "push"` when opening;
- use `history: "replace"` on ordinary close;
- render one controlled overlay in the scenario parent;
- do not render one overlay instance per row.

## Entity Rules

`entities/*` can contain schemas, types, constants, pure utilities and
presentational entity UI.

Entities must not contain API calls, query hooks, mutation hooks, Zustand stores
or feature-specific scenario logic.

## Shared Rules

`shared` is infrastructure-only:

- `shared/api` — generated Orval client
- `shared/components/ui` — shadcn/ui design system
- `shared/lib/client` — axios, query client, mutation helpers
- `shared/hooks` — generic hooks
- `shared/providers` — global providers
- `shared/configs/i18` — i18n configs
- `shared/consts` — global constants
- `shared/types` — global types

If code knows business meaning, it does not belong in `shared`.

## Imports

- Inside a module/entity, use relative imports.
- Outside a module/entity, use public APIs:
  - `@/modules/x`
  - `@/entities/x`
  - `@/shared/...`
- Do not deep-import another module/entity internals.

## File Naming

- Component files use PascalCase: `UserProfile.tsx`.
- Hook files use kebab-case and start with `use-`: `use-update-user.ts`.
- Query keys use `*.keys.ts`.
- Zustand stores use `*.store.ts`.
- Messages use `*.messages.ts`.
- Mappers use `*.mapper.ts`.
- Schemas use `*.schema.ts`.

## Commands

Run relevant checks after changes:

```bash
pnpm lint
pnpm lint:unused
pnpm exec tsc --noEmit
pnpm test:run
pnpm build
```

For dependency boundaries:

```bash
pnpm lint:deps
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
