# Tooling

## Runtime And Dependencies

- Node.js 24 LTS, minimum 24.14.0; CI and Docker use the same major version.
- pnpm 10.30.3 is pinned in `package.json`; install with `pnpm install --frozen-lockfile`.
- Dependency versions are declared in `package.json` and resolved in `pnpm-lock.yaml`.
  Packages come from the npm registry; retain their bundled license notices.
- Vitest, its UI and coverage package use the same 4.1.x release. Storybook 10.6
  supports Vitest 3/4, so Vitest 5 is not used yet.
- jsdom uses 29.x because jsdom 30 requires a newer Node.js patch than the
  supported 24.14.0 runtime. Node types follow the supported 24.x runtime.
- TypeScript uses 5.9.x to satisfy the TypeScript 5 peer dependency of the
  tsconfig loader used by Storybook's Next.js integration.
- `pnpm-workspace.yaml` keeps Rollup 4 and Orval's transitive Undici 7 on patched
  releases. Revisit these overrides when upstream dependency constraints change.

## Scripts

```bash
pnpm dev
pnpm build
pnpm lint
pnpm lint:deps
pnpm lint:unused
pnpm format
pnpm orval
pnpm test:run
pnpm test:e2e
pnpm storybook
pnpm build:analyze
```

## Generators

```bash
pnpm g:module      # new module: index.ts only
pnpm g:entity      # new entity: model/schema + index.ts
pnpm g:component   # ui/<Component>.tsx
pnpm g:api         # optional api/<module>.api.ts adapter
pnpm g:query       # model/queries/use-<name>.ts + <name>.keys.ts
pnpm g:mutation    # model/mutations/use-<name>.ts
pnpm g:store       # model/stores/<name>.store.ts
```

## Environment Variables

There is no shared env facade in this frontend template.

- `NEXT_PUBLIC_API_URL` — browser API base URL for axios/Orval client.
- `ORVAL_PATH_URL` — OpenAPI schema source for Orval.
- `ANALYZE` — enables bundle analyzer when set to `true`.

See `.env.example`.

## UI

Design system components live in `src/shared/components/ui/*` and are based on
shadcn/ui with Tailwind v4.

## Localization

`next-intl` is used for localization. Locales are `ru` and `kk`.

- Routing/request config: `src/shared/configs/i18/`.
- Messages: `messages/ru.json`, `messages/kk.json`.
- Next.js 16 request interception: `src/proxy.ts`.

## Testing

```bash
pnpm test
pnpm test:run
pnpm test:coverage
pnpm test:e2e
```

Unit/component tests live next to code in `__tests__/`. E2E tests live in
`tests/e2e`.

## Quality Tools

- `pnpm lint:deps` checks dependency boundaries.
- `pnpm lint:unused` finds unused files, exports, types and dependencies.
- `pnpm build:analyze` builds a client bundle report with webpack; the bundle
  analyzer requires webpack, while the ordinary Next.js build uses Turbopack.
- `next.config.ts` connects `next-intl`, bundle analyzer and
  `output: "standalone"` for production/Docker builds.
