# Data Flow

Default data flow:

```txt
UI component
↓
module model query/mutation hook
↓
module api adapter
↓
shared/api/generated axios client
↓
backend
```

## Orval And TanStack Query

- `pnpm orval` generates TypeScript types and axios request functions from
  OpenAPI into `src/shared/api/generated.ts`. React Query hooks are not generated
  there and are written in the owning module.
- OpenAPI source is configured with `ORVAL_PATH_URL`; when it is absent, the
  demo Petstore schema is used.
- Browser API base URL is configured with `NEXT_PUBLIC_API_URL`.
- HTTP instance and wrappers live in `src/shared/lib/client/`.
- Every API-backed module has an `api/` layer. Its functions are the only module
  boundary that imports generated axios clients and own endpoint-specific
  request/response mapping.
- Module hooks in `modules/*/model/queries` and `modules/*/model/mutations`
  call the module `api/` layer, assign query keys, invalidate queries and map DTO
  to domain/view models when needed.
- Components do not call generated functions directly.
- Hooks do not import `@/shared/api/generated` directly.
- Routes do not call generated functions directly. Keep `app/` thin and put
  data orchestration in module hooks or scenario modules.

## Module API Layer

`modules/*/api` is required for every module that talks to the backend. It is the
stable boundary between the generated transport client and the module model.

Typical responsibilities:

- call the generated axios function;
- provide a domain-oriented function name and arguments;
- keep endpoint paths and transport details out of hooks and UI;
- normalize API errors;
- map or compose DTOs when the module needs a view model;
- handle upload/download, polling or other non-trivial transport behavior.

The adapter must not become a second generated client. Keep it small and focused;
do not duplicate endpoint schemas or business calculations there.

## Zustand

Zustand stores (`model/stores/*.store.ts`) must not duplicate backend data or
query cache. Server-state belongs in TanStack Query.

Use Zustand only for ephemeral UI-state:

- modal/drawer open state when it is not URL-driven;
- selected IDs for sidebars/details when they do not affect navigation;
- wizard steps;
- temporary local drafts before submit.

## URL State And shadcn Overlays

User-controlled state that affects page content, navigation or data fetching
belongs in the URL through `nuqs`.

```txt
row click
↓
callback(id)
↓
scenario module writes id to URL with nuqs
↓
Boolean(id) controls shadcn overlay
↓
module query hook loads data with enabled: Boolean(id)
```

Use `history: "push"` when opening an overlay so browser Back closes it. Use
`history: "replace"` on ordinary close so Back does not reopen a just-closed
overlay.
