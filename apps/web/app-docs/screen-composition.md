# Career Quest — композиция экранов и маршруты

Документ фиксирует frontend-маршруты, состав экранов и переходы для MVP.
Маршруты являются навигационным соглашением frontend и не являются финальным
backend API-контрактом. Финальные URL, параметры и способы загрузки данных будут
уточнены после появления backend-роутов.

Визуальные токены, motion и общие правила компонентов описаны в
[`ui-system-map.md`](./ui-system-map.md).

## 1. Карта маршрутов

| Маршрут | Роль | Назначение | Приоритет |
|---|---|---|---:|
| `/login` | все | Вход в демо и выбор сценария | P0 |
| `/employee` | сотрудник | Главная страница и следующий шаг | P0 |
| `/employee/activity/[activityId]` | сотрудник | Детали и запуск активности | P0 |
| `/employee/career` | сотрудник | Карьерная траектория и skill gaps | P1 |
| `/employee/profile` | сотрудник | Профиль, навыки и история | P1 |
| `/hr` | HR | Агрегированная аналитика | P0 |
| `/hr/employees` | HR | Таблица сотрудников и фильтры | P1 |
| `/import` | HR | Загрузка и проверка датасета | P1 |

### Правила маршрутизации

- `/login` — публичный маршрут; остальные маршруты требуют выбранной роли.
- Сотрудник после входа попадает на `/employee`.
- HR после входа попадает на `/hr`.
- При попытке открыть чужой role-specific маршрут показывается `403` или
  выполняется редирект на домашний маршрут текущей роли.
- Открытие деталей активности должно быть доступно по прямой ссылке.
- После выполнения активности URL остаётся на
  `/employee/activity/[activityId]`, а результат отображается на этой же
  странице.
- Язык задаётся через локализованный сегмент или текущую конфигурацию
  `next-intl`; UI не должен дублировать маршруты вручную для каждого языка.

## 2. Общая композиция приложения

Все role-specific страницы используют один `AppShell`:

```text
AppShell
├── Sidebar
│   ├── Overview
│   ├── Career path
│   ├── Activities
│   ├── HR view (только HR)
│   └── Import data (только HR)
├── Header
│   ├── Breadcrumb / page title
│   ├── LanguageSwitcher
│   └── UserMenu
└── PageContainer
    └── Page content
```

На каждой странице должен быть один основной CTA. Вторичные действия оформляются
как `outline`, `ghost`, ссылка или действие в `DropdownMenu`.

### Responsive layout

- desktop: sidebar 240–264px и контент максимум 1200–1280px;
- tablet: sidebar может сворачиваться в icon rail или `Sheet`;
- mobile: sidebar открывается через `Sheet`, контент — одна колонка;
- HR-таблица на узком экране превращается в список карточек или получает
  горизонтальный `ScrollArea`;
- порядок блоков на мобильном: прогресс → следующий шаг → skill gaps → история.

## 3. `/login` — вход

### Композиция

```text
LoginPage
├── ProductIntro
├── EmployeeLoginSection
│   ├── EmployeeSelect
│   └── ContinueButton
├── HRLoginButton
└── DemoProfilesHint
```

### Поведение

- `EmployeeSelect` используется только для MVP-демо.
- `ContinueButton` disabled, пока сотрудник не выбран.
- `HRLoginButton` сразу переводит в роль HR.
- после входа сохраняются роль и выбранный профиль в session state.
- при ошибке входа показывается `Alert`, форма остаётся доступной.

### Основной CTA

`Продолжить` для сотрудника или `Войти как HR` для HR-сценария.

## 4. `/employee` — Employee Dashboard

### Композиция

```text
EmployeeDashboard
├── WelcomeHeader
│   ├── EmployeeName
│   ├── RoleAndGrade
│   └── CareerGoal
├── ProgressSummary
│   ├── CurrentGrade
│   ├── NextGrade
│   ├── ReadinessValue
│   └── ProgressBar
├── NextStepSection
│   └── RecommendationCard
│       ├── ActivitySummary
│       ├── WhyThisStep
│       ├── SkillImpact
│       ├── ActivityMeta
│       └── PrimaryAction
├── SkillGapList
└── RecentActivityList
```

### Порядок внимания

1. Текущий грейд и readiness.
2. Один главный следующий шаг.
3. Причина рекомендации и ожидаемый результат.
4. Ключевые skill gaps.
5. Последние активности.

### Основной CTA

`Подробнее` или `Начать следующий шаг`. В карточке допускается до двух
альтернатив, но только одна рекомендация визуально выделяется как основная.

### Состояния

- loading: `Skeleton` для прогресса и recommendation card;
- default: одна главная рекомендация;
- empty: `Empty` с текстом «Пока нет подходящего следующего шага»;
- error: `Alert` и `Повторить`;
- success: обновлённый readiness и ссылка на новый следующий шаг.

## 5. `/employee/activity/[activityId]` — Activity Details

### Композиция

```text
ActivityDetailsPage
├── Breadcrumb
├── ActivityHeader
│   ├── ActivityTitle
│   ├── RecommendationBadge
│   └── ActivityStatus
├── RecommendationExplanation
│   ├── WhyThisStep
│   ├── CurrentSkillLevel
│   ├── RequiredSkillLevel
│   └── RecommendationFactors
├── ActivityDescription
├── SkillGainPreview
├── RequirementsList
├── ActivityMeta
│   ├── Format
│   ├── Duration
│   └── Availability
└── ActivityAction
```

