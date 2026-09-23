# Data Flow

Default data flow:

```txt
UI component
↓
module model query/mutation hook
↓
shared/api/generated
↓
backend
```

## Orval And TanStack Query

- `pnpm orval` generates types, request functions and React Query helpers from
  OpenAPI into `src/shared/api/generated.ts`.
- OpenAPI source is configured with `ORVAL_PATH_URL`; when it is absent, the
  demo Petstore schema is used.
- Browser API base URL is configured with `NEXT_PUBLIC_API_URL`.
- HTTP instance and wrappers live in `src/shared/lib/client/`.
- Module hooks in `modules/*/model/queries` and `modules/*/model/mutations`
  import generated functions, assign query keys, invalidate queries and map DTO
  when needed.
- Components do not call generated functions directly.
- Routes do not call generated functions directly. Keep `app/` thin and put
  data orchestration in module hooks or scenario modules.

## Optional Module API Adapter

`modules/*/api` is needed only when generated client is not enough:

- composite request;
- upload/download;
- SSE/WebSocket;
- polling adapter;
- legacy endpoint;
- complex transport mapping that should not live inside a hook.

Do not create module `api/` only to re-export Orval-generated functions.

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
