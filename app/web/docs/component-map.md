# Карта UI-компонентов Career Quest

## Структура приложения

```text
App
├── AppShell
│   ├── Header
│   │   ├── Logo
│   │   ├── LanguageSwitcher
│   │   └── UserMenu
│   ├── Sidebar
│   │   ├── DashboardNav
│   │   ├── MyCareerNav
│   │   └── HRNav
│   └── PageContainer
│
├── EmployeeDashboard
│   ├── WelcomeCard
│   ├── CareerProgressCard
│   │   ├── CurrentGrade
│   │   ├── NextGrade
│   │   └── ProgressBar
│   ├── SkillGapOverview
│   │   ├── SkillGapCard
│   │   ├── CriticalSkillBadge
│   │   └── SkillLevelBar
│   ├── RecommendationSection
│   │   ├── RecommendationCard
│   │   │   ├── ActivitySummary
│   │   │   ├── RecommendationReason
│   │   │   ├── SkillImpact
│   │   │   └── ActivityActions
│   │   └── EmptyRecommendationState
│   └── ActivityHistoryPreview
│
├── EmployeeProfile
│   ├── ProfileHeader
│   ├── EmployeeInfo
│   ├── CareerGoalCard
│   ├── SkillsMatrix
│   ├── CompletedActivities
│   └── ParticipationStats
│
├── ActivityDetails
│   ├── ActivityHeader
│   ├── ActivityDescription
│   ├── RequirementsList
│   ├── SkillGainPreview
│   ├── RecommendationExplanation
│   └── CompleteActivityButton
│
├── CareerTrajectory
│   ├── CareerTimeline
│   ├── GradeTransitionCard
│   ├── RequiredSkillsList
│   ├── CurrentGapsList
│   └── ReadinessSummary
│
├── HRDashboard
│   ├── HROverviewCards
│   ├── SkillGapAnalytics
│   │   ├── SkillGapChart
│   │   └── CriticalSkillsTable
│   ├── ParticipationAnalytics
│   │   ├── CompletionRateChart
│   │   ├── StatusBreakdown
│   │   └── ActivityParticipationTable
│   ├── EmployeesAtRisk
│   └── EmployeeFilters
│
├── DataImport
│   ├── FileUpload
│   ├── DatasetValidation
│   ├── ImportPreview
│   └── ImportResult
│
└── Shared
    ├── Button
    ├── Card
    ├── Badge
    ├── ProgressBar
    ├── Modal
    ├── Tabs
    ├── Table
    ├── Chart
    ├── LoadingState
    ├── EmptyState
    └── ErrorState
```

## Архитектурные слои

```text
Pages
  ↓
Feature Components
  ↓
Domain Logic
  ↓
Data/API Layer
```

Основные доменные модули:

- `employee` — профиль, навыки и карьерная цель;
- `recommendations` — подбор активностей и объяснения;
- `career` — переходы между грейдами и skill gaps;
- `activities` — каталог активностей, выполнение и расчёт прироста;
- `analytics` — HR-метрики;
- `data-import` — загрузка и валидация JSON/CSV;
- `auth` — роли сотрудника и HR.

## Основной поток данных

```text
EmployeeProfile
   ↓
CareerTrajectory + SkillGaps
   ↓
RecommendationEngine
   ↓
RecommendationCard
   ↓
CompleteActivity
   ↓
Progress Update
   ↓
Updated Skills + Updated Trajectory + HR Analytics
```

## Приоритет MVP

В первую очередь реализуются:

1. `EmployeeDashboard`;
2. `RecommendationCard` с объяснением;
3. `ActivityDetails`;
4. обновление навыков после выполнения;
5. `HRDashboard`;
6. загрузка датасета;
7. состояния `Loading`, `Error` и `Empty`.

Такой набор покрывает основной демонстрационный сценарий: профиль → рекомендация → выполнение активности → обновление навыков → HR-аналитика.
