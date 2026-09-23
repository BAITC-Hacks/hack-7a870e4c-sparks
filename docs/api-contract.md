# Контракт MVP (проектное решение)

Все маршруты имеют префикс `/api`. Типы ответа определены в `apps/api/src/contracts.ts`, проверяемые HTTP-схемы и маршруты — в `model.ts` и `controller.ts` соответствующих модулей `apps/api/src/modules/`; общие HTTP-модели находятся в `src/utils/http/model.ts`. Приложение собирается в `src/app.ts`, OpenAPI подключается через `src/plugins/openapi.ts`. Фронтенд может использовать этот контракт для генерации клиента; интеграция текущего шаблона в этой задаче не проверялась.

Машиночитаемая схема: **`GET /api/openapi.json`**, интерактивная документация: **`GET /api/docs`**. OpenAPI содержит полные схемы тел и ответов, параметры пути, ошибки, стабильные `operationId` и cookie-авторизацию. Команда `bun run openapi` из `apps/api` сохраняет текущий документ в `apps/api/openapi.json`. Для генерации клиента используйте этот файл.

Сессия — cookie `career_quest_session` с `HttpOnly`, `SameSite=Lax`, сроком 12 часов и `Secure` при `COOKIE_SECURE=true`. После входа браузер отправляет cookie автоматически; API-клиент должен сохранять cookie между запросами. `health`, вход и документация доступны без сессии; каталог требует входа. Запросы изменения с заголовком `Origin` принимаются только от настроенного `APP_ORIGIN`.

Ошибка: `{message: string}` с соответствующим HTTP-статусом. Основные случаи: 400 — неверное тело или доменные данные, 401 — неверные учетные данные либо отсутствующая/истекшая сессия, 403 — чужой профиль или запрещенный origin, 404 — неизвестный маршрут/профиль при чтении, 413 — импорт больше лимита, 429 — превышение лимита попыток входа, 500 — внутренняя ошибка, 503 — агент недоступен для плана или чата. Детали SQL, секреты и сообщения внешнего AI в клиентскую ошибку не включаются.

| Метод и путь | operationId | Тело / ответ |
| --- | --- | --- |
| POST /auth/login | login | `{username,password}` → SessionUser |
| GET /auth/session | getSession | SessionUser; 401 без сессии |
| POST /auth/logout | logout | `{}` → `{ok:true}` |
| GET /catalog | getCatalog | `{roles: RoleProfile[], skills: Skill[], as_of_date:string}` |
| GET /employees | getEmployees | HR: `{employees: {employee_id,full_name,role,grade,department}[]}` |
| GET /employees/:id | getProfile | Profile; HR либо владелец |
| PATCH /employees/:id/goal | updateGoal | `{goal: Goal|null}` → Profile |
| POST /employees/:id/recommendations | getRecommendations | `{}` → Recommendations |
| GET /employees/:id/plan | getCareerPlan | Plan; HR либо владелец; 503 при недоступности агента |
| POST /employees/:id/chat | chatWithCareerAdvisor | ChatInput → ChatResponse; HR либо владелец; 503 при недоступности агента |
| POST /employees/:id/activities/:eventId/complete | completeActivity | `{}` → `{profile:Profile, already_completed:boolean}` |
| GET /hr/overview | getHrOverview | HrOverview; только HR |
| POST /hr/import | importData | `{employees_json:string, history_csv:string}` → `{employees:number, history:number, message:string}`; только HR |
| GET /health | health | `{status:string, ai_configured:boolean, agent_available:boolean}` |

У маршрутов logout, рекомендаций и завершения тело `{}` необязательно. В остальных маршрутах тело должно соответствовать схеме; неизвестные поля отклоняются. Импорт принимает содержимое файлов строками в JSON, а не `multipart/form-data`; оба поля присутствуют, одно из них может быть пустой строкой. Лимит суммы исходного JSON и CSV — 8 МиБ.

Аккаунт `hr` и аккаунты сотрудников разделены. Пароли не включаются в Git. Для приложения проверяется пароль конкретного аккаунта; общий код с выбором произвольного сотрудника не используется. После десяти неудачных попыток входа для одного аккаунта запросы ограничиваются на 15 минут. Импорт не выдает учетные записи и не меняет их роли; отсутствующие аккаунты создает запуск API или административная команда `credentials:employee`.

Профиль и HR-аналитика не требуют LLM. Все расчеты используют дату среза. Цель без career_goal — следующий грейд текущей роли; выше Lead цели по умолчанию нет. Учитываем аудиторию по текущей роли/грейду; смена карьерной цели не меняет фактическую роль и не отменяет prerequisites. Непокрытые пути показываем явно.

API передает Python-агенту контекст из БД: профиль выбранного сотрудника, его историю, каталог, требования ролей и дату среза. Идентификатор берется из пути после проверки сессии и прав; клиент не может подменить контекст. Агент выбирает до трех допустимых мероприятий и строит объяснения из проверенных факторов. Внешняя модель выбирает идентификаторы мероприятий, а правила доступности, приросты и факторы рассчитываются кодом. При отсутствии ключа или недоступности модели агент возвращает `mode: "rules"`; при недоступности самого агента API сохраняет расчетный подбор рекомендаций. Если допустимых шагов нет, `recommendations: []` и причина объясняют ограничение. Поля `generated_at` и `duration_ms` описывают реальное время запроса; дата расчетов остается `meta.as_of_date`.

`GET /employees/:id/plan` возвращает структуру `Plan`: `employee_id`, текущую позицию `current_position`, цель `career_goal`, источник цели `goal_source` (`explicit`, `next_grade`, `none`), даты `as_of_date` и `last_review_date`, текущие `effective_skills`, учтенные завершения `counted_completions`, пояснение `assessment_note`, текущую и прогнозную готовность `readiness`/`projected_readiness`, прогноз навыков `projected_skills`, последовательность шагов `trajectory`, разрывы `gaps`, до трех `recommendations`, непокрытые навыки `uncovered_skills`, незавершенные обязательные задачи `mandatory_tasks` и `warnings`. Каждый шаг траектории содержит `event_id`, `readiness_before` и `readiness_after`. Готовность — расчетное покрытие требований, а не официальный порог повышения; без цели она равна `null`. Обязательные задачи выводятся отдельно и не становятся рекомендациями. План рассчитывается агентом без обращения к внешней модели.

`POST /employees/:id/chat` принимает обязательное `message` длиной 1–3000 символов и необязательный `conversation_history` — до 20 объектов `{role: "user" | "assistant", content: string}` с содержимым длиной 1–3000 символов. Поле `context` и неизвестные поля запрещены. История разговора передается клиентом при каждом запросе; этот маршрут не сохраняет ее в БД. Ответ `ChatResponse` содержит `employee_id`, текст `reply`, `plan` и объект `recommendations` с режимом `ai` либо `rules`. При выключенном агенте, сетевой ошибке, таймауте или непригодном ответе агента план и чат возвращают 503; рекомендации остаются доступны в расчетном режиме.
