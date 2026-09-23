# Career Quest Agent

Сервис на FastAPI для карьерных консультаций. NestJS передаёт профиль сотрудника, навыки, требования к ролям, мероприятия и историю участия при каждом запросе. Агент не читает локальные файлы `data/` и не хранит состояние диалога.

## Запуск

Из корня репозитория:

```bash
python3 -m venv venv
venv/bin/pip install -r agent/requirements.txt
venv/bin/uvicorn agent.main:app --reload --port 8000
```

Добавьте `OPENAI_API_KEY` и при необходимости `OPENAI_MODEL` в корневой `.env`. Существующее имя `OPENAI_KEY` тоже работает. Значения для примера находятся в корневом `.env.example`. `GET /health` проверяет работу сервиса, `/docs` показывает OpenAPI.

## Запрос от NestJS

`POST /api/v1/advisor/chat` принимает вопрос, контекст сотрудника и необязательную историю диалога:

```json
{
  "message": "Каких навыков мне не хватает и что пройти?",
  "conversation_history": [],
  "context": {
    "as_of_date": "2026-10-01",
    "employee": {
      "employee_id": "E0001",
      "full_name": "Сотрудник",
      "role": "Backend Engineer",
      "grade": "Junior",
      "skills": {"SK_PYTHON": 2},
      "career_goal": {"target_role": "Backend Engineer", "target_grade": "Middle"},
      "last_review_date": "2026-09-11",
      "preferred_language": "ru"
    },
    "skills": [
      {"skill_id": "SK_PYTHON", "name": "Python", "type": "hard"}
    ],
    "role_profiles": [
      {
        "role": "Backend Engineer",
        "grade": "Middle",
        "required_skills": {"SK_PYTHON": 3},
        "critical_skills": ["SK_PYTHON"]
      }
    ],
    "events": [
      {
        "event_id": "EV_101",
        "title": "Python Practice",
        "description": "Практический курс по Python",
        "type": "course",
        "format": "self_paced",
        "duration_hours": 4,
        "mandatory": false,
        "target_roles": ["Backend Engineer"],
        "target_grades": ["Junior", "Middle"],
        "develops_skills": [{"skill_id": "SK_PYTHON", "gain": 1, "max_level": 3}],
        "prerequisites": {},
        "upcoming_sessions": []
      }
    ],
    "activity_history": []
  }
}
```

Ответ содержит `employee_id`, текст `reply` от OpenAI и рассчитанный `plan`. Для следующего сообщения NestJS передаёт в `conversation_history` пары `{ "role": "user" | "assistant", "content": "..." }`; используются до 12 последних реплик.

`POST /api/v1/advisor/plan` принимает `{ "context": { ... } }` и возвращает только план без вызова OpenAI. Поля справочников и истории соответствуют [контрактам TypeScript](../apps/api/src/contracts.ts) и [описанию набора](../data/DATA_MODEL.ru.md). Для точных рекомендаций NestJS передаёт полный каталог доступных мероприятий и историю данного сотрудника.

Агент считает дефициты для карьерной цели, проверяет требования к обучению, исключает пройденные и уже начатые мероприятия и возвращает до пяти рекомендаций. Обязательное обучение выводится отдельно. Если цель не задана, для грейдов ниже Lead предлагается следующий грейд текущей роли с `goal_source: "next_grade"`.

Сохранённые уровни навыков считаются оценкой на `last_review_date`. Прирост от завершённого обучения применяется только когда backend передал точный `completed_at` позже этой даты. Если его нет, агент не удваивает уже учтённый эффект.

В OpenAI передаются рабочие карьерные сведения и история переписки. Полные имя и ID сотрудника из контекста в запрос модели не включаются. Вызов выполняется с `store=False`; перед использованием с реальными данными банка настройте разрешённый порядок передачи данных и доступ к сервису.
