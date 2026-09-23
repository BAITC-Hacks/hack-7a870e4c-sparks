# Career Quest — план имплементации frontend по API-контракту

Документ связывает OpenAPI-контракт из [`apps/api/openapi.json`](../../api/openapi.json)
с уже описанными экранами Career Quest. Это план реализации веб-приложения,
разделённый на законченные стадии. Он учитывает правила слоёв из
[`architecture.md`](./architecture.md), поток данных из [`data-flow.md`](./data-flow.md),
структуру модулей из [`module-structure.md`](./module-structure.md) и маршруты из
[`screen-composition.md`](./screen-composition.md).

## 1. Что является источником истины

- HTTP-маршруты, параметры, request body, ответы и ошибки — `apps/api/openapi.json`.
- Семантика расчёта профиля, рекомендаций, даты среза и импортов — API-контракт и
  реализация `apps/api/src/modules/*`.
- Визуальная композиция и UX-состояния — документы в этой папке.
- При реализации любой стадии обязательно использовать указания из всех
  относящихся к экрану документов этой папки, включая UI/UX:
  [`screen-composition.md`](./screen-composition.md) задаёт маршруты, состав
  экранов, роли и основные CTA; [`ui-system-map.md`](./ui-system-map.md) —
  визуальные токены, компоненты и композиционные правила;
  [`interaction-and-motion.md`](./interaction-and-motion.md) — состояния,
  переходы, URL-state, overlay и motion; [`frontend-mock-scenarios.md`](./frontend-mock-scenarios.md)
  — демо-сценарии, fixtures и ожидаемые пользовательские потоки.
  Архитектурные и инструментальные ограничения берутся соответственно из
  [`architecture.md`](./architecture.md), [`module-structure.md`](./module-structure.md),
  [`data-flow.md`](./data-flow.md) и [`tooling.md`](./tooling.md).
- API-план не заменяет UI/UX-документы: перед изменением экрана агент должен
  проверить связанные требования, состояния loading/empty/error/success,
  responsive-поведение, доступность и ограничения по ролям. Если фактический
  API не покрывает описанный UI-сценарий, нужно явно зафиксировать ограничение
  и не подменять его фиктивными данными или выдуманным endpoint.
- При расхождении источников область применения разделяется по ответственности:
  API-контракт имеет приоритет для транспорта и данных, UI/UX-документы — для
  композиции и поведения интерфейса, архитектурные документы — для структуры
  кода. Существенные расхождения фиксируются в изменяемой документации.
- Backend server-state хранится в TanStack Query. Zustand используется только для
  временного UI-состояния.
- Orval генерирует только axios-клиенты и типы. React Query hooks пишутся вручную
  внутри модулей.
- UI-компоненты и hooks не импортируют `@/shared/api/generated` напрямую. Каждый
  API-backed module использует свой `api/` слой, а hooks вызывают только его.

## 2. Сводка API-контракта

| Зона | Endpoint | Доступ | Назначение frontend |
|---|---|---|---|
| System | `GET /api/health` | public | проверка API/БД, AI-конфигурации и доступности агента |
| Auth | `POST /api/auth/login` | public | вход по `username` и `password`, установка HttpOnly cookie |
| Auth | `GET /api/auth/session` | session | восстановление текущего пользователя при загрузке приложения |
| Auth | `POST /api/auth/logout` | session | завершение сессии |
| Career | `GET /api/employees/{id}` | employee: self, HR: any | профиль, цель, readiness, gaps, history, warnings |
| Career | `PATCH /api/employees/{id}/goal` | employee: self, HR: any | установка или сброс карьерной цели |
| Career | `POST /api/employees/{id}/activities/{eventId}/complete` | employee: self, HR: any | идемпотентное демо-завершение активности и пересчёт профиля |
| Career | `GET /api/catalog` | session | роли, требования, навыки и `as_of_date` |
| Career | `POST /api/employees/{id}/recommendations` | employee: self, HR: any | до трёх рекомендаций, `mode=ai` или `mode=rules` |
| Career | `GET /api/employees/{id}/plan` | employee: self, HR: any | расчётный карьерный план, прогноз readiness и траектория |
| Career | `POST /api/employees/{id}/chat` | employee: self, HR: any | AI-советник с сообщением, планом и рекомендациями |
| HR | `GET /api/employees` | session, HR-сценарий | краткий список сотрудников |
| HR | `GET /api/hr/overview` | HR | агрегаты дефицитов, участия и сотрудники без следующего шага |
| HR | `POST /api/hr/import` | HR | атомарный импорт JSON-профилей и CSV-истории |

