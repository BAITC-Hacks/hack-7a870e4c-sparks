from __future__ import annotations

from datetime import date as Date
from typing import Literal

from pydantic import BaseModel, Field


Grade = Literal["Junior", "Middle", "Senior", "Lead"]


class Goal(BaseModel):
    target_role: str
    target_grade: Grade


class Employee(BaseModel):
    employee_id: str
    full_name: str | None = None
    department: str | None = None
    role: str
    grade: Grade
    tenure_months: int | None = None
    work_format: Literal["office", "hybrid", "remote"] | None = None
    skills: dict[str, int] = Field(default_factory=dict)
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
    required_skills: dict[str, int]
    critical_skills: list[str] = Field(default_factory=list)


class SkillDevelopment(BaseModel):
    skill_id: str
    gain: int
    max_level: int


class Event(BaseModel):
    event_id: str
    title: str
    description: str | None = None
    type: str | None = None
    format: Literal["online", "offline", "self_paced"]
    duration_hours: float
    mandatory: bool
    target_roles: list[str]
    target_grades: list[Grade]
    develops_skills: list[SkillDevelopment] = Field(default_factory=list)
    prerequisites: dict[str, int] = Field(default_factory=dict)
    upcoming_sessions: list[Date] = Field(default_factory=list)


class HistoryItem(BaseModel):
    record_id: str | None = None
    event_id: str
    employee_id: str | None = None
    date: Date | None = None
    completed_at: Date | None = None
    due_date: Date | None = None
    status: Literal["completed", "in_progress", "dropped", "no_show", "declined", "overdue"]
    completion_pct: int | None = None
    score: int | None = None
    feedback_rating: int | None = None
    assigned_by: Literal["self", "manager", "hr"] | None = None


class CareerContext(BaseModel):
    as_of_date: Date
    employee: Employee
    skills: list[Skill]
    role_profiles: list[RoleProfile]
    events: list[Event]
    activity_history: list[HistoryItem] = Field(default_factory=list)


class ConversationTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=3000)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=3000)
    context: CareerContext
    conversation_history: list[ConversationTurn] = Field(default_factory=list, max_length=20)


class PlanRequest(BaseModel):
    context: CareerContext
