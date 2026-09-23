from __future__ import annotations

from typing import Any

from agent.schemas import Candidate, CareerContext, Event, Factor, Gain, Goal, Recommendation

GRADES = ("Junior", "Middle", "Senior", "Lead")
NEGATIVE_STATUSES = {"no_show", "declined", "dropped"}
REPEATABLE_EVENT_IDS = {"EV_036"}  # Explicit exception in the dataset README.


class Advisor:
    """Eligibility, skill arithmetic and evidence shared by AI and rules mode."""

    def __init__(self, context: CareerContext):
        self.context = context
        self.employee = context.employee
        self.skills = {s.skill_id: s for s in context.skills}
        self.events = {e.event_id: e for e in context.events}
        self.history = [
            h for h in context.activity_history
            if (h.date is None or h.date <= context.as_of_date)
            and (h.completion_day is None or h.completion_day <= context.as_of_date)
        ]
        self.goal = self.employee.career_goal
        self.goal_source = "explicit" if self.goal else "none"
        if self.goal is None and self.employee.grade != "Lead":
            self.goal = Goal(
                target_role=self.employee.role,
                target_grade=GRADES[GRADES.index(self.employee.grade) + 1],
            )
            self.goal_source = "next_grade"
        profiles = {(p.role, p.grade): p for p in context.role_profiles}
        self.profile = profiles.get((self.goal.target_role, self.goal.target_grade)) if self.goal else None
        if self.goal and not self.profile:
            raise ValueError(f"Нет требований для {self.goal.target_role} / {self.goal.target_grade}")
        self.required = self.profile.required_skills if self.profile else {}
        self.critical = set(self.profile.critical_skills) if self.profile else set()
        self.levels, self.counted_completions = self._effective_skills()
        self.completed = {h.event_id for h in self.history if h.status == "completed"}
        self.active = {h.event_id for h in self.history if h.status in {"in_progress", "overdue"}}
        self.candidates = sorted(
            (c for event in context.events if (c := self._candidate(event, self.levels)) is not None),
            key=self._sort_key,
        )
        self.candidate_ids = {c.event.event_id for c in self.candidates}

    @staticmethod
    def _apply(event: Event, levels: dict[str, int]) -> dict[str, int]:
        result = dict(levels)
        for effect in event.develops_skills:
            before = result.get(effect.skill_id, 0)
            result[effect.skill_id] = max(before, min(5, before + effect.gain, effect.max_level))
        return result

    def _effective_skills(self) -> tuple[dict[str, int], list[str]]:
        levels = dict(self.employee.skills)
        review = self.employee.last_review_date
        if review is None:
            return levels, []
        rows = sorted(
            (h for h in self.history if h.status == "completed" and h.completion_day and h.completion_day > review),
            key=lambda h: (h.completion_day, str(h.completed_at), h.record_id or ""),
        )
        seen: set[tuple] = set()
        counted: list[str] = []
        for item in rows:
            key = (item.event_id,)
            if item.event_id in REPEATABLE_EVENT_IDS:
                key = (item.event_id, item.record_id or (str(item.completed_at), item.date))
            if key in seen:
                continue
            seen.add(key)
            levels = self._apply(self.events[item.event_id], levels)
            counted.append(item.record_id or item.event_id)
        return levels, counted

    def _history_evidence(self, event: Event) -> tuple[float, str]:
        developed = {s.skill_id for s in event.develops_skills}
        exact = [h for h in self.history if h.event_id == event.event_id]
        similar = [
            h for h in self.history
            if h.event_id != event.event_id
            and self.events[h.event_id].format == event.format
            and developed.intersection(s.skill_id for s in self.events[h.event_id].develops_skills)
        ]
        def counts(rows: list) -> str:
            return ", ".join(
                f"{label}: {sum(h.status == status for h in rows)}"
                for status, label in (("completed", "завершено"), ("no_show", "неявки"),
                                      ("declined", "отказы"), ("dropped", "прекращено"))
            )
        exact_bad = sum(h.status in NEGATIVE_STATUSES for h in exact)
        similar_bad = sum(h.status in NEGATIVE_STATUSES for h in similar)
        successes = sum(h.status == "completed" for h in exact + similar)
        adjustment = min(successes, 3) * 2 - min(120, exact_bad * 25 + similar_bad * 10)
        evidence = f"Это мероприятие — {counts(exact)}."
        if similar:
            evidence += f" Тот же формат с пересекающимися навыками — {counts(similar)}."
        else:
            evidence += " Истории по другим мероприятиям такого формата с этими навыками нет."
        if exact_bad or similar_bad:
            evidence += " Перед записью стоит уточнить удобный формат; причины отказов и пропусков неизвестны."
        return adjustment, evidence

    def _candidate(self, event: Event, levels: dict[str, int]) -> Candidate | None:
        if not self.goal or event.mandatory or event.event_id in self.active:
            return None
        if event.event_id in self.completed and event.event_id not in REPEATABLE_EVENT_IDS:
            return None
        if self.employee.role not in event.target_roles or self.employee.grade not in event.target_grades:
            return None
        if any(levels.get(skill, 0) < minimum for skill, minimum in event.prerequisites.items()):
            return None
        sessions = sorted(day for day in event.upcoming_sessions if day >= self.context.as_of_date)
        if event.format != "self_paced" and not sessions:
            return None
        after = self._apply(event, levels)
        gains = [
            Gain(skill_id=skill, name=self.skills[skill].name, before=levels.get(skill, 0),
                 after=after.get(skill, 0), target=required)
            for skill, required in self.required.items()
            if levels.get(skill, 0) < required and after.get(skill, 0) > levels.get(skill, 0)
        ]
        if not gains:
            return None
        critical = [g for g in gains if g.skill_id in self.critical]
        coverage = sum(min(g.after - g.before, g.target - g.before) / (g.target - g.before) for g in gains)
        critical_coverage = sum(
            min(g.after - g.before, g.target - g.before) / (g.target - g.before) for g in critical
        )
        history_adjustment, history_text = self._history_evidence(event)
        # Critical tier dominates effort; short noncritical events cannot displace it.
        score = (1000 if critical else 0) + 100 * critical_coverage + 40 * coverage
        score += history_adjustment - min(10, event.duration_hours / 8)
        gap_text = "; ".join(f"{g.name}: {g.before} → {g.after}, требуется {g.target}" for g in gains)
        target_text = f"Цель: {self.goal.target_role} / {self.goal.target_grade}. "
        if critical:
            target_text += "Сокращает критические разрывы: " + ", ".join(g.name for g in critical) + "."
        else:
            target_text += "Развивает требуемые навыки; критические разрывы этим шагом не закрываются."
        prefix = "Цель задана сотрудником. " if self.goal_source == "explicit" else "Предложен следующий грейд. "
        return Candidate(
            event=event, score=round(score, 3),
            factors=[
                Factor(id=f"{event.event_id}:grade", category="grade", text=(
                    f"Текущая позиция: {self.employee.role} / {self.employee.grade}; "
                    "роль, грейд и входные требования мероприятия подходят."
                )),
                Factor(id=f"{event.event_id}:gap", category="gap", text=gap_text + "."),
                Factor(id=f"{event.event_id}:history", category="history", text=history_text),
                Factor(id=f"{event.event_id}:target", category="target", text=prefix + target_text),
            ],
            next_session=sessions[0].isoformat() if sessions else None,
            gains=gains, in_progress=False,
        )

    @staticmethod
    def _sort_key(candidate: Candidate) -> tuple:
        return (-candidate.score, candidate.next_session or "", candidate.event.event_id)

    def _is_critical(self, candidate: Candidate) -> bool:
        return any(g.skill_id in self.critical for g in candidate.gains)

    @staticmethod
    def _recommendation(candidate: Candidate) -> Recommendation:
        return Recommendation(
            **candidate.model_dump(),
            explanation=" ".join(factor.text for factor in candidate.factors),
        )

    def rules_selection(self) -> list[Recommendation]:
        levels = dict(self.levels)
        remaining = set(self.candidate_ids)
        selected = []
        while remaining and len(selected) < 3:
            options = [
                c for event_id in remaining
                if (c := self._candidate(self.events[event_id], levels)) is not None
            ]
            if not options:
                break
            candidate = min(options, key=self._sort_key)
            selected.append(self._recommendation(candidate))
            levels = self._apply(candidate.event, levels)
            remaining.remove(candidate.event.event_id)
        return selected

    def validate_selection(self, event_ids: list[str], allowed_ids: set[str]) -> list[Recommendation]:
        if len(event_ids) > 3 or len(event_ids) != len(set(event_ids)):
            raise ValueError("Выбор содержит дубликаты или больше трёх мероприятий")
        if self.candidates and not event_ids:
            raise ValueError("Есть кандидаты, но модель не выбрала шаг")
        if not set(event_ids) <= self.candidate_ids.intersection(allowed_ids):
            raise ValueError("Модель выбрала недоступное мероприятие")
        levels = dict(self.levels)
        selected = []
        for event_id in event_ids:
            candidate = self._candidate(self.events[event_id], levels)
            if candidate is None:
                raise ValueError("Шаг уже не даёт прироста после предыдущих шагов")
            if not selected and any(self._is_critical(c) for c in self.candidates) and not self._is_critical(candidate):
                raise ValueError("Первый шаг должен сокращать доступный критический разрыв")
            selected.append(self._recommendation(candidate))
            levels = self._apply(candidate.event, levels)
        return selected

    def readiness(self, levels: dict[str, int]) -> float | None:
        total = sum(self.required.values())
        if not self.profile:
            return None
        return round(100 * sum(min(levels.get(s, 0), r) for s, r in self.required.items()) / total, 1) if total else 100.0

    def plan(self, selected: list[Recommendation] | None = None) -> dict[str, Any]:
        selected = self.rules_selection() if selected is None else selected
        covered = {g.skill_id for c in self.candidates for g in c.gains}
        gaps = [
            {"skill_id": skill, "name": self.skills[skill].name, "current": self.levels.get(skill, 0),
             "required": required, "gap": required - self.levels.get(skill, 0),
             "critical": skill in self.critical, "covered": skill in covered}
            for skill, required in self.required.items() if self.levels.get(skill, 0) < required
        ]
        gaps.sort(key=lambda g: (not g["critical"], -g["gap"], g["skill_id"]))
        projected = dict(self.levels)
        trajectory = []
        for rec in selected:
            before = self.readiness(projected)
            projected = self._apply(rec.event, projected)
            trajectory.append({"event_id": rec.event.event_id, "readiness_before": before,
                               "readiness_after": self.readiness(projected)})
        warnings = []
        if any(h.status == "completed" and h.completed_at is None for h in self.history):
            warnings.append("У завершённых активностей без completed_at прирост после оценки не восстанавливается.")
        if not self.employee.last_review_date:
            warnings.append("Дата оценки неизвестна; базовые навыки используются без добавления истории.")
        if not self.goal:
            warnings.append("Для Lead без карьерной цели следующий грейд не предлагается.")
        return {
            "employee_id": self.employee.employee_id,
            "current_position": {"role": self.employee.role, "grade": self.employee.grade},
            "career_goal": self.goal.model_dump() if self.goal else None,
            "goal_source": self.goal_source,
            "as_of_date": self.context.as_of_date.isoformat(),
            "last_review_date": self.employee.last_review_date.isoformat() if self.employee.last_review_date else None,
            "effective_skills": self.levels,
            "counted_completions": self.counted_completions,
            "assessment_note": "Расчётный прогресс учитывает только completed_at после даты оценки и не позже as_of_date.",
            "readiness": self.readiness(self.levels),
            "projected_readiness": self.readiness(projected),
            "projected_skills": projected,
            "trajectory": trajectory,
            "gaps": gaps,
            "recommendations": [rec.model_dump(mode="json") for rec in selected],
            "uncovered_skills": [g["skill_id"] for g in gaps if not g["covered"]],
            "mandatory_tasks": [
                {"event_id": h.event_id, "title": self.events[h.event_id].title, "status": h.status,
                 "due_date": h.due_date.isoformat() if h.due_date else None}
                for h in self.history if self.events[h.event_id].mandatory and h.status != "completed"
            ],
            "warnings": warnings,
        }
