# Career Quest — frontend

Интерфейс сотрудника и HR на Next.js: cookie-сессия, профиль, карьерная цель,
рекомендации, демонстрационное завершение активности и HR-сводка со списком сотрудников. После завершения
показываются фактические изменения навыков и готовности из ответа API; повторный
запрос не начисляет прогресс снова. Доступны русский и казахский языки.

Для локального запуска серверной части выполните `./init.sh` из корня
репозитория, затем из `apps/web` — команды установки и запуска ниже.
`NEXT_PUBLIC_API_URL` в локальном `.env` должен указывать на доступный API
(по умолчанию при стандартном запуске сервера — `http://localhost:3001`).
Учётные данные берутся из конфигурации API; секреты не хранить в Git.

Сценарий проверки стадии 4: войти сотрудником → `/employee` → «Подробнее»
у доступного следующего шага → «Завершить активность» → сравнить до/после →
вернуться к обзору и открыть профиль с обновлёнными навыками и историей.
Повторное открытие ссылки сохраняет статус завершения, но не выдумывает старый
снимок для сравнения. Подтверждение демонстрационное, без интеграции с LMS.

HR-интерфейс стадии 5 подключён к API: `/hr` показывает агрегаты дефицитов,
участия и причины отсутствия следующего шага; `/hr/employees` — список с
поиском и фильтрами. Выбранный сотрудник открывается в боковой панели с
целью, навыками и полной историей. Фильтры и выбранный ID сохраняются в URL;
работают прямые ссылки, перезагрузка и Back/Forward. Просмотр доступен только HR.

Проверка стадии 5: войти как HR → `/hr` → «Сотрудники без следующего шага»
→ изменить фильтры → открыть сотрудника → проверить навыки и историю →
закрыть панель или нажать Back. Панель позволяет только просматривать профиль.
Участие показано числом записей истории из API; проценты вовлечённости и
публичные рейтинги не рассчитываются. Фильтрация списка выполняется локально.

План и AI-советник стадии 3 и импорт стадии 6 ещё не подключены к frontend.
Стадия 4 добавляет только необходимый для своего сценария подбор рекомендаций.
API не предоставляет отдельный endpoint деталей активности: доступны текущие
рекомендации и сведения из истории. Дата среза берётся из каталога API.
Подробнее: [реализация стадии 4](app-docs/api-implementation-stages.md#реализация-стадии-4).
HR API и ограничения: [реализация стадии 5](app-docs/api-implementation-stages.md#реализация-стадии-5).

Проверки:

```bash
pnpm test:run
pnpm exec tsc --noEmit
pnpm lint:deps
pnpm build
pnpm exec playwright test tests/e2e/activity-completion.spec.ts tests/e2e/hr-view.spec.ts --project=chromium --project="Mobile Chrome" --workers=1
```

Playwright-сценарии используют перехват HTTP с типизированными ответами API и
не изменяют живые профили. Для первого запуска нужен Chromium:
`pnpm exec playwright install chromium --only-shell`.
При проверке стадии 5 прошли 131 unit-тест и 38 Playwright-сценариев стадий 4–5
(Chromium desktop/mobile), TypeScript, dependency boundaries, сборка и Biome
для изменённых файлов. Проверены RU/KK, reduced motion, повторное завершение,
HR-only доступ, URL-фильтры, навигация Sheet, ошибки 401/403/404 и защита кеша
при выходе или нескольких запросах.
На живом локальном API отдельно пройден HR-сценарий: вход, сводка,
список из 200 сотрудников, открытие и закрытие профиля. Профили не изменялись.
Общие `pnpm lint` и `pnpm lint:unused` пока выявляют ошибки форматирования и
неиспользуемые части исходного шаблона; эта стадия не заявляет их успешное прохождение.
Полный сценарий сотрудника с живым AI и публичное развёртывание не проверены.

## Основа проекта — Crystal Architecture v2

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

- [Architecture](app-docs/architecture.md)
- [Module Structure](app-docs/module-structure.md)
- [Data Flow](app-docs/data-flow.md)
- [Tooling](app-docs/tooling.md)
