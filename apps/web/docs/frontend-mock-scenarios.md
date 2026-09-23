# Career Quest — frontend mock-сценарии

Документ описывает временные данные и состояния для разработки UI до появления
backend-роутов. Эти структуры предназначены для fixtures, Storybook и локального
демо и не являются API-контрактом.

## 1. Принципы

- UI не должен зависеть от конкретных backend ID и URL.
- Fixtures должны подставляться через module-level adapter или mock query hooks.
- Компоненты получают данные в форме, удобной для отображения, а не в форме
  будущего DTO.
- После появления API fixtures заменяются адаптерами без изменения композиции
  экранов.
- Нельзя добавлять в mock-данные поля только ради предположительной реализации
  backend.

## 2. Демо-профили входа

Для MVP достаточно двух employee-профилей и одного HR-сценария:

| Профиль | Роль | Сценарий |
|---|---|---|
| Backend Engineer | Middle → Senior | Есть критичный skill gap и рекомендация |
| Product Manager | Middle → Senior | Нет подходящей рекомендации или есть альтернативы |
| HR Demo | HR | Есть агрегированная аналитика и сотрудники без следующего шага |

UI должен работать с выбранным profile fixture, а не с жёстко зашитым именем
сотрудника.

## 3. Employee Dashboard fixture

Минимальные отображаемые данные:

```ts
type EmployeeDashboardFixture = {
  employeeName: string
  role: string
  currentGrade: string
  nextGrade: string
  readiness: number
  careerGoal?: string
  recommendation: RecommendationFixture | null
  skillGaps: SkillGapFixture[]
  recentActivities: ActivityHistoryFixture[]
}
```

### Fixture с рекомендацией

Должна позволять показать:

- readiness `68%`;
- текущий грейд `Middle`;
- следующий грейд `Senior`;
- skill gap `System Design`;
- одну основную рекомендацию;
- до двух альтернатив;
- историю участия, влияющую на объяснение.

### Fixture без рекомендации

Должна показывать `Empty`-состояние и понятное объяснение, например:

> Сейчас нет подходящего следующего шага. Обновите профиль или попробуйте
> позже.

Текст не должен обещать конкретный backend retry или пересчёт, если такой
операции ещё нет.

## 4. Recommendation fixture

```ts
type RecommendationFixture = {
  id: string
  title: string
  format: string
  durationLabel: string
  availabilityLabel: string
  targetSkill: string
  currentLevel: number
  requiredLevel: number
  expectedGain: number
  reason: string
  impact: string
  prerequisites?: string[]
  status: 'available' | 'blocked' | 'completed'
}
```

Fixture должна поддерживать следующие состояния:

- `available` — основная кнопка `Начать активность`;
- `blocked` — кнопка disabled и объяснение prerequisite;
- `completed` — результат и запрет повторного выполнения.

`reason` и `impact` являются временным UI-контентом. Они не означают, что
backend уже определил финальный формат объяснимости AI.

## 5. Activity Result fixture

Результат выполнения в UI моделируется отдельным состоянием:

```ts
type ActivityResultFixture = {
  skillName: string
  skillLevelBefore: number
  skillLevelAfter: number
  readinessBefore: number
  readinessAfter: number
  closedGaps: number
  nextActivityId?: string
}
```

Для демонстрации использовать сценарий:

```text
System Design: 2/5 → 3/5
Готовность к Senior: 68% → 76%
Закрыто 1 из 4 ключевых разрывов
```

Важно: fixture моделирует визуальный результат и не фиксирует алгоритм
пересчёта. Алгоритм будет определён backend-контрактом.

## 6. HR Dashboard fixture

```ts
type HRDashboardFixture = {
  employeesWithoutNextStep: number
  participation: {
    completed: number
    skipped: number
    abandoned: number
    declined: number
  }
  criticalSkills: Array<{
    name: string
    affectedEmployees: number
    averageGap: number
  }>
}
```

Минимальный визуальный сценарий:

- `Leadership — 47 сотрудников`;
- завершено `79%`;
- пропущено `7%`;
- брошено `6%`;
- отказались `4%`;
- без рекомендации `12`.

Графики должны работать даже при пустых массивах и нулевых значениях.

## 7. Локальные UI-состояния

До появления backend достаточно моделировать следующие состояния:

```text
login: idle → selected → signed-in
dashboard: loading → ready | empty | error
recommendation: loading → available | blocked | completed | empty | error
activity: idle → submitting → completed | error
import: idle → selected → validating → preview | invalid | imported
```

Эти состояния относятся к UI и не требуют заранее определять HTTP-коды,
endpoint names или transport-specific ошибки.

## 8. Mock adapter boundary

Рекомендуемый временный поток:

```text
Page
  ↓
module query/mutation hook
  ↓
mock adapter / fixture
  ↓
view model
  ↓
UI component
```

Когда появится backend:

```text
Page
  ↓
module query/mutation hook
  ↓
API adapter
  ↓
mapper → view model
  ↓
UI component
```

UI-компоненты не должны напрямую импортировать fixture-файлы. Это позволит
заменить источник данных без переписывания экранов.

## 9. Acceptance criteria для frontend demo

### Employee flow

- пользователь выбирает employee-профиль на `/login`;
- после входа открывается `/employee`;
- на первом экране видны грейд, readiness и следующий шаг;
- переход на детали активности работает по маршруту;
- кнопка запуска показывает submitting state;
- после завершения отображается before/after результат;
- на странице появляется следующий шаг или empty state.

### HR flow

- пользователь входит как HR;
- `/hr` показывает агрегированные метрики;
- employee-level данные не отображаются как публичный рейтинг;
- пустые и ошибочные данные имеют отдельные состояния;
- переход к сотрудникам и импорту не ломает основной HR flow.

### Visual quality

- нет второго CTA равной визуальной силы на одном экране;
- все ключевые состояния представлены в Storybook или локальным переключателем;
- UI работает с длинными названиями навыков и активностей;
- при `prefers-reduced-motion` результат не зависит от анимации.

## 10. Что будет уточнено после backend

После появления backend-роутов отдельным документом нужно будет закрепить:

- реальные endpoint и HTTP-методы;
- DTO и schema validation;
- query/mutation keys;
- auth/session transport;
- ошибки и retry policy;
- pagination и фильтры HR;
- импорт и правила валидации файлов;
- финальную серверную модель рекомендации и пересчёта прогресса.
