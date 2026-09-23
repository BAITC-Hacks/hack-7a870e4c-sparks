# Module Structure

Segments are created on demand.

## Project Structure

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

## Entity

`entities/*` contains reusable domain building blocks:

- `model/` — zod schemas, TypeScript types, domain constants;
- `lib/` — pure domain functions;
- `ui/` — presentational entity components;
- `index.ts` — public API.

Entities do not make API requests, do not contain Zustand stores and do not
know about modules.

## Module

- `ui/` — scenario components. It can be flat in small modules and split by
  responsibility zones in medium and large modules.
- `model/` — scenario application logic: query keys, TanStack Query hooks,
  mutation invalidation, DTO mapping, permissions, messages and UI-state
  stores.
- `api/` — optional manual transport adapter. Do not create it when
  Orval-generated client is enough.
- `lib/` — pure module-local utilities.
- `index.ts` — public API.

For a small module, flat `model/` is acceptable. When hooks become noticeable,
group them by role:

```txt
model/
├── queries/      # useQuery hooks and query keys
├── mutations/    # useMutation hooks and invalidation
├── stores/       # Zustand UI-state
├── mappers/      # DTO -> domain/view model
├── constants/    # scenario constants
└── permissions/  # scenario permissions and checks
```

Do not use `model/hooks` as the default structure.

## UI Zones

Do not split `ui/` by `smart/dumb`, `containers/components` or
`widgets/components` by default. Split it by responsibility zones:

```txt
ui/
├── ItemDetailsDialog.tsx
├── content/
├── activity-log/
├── related-records/
├── states/
└── parts/
```

Recommended zones: `table`, `form`, `dialog`, `sheet`, `drawer`, `filters`,
`states`, `content`, `toolbar`, `parts`.

Keep the main scenario component at the top level of `ui/` when that improves
discoverability. Move reusable presentational pieces used by multiple modules
to `entities` or `shared`.

## Cheat Sheet

| Task | Location |
| --- | --- |
| Query key factory | `modules/x/model/queries/x.keys.ts` |
| `useQuery` hook | `modules/x/model/queries/use-*.ts` |
| `useMutation` hook | `modules/x/model/mutations/use-*.ts` |
| Mutation invalidation | `modules/x/model/mutations/use-*.ts` |
| DTO -> domain/view model mapper | `modules/x/model/mappers/*.mapper.ts` |
| Manual transport adapter | `modules/x/api/x.api.ts` |
| Domain schema and type | `entities/x/model/x.schema.ts` |
| Entity card/avatar | `entities/x/ui/` |
| Pure domain utility | `entities/x/lib/` |
| Feature UI-state | `modules/x/model/stores/*.store.ts` |
| Scenario permissions | `modules/x/model/use-*-permissions.ts` |
| Button/input/dialog | `shared/components/ui/` |
| Axios, queryClient, useCustomMutation | `shared/lib/client/` |
| Generated API client | `shared/api/generated.ts` |
| Generic URL/filter hook | `shared/hooks/` |