Все ошибки имеют форму `{ message: string }`. Для `401` нужно очищать локальное
состояние сессии и отправлять пользователя на `/login`; `403` отображать как
ошибку доступа без подмены роли. UI не должен считать `200` единственным
возможным ответом.

Авторизация основана на cookie `career_quest_session`, поэтому axios-клиент
должен отправлять credentials. Сессия живёт 12 часов; API ограничивает неудачные
попытки входа: 10 попыток на аккаунт за 15 минут.

## 3. Целевая frontend-структура

```text
src/
├── app/[locale]/
│   ├── login/page.tsx
│   ├── employee/page.tsx
│   ├── employee/activity/[activityId]/page.tsx
│   ├── employee/career/page.tsx
│   ├── employee/profile/page.tsx
│   ├── hr/page.tsx
│   ├── hr/employees/page.tsx
│   └── import/page.tsx
├── entities/
│   ├── career-profile/       # Profile, Goal, SkillGap, History
│   ├── activity/             # Event, Recommendation, completion result
│   └── session/              # SessionUser, role/permission helpers
├── modules/
│   ├── auth/
│   │   ├── api/
│   │   └── model/
│   │       ├── queries/
│   │       └── mutations/
│   ├── career-profile/
│   ├── recommendations/
│   ├── career-plan/
│   ├── career-advisor/
│   ├── activities/
│   ├── catalog/
│   ├── hr-overview/
│   ├── employees-directory/
│   └── data-import/
└── shared/api/generated.ts       # только Orval axios clients и типы
```

Модули могут быть объединены, если размер кода этого требует, но границы
ответственности должны сохраниться. Внешние импорты идут через `index.ts`.
Scenario-модуль `career-quest` может композиционно собирать profile,
recommendations и activities, не нарушая направление `app → modules → entities → shared`.

## 4. Фактический generated API surface

После генерации из текущего OpenAPI `src/shared/api/generated.ts` экспортирует
axios-фабрику `getCareerQuestAPI()`. Она возвращает следующие transport-клиенты:

| Generated client | Endpoint | Module API adapter |
|---|---|---|
| `health` | `GET /api/health` | `system/api` |
| `login`, `getSession`, `logout` | `/api/auth/*` | `auth/api` |
| `getEmployees` | `GET /api/employees` | `employees-directory/api` |
| `getProfile`, `updateGoal`, `completeActivity` | `/api/employees/{id}*` | `career-profile/api`, `activities/api` |
| `getCatalog` | `GET /api/catalog` | `catalog/api` |
| `getRecommendations` | `POST /api/employees/{id}/recommendations` | `recommendations/api` |
| `getCareerPlan` | `GET /api/employees/{id}/plan` | `career-plan/api` |
| `chatWithCareerAdvisor` | `POST /api/employees/{id}/chat` | `career-advisor/api` |
| `getHrOverview`, `importData` | `/api/hr/*` | `hr-overview/api`, `data-import/api` |

Рядом с клиентами сгенерированы result-типы, например
`GetProfileResult`, `GetCareerPlanResult` и `ChatWithCareerAdvisorResult`.
Module API adapters импортируют `getCareerQuestAPI` и эти типы; React Query hooks
не импортируют generated-файл и не знают имён HTTP-операций. Экземпляр клиента
создаётся один раз на уровне module API:

```ts
const api = getCareerQuestAPI();
```

Не создавать фабрику внутри каждого query/mutation hook.

У `getCareerQuestAPI()` есть три одинаково типизированных варианта body для
частично пересекающихся content types (`BodyOne`, `BodyTwo`, `BodyThree`). Adapter
должен выбрать один формат запроса для приложения и не размножать эту деталь в UI.
Для `completeActivity` и `getRecommendations` generated client всё равно требует
аргумент body, поэтому adapter явно передаёт `{}`. Не добавлять туда бизнес-поля.

## Стадия 0. Подготовка контракта и клиента

**Результат:** frontend использует фактический Career Quest API вместо Petstore.

1. Рекомендуемый источник — локальный `../../apps/api/openapi.json`, уже заданный
   в `orval.config.js`. Если используется `ORVAL_PATH_URL`, он должен указывать
   на тот же Career Quest OpenAPI и осознанно переопределяет `input` конфига.
   Не запускать рабочую генерацию с Petstore fallback.