### Основной CTA

- доступна: `Начать активность`;
- prerequisite не выполнен: `Недоступно` + объяснение причины;
- уже выполнена: `Активность завершена` + результат;
- ошибка запуска: `Повторить`.

### Навигация

- Back возвращает на `/employee`;
- после запуска остаёмся на текущем маршруте;
- результат активности появляется inline, без принудительного перехода на
  отдельный экран.

## 6. Результат выполнения активности

Результат является состоянием страницы Activity Details, а не отдельным
маршрутом MVP.

```text
ActivityResult
├── ResultHeader
├── BeforeAfterComparison
│   ├── SkillLevelBefore
│   ├── SkillLevelAfter
│   ├── ReadinessBefore
│   └── ReadinessAfter
├── ClosedGapsSummary
├── ProgressUpdatedToast
└── NextStepCard
```

Последовательность:

```text
Начать активность
  ↓
Button disabled + Spinner
  ↓
обновление skill level и readiness
  ↓
короткий highlight изменившихся значений
  ↓
toast «Прогресс обновлён»
  ↓
появляется следующий шаг
```

Повторное выполнение обычной активности запрещено. Кнопка должна оставаться
disabled с пояснением причины.

## 7. `/employee/career` — карьерная траектория

### Композиция

```text
CareerPage
├── CareerHeader
├── CareerTimeline
│   ├── CurrentGrade
│   ├── NextGrade
│   └── FutureGrades
├── ReadinessSummary
├── RequiredSkillsList
└── CurrentGapsList
```

### Основной CTA

`Посмотреть следующий шаг` — возвращает к главной рекомендации на `/employee`.

Это информационный экран: он не должен конкурировать с основным flow выполнения
активности.

## 8. `/employee/profile` — профиль сотрудника

### Композиция

```text
ProfilePage
├── ProfileHeader
├── EmployeeInfo
├── CareerGoalCard
├── SkillsMatrix
├── CompletedActivities
└── ParticipationStats
```

### Основной CTA

`Вернуться к следующему шагу` → `/employee`.

Персональная история доступна только текущему сотруднику и HR с соответствующим
доступом.

## 9. `/hr` — HR Dashboard

### Композиция

```text
HRDashboard
├── HRHeader
├── OverviewMetrics
│   ├── EmployeesWithoutNextStep
│   ├── OverallParticipation
│   └── CriticalSkillCount
├── SkillGapAnalytics
│   ├── SkillGapChart
│   └── CriticalSkillsTable
├── ParticipationAnalytics
│   ├── CompletionRateChart
│   └── StatusBreakdown
└── QuickActions
    ├── ViewEmployees
    └── ImportData
```

### Основной CTA

`Посмотреть сотрудников без следующего шага` или `Загрузить данные`, если
аналитика ещё не сформирована.

### Ограничения

- показывать агрегированные показатели;
- не показывать публичные рейтинги сотрудников;
- не смешивать HR-аналитику с employee recommendation flow;
- график всегда сопровождается числовыми значениями и понятным label.

## 10. `/hr/employees` — сотрудники

### Композиция

```text
EmployeesPage
├── PageHeader
├── EmployeeFilters
│   ├── DepartmentSelect
│   ├── RoleSelect
│   └── GradeSelect
├── EmployeesTable
└── EmployeeDetailsSheet
```

### Поведение

- фильтры, влияющие на данные, синхронизируются с URL;
- выбор строки открывает `Sheet`, а не отдельную обязательную страницу;
- Back закрывает `Sheet` через URL state;
- персональные детали доступны только HR.

## 11. `/import` — загрузка данных

### Композиция

```text
DataImportPage
├── ImportHeader
├── FileUpload
├── DatasetValidation
├── ImportPreview
├── ImportResult
└── ImportAction
```

### Состояния

```text
idle → file selected → validating → preview → importing → success/error
```

Ошибки должны показывать файл, строку, поле и причину. При ошибке валидации
кнопка импорта disabled, но пользователь может заменить файл.

## 12. Навигационные переходы MVP

```text
/login
  ├── employee → /employee
  └── HR       → /hr

/employee
  └── основной CTA → /employee/activity/[activityId]

/employee/activity/[activityId]
  ├── Back → /employee
  ├── завершение → результат на текущем маршруте
  └── следующий шаг → /employee/activity/[nextActivityId]

/hr
  ├── сотрудники → /hr/employees
  └── импорт → /import

/hr/employees
  └── строка таблицы → EmployeeDetailsSheet

/import
  └── завершение → /hr
```

## 13. Готовность экрана к реализации

Экран считается готовым к разработке, если для него определены:

- маршрут и роль доступа;
- композиция блоков сверху вниз;
- один основной CTA;
- loading, error, empty и success состояния;
- правила переходов назад и вперёд;
- используемые shadcn-компоненты;
- источник данных или mock view-model.

Минимальный порядок реализации:

1. `/login`;
2. `/employee`;
3. `/employee/activity/[activityId]`;
4. результат активности;
5. `/hr`;
6. `/hr/employees` и `/import`;
7. `/employee/career` и `/employee/profile`.
