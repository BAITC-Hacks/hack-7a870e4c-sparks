# Architecture

Crystal Architecture v2 is a frontend architecture for Next.js App Router
projects with Orval and TanStack Query.

## Principles

1. **Colocation by default.** Code lives close to the place that uses it.
2. **One obvious place for each thing.**
3. **One-way layer dependencies.** The direction is always
   `app -> modules -> entities -> shared`.
4. **Thin `app/`.** Routes compose scenarios and route-level concerns.
5. **Server-state is not duplicated.** Backend data lives in TanStack Query.
6. **Generated API does not leak into UI.** Components call module hooks.

## Layers

```txt
app/        -> Next.js routing and thin composition
modules/    -> business scenarios: UI, model hooks, scenario state
entities/   -> domain building blocks: schemas, types, pure utilities, entity UI
shared/     -> infrastructure: design system, http client, generated API, configs
```

## Boundaries

- `shared` does not import `@/entities`, `@/modules` or `@/app`.
- `entities` do not import `@/modules` or `@/app`.
- Modules can import other modules only through public APIs and only for
  scenario composition.
- Internal imports of another module/entity are forbidden.
- `modules/*/ui` must not import `@/shared/api/generated` directly.
- `app/*` must not import `@/shared/api/generated` directly.

Dependency boundaries are checked by dependency-cruiser:

```bash
pnpm lint:deps
```

## Public API

External imports go through `index.ts`:

```ts
import { UserProfile, useUpdateUser } from "@/modules/users";
import { UserAvatar, userSchema } from "@/entities/user";
```

Do not import internal files of another module:

```ts
// Forbidden
import { UserProfile } from "@/modules/users/ui/UserProfile";
```

## Base And Scenario Modules

- **Base module** owns one business area: `items`, `activity-log`,
  `related-records`.
- **Scenario module** composes a user workflow from several modules:
  `item-details`, `item-directory`.

Example:

```txt
app/items/page.tsx
↓
modules/item-directory
├── modules/items
└── modules/item-details
    ├── modules/items
    ├── modules/activity-log
    └── modules/related-records
```

Scenario dependencies are valid when they go through public APIs, stay one-way,
do not create cycles and represent a real user workflow.

## Component Coupling

Prefer callbacks over direct knowledge of parent scenarios.

- A table/list component reports events: `onItemClick(itemId)`.
- A scenario parent decides what the event means.
- Base components should not know which dialog, sheet or route will react.
- For shadcn overlays from lists/tables, prefer one controlled overlay in the
  scenario parent instead of one overlay instance per row.