2. В `orval.config.js` выбрать axios-клиент без React Query helpers; результатом
   должны быть типы и request functions в `src/shared/api/generated.ts`.

   ```js
   output: {
     target: "./src/shared/api/generated.ts",
     client: "axios",
     override: {
       mutator: {
         path: "./src/shared/lib/client/custom-instance.ts",
         name: "customInstance",
       },
     },
   }
   ```

3. Запустить `pnpm orval` из `apps/web` и проверить, что
   `src/shared/api/generated.ts` содержит операции Career Quest, а не `pet`/`store`.
4. В `axios-client.ts` проверить base URL через `NEXT_PUBLIC_API_URL` и включить
   `withCredentials: true` для cookie-сессии.
5. Не редактировать `generated.ts` вручную. Любые transport-особенности исправлять
   в `custom-instance.ts` или module `api/` adapter.
6. Добавить общий разбор API-ошибки `{ message }` и поведение для `401`.

**Проверка стадии:** `pnpm orval`, TypeScript-компиляция и запрос
`GET /api/health` к настроенному API.

## Стадия 1. Сессия и каркас маршрутов

**Результат:** пользователь может войти, восстановить сессию, выйти и попасть в
нужный role-specific shell.

### Реализация

- Создать `modules/auth/api/` с функциями `login`, `getSession`, `logout`, которые
  вызывают только generated axios clients.
- Создать `modules/auth/model/queries` и `model/mutations` с React Query hooks
  `useSession`, `useLogin`, `useLogout`; hooks не знают URL и transport details.
- `POST /api/auth/login`: через `auth/api` отправлять `{ username, password }`, после успеха
  инвалидировать session query и перенаправлять employee на `/employee`, HR на `/hr`.
- `GET /api/auth/session`: через `auth/api` запрашивать при старте приложения; `401` трактовать как
  anonymous, остальные ошибки показывать в error state.
- `POST /api/auth/logout`: через `auth/api` завершить сессию, очистить query cache и перейти на `/login`.
- Сохранить в query cache только `SessionUser`; не дублировать server-state в Zustand.
- Защитить маршруты через session/role guard. Employee не должен выбирать другой
  `employee_id` через URL: backend всё равно вернёт `403`, но UI обязан не строить
  такую навигацию.

Для `401` отключить автоматический retry query и выполнять redirect только для
сессионных запросов. Публичные запросы вроде `/api/health` не должны вызывать
редирект на `/login`.

### Связь с UI-документами

Реализуются `/login`, `AppShell`, `UserMenu`, loading/error состояния из
`screen-composition.md` и демо-профили из `frontend-mock-scenarios.md`. Выбор
профиля — только способ ввести demo credentials; это не отдельный backend endpoint.

**DoD:** вход employee и HR, перезагрузка страницы с восстановлением cookie,
выход, корректные `401/403`, локали `ru` и `kk`.

## Стадия 2. Профиль, карьерная цель и каталог

**Результат:** `/employee` и `/employee/profile` показывают данные API.

### Query и mutation hooks

- `modules/career-profile/api/` вызывает generated axios clients для
  `GET /api/employees/{id}` и `PATCH /api/employees/{id}/goal`.
- `modules/catalog/api/` вызывает generated axios client для `GET /api/catalog`.
- `useEmployeeProfile(employeeId)` в `model/queries` вызывает module API для
  `GET /api/employees/{id}`.
- `useUpdateCareerGoal(employeeId)` в `model/mutations` вызывает module API для
  `PATCH /api/employees/{id}/goal` с
  `{ goal: Goal | null }`.
- `useCatalog()` вызывает module API для `GET /api/catalog`; запрос можно
  кэшировать дольше профиля.
- Query keys хранить рядом с hooks, например `['employee-profile', employeeId]`.
- После смены цели инвалидировать profile, recommendations, career-plan и advisor
  queries, так как цель влияет на все эти результаты.

### DTO → view model

Из `Profile` использовать:

- `employee.full_name`, `role`, `grade`, `career_goal` — шапка профиля;
- `target`, `target_source`, `readiness` — карьерная цель и прогресс;
- `gaps` — critical/non-critical skill gaps;
- `history` — последние активности, включая обязательные;
- `warnings` — объяснения отсутствия цели, каталога или покрытия.

Generated-типы для skill maps и prerequisites используют `Record<string, unknown>`.
В module mapper/schema layer нужно проверить, что значения действительно являются
числами уровня навыка или допустимыми prerequisite values, прежде чем отдавать их
в view model. Не делать небезопасные `as Record<string, number>` внутри UI.

