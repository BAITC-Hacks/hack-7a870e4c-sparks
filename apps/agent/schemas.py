from __future__ import annotations

from datetime import date as Date, datetime
from typing import Annotated, Literal

from pydantic import BaseModel, Field, model_validator

Grade = Literal["Junior", "Middle", "Senior", "Lead"]
Level = Annotated[int, Field(ge=0, le=5)]


class Goal(BaseModel):
    target_role: str
    target_grade: Grade


class Employee(BaseModel):
    employee_id: str = Field(min_length=1)
    full_name: str | None = None
    department: str | None = None
    role: str
    grade: Grade
    tenure_months: int | None = Field(default=None, ge=0)
    work_format: Literal["office", "hybrid", "remote"] | None = None
    skills: dict[str, Level] = Field(default_factory=dict)
    career_goal: Goal | None = None
    last_review_date: Date | None = None
    preferred_language: Literal["ru", "kk", "en"] | None = None


class Skill(BaseModel):
    skill_id: str
    name: str
    type: str | None = None
    description: str | None = None


class RoleProfile(BaseModel):
    role: str
    grade: Grade
    required_skills: dict[str, Level]
    critical_skills: list[str] = Field(default_factory=list)


class SkillDevelopment(BaseModel):
    skill_id: str
    gain: Level
    max_level: Level


class Event(BaseModel):
    event_id: str
    title: str
    description: str = ""
    type: str = "course"
    format: Literal["online", "offline", "self_paced"]
    duration_hours: float = Field(gt=0, allow_inf_nan=False)
    mandatory: bool
    target_roles: list[str]
    target_grades: list[Grade]
    develops_skills: list[SkillDevelopment] = Field(default_factory=list)
    prerequisites: dict[str, Level] = Field(default_factory=dict)
    upcoming_sessions: list[Date] = Field(default_factory=list)


class HistoryItem(BaseModel):
    record_id: str | None = None
    event_id: str
    employee_id: str | None = None
    date: Date | None = None
    completed_at: Date | datetime | None = None
    due_date: Date | None = None
    status: Literal["completed", "in_progress", "dropped", "no_show", "declined", "overdue"]
    completion_pct: int | None = Field(default=None, ge=0, le=100)
    score: int | None = Field(default=None, ge=0, le=100)
    feedback_rating: int | None = Field(default=None, ge=1, le=5)
    assigned_by: Literal["self", "manager", "hr"] | None = None

    @property
    def completion_day(self) -> Date | None:
        value = self.completed_at
        return value.date() if isinstance(value, datetime) else value


class CareerContext(BaseModel):
    as_of_date: Date
    employee: Employee
    skills: list[Skill]
    role_profiles: list[RoleProfile]
    events: list[Event]
    activity_history: list[HistoryItem] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_references(self) -> "CareerContext":
        def unique(values: list, label: str) -> None:
            if len(values) != len(set(values)):
                raise ValueError(f"Повторяющиеся идентификаторы: {label}")

        unique([s.skill_id for s in self.skills], "skills")
        unique([e.event_id for e in self.events], "events")
        unique([(p.role, p.grade) for p in self.role_profiles], "role_profiles")
        unique([h.record_id for h in self.activity_history if h.record_id], "activity_history")
        known = {s.skill_id for s in self.skills}
        referenced = set(self.employee.skills)
        for profile in self.role_profiles:
            referenced.update(profile.required_skills)
            if not set(profile.critical_skills) <= profile.required_skills.keys():
                raise ValueError("Критические навыки должны входить в required_skills")
        for event in self.events:
            unique([s.skill_id for s in event.develops_skills], f"develops_skills: {event.event_id}")
            referenced.update(event.prerequisites)
            referenced.update(s.skill_id for s in event.develops_skills)
        if referenced - known:
            raise ValueError(f"В каталоге отсутствуют навыки: {sorted(referenced - known)}")
        events = {e.event_id for e in self.events}
        for item in self.activity_history:
            if item.employee_id not in (None, self.employee.employee_id):
                raise ValueError("Контекст должен содержать историю только данного сотрудника")
            if item.event_id not in events:
                raise ValueError(f"В каталоге отсутствует мероприятие: {item.event_id}")
        if self.employee.last_review_date and self.employee.last_review_date > self.as_of_date:
            raise ValueError("last_review_date позже as_of_date")
        return self


class ConversationTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=3000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=3000)
    context: CareerContext
    conversation_history: list[ConversationTurn] = Field(default_factory=list, max_length=20)


class PlanRequest(BaseModel):
    context: CareerContext


class Factor(BaseModel):
    id: str
    category: Literal["grade", "gap", "history", "target"]
    text: str


class Gain(BaseModel):
    skill_id: str
    name: str
    before: Level
    after: Level
    target: Level


class Candidate(BaseModel):
    event: Event
    score: float
    factors: list[Factor]
    next_session: str | None
    gains: list[Gain]
    in_progress: bool = False


class Recommendation(Candidate):
    explanation: str


class Recommendations(BaseModel):
    # Matches apps/api/src/contracts.ts: Recommendations.
    mode: Literal["ai", "rules"]
    model: str | None
    message: str
    recommendations: list[Recommendation] = Field(max_length=3)
    generated_at: str
    duration_ms: int


class RecommendationSelection(BaseModel):
    # Recommendation cards already contain server-computed explanations.
    event_ids: list[str] = Field(max_length=3)


class ModelDecision(RecommendationSelection):
    # Free-form replies are needed only for the conversational endpoint.
    reply: str = Field(min_length=1, max_length=3000)
