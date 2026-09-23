/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-module-to-module-internals",
      comment:
        "Модули могут зависеть от других модулей только через публичный API. Внутренние импорты создают жесткую связанность.",
      severity: "error",
      from: { path: "^src/modules/([^/]+)/" },
      to: {
        path: "^src/modules/([^/]+)/",
        pathNot: ["^src/modules/$1/", "^src/modules/([^/]+)/index\\.ts$"],
      },
    },
    {
      name: "no-entities-to-modules",
      comment:
        "Слой доменных сущностей (entities) не должен зависеть от бизнес-сценариев (modules).",
      severity: "error",
      from: { path: "^src/entities/" },
      to: { path: "^src/modules/" },
    },
    {
      name: "no-shared-to-domain",
      comment:
        "Слой инфраструктуры (shared) не должен импортировать доменную логику (entities) или фичи (modules).",
      severity: "error",
      from: { path: "^src/shared/" },
      to: { path: ["^src/entities/", "^src/modules/"] },
    },
    {
      name: "only-import-modules-via-public-api",
      comment:
        "Импорт модулей разрешен только через их публичный API: @/modules/x.",
      severity: "error",
      from: {
        path: "^src/",
        pathNot: "^src/modules/([^/]+)/", // Внутри модуля относительные импорты разрешены
      },
      to: {
        path: "^src/modules/([^/]+)/",
        // Запрещаем импорт во внутренние папки напрямую. Разрешаем только index.ts
        pathNot: "^src/modules/([^/]+)/index\\.ts$",
      },
    },
    {
      name: "no-ui-to-generated-api",
      comment:
        "Компоненты не должны напрямую импортировать Orval generated client. Оборачивайте API в hooks/mappers внутри model слоя модуля.",
      severity: "error",
      from: { path: "^src/modules/([^/]+)/ui/" },
      to: { path: "^src/shared/api/generated\\.ts$" },
    },
    {
      name: "no-app-to-generated-api",
      comment:
        "Роуты не должны напрямую импортировать Orval generated client. Выносите загрузку данных и orchestration в module model/scenario hooks.",
      severity: "error",
      from: { path: "^src/app/" },
      to: { path: "^src/shared/api/generated\\.ts$" },
    },
    {
      name: "only-import-entities-via-public-api",
      comment:
        "Импорт сущностей разрешен только через их публичный API: @/entities/x.",
      severity: "error",
      from: {
        path: "^src/",
        pathNot: "^src/entities/([^/]+)/", // Внутри сущности относительные импорты разрешены
      },
      to: {
        path: "^src/entities/([^/]+)/",
        // Разрешаем только index.ts сущности
        pathNot: "^src/entities/([^/]+)/index\\.ts$",
      },
    },
    {
      name: "no-circular-dependencies",
      comment: "В проекте не должно быть циклических зависимостей.",
      severity: "error",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: "tsconfig.json",
    },
    reporterOptions: {
      text: {
        highlightFocused: true,
      },
    },
  },
};