`readiness` — покрытие требований цели, а не вероятность повышения. `null` нужно
показывать как отсутствие расчёта, а не как `0%`. `target_source=next_grade`
означает автоматически выбранный следующий грейд; `none` требует явной цели.

Для Lead без следующего грейда показать CTA задания явной цели. Не добавлять
неподтверждённую формулу readiness и не выдумывать отсутствующие занятия.

**DoD:** loading/empty/error/success, редактирование и сброс цели, отображение
warnings и корректное обновление readiness/gaps после mutation.

## Стадия 3. Рекомендации и детали активности

**Результат:** главный demo-flow ведёт от профиля к объяснимому следующему шагу.

### Endpoint

`modules/recommendations/api/` вызывает generated axios client для
`POST /api/employees/{id}/recommendations`. Hook `useRecommendations` в
`model/queries` вызывает только этот adapter. Несмотря на отсутствие бизнес-полей,
adapter передаёт generated client пустой body `{}`. Endpoint получает до трёх
рекомендаций и возвращает:

- `mode`: `ai` или `rules`;
- `model`: имя модели или `null`;
- `message`: пояснение режима/результата;
- `recommendations[]`: event, score, factors, gains, `next_session`,
  `in_progress`, `explanation`;
- `generated_at`, `duration_ms`.

Запрос запускать по явному CTA или при загрузке dashboard согласно UX-решению;
не запускать бесконечно после каждого рендера. Состояния: loading, available,
empty, error. При `mode=rules` не показывать AI как использованный: в UI явно
отобразить расчётный режим и `message`.

Каждая рекомендация должна показывать объяснение минимум по трём категориям
факторов (`grade`, `gap`, `history`, `target`). Визуально выделяется только одна
основная рекомендация; максимум две альтернативы.

Детали карточки маппятся на `/employee/activity/[activityId]`. Prerequisites,
аудитория, доступная сессия и `mandatory` должны влиять на disabled/available
состояние. Обязательные мероприятия не превращать в CTA рекомендации.

**DoD:** до трёх карточек, empty state с `message`, объяснение факторов, fallback
rules, отображение длительности/формата/ближайшей сессии и корректная ошибка.

### Карьерный план и AI-советник

`modules/career-plan/api/` вызывает `getCareerPlan(employeeId)` для
`GET /api/employees/{id}/plan`. Hook `useCareerPlan` использует его для
`/employee/career` и получает:

- текущую позицию и карьерную цель с `goal_source`;
- `as_of_date`, `last_review_date`, `effective_skills`;
- `readiness` и `projected_readiness`;
- до трёх элементов `trajectory` и до трёх рекомендаций;
- `gaps`, `uncovered_skills`, `mandatory_tasks`, `warnings`.

`projected_readiness` и `projected_skills` показывать как прогноз, не как
подтверждённый текущий результат. `counted_completions` и `assessment_note`
нужны для объяснения расчёта и не должны превращаться в локальную историю.
Ответ `503` отображать как недоступность AI/плана с сохранением понятного
расчётного состояния, если оно уже есть.

`modules/career-advisor/api/` вызывает `chatWithCareerAdvisor(employeeId,
body)` для `POST /api/employees/{id}/chat`. Hook `useCareerAdvisor` передаёт
`message` длиной 1–3000 символов и не более 20 реплик
`conversation_history`. Ответ содержит `reply`, полный `plan` и
`recommendations`; после ответа инвалидировать query ключи career plan и
recommendations. Не отправлять employee ID, профиль или сырую историю вручную:
контекст сотрудника формируется API после проверки доступа.

**DoD:** `/employee/career` показывает текущую и прогнозную траекторию,
mandatory tasks и warnings; advisor поддерживает loading/error/503 и сохраняет
контекст диалога только в UI state или URL, не дублируя server-state в Zustand.

## Стадия 4. Завершение активности и обновление прогресса

**Результат:** пользователь может завершить допустимую активность и увидеть
before/after без фиктивного локального пересчёта.

### Mutation

`modules/activities/api/` вызывает generated axios client для
`POST /api/employees/{id}/activities/{eventId}/complete` с пустым body `{}`. Hook
`useCompleteActivity` в `model/mutations` вызывает adapter. Ответ содержит
`profile` и `already_completed`.

- Пока mutation выполняется: disabled CTA + Spinner.
- После успеха: обновить profile query данными ответа, а рекомендации,
  career-plan и advisor queries инвалидировать.
- Если `already_completed=true`, показать идемпотентный результат, не начислять
  прогресс повторно.
