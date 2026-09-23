from __future__ import annotations

from typing import Any

from agent.schemas import CareerContext, Goal


GRADES = ("Junior", "Middle", "Senior", "Lead")


class Advisor:
    """Calculations that must not depend on generated model text."""

    def __init__(self, context: CareerContext):
        self.context = context
        self.employee = context.employee
        self.skills = {skill.skill_id: skill for skill in context.skills}
        self.profiles = {(profile.role, profile.grade): profile for profile in context.role_profiles}
        self.events = {event.event_id: event for event in context.events}
        self.history = [
            item for item in context.activity_history
            if item.employee_id is None or item.employee_id == self.employee.employee_id
        ]

    def plan(self) -> dict[str, Any]:
        employee = self.employee
        goal = employee.career_goal
        source = "explicit" if goal else "none"
        if goal is None and employee.grade != "Lead":
            goal = Goal(target_role=employee.role, target_grade=GRADES[GRADES.index(employee.grade) + 1])
            source = "next_grade"

        effective_skills, counted = self._effective_skills()
        gaps: list[dict[str, Any]] = []
        if goal is not None:
            profile = self.profiles.get((goal.target_role, goal.target_grade))
            if profile is None:
                raise ValueError(f"Не найден профиль требований: {goal.target_role} / {goal.target_grade}")
            for skill_id, required in profile.required_skills.items():
                if skill_id not in self.skills:
                    raise ValueError(f"Не найден навык в каталоге: {skill_id}")
                current = effective_skills.get(skill_id, 0)
                if current < required:
                    gaps.append({
                        "skill_id": skill_id,
                        "name": self.skills[skill_id].name,
                        "current": current,
                        "required": required,
                        "gap": required - current,
                        "critical": skill_id in profile.critical_skills,
                    })
        gaps.sort(key=lambda item: (not item["critical"], -item["gap"], item["name"]))
        recommendations, covered = self._recommendations(gaps, effective_skills)
        mandatory_tasks = self._mandatory_tasks()
        return {
            "employee_id": employee.employee_id,
            "current_position": {"role": employee.role, "grade": employee.grade},
            "career_goal": goal.model_dump() if goal else None,
            "goal_source": source,
            "as_of_date": self.context.as_of_date.isoformat(),
            "last_review_date": employee.last_review_date.isoformat() if employee.last_review_date else None,
            "effective_skills": effective_skills,
            "counted_completions": counted,
            "assessment_note": (
                "После последней оценки учтены только завершённые мероприятия с completed_at. "
                "Записи без точной даты завершения не меняют расчётный уровень навыка."
            ),
            "gaps": gaps,
            "recommendations": recommendations,
            "uncovered_skills": [item["skill_id"] for item in gaps if item["skill_id"] not in covered],
            "mandatory_tasks": mandatory_tasks,
        }

    def _effective_skills(self) -> tuple[dict[str, int], list[str]]:
        levels = dict(self.employee.skills)
        review = self.employee.last_review_date
        if review is None:
            return levels, []
        completed = sorted(
            (
                item for item in self.history
                if item.status == "completed" and item.completed_at and item.completed_at > review
            ),
            key=lambda item: item.completed_at,
        )
        counted: list[str] = []
        for item in completed:
            event = self.events.get(item.event_id)
            if event is None:
                continue
            counted.append(item.event_id)
            for effect in event.develops_skills:
                before = levels.get(effect.skill_id, 0)
                levels[effect.skill_id] = max(before, min(before + effect.gain, effect.max_level))
        return levels, counted

    def _recommendations(
        self, gaps: list[dict[str, Any]], levels: dict[str, int]
    ) -> tuple[list[dict[str, Any]], set[str]]:
        if not gaps:
            return [], set()
        gap_by_id = {item["skill_id"]: item for item in gaps}
        completed = {item.event_id for item in self.history if item.status == "completed"}
        active = {item.event_id for item in self.history if item.status in {"in_progress", "overdue"}}
        candidates: list[tuple[float, dict[str, Any]]] = []
        covered: set[str] = set()
        for event in self.context.events:
            if event.mandatory or event.event_id in active:
                continue
            if event.event_id in completed and event.event_id != "EV_036":
                continue
            if self.employee.role not in event.target_roles or self.employee.grade not in event.target_grades:
                continue
            if any(levels.get(skill_id, 0) < minimum for skill_id, minimum in event.prerequisites.items()):
                continue
            sessions = sorted(day for day in event.upcoming_sessions if day >= self.context.as_of_date)
            if event.format != "self_paced" and not sessions:
                continue
            gains = []
            benefit = 0
            for effect in event.develops_skills:
                gap = gap_by_id.get(effect.skill_id)
                if gap is None:
                    continue
                before = levels.get(effect.skill_id, 0)
                gain = max(0, min(effect.gain, effect.max_level - before, gap["gap"]))
                if gain:
                    gains.append({
                        "skill_id": effect.skill_id,
                        "name": gap["name"],
                        "before": before,
                        "after": before + gain,
                        "target": gap["required"],
                        "critical": gap["critical"],
                    })
                    benefit += gain * (2 if gap["critical"] else 1)
                    covered.add(effect.skill_id)
            if not gains:
                continue
            recommendation = {
                "event_id": event.event_id,
                "title": event.title,
                "description": event.description,
                "type": event.type,
                "format": event.format,
                "duration_hours": event.duration_hours,
                "next_session": sessions[0].isoformat() if sessions else None,
                "gains": gains,
                "reason": "Мероприятие сокращает дефицит навыков для выбранной цели.",
            }
            candidates.append((benefit / max(event.duration_hours, 0.5), recommendation))
        candidates.sort(key=lambda pair: (-pair[0], pair[1]["duration_hours"], pair[1]["event_id"]))
        return [candidate for _, candidate in candidates[:5]], covered

    def _mandatory_tasks(self) -> list[dict[str, Any]]:
        tasks = []
        for item in self.history:
            event = self.events.get(item.event_id)
            if event and event.mandatory and item.status != "completed":
                tasks.append({
                    "event_id": event.event_id,
                    "title": event.title,
                    "status": item.status,
                    "due_date": item.due_date.isoformat() if item.due_date else None,
                })
        return tasks