- Ошибка не должна оптимистично менять skill level.
- `history` после ответа снова отображается из backend, включая обязательные записи.

Motion соответствует `interaction-and-motion.md`: progress bar 500–700ms,
короткий highlight изменившихся значений, toast и новый next step. Lottie не
заменяет текстовый результат.

Особенно важно: дата среза берётся из ответа API/`as_of_date`; frontend не должен
начислять gain по всей истории, понижать уровень через `max_level` или создавать
локальную дату завершения.

**DoD:** submitting/success/error, before/after, повторный запрос, обновление
dashboard и тест на отсутствие двойного начисления.

### Реализация стадии 4

Реализованы `modules/activities`, маршрут
`/employee/activity/[activityId]` и следующий шаг на `/employee`. В исходной
ветке отсутствовала стадия 3, поэтому добавлен необходимый для завершения
`modules/recommendations`: реальный POST, query, до трёх ссылок и детали с
объяснениями API. Карьерный план и AI-советник остаются отдельной работой
стадии 3; их будущие query keys уже инвалидируются после завершения.

- `useCompleteActivity(employeeId)` передаёт только `eventId`; adapter отправляет
  `{}`. Повторных автоматических попыток mutation нет. Перед запросом сохраняется
  снимок профиля из Query Cache; оптимистичного начисления нет.
- Успешный ответ целиком заменяет кеш профиля. Незавершённые GET профиля
  отменяются до отправки и перед записью ответа, чтобы старые данные не затёрли
  результат. Пересчёт рекомендаций идёт в фоне и не задерживает показ результата.
- Завершения одного сотрудника выполняются последовательно, в том числе при
  переходе между страницами. Before-снимок берётся перед фактическим запросом.
  Ответ после logout/очистки кеша или замены profile query не записывает старый
  профиль обратно; устаревший запрос из очереди не отправляется.
- Сравнение навыков, readiness и закрытых разрывов строится из двух профилей.
  `already_completed=true` не отображает новый прирост. `null` readiness остаётся
  отсутствием расчёта. Сохранённая история, включая обязательные ежегодные записи,
  показывается на странице профиля без локальных добавлений.
- В текущем контракте **Profile не содержит `as_of_date`**. На экране используется
  `as_of_date` из `GET /api/catalog`, а дата завершения — только из `completed_at`
  истории. Текущее время браузера не используется для начисления или датирования.
- Отдельного endpoint деталей мероприятия нет. Прямая ссылка загружает текущие
  рекомендации; после завершения показывает сохранённую историю, если мероприятие
  уже исключено из подбора. Если его нет ни там, ни там — состояние недоступности
  без кнопки завершения. Before/after доступно в текущем успешном запуске; после
  reload старый снимок не восстанавливается и не выдумывается.
- UI блокирует обязательные мероприятия, неподходящую аудиторию, невыполненные
  prerequisites, отсутствие сессии и уже завершённый шаг. Для EV_036 учитывается
  повтор на другой дате среза; окончательная допустимость проверяется backend.
- RU/KK, disabled + Spinner, inline error/retry, toast, прогресс 600 ms и короткая
  подсветка изменений поддерживают reduced motion. `401` очищает кеш и ведёт на
  вход, `403` показывает ошибку доступа.

Автоматические проверки: unit-тесты adapter/hook/mapper и route-mocked Playwright
сценарии в `tests/e2e/activity-completion.spec.ts`. Они проверяют ответ сервера,
отличающийся от прогноза, ошибку и повтор, идемпотентность, обновление dashboard,
историю и прямую ссылку. Они не подтверждают публичное развёртывание или живой
AI-подбор. Команды и ограничения проверок указаны в README frontend.

## Стадия 5. HR-view и список сотрудников

**Результат:** HR получает агрегированный экран без раскрытия employee-only
сценария другим пользователям.

### Endpoint mapping

- `modules/hr-overview/api/` вызывает generated axios clients для
  `GET /api/hr/overview` и `GET /api/employees`. Hooks в `model/queries` вызывают
  только этот adapter.
- `GET /api/hr/overview` → `/hr`:
  `total_employees`, `employees_without_step`, `skill_gaps`, `participation`,
  `as_of_date`.
- `GET /api/employees` → `/hr/employees`:
  краткие `employee_id`, `full_name`, `role`, `grade`, `department`.
- `GET /api/employees/{id}` → HR detail/Sheet сотрудника; переиспользовать
  profile module и его mapper.

`participation` уже агрегирован по event и содержит `mandatory`; не пересчитывать
проценты из неполного набора на frontend. `employees_without_step[].reason`
показывать как backend explanation. Не создавать публичные рейтинги сотрудников
и не показывать чувствительную вовлечённость employee-пользователю.

Фильтры, если они нужны для локального UI, держать в URL через `nuqs`. Если API
не поддерживает серверную фильтрацию, фильтровать только полученный HR-список и
явно учитывать его ограничение.

**DoD:** метрики, пустые массивы, таблица/мобильный список, Sheet профиля,
loading/error/forbidden states и проверка HR-only доступа.

## Стадия 6. Импорт данных

**Результат:** `/import` отправляет синтетические профили и историю одной
атомарной операцией.

### Endpoint

`modules/data-import/api/` вызывает generated axios client для
`POST /api/hr/import`. Hook `useImportData` в `model/mutations` вызывает только
этот adapter. Endpoint получает `{ employees_json, history_csv }` как строки.
Один из файлов может быть пустым; общий лимит запроса — 8 МиБ. Backend сначала
валидирует весь объединённый набор, затем выполняет upsert; ошибка отменяет
весь запрос. Импорт не создаёт аккаунты и не меняет роли.

Frontend-flow:

```text
выбор файлов → чтение текста → локальная базовая валидация
→ preview/размер → submit → результат employees/history/message
→ invalidate hr overview, employees, catalog, profile, recommendations and career-plan queries
```

Файлы не отправлять в неизвестном multipart-формате: контракт допускает разные
content types, но целевой адаптер должен явно отправлять JSON с двумя строковыми
полями и ограничивать общий размер до запроса. Для ошибок `413` показать лимит,
для `400` — backend `message`, для повторной отправки не показывать ложный success.

**DoD:** drag/drop и выбор файлов, preview, размер, submitting, атомарный success,
ошибка без частично обновлённого UI, переход в `/hr` после успеха.

## Стадия 7. Сквозная проверка и удаление mock boundary

**Результат:** приложение воспроизводимо демонстрирует основной сценарий на API.

### Основной smoke flow

1. Открыть `/login`, войти employee.
2. Восстановить `/api/auth/session` после reload.
3. Открыть `/employee`, получить профиль и рекомендации.
4. Открыть `/employee/career`, проверить текущую и прогнозную траекторию.
5. Отправить сообщение в AI-советник, проверить `reply`, `plan` и
   `recommendations`, включая fallback/ошибку `503`.
6. Открыть Activity Details, проверить минимум три фактора объяснения.
7. Нажать завершение, получить `profile`, увидеть обновлённый skill/readiness и
   обновлённый career plan.
8. Выйти, войти HR.
9. Открыть `/hr`, `/hr/employees`, профиль сотрудника и `/import`.
10. Импортировать синтетические JSON/CSV, убедиться в обновлении агрегатов.

### Проверки

- `pnpm orval` — клиент соответствует контракту.
- `pnpm test:run` — hooks, mappers, permission/error states и mutation behavior.
- `pnpm test:e2e` — основной employee и HR flows с настроенным API.
- `pnpm lint`, `pnpm lint:deps`, `pnpm lint:unused`.
- `pnpm build`.

После подключения API fixtures из `frontend-mock-scenarios.md` оставить только
для Storybook/изолированных UI-тестов. Не использовать fixture как fallback в
production query hook без явного режима demo.

## 5. Definition of Done для frontend API-интеграции

- [ ] `generated.ts` сгенерирован из `apps/api/openapi.json`, Petstore удалён.
- [ ] `NEXT_PUBLIC_API_URL`, cookie credentials и `401` обработаны.
- [ ] `401` не уходит в бесконечный retry и не редиректит публичные запросы.
- [ ] Сессия, роли employee/HR и route guards работают после reload.
- [ ] Профиль, цель, readiness, gaps, history и warnings отображаются из API.
- [ ] Рекомендации показывают режим, до трёх результатов и объяснение по трём факторам.
- [ ] Career plan и AI-advisor проверяются отдельно, включая `503`.
- [x] Завершение активности идемпотентно и обновляет server-state из ответа.
- [ ] HR overview, employee directory и profile Sheet работают с пустыми массивами.
- [ ] Импорт валидируется, соблюдает лимит 8 МиБ и не создаёт частичное состояние.
- [ ] Mock-сценарии не подменяют API в основном приложении.
- [ ] Основной smoke flow и релевантные команды проверки выполнены и зафиксированы.
